import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function getRoles(supabase: any, userId: string): Promise<string[]> {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  return (data ?? []).map((r: any) => r.role as string);
}
const isFinanceStaff = (roles: string[]) => roles.includes("admin") || roles.includes("admin_operations");

function genReference() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return "VERS-" + s;
}

// ── Côté commerçant ──────────────────────────────────────────────

export const getMonSolde = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await supabaseAdmin
      .from("solde_a_reverser")
      .select("*")
      .eq("client_id", context.userId)
      .maybeSingle();
    return { nb_colis: data?.nb_colis ?? 0, montant_du: data?.montant_du ?? 0 };
  });

export const getMesColisEnAttente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await supabaseAdmin
      .from("colis")
      .select("id, tracking, destinataire_nom, prix_colis, prix, frais_payes_par_expediteur, date_creation")
      .eq("client_id", context.userId)
      .eq("statut", "livre")
      .eq("cod_encaisse", true)
      .is("reversement_id", null)
      .eq("archive", false)
      .eq("type_colis", "REV")
      .order("date_creation", { ascending: false });
    return { colis: data ?? [] };
  });

export const getMesReversements = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await supabaseAdmin
      .from("reversements")
      .select("*")
      .eq("client_id", context.userId)
      .order("created_at", { ascending: false });
    return { reversements: data ?? [] };
  });

// ── Côté staff (finance) : DG et Admin Opérations ─────────────────

export const listSoldesTousClients = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const roles = await getRoles(context.supabase, context.userId);
    if (!isFinanceStaff(roles)) throw new Error("Forbidden");

    const { data: soldes } = await supabaseAdmin.from("solde_a_reverser").select("*");
    if (!soldes?.length) return { soldes: [] };

    const ids = soldes.map((s: any) => s.client_id);
    const { data: profs } = await supabaseAdmin.from("profiles").select("id, nom, nom_boutique, telephone").in("id", ids);
    const byId = new Map((profs ?? []).map((p: any) => [p.id, p]));

    const enrichis = soldes
      .map((s: any) => ({ ...s, profil: byId.get(s.client_id) }))
      .sort((a: any, b: any) => Number(b.montant_du) - Number(a.montant_du));
    return { soldes: enrichis };
  });

const CreerReversementInput = z.object({
  client_id: z.string().uuid(),
  colis_ids: z.array(z.string().uuid()).min(1),
});

export const creerReversement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => CreerReversementInput.parse(data))
  .handler(async ({ data, context }) => {
    const roles = await getRoles(context.supabase, context.userId);
    if (!isFinanceStaff(roles)) throw new Error("Forbidden");

    const { data: colisRows } = await supabaseAdmin
      .from("colis")
      .select("id, prix_colis, prix, frais_payes_par_expediteur")
      .in("id", data.colis_ids)
      .eq("client_id", data.client_id)
      .is("reversement_id", null);

    if (!colisRows?.length) throw new Error("Aucun colis valide sélectionné");

    const montant_total = colisRows.reduce((sum: number, c: any) => {
      const m = c.frais_payes_par_expediteur ? Number(c.prix_colis) - Number(c.prix) : Number(c.prix_colis);
      return sum + m;
    }, 0);

    const { data: rev, error: revErr } = await supabaseAdmin
      .from("reversements")
      .insert({
        client_id: data.client_id,
        montant_total,
        nb_colis: colisRows.length,
        reference: genReference(),
        cree_par: context.userId,
      })
      .select()
      .single();
    if (revErr) throw new Error(revErr.message);

    const { error: updErr } = await supabaseAdmin
      .from("colis")
      .update({ reversement_id: rev.id })
      .in("id", colisRows.map((c: any) => c.id));
    if (updErr) throw new Error(updErr.message);

    return { ok: true, reversement: rev };
  });

export const listReversementsTous = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const roles = await getRoles(context.supabase, context.userId);
    if (!isFinanceStaff(roles)) throw new Error("Forbidden");
    const { data } = await supabaseAdmin.from("reversements").select("*").order("created_at", { ascending: false }).limit(200);
    return { reversements: data ?? [] };
  });

export const getReversementDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: rev } = await supabaseAdmin.from("reversements").select("*").eq("id", data.id).single();
    if (!rev) throw new Error("Reversement introuvable");
    const roles = await getRoles(context.supabase, context.userId);
    const isOwner = rev.client_id === context.userId;
    if (!isOwner && !isFinanceStaff(roles)) throw new Error("Forbidden");

    const { data: profil } = await supabaseAdmin.from("profiles").select("nom, nom_boutique").eq("id", rev.client_id).single();
    const { data: colisInclus } = await supabaseAdmin
      .from("colis")
      .select("tracking, destinataire_nom, prix_colis, prix, frais_payes_par_expediteur")
      .eq("reversement_id", rev.id);

    return { reversement: rev, profil, colis: colisInclus ?? [] };
  });
  // ── Marquer l'encaissement (DG / Admin Opérations, sans passer par le livreur) ──

export const listColisLivresNonEncaisses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const roles = await getRoles(context.supabase, context.userId);
    if (!isFinanceStaff(roles)) throw new Error("Forbidden");

    const { data } = await supabaseAdmin
      .from("colis")
      .select("id, tracking, client_id, destinataire_nom, prix_colis, prix, date_creation")
      .eq("statut", "livre")
      .or("cod_encaisse.is.null,cod_encaisse.eq.false")
      .eq("archive", false)
      .eq("type_colis", "REV")
      .order("date_creation", { ascending: false })
      .limit(200);
    if (!data?.length) return { colis: [] };

    const ids = Array.from(new Set(data.map((c: any) => c.client_id)));
    const { data: profs } = await supabaseAdmin.from("profiles").select("id, nom, nom_boutique").in("id", ids);
    const byId = new Map((profs ?? []).map((p: any) => [p.id, p]));
    const enrichis = data.map((c: any) => ({ ...c, profil: byId.get(c.client_id) }));
    return { colis: enrichis };
  });

const MarquerEncaisseInput = z.object({
  colis_ids: z.array(z.string().uuid()).min(1),
});

export const marquerEncaisse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => MarquerEncaisseInput.parse(data))
  .handler(async ({ data, context }) => {
    const roles = await getRoles(context.supabase, context.userId);
    if (!isFinanceStaff(roles)) throw new Error("Forbidden");

    const { error } = await supabaseAdmin
      .from("colis")
      .update({ cod_encaisse: true })
      .in("id", data.colis_ids);
    if (error) throw new Error(error.message);
    return { ok: true, count: data.colis_ids.length };
  });