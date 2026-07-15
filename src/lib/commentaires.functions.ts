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

// Tags autorisés
const TAGS = ["reclamation", "demande_client", "pb_operations", "remarque_commerciale", "autre"] as const;

// ─────────────────────────────────────────────────────────
// Ajouter un commentaire (ou une réponse)
// ─────────────────────────────────────────────────────────
const AddInput = z.object({
  colis_id: z.string().uuid(),
  contenu: z.string().trim().min(1).max(2000),
  tag: z.enum(TAGS).optional(),
  parent_id: z.string().uuid().optional(),
});

export const ajouterCommentaire = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => AddInput.parse(data))
  .handler(async ({ data, context }) => {
    if (!(await estInterne(context.supabase, context.userId))) throw new Error("Forbidden");
    const { data: prof } = await supabaseAdmin
      .from("profiles").select("nom").eq("id", context.userId).single();

    const { data: row, error } = await supabaseAdmin.from("colis_commentaires").insert({
      colis_id: data.colis_id,
      auteur_id: context.userId,
      auteur_nom: prof?.nom ?? null,
      contenu: data.contenu,
      tag: data.tag ?? null,
      parent_id: data.parent_id ?? null,
    }).select().single();
    if (error) throw new Error(error.message);
    return { ok: true, commentaire: row };
  });

// ─────────────────────────────────────────────────────────
// Lister les commentaires d'un colis (fil complet)
// ─────────────────────────────────────────────────────────
export const listCommentaires = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ colis_id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    if (!(await estInterne(context.supabase, context.userId))) throw new Error("Forbidden");
    const { data: rows } = await supabaseAdmin
      .from("colis_commentaires").select("*")
      .eq("colis_id", data.colis_id).order("created_at", { ascending: true });
    return { commentaires: rows ?? [], me: context.userId };
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
    // Vérifie que c'est bien l'auteur
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
