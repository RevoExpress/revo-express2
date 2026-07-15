import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createHash, randomBytes } from "node:crypto";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type AppRole =
  | "admin" | "directeur_commercial" | "admin_commercial" | "admin_operations"
  | "admin_service_client" | "commercial" | "service_client" | "livreur" | "client";

async function getRoles(supabase: any, userId: string): Promise<AppRole[]> {
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  if (error) throw new Error("Forbidden");
  return (data ?? []).map((r: any) => r.role as AppRole);
}

function sha256(s: string) {
  return createHash("sha256").update(s).digest("hex");
}

// ═══════════════════════════════════════════════════════════
// GÉNÉRER une clé API pour un commerçant (DG uniquement)
// La clé complète n'est retournée qu'UNE FOIS.
// ═══════════════════════════════════════════════════════════
const GenKeyInput = z.object({
  client_id: z.string().uuid(),
  nom: z.string().trim().max(100).optional(),
});

export const genererApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => GenKeyInput.parse(data))
  .handler(async ({ data, context }) => {
    const roles = await getRoles(context.supabase, context.userId);
    if (!roles.includes("admin")) throw new Error("Forbidden: DG uniquement");

    // Génère une clé aléatoire : rvx_<40 hex>
    const raw = "rvx_" + randomBytes(24).toString("hex");
    const prefix = raw.slice(0, 12);
    const hash = sha256(raw);

    const { error } = await supabaseAdmin.from("api_keys").insert({
      client_id: data.client_id,
      nom: data.nom ?? null,
      key_prefix: prefix,
      key_hash: hash,
      created_by: context.userId,
    });
    if (error) throw new Error(error.message);

    // On renvoie la clé EN CLAIR une seule fois (à copier immédiatement)
    return { ok: true, api_key: raw, prefix };
  });

export const listApiKeys = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ client_id: z.string().uuid().optional() }).parse(data))
  .handler(async ({ data, context }) => {
    const roles = await getRoles(context.supabase, context.userId);
    const isAdmin = roles.includes("admin");
    if (!isAdmin && data.client_id && data.client_id !== context.userId) throw new Error("Forbidden");

    let q = supabaseAdmin
      .from("api_keys")
      .select("id, client_id, nom, key_prefix, actif, created_at, last_used_at")
      .order("created_at", { ascending: false });
    if (data.client_id) q = q.eq("client_id", data.client_id);
    else if (!isAdmin) q = q.eq("client_id", context.userId);
    const { data: rows } = await q;
    return { keys: rows ?? [] };
  });

export const revoquerApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ key_id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const roles = await getRoles(context.supabase, context.userId);
    if (!roles.includes("admin")) throw new Error("Forbidden: DG uniquement");
    const { error } = await supabaseAdmin.from("api_keys").update({ actif: false }).eq("id", data.key_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ═══════════════════════════════════════════════════════════
// RÉCEPTION d'une commande via API (authentifiée par clé)
// Endpoint générique : la boutique POST une commande avec sa clé API.
// La commande est stockée en "en_attente" (le commerçant valide ensuite).
// ═══════════════════════════════════════════════════════════
const IncomingOrderInput = z.object({
  api_key: z.string().min(10),
  source: z.string().max(40).optional(),
  destinataire_nom: z.string().trim().min(2).max(100),
  destinataire_tel: z.string().trim().min(6).max(20),
  destinataire_adresse: z.string().trim().min(3).max(255),
  destinataire_wilaya: z.string().trim().max(100).optional(),
  destinataire_commune: z.string().trim().max(100).optional(),
  prix_colis: z.number().min(0),
  description: z.string().trim().max(255).optional(),
  ref_externe: z.string().trim().max(100).optional(),
});

export const recevoirCommandeApi = createServerFn({ method: "POST" })
  .inputValidator((data) => IncomingOrderInput.parse(data))
  .handler(async ({ data }) => {
    // Authentifie via le hash de la clé
    const hash = sha256(data.api_key);
    const { data: clientId } = await supabaseAdmin.rpc("verifier_api_key", { _hash: hash });
    if (!clientId) throw new Error("Clé API invalide");

    // Met à jour last_used_at
    await supabaseAdmin.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("key_hash", hash);

    // Stocke la commande en attente de validation
    const { data: cmd, error } = await supabaseAdmin.from("commandes_api").insert({
      client_id: clientId,
      source: data.source ?? "api",
      destinataire_nom: data.destinataire_nom,
      destinataire_tel: data.destinataire_tel,
      destinataire_adresse: data.destinataire_adresse,
      destinataire_wilaya: data.destinataire_wilaya ?? null,
      destinataire_commune: data.destinataire_commune ?? null,
      prix_colis: data.prix_colis,
      description: data.description ?? null,
      ref_externe: data.ref_externe ?? null,
      etat: "en_attente",
    }).select().single();
    if (error) throw new Error(error.message);
    return { ok: true, commande_id: cmd.id };
  });

// Liste des commandes API en attente (côté commerçant)
export const listCommandesApiEnAttente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await supabaseAdmin
      .from("commandes_api").select("*")
      .eq("client_id", context.userId).eq("etat", "en_attente")
      .order("created_at", { ascending: false });
    return { commandes: data ?? [] };
  });

// Valider une commande API → crée le colis en "en-preparation"
const ValiderInput = z.object({
  commande_id: z.string().uuid(),
  accepter: z.boolean(),
});

function genTracking() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return "REV-" + s;
}

export const validerCommandeApi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => ValiderInput.parse(data))
  .handler(async ({ data, context }) => {
    const { data: cmd } = await supabaseAdmin
      .from("commandes_api").select("*").eq("id", data.commande_id).single();
    if (!cmd) throw new Error("Commande introuvable");
    if (cmd.client_id !== context.userId) throw new Error("Forbidden");
    if (cmd.etat !== "en_attente") throw new Error("Commande déjà traitée");

    if (!data.accepter) {
      await supabaseAdmin.from("commandes_api").update({ etat: "rejetee" }).eq("id", data.commande_id);
      return { ok: true, rejected: true };
    }

    // Récupère le profil commerçant (expéditeur)
    const { data: prof } = await supabaseAdmin
      .from("profiles").select("nom_boutique, nom, telephone, adresse, ramassage_commune").eq("id", context.userId).single();

    const tracking = genTracking();
    const { data: colis, error } = await supabaseAdmin.from("colis").insert({
      tracking,
      client_id: context.userId,
      expediteur_nom: prof?.nom_boutique || prof?.nom || "Boutique",
      expediteur_tel: prof?.telephone || "",
      expediteur_adresse: prof?.adresse || "",
      expediteur_commune: prof?.ramassage_commune || null,
      destinataire_nom: cmd.destinataire_nom,
      destinataire_tel: cmd.destinataire_tel,
      destinataire_adresse: cmd.destinataire_adresse,
      destinataire_wilaya: cmd.destinataire_wilaya,
      prix_colis: cmd.prix_colis ?? 0,
      prix: 0, // frais calculés ensuite / à l'affectation
      type_livraison: "standard",
      type_colis: "REV",
      description: cmd.description,
      statut: "en-preparation",
    }).select().single();
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("commandes_api")
      .update({ etat: "validee", colis_id: colis.id }).eq("id", data.commande_id);

    return { ok: true, tracking };
  });
