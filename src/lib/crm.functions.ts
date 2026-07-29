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
const canCommercial = (roles: AppRole[]) =>
  roles.some((r) => r === "admin" || r === "directeur_commercial" || r === "admin_commercial" || r === "commercial");
const seeAllCommercial = (roles: AppRole[]) =>
  roles.some((r) => r === "admin" || r === "directeur_commercial" || r === "admin_commercial");

// ═══════════════════════════════════════════════════════════
// INTERACTIONS CLIENT — appels / réclamations / notes / RDV
// ═══════════════════════════════════════════════════════════

export const listInteractions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ client_id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const roles = await getRoles(context.supabase, context.userId);
    if (!canCommercial(roles)) throw new Error("Forbidden");

    const { data: rows } = await supabaseAdmin
      .from("interactions_client")
      .select("*")
      .eq("client_id", data.client_id)
      .order("created_at", { ascending: false });
    if (!rows?.length) return { interactions: [] };

    const authorIds = Array.from(new Set(rows.map((r: any) => r.created_by).filter(Boolean)));
    const { data: profs } = authorIds.length
      ? await supabaseAdmin.from("profiles").select("id, nom").in("id", authorIds)
      : { data: [] as any[] };
    const byId = new Map((profs ?? []).map((p: any) => [p.id, p.nom]));
    return { interactions: rows.map((r: any) => ({ ...r, created_by_nom: byId.get(r.created_by) ?? null })) };
  });

const CreerInteractionInput = z.object({
  client_id: z.string().uuid(),
  type: z.enum(["appel", "reclamation", "note", "rdv"]),
  titre: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  date_prevue: z.string().datetime().optional(),
});

export const creerInteraction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => CreerInteractionInput.parse(data))
  .handler(async ({ data, context }) => {
    const roles = await getRoles(context.supabase, context.userId);
    if (!canCommercial(roles)) throw new Error("Forbidden");

    const { data: row, error } = await supabaseAdmin.from("interactions_client").insert({
      client_id: data.client_id,
      type: data.type,
      titre: data.titre,
      description: data.description ?? null,
      date_prevue: data.date_prevue ?? null,
      statut: data.type === "reclamation" ? "ouverte" : null,
      created_by: context.userId,
    }).select().single();
    if (error) throw new Error(error.message);
    return { ok: true, interaction: row };
  });

export const resoudreReclamation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const roles = await getRoles(context.supabase, context.userId);
    if (!canCommercial(roles)) throw new Error("Forbidden");
    const { error } = await supabaseAdmin.from("interactions_client")
      .update({ statut: "resolue", updated_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ═══════════════════════════════════════════════════════════
// TÂCHES
// ═══════════════════════════════════════════════════════════

export const listTaches = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ client_id: z.string().uuid().optional() }).parse(data ?? {}))
  .handler(async ({ data, context }) => {
    const roles = await getRoles(context.supabase, context.userId);
    if (!canCommercial(roles)) throw new Error("Forbidden");

    let q = supabaseAdmin.from("taches").select("*").order("echeance", { ascending: true, nullsFirst: false });
    if (data.client_id) q = q.eq("client_id", data.client_id);
    if (!seeAllCommercial(roles)) q = q.eq("owner_id", context.userId);
    const { data: rows } = await q;
    return { taches: rows ?? [] };
  });

const CreerTacheInput = z.object({
  titre: z.string().trim().min(1).max(200),
  priorite: z.enum(["urgent", "haute", "normale", "faible"]).default("normale"),
  client_id: z.string().uuid().optional(),
  echeance: z.string().datetime().optional(),
});

export const creerTache = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => CreerTacheInput.parse(data))
  .handler(async ({ data, context }) => {
    const roles = await getRoles(context.supabase, context.userId);
    if (!canCommercial(roles)) throw new Error("Forbidden");
    const { data: row, error } = await supabaseAdmin.from("taches").insert({
      owner_id: context.userId,
      client_id: data.client_id ?? null,
      titre: data.titre,
      priorite: data.priorite,
      echeance: data.echeance ?? null,
    }).select().single();
    if (error) throw new Error(error.message);
    return { ok: true, tache: row };
  });

export const toggleTache = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid(), fait: z.boolean() }).parse(data))
  .handler(async ({ data, context }) => {
    const roles = await getRoles(context.supabase, context.userId);
    if (!canCommercial(roles)) throw new Error("Forbidden");
    const { error } = await supabaseAdmin.from("taches")
      .update({ statut: data.fait ? "fait" : "a_faire", completed_at: data.fait ? new Date().toISOString() : null })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const supprimerTache = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const roles = await getRoles(context.supabase, context.userId);
    if (!canCommercial(roles)) throw new Error("Forbidden");
    const { error } = await supabaseAdmin.from("taches").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ═══════════════════════════════════════════════════════════
// STATS FICHE CLIENT — calculées depuis colis, pas de table dédiée
// ═══════════════════════════════════════════════════════════

export const getStatsClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ client_id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const roles = await getRoles(context.supabase, context.userId);
    if (!canCommercial(roles) && context.userId !== data.client_id) throw new Error("Forbidden");

    const { data: colis } = await supabaseAdmin
      .from("colis")
      .select("prix_colis, statut, type_colis, date_creation")
      .eq("client_id", data.client_id);
    const rows = colis ?? [];

    const ca_genere = rows.reduce((s: number, c: any) => s + Number(c.prix_colis ?? 0), 0);
    const nb_colis = rows.length;
    const livraisons_reussies = rows.filter((c: any) => c.statut === "livre").length;
    const retours = rows.filter((c: any) => c.statut === "retourne-vendeur").length;
    const incidents = rows.filter((c: any) => c.statut === "echec-livraison").length;
    const retards = rows.filter((c: any) => c.statut === "reporte").length;

    return { ca_genere, nb_colis, livraisons_reussies, retours, incidents, retards };
  });
