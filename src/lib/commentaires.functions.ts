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
async function estInterne(supabase: any, userId: string) {
  const roles = await getRoles(supabase, userId);
  return roles.some((r) => r !== "client");
}

async function chargerColis(colisId: string) {
  const { data } = await supabaseAdmin.from("colis").select("id, client_id").eq("id", colisId).single();
  return data;
}

// Vérifie l'accès : le staff a accès à tout, un client seulement à SES colis
async function verifierAcces(supabase: any, userId: string, colisId: string) {
  const col = await chargerColis(colisId);
  if (!col) throw new Error("Colis introuvable");
  const interne = await estInterne(supabase, userId);
  if (!interne && col.client_id !== userId) throw new Error("Forbidden");
  return { interne, col };
}

const TAGS = ["reclamation", "demande_client", "pb_operations", "remarque_commerciale", "autre"] as const;

// ─────────────────────────────────────────────────────────
// Ajouter un commentaire (ou une réponse)
// visible_client=false → Notes internes (staff uniquement, comme avant)
// visible_client=true  → Commentaires partagés (client + staff)
// ─────────────────────────────────────────────────────────
const AddInput = z.object({
  colis_id: z.string().uuid(),
  contenu: z.string().trim().min(1).max(2000),
  tag: z.enum(TAGS).optional(),
  parent_id: z.string().uuid().optional(),
  visible_client: z.boolean().optional().default(false),
});

export const ajouterCommentaire = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => AddInput.parse(data))
  .handler(async ({ data, context }) => {
    const { interne } = await verifierAcces(context.supabase, context.userId, data.colis_id);
    // Un client ne peut écrire QUE dans les commentaires partagés, jamais en notes internes
    if (!interne && !data.visible_client) throw new Error("Forbidden");

    const { data: prof } = await supabaseAdmin
      .from("profiles").select("nom, nom_boutique").eq("id", context.userId).single();
    const auteur_nom = interne ? (prof?.nom ?? null) : (prof?.nom_boutique || prof?.nom || "Client");

    const { data: row, error } = await supabaseAdmin.from("colis_commentaires").insert({
      colis_id: data.colis_id,
      auteur_id: context.userId,
      auteur_nom,
      contenu: data.contenu,
      tag: data.tag ?? null,
      parent_id: data.parent_id ?? null,
      visible_client: data.visible_client,
    }).select().single();
    if (error) throw new Error(error.message);
    return { ok: true, commentaire: row };
  });

// ─────────────────────────────────────────────────────────
// Lister les commentaires d'un colis, filtrés par visibilité
// ─────────────────────────────────────────────────────────
const ListInput = z.object({
  colis_id: z.string().uuid(),
  visible_client: z.boolean().optional().default(false),
});

export const listCommentaires = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => ListInput.parse(data))
  .handler(async ({ data, context }) => {
    const { interne, col } = await verifierAcces(context.supabase, context.userId, data.colis_id);
    // Les notes internes (visible_client=false) restent strictement staff
    if (!data.visible_client && !interne) throw new Error("Forbidden");

    const { data: rows } = await supabaseAdmin
      .from("colis_commentaires").select("*")
      .eq("colis_id", data.colis_id)
      .eq("visible_client", data.visible_client)
      .order("created_at", { ascending: true });
    return { commentaires: rows ?? [], me: context.userId, clientId: col?.client_id ?? null };
  });

// ─────────────────────────────────────────────────────────
// Modifier son propre commentaire
// ─────────────────────────────────────────────────────────
const EditInput = z.object({
  id: z.string().uuid(),
  contenu: z.string().trim().min(1).max(2000),
});

export const modifierCommentaire = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => EditInput.parse(data))
  .handler(async ({ data, context }) => {
    const { data: c } = await supabaseAdmin
      .from("colis_commentaires").select("auteur_id").eq("id", data.id).single();
    if (!c || c.auteur_id !== context.userId) throw new Error("Forbidden");

    const { error } = await supabaseAdmin.from("colis_commentaires")
      .update({ contenu: data.contenu, updated_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ─────────────────────────────────────────────────────────
// Supprimer son propre commentaire
// ─────────────────────────────────────────────────────────
export const supprimerCommentaire = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: c } = await supabaseAdmin
      .from("colis_commentaires").select("auteur_id").eq("id", data.id).single();
    if (!c || c.auteur_id !== context.userId) throw new Error("Forbidden");

    const { error } = await supabaseAdmin.from("colis_commentaires").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });