import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type AppRole =
  | "admin" | "directeur_commercial" | "admin_commercial" | "admin_operations"
  | "admin_service_client" | "commercial" | "service_client" | "livreur" | "client";

async function getRoles(supabase: any, userId: string): Promise<AppRole[]> {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  return (data ?? []).map((r: any) => r.role as AppRole);
}
const canFinance = (roles: AppRole[]) =>
  roles.some((r) => r === "admin" || r === "admin_service_client" || r === "service_client");
const canOps = (roles: AppRole[]) =>
  roles.some((r) => r === "admin" || r === "admin_operations");

// ═══════════════════════════════════════════════════════════
// ÉTAPE 2 : marquer le COD d'un colis comme ENCAISSÉ (argent ramené par le livreur)
// + enregistre une "remise" dans la caisse livreur
// ═══════════════════════════════════════════════════════════
const EncaisseInput = z.object({
  colis_ids: z.array(z.string().uuid()).min(1),
});

export const marquerCodEncaisse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => EncaisseInput.parse(data))
  .handler(async ({ data, context }) => {
    const roles = await getRoles(context.supabase, context.userId);
    if (!canFinance(roles) && !canOps(roles)) throw new Error("Forbidden");

    const now = new Date().toISOString();
    // Récupère les colis pour la caisse livreur
    const { data: colisRows } = await supabaseAdmin
      .from("colis").select("id, livreur_id, prix_colis, tracking").in("id", data.colis_ids);

    const { error } = await supabaseAdmin
      .from("colis").update({ cod_encaisse: true, cod_encaisse_at: now }).in("id", data.colis_ids);
    if (error) throw new Error(error.message);

    // Enregistre une remise dans la caisse de chaque livreur concerné
    for (const c of colisRows ?? []) {
      if (c.livreur_id) {
        await supabaseAdmin.from("caisse_livreur").insert({
          livreur_id: c.livreur_id, colis_id: c.id,
          type: "remise", montant: Number(c.prix_colis ?? 0),
          note: "COD encaissé colis " + c.tracking,
        });
      }
    }

    await supabaseAdmin.rpc("log_audit", {
      _domaine: "finance", _action: "cod_encaisse",
      _cible: `${data.colis_ids.length} colis`,
    });
    return { ok: true, count: data.colis_ids.length };
  });

// ═══════════════════════════════════════════════════════════
// Solde à reverser (par commerçant) — vue solde_a_reverser
// ═══════════════════════════════════════════════════════════
export const listSoldesAReverser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const roles = await getRoles(context.supabase, context.userId);
    if (!canFinance(roles)) throw new Error("Forbidden");

    const { data: soldes } = await supabaseAdmin.from("solde_a_reverser").select("*");
    // Enrichit avec le nom de la boutique
    const ids = (soldes ?? []).map((s: any) => s.client_id);
    const { data: profs } = ids.length
      ? await supabaseAdmin.from("profiles").select("id, nom_boutique, nom").in("id", ids)
      : { data: [] as any[] };
    const byId = new Map((profs ?? []).map((p: any) => [p.id, p]));
    return {
      soldes: (soldes ?? []).map((s: any) => ({
        ...s,
        nom_boutique: byId.get(s.client_id)?.nom_boutique ?? byId.get(s.client_id)?.nom ?? "—",
      })),
    };
  });

// Colis reversables d'un commerçant (livrés, encaissés, non reversés)
export const listColisAReverser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ client_id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const roles = await getRoles(context.supabase, context.userId);
    if (!canFinance(roles)) throw new Error("Forbidden");
    const { data: rows } = await supabaseAdmin
      .from("colis")
      .select("id, tracking, destinataire_nom, prix_colis, cod_encaisse_at")
      .eq("client_id", data.client_id)
      .eq("statut", "livre").eq("cod_encaisse", true)
      .is("reversement_id", null).eq("archive", false).eq("type_colis", "REV")
      .order("cod_encaisse_at", { ascending: true });
    return { colis: rows ?? [] };
  });

// ═══════════════════════════════════════════════════════════
// CRÉER un reversement (on choisit les colis à inclure)
// ═══════════════════════════════════════════════════════════
const ReversementInput = z.object({
  client_id: z.string().uuid(),
  colis_ids: z.array(z.string().uuid()).min(1),
});

export const creerReversement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => ReversementInput.parse(data))
  .handler(async ({ data, context }) => {
    const roles = await getRoles(context.supabase, context.userId);
    if (!canFinance(roles)) throw new Error("Forbidden");

    // Calcule le montant total des colis choisis
    const { data: colisRows } = await supabaseAdmin
      .from("colis").select("id, prix_colis").in("id", data.colis_ids)
      .eq("client_id", data.client_id).is("reversement_id", null);
    if (!colisRows?.length) throw new Error("Aucun colis reversable dans la sélection");

    const total = colisRows.reduce((s, c) => s + Number(c.prix_colis ?? 0), 0);
    const ref = "REV-PAY-" + new Date().toISOString().slice(0, 10).replaceAll("-", "") + "-" + Math.floor(Math.random() * 900 + 100);

    // Crée le reversement
    const { data: rev, error } = await supabaseAdmin.from("reversements").insert({
      client_id: data.client_id,
      montant_total: total,
      nb_colis: colisRows.length,
      reference: ref,
      cree_par: context.userId,
    }).select().single();
    if (error) throw new Error(error.message);

    // Rattache les colis au reversement
    await supabaseAdmin.from("colis")
      .update({ reversement_id: rev.id })
      .in("id", colisRows.map((c) => c.id));

    await supabaseAdmin.rpc("log_audit", {
      _domaine: "finance", _action: "reversement_cree",
      _cible: ref, _nouvelle: total + " DA",
    });
    return { ok: true, reversement: rev };
  });

// Historique des reversements (staff : tous ; commerçant : les siens)
export const listReversements = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ client_id: z.string().uuid().optional() }).parse(data))
  .handler(async ({ data, context }) => {
    const roles = await getRoles(context.supabase, context.userId);
    const staff = canFinance(roles);
    let q = supabaseAdmin.from("reversements").select("*").order("created_at", { ascending: false });
    if (staff && data.client_id) q = q.eq("client_id", data.client_id);
    else if (!staff) q = q.eq("client_id", context.userId);
    const { data: rows } = await q;
    return { reversements: rows ?? [] };
  });

// Détail d'un reversement (colis inclus) — pour le reçu PDF
export const detailReversement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ reversement_id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: rev } = await supabaseAdmin
      .from("reversements").select("*").eq("id", data.reversement_id).single();
    if (!rev) throw new Error("Reversement introuvable");
    // Le commerçant ne voit que les siens
    const roles = await getRoles(context.supabase, context.userId);
    if (!canFinance(roles) && rev.client_id !== context.userId) throw new Error("Forbidden");

    const { data: colis } = await supabaseAdmin
      .from("colis").select("tracking, destinataire_nom, prix_colis")
      .eq("reversement_id", data.reversement_id);
    const { data: prof } = await supabaseAdmin
      .from("profiles").select("nom_boutique, nom, telephone").eq("id", rev.client_id).single();
    return { reversement: rev, colis: colis ?? [], commercant: prof ?? null };
  });

// ═══════════════════════════════════════════════════════════
// CAISSE LIVREUR
// ═══════════════════════════════════════════════════════════
// Solde caisse d'un livreur (ou de tous, pour Ops/DG)
export const soldeCaisse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ livreur_id: z.string().uuid().optional() }).parse(data))
  .handler(async ({ data, context }) => {
    const roles = await getRoles(context.supabase, context.userId);
    const isLivreur = roles.includes("livreur");
    const target = data.livreur_id ?? (isLivreur ? context.userId : undefined);

    if (!canOps(roles) && target !== context.userId) throw new Error("Forbidden");

    let q = supabaseAdmin.from("solde_caisse_livreur").select("*");
    if (target) q = q.eq("livreur_id", target);
    const { data: rows } = await q;
    return { soldes: rows ?? [] };
  });

// Valider la caisse d'un livreur en fin de journée (Ops/DG)
export const validerCaisseJour = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ livreur_id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const roles = await getRoles(context.supabase, context.userId);
    if (!canOps(roles)) throw new Error("Forbidden");
    const { error } = await supabaseAdmin.from("caisse_livreur")
      .update({ valide: true }).eq("livreur_id", data.livreur_id).eq("valide", false);
    if (error) throw new Error(error.message);
    await supabaseAdmin.rpc("log_audit", {
      _domaine: "finance", _action: "caisse_validee", _cible: data.livreur_id,
    });
    return { ok: true };
  });

// ═══════════════════════════════════════════════════════════
// CÔTÉ COMMERÇANT : "Mon paiement" — solde temps réel
// ═══════════════════════════════════════════════════════════
export const monPaiement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Solde à recevoir = colis livrés + encaissés + non reversés
    const { data: solde } = await supabaseAdmin
      .from("solde_a_reverser").select("*").eq("client_id", context.userId).maybeSingle();
    // En attente d'encaissement = livrés mais COD pas encore ramené
    const { data: enAttente } = await supabaseAdmin
      .from("colis").select("prix_colis")
      .eq("client_id", context.userId).eq("statut", "livre")
      .eq("cod_encaisse", false).eq("archive", false).eq("type_colis", "REV");
    const montantEnAttente = (enAttente ?? []).reduce((s, c) => s + Number(c.prix_colis ?? 0), 0);

    return {
      montant_a_recevoir: solde?.montant_du ?? 0,
      nb_colis_a_recevoir: solde?.nb_colis ?? 0,
      montant_en_attente_encaissement: montantEnAttente,
    };
  });
