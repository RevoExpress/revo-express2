import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
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

// ═══════════════════════════════════════════════════════════
// Demande de retour en arrière d'un statut (n'importe quel interne)
// ═══════════════════════════════════════════════════════════
const DemandeInput = z.object({
  colis_id: z.string().uuid(),
  statut_souhaite: z.string().min(2).max(40),
  motif: z.string().trim().max(500).optional(),
});

export const demanderRetourStatut = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => DemandeInput.parse(data))
  .handler(async ({ data, context }) => {
    const roles = await getRoles(context.supabase, context.userId);
    const isInterne = roles.some((r) => r !== "client");
    if (!isInterne) throw new Error("Forbidden");

    const { data: colis } = await supabaseAdmin
      .from("colis").select("id, tracking, statut").eq("id", data.colis_id).single();
    if (!colis) throw new Error("Colis introuvable");

    const { data: prof } = await supabaseAdmin
      .from("profiles").select("nom").eq("id", context.userId).single();

    const { error } = await supabaseAdmin.from("demandes_validation").insert({
      colis_id: colis.id,
      tracking: colis.tracking,
      demandeur_id: context.userId,
      demandeur_nom: prof?.nom ?? null,
      statut_actuel: colis.statut,
      statut_souhaite: data.statut_souhaite,
      motif: data.motif ?? null,
      etat: "en_attente",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Liste des demandes en attente (Dir. Ops / DG)
export const listDemandesValidation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const roles = await getRoles(context.supabase, context.userId);
    const allowed = roles.some((r) => r === "admin" || r === "admin_operations");
    if (!allowed) throw new Error("Forbidden");

    const { data } = await supabaseAdmin
      .from("demandes_validation").select("*")
      .eq("etat", "en_attente").order("created_at", { ascending: false });
    return { demandes: data ?? [] };
  });

// Traiter une demande : accepter (applique le retour) ou refuser
const TraiterInput = z.object({
  demande_id: z.string().uuid(),
  accepter: z.boolean(),
});

export const traiterDemandeValidation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => TraiterInput.parse(data))
  .handler(async ({ data, context }) => {
    const roles = await getRoles(context.supabase, context.userId);
    const allowed = roles.some((r) => r === "admin" || r === "admin_operations");
    if (!allowed) throw new Error("Forbidden: Directeur des Opérations uniquement");

    const { data: demande } = await supabaseAdmin
      .from("demandes_validation").select("*").eq("id", data.demande_id).single();
    if (!demande) throw new Error("Demande introuvable");
    if (demande.etat !== "en_attente") throw new Error("Demande déjà traitée");

    if (data.accepter) {
      // Applique le retour en arrière sur le colis
      const { error: upErr } = await supabaseAdmin
        .from("colis").update({ statut: demande.statut_souhaite }).eq("id", demande.colis_id);
      if (upErr) throw new Error(upErr.message);
    }

    const { error } = await supabaseAdmin.from("demandes_validation").update({
      etat: data.accepter ? "accepte" : "refuse",
      traite_par: context.userId,
      traite_at: new Date().toISOString(),
    }).eq("id", data.demande_id);
    if (error) throw new Error(error.message);

    // Log audit
    await supabaseAdmin.rpc("log_audit", {
      _domaine: "operations",
      _action: data.accepter ? "retour_statut_accepte" : "retour_statut_refuse",
      _cible: demande.tracking,
      _ancienne: demande.statut_actuel,
      _nouvelle: data.accepter ? demande.statut_souhaite : demande.statut_actuel,
    });

    return { ok: true };
  });

// ═══════════════════════════════════════════════════════════
// Archiver un colis (au lieu de supprimer) — DG / directeurs
// ═══════════════════════════════════════════════════════════
export const archiverColis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ colis_id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const roles = await getRoles(context.supabase, context.userId);
    const allowed = roles.some((r) =>
      r === "admin" || r === "admin_operations" || r === "admin_service_client");
    if (!allowed) throw new Error("Forbidden");

    const { data: colis } = await supabaseAdmin
      .from("colis").select("tracking").eq("id", data.colis_id).single();

    const { error } = await supabaseAdmin.from("colis")
      .update({ archive: true, archive_at: new Date().toISOString() })
      .eq("id", data.colis_id);
    if (error) throw new Error(error.message);

    await supabaseAdmin.rpc("log_audit", {
      _domaine: "colis", _action: "archivage", _cible: colis?.tracking ?? data.colis_id,
    });
    return { ok: true };
  });

// ═══════════════════════════════════════════════════════════
// ALERTES : liste des colis bloqués (>48h sans MAJ, non finalisés)
// ═══════════════════════════════════════════════════════════
export const listColisBloques = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const roles = await getRoles(context.supabase, context.userId);
    const isInterne = roles.some((r) => r !== "client");
    if (!isInterne) throw new Error("Forbidden");

    const { data } = await supabaseAdmin
      .from("colis_bloques").select("*").order("updated_at", { ascending: true });
    return { colis: data ?? [] };
  });

// Audit : lecture (chaque directeur voit son domaine ; RLS applique le filtre)
export const listAudit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ domaine: z.string().optional() }).parse(data))
  .handler(async ({ data, context }) => {
    const roles = await getRoles(context.supabase, context.userId);
    const isInterne = roles.some((r) => r !== "client");
    if (!isInterne) throw new Error("Forbidden");

    let q = supabaseAdmin.from("audit_log").select("*").order("created_at", { ascending: false }).limit(200);
    if (data.domaine) q = q.eq("domaine", data.domaine);
    const { data: rows } = await q;
    return { audit: rows ?? [] };
  });
