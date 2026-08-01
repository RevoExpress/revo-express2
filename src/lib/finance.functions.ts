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
      .select("id, tracking, type_colis, destinataire_nom, prix_colis, prix, frais_payes_par_expediteur, date_creation")
      .eq("client_id", context.userId)
      .eq("statut", "livre")
      .eq("cod_encaisse", true)
      .is("reversement_id", null)
      .eq("archive", false)
      // Pas de filtre sur type_colis : l'argent encaissé sur un colis SPLIT ou ÉCHANGE
      // appartient au commerçant au même titre qu'un colis classique. Le restreindre à "REV"
      // rendait ces montants invisibles et jamais reversés.
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

export const getSoldeClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ client_id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const roles = await getRoles(context.supabase, context.userId);
    if (!isFinanceStaff(roles)) throw new Error("Forbidden");
    const { data: solde } = await supabaseAdmin
      .from("solde_a_reverser")
      .select("*")
      .eq("client_id", data.client_id)
      .maybeSingle();
    return { nb_colis: solde?.nb_colis ?? 0, montant_du: solde?.montant_du ?? 0 };
  });

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

    // Id généré côté serveur avant l'insert : sert de "jeton de claim" pour l'UPDATE ci-dessous.
    // On réclame les colis D'ABORD (avec .is("reversement_id", null) dans le WHERE), puis on calcule
    // le montant sur ce qui a RÉELLEMENT été réclamé — pas sur la sélection initiale. Sans ça, deux
    // reversements créés au même instant sur les mêmes colis pouvaient tous les deux "gagner" (la
    // deuxième UPDATE écrasait le reversement_id posé par la première, sans erreur), doublant le colis
    // dans 2 reçus différents. Avec le filtre .is(), la deuxième UPDATE ne matche simplement plus ces
    // lignes déjà prises, donc les deux reversements restent cohérents avec la réalité de la base.
    const revId = crypto.randomUUID();
    const { data: claimed, error: claimErr } = await supabaseAdmin
      .from("colis")
      .update({ reversement_id: revId })
      .in("id", data.colis_ids)
      .eq("client_id", data.client_id)
      .is("reversement_id", null)
      .select("id, prix_colis, prix, frais_payes_par_expediteur");
    if (claimErr) throw new Error(claimErr.message);
    if (!claimed?.length) throw new Error("Ces colis ont déjà été reversés entre-temps — actualisez la page.");

    const montant_total = claimed.reduce((sum: number, c: any) => {
      const m = c.frais_payes_par_expediteur ? Number(c.prix_colis) - Number(c.prix) : Number(c.prix_colis);
      return sum + m;
    }, 0);

    const { data: rev, error: revErr } = await supabaseAdmin
      .from("reversements")
      .insert({
        id: revId,
        client_id: data.client_id,
        montant_total,
        nb_colis: claimed.length,
        reference: genReference(),
        cree_par: context.userId,
      })
      .select()
      .single();
    if (revErr) {
      // Rollback : sans ça les colis resteraient marqués "reversés" par un reversement inexistant.
      await supabaseAdmin.from("colis").update({ reversement_id: null }).eq("reversement_id", revId);
      throw new Error(revErr.message);
    }

    return { ok: true, reversement: rev, partiel: claimed.length < data.colis_ids.length };
  });

async function enrichirReversements(rows: any[]) {
  if (!rows.length) return [];
  const userIds = Array.from(new Set(rows.flatMap((r) => [r.cree_par, r.annule_par]).filter(Boolean)));
  const { data: profs } = userIds.length
    ? await supabaseAdmin.from("profiles").select("id, nom").in("id", userIds)
    : { data: [] as any[] };
  const byId = new Map((profs ?? []).map((p: any) => [p.id, p.nom]));
  return rows.map((r) => ({ ...r, cree_par_nom: byId.get(r.cree_par) ?? null, annule_par_nom: byId.get(r.annule_par) ?? null }));
}

export const listReversementsTous = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const roles = await getRoles(context.supabase, context.userId);
    if (!isFinanceStaff(roles)) throw new Error("Forbidden");
    const { data } = await supabaseAdmin.from("reversements").select("*").order("created_at", { ascending: false }).limit(200);
    return { reversements: await enrichirReversements(data ?? []) };
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
    const [revEnrichi] = await enrichirReversements([rev]);

    return { reversement: revEnrichi, profil, colis: colisInclus ?? [] };
  });

const AnnulerReversementInput = z.object({ id: z.string().uuid() });

export const annulerReversement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => AnnulerReversementInput.parse(data))
  .handler(async ({ data, context }) => {
    const roles = await getRoles(context.supabase, context.userId);
    if (!isFinanceStaff(roles)) throw new Error("Forbidden");

    const { data: rev } = await supabaseAdmin.from("reversements").select("*").eq("id", data.id).single();
    if (!rev) throw new Error("Reversement introuvable");
    if (rev.annule_at) throw new Error("Ce reversement est déjà annulé");

    // Relâcher d'abord les colis (ils redeviennent "à reverser"), marquer annulé ensuite — dans cet
    // ordre, si l'étape 2 échoue on peut réessayer sans risquer de colis orphelins d'un reversement
    // qui prétendrait encore les couvrir.
    const { error: relErr } = await supabaseAdmin.from("colis").update({ reversement_id: null }).eq("reversement_id", data.id);
    if (relErr) throw new Error(relErr.message);

    const { error: updErr } = await supabaseAdmin
      .from("reversements")
      .update({ annule_par: context.userId, annule_at: new Date().toISOString() })
      .eq("id", data.id);
    if (updErr) throw new Error(updErr.message);

    return { ok: true };
  });
  // ── Marquer l'encaissement (DG / Admin Opérations, sans passer par le livreur) ──

export const listColisLivresNonEncaisses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const roles = await getRoles(context.supabase, context.userId);
    if (!isFinanceStaff(roles)) throw new Error("Forbidden");

    const { data } = await supabaseAdmin
      .from("colis")
      .select("id, tracking, type_colis, client_id, destinataire_nom, prix_colis, prix, date_creation")
      .eq("statut", "livre")
      .or("cod_encaisse.is.null,cod_encaisse.eq.false")
      .eq("archive", false)
      // Même raison que dans getMesColisEnAttente : un colis SPLIT/ÉCHANGE livré doit pouvoir
      // être marqué encaissé, sinon son montant n'entre jamais dans le circuit de reversement.
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

// ── Solde livreur : argent COD collecté par le livreur, pas encore remis au bureau ──

export const getMonSoldeLivreur = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await supabaseAdmin
      .from("solde_livreur")
      .select("*")
      .eq("livreur_id", context.userId)
      .maybeSingle();
    return { nb_colis: data?.nb_colis ?? 0, montant_du: data?.montant_du ?? 0 };
  });

export const listSoldesLivreurs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const roles = await getRoles(context.supabase, context.userId);
    if (!isFinanceStaff(roles)) throw new Error("Forbidden");

    const { data: soldes } = await supabaseAdmin.from("solde_livreur").select("*");
    if (!soldes?.length) return { soldes: [] };

    const ids = soldes.map((s: any) => s.livreur_id);
    const { data: profs } = await supabaseAdmin.from("profiles").select("id, nom, telephone").in("id", ids);
    const byId = new Map((profs ?? []).map((p: any) => [p.id, p]));

    const enrichis = soldes
      .map((s: any) => ({ ...s, profil: byId.get(s.livreur_id) }))
      .sort((a: any, b: any) => Number(b.montant_du) - Number(a.montant_du));
    return { soldes: enrichis };
  });

export const getColisNonRemisLivreur = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ livreur_id: z.string().uuid().optional() }).parse(data ?? {}))
  .handler(async ({ data, context }) => {
    const roles = await getRoles(context.supabase, context.userId);
    const isOwner = !data.livreur_id || data.livreur_id === context.userId;
    if (!isOwner && !isFinanceStaff(roles)) throw new Error("Forbidden");
    const livreurId = data.livreur_id ?? context.userId;

    const { data: colis } = await supabaseAdmin
      .from("colis")
      .select("id, tracking, destinataire_nom, prix_colis, prix, date_creation")
      .eq("livreur_id", livreurId)
      .eq("statut", "livre")
      .is("remis_livreur_id", null)
      .order("date_creation", { ascending: false });
    return { colis: colis ?? [] };
  });

const CreerRemiseLivreurInput = z.object({
  livreur_id: z.string().uuid(),
  colis_ids: z.array(z.string().uuid()).min(1),
});

export const creerRemiseLivreur = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => CreerRemiseLivreurInput.parse(data))
  .handler(async ({ data, context }) => {
    const roles = await getRoles(context.supabase, context.userId);
    if (!isFinanceStaff(roles)) throw new Error("Forbidden");

    const { data: colisRows } = await supabaseAdmin
      .from("colis")
      .select("id, prix_colis, prix")
      .in("id", data.colis_ids)
      .eq("livreur_id", data.livreur_id)
      .eq("statut", "livre")
      .is("remis_livreur_id", null);

    if (!colisRows?.length) throw new Error("Aucun colis valide sélectionné");

    const montant_total = colisRows.reduce((sum: number, c: any) => sum + Number(c.prix_colis ?? 0) + Number(c.prix ?? 0), 0);

    const { data: remise, error: remiseErr } = await supabaseAdmin
      .from("remises_livreur")
      .insert({
        livreur_id: data.livreur_id,
        montant_total,
        nb_colis: colisRows.length,
        reference: genReference().replace("VERS-", "REMI-"),
        cree_par: context.userId,
      })
      .select()
      .single();
    if (remiseErr) throw new Error(remiseErr.message);

    const { error: updErr } = await supabaseAdmin
      .from("colis")
      .update({ remis_livreur_id: remise.id })
      .in("id", colisRows.map((c: any) => c.id));
    if (updErr) throw new Error(updErr.message);

    return { ok: true, remise };
  });

export const listRemisesLivreurTous = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const roles = await getRoles(context.supabase, context.userId);
    if (!isFinanceStaff(roles)) throw new Error("Forbidden");
    const { data } = await supabaseAdmin.from("remises_livreur").select("*").order("created_at", { ascending: false }).limit(200);
    return { remises: data ?? [] };
  });