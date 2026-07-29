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

function moisKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function moisLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
}

export const getDashboardCommercial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const roles = await getRoles(context.supabase, context.userId);
    if (!canCommercial(roles)) throw new Error("Forbidden");
    const scopeAll = seeAllCommercial(roles);

    const now = new Date();
    const debutMois = new Date(now.getFullYear(), now.getMonth(), 1);
    const il30j = new Date(Date.now() - 30 * 86400000);
    const il6mois = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    // ── Prospects ──
    let prospectsQ = supabaseAdmin.from("prospects").select("id, etape, converti_client_id, updated_at");
    if (!scopeAll) prospectsQ = prospectsQ.eq("commercial_id", context.userId);
    const { data: prospects } = await prospectsQ;
    const nb_prospects = (prospects ?? []).filter((p: any) => p.etape !== "client_actif" && p.etape !== "perdu").length;
    const contrats_signes_total = (prospects ?? []).filter((p: any) => !!p.converti_client_id).length;
    const contrats_signes_mois = (prospects ?? []).filter((p: any) => p.converti_client_id && new Date(p.updated_at) >= debutMois).length;

    // ── Clients (profils avec role=client), scopés par commercial_id si besoin ──
    const { data: clientRoles } = await supabaseAdmin.from("user_roles").select("user_id").eq("role", "client");
    const clientIds = (clientRoles ?? []).map((r: any) => r.user_id);
    let clientsQ = supabaseAdmin.from("profiles").select("id, nom, nom_boutique, commercial_id, created_at").in("id", clientIds.length ? clientIds : ["__none__"]);
    const { data: allClientProfiles } = await clientsQ;
    const clientsScoped = scopeAll ? (allClientProfiles ?? []) : (allClientProfiles ?? []).filter((c: any) => c.commercial_id === context.userId);
    const scopedIds = new Set(clientsScoped.map((c: any) => c.id));
    const nouveaux_clients_30j = clientsScoped.filter((c: any) => new Date(c.created_at) >= il30j).length;

    // ── Colis des clients scopés, sur les 6 derniers mois (suffit pour KPIs + évolution) ──
    const { data: colisRows } = await supabaseAdmin
      .from("colis")
      .select("client_id, prix_colis, date_creation, statut")
      .in("client_id", clientsScoped.length ? Array.from(scopedIds) : ["__none__"])
      .gte("date_creation", il6mois.toISOString());

    const clientsActifsSet = new Set<string>();
    let ca_mois = 0, nb_colis_mois = 0;
    const parMois: Record<string, { ca: number; colis: number }> = {};
    for (const c of colisRows ?? []) {
      const d = new Date(c.date_creation);
      const key = moisKey(d);
      if (!parMois[key]) parMois[key] = { ca: 0, colis: 0 };
      parMois[key].ca += Number(c.prix_colis ?? 0);
      parMois[key].colis += 1;
      if (d >= il30j) clientsActifsSet.add(c.client_id as string);
      if (d >= debutMois) { ca_mois += Number(c.prix_colis ?? 0); nb_colis_mois += 1; }
    }
    const clients_actifs = clientsActifsSet.size;
    // "inactif" : a déjà commandé au moins une fois (visible dans les 6 derniers mois ou avant)
    // mais rien dans les 30 derniers jours. On ne compte pas les tout nouveaux sans historique.
    const clientsAvecColisSet = new Set((colisRows ?? []).map((c: any) => c.client_id));
    const clients_inactifs = Array.from(clientsAvecColisSet).filter((id) => !clientsActifsSet.has(id as string)).length;

    const evolution: { mois: string; ca: number; colis: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = moisKey(d);
      evolution.push({ mois: moisLabel(key), ca: parMois[key]?.ca ?? 0, colis: parMois[key]?.colis ?? 0 });
    }

    // ── Objectif du commercial connecté ──
    const { data: monProfil } = await supabaseAdmin.from("profiles").select("objectif_ca_mensuel").eq("id", context.userId).maybeSingle();

    // ── Classement (uniquement les commerciaux "terrain", pas les rôles de direction) ──
    let classement: { commercial_id: string; nom: string; ca_mois: number; nb_clients: number }[] = [];
    if (scopeAll) {
      const { data: repRoles } = await supabaseAdmin.from("user_roles").select("user_id").eq("role", "commercial");
      const repIds = (repRoles ?? []).map((r: any) => r.user_id);
      if (repIds.length) {
        const { data: repProfiles } = await supabaseAdmin.from("profiles").select("id, nom").in("id", repIds);
        classement = (repProfiles ?? []).map((rp: any) => {
          const leursClients = (allClientProfiles ?? []).filter((c: any) => c.commercial_id === rp.id);
          const leursClientIds = new Set(leursClients.map((c: any) => c.id));
          const ca = (colisRows ?? [])
            .filter((c: any) => leursClientIds.has(c.client_id) && new Date(c.date_creation) >= debutMois)
            .reduce((s: number, c: any) => s + Number(c.prix_colis ?? 0), 0);
          return { commercial_id: rp.id, nom: rp.nom ?? "—", ca_mois: ca, nb_clients: leursClients.length };
        }).sort((a, b) => b.ca_mois - a.ca_mois);
      }
    }

    return {
      scope: scopeAll ? "all" : "self",
      nb_prospects,
      contrats_signes_total,
      contrats_signes_mois,
      nouveaux_clients_30j,
      clients_actifs,
      clients_inactifs,
      clients_total: clientsScoped.length,
      ca_mois,
      nb_colis_mois,
      evolution,
      objectif_ca_mensuel: monProfil?.objectif_ca_mensuel ?? null,
      classement,
    };
  });

// ═══════════════════════════════════════════════════════════
// NOTIFICATIONS INTELLIGENTES + RECOMMANDATIONS — à base de règles sur les données
// existantes (colis, prospects, tâches, interactions). Pas d'IA, pas d'appel externe.
// ═══════════════════════════════════════════════════════════

export const getInsightsCommercial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const roles = await getRoles(context.supabase, context.userId);
    if (!canCommercial(roles)) throw new Error("Forbidden");
    const scopeAll = seeAllCommercial(roles);

    const now = new Date();
    const debutJour = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const finJour = new Date(debutJour.getTime() + 86400000);
    const il30j = new Date(Date.now() - 30 * 86400000);
    const il60j = new Date(Date.now() - 60 * 86400000);

    // ── Relances de prospects oubliées ──
    let relQ = supabaseAdmin.from("prospects_a_relancer").select("id, nom_boutique, derniere_relance, commercial_id");
    if (!scopeAll) relQ = relQ.eq("commercial_id", context.userId);
    const { data: relances } = await relQ;

    // ── Clients scopés + leur historique colis (90j pour comparer tendance 30j vs 30j précédents) ──
    const { data: clientRoles } = await supabaseAdmin.from("user_roles").select("user_id").eq("role", "client");
    const clientIds = (clientRoles ?? []).map((r: any) => r.user_id);
    const { data: allClientProfiles } = await supabaseAdmin
      .from("profiles").select("id, nom, nom_boutique, commercial_id").in("id", clientIds.length ? clientIds : ["__none__"]);
    const clientsScoped = scopeAll ? (allClientProfiles ?? []) : (allClientProfiles ?? []).filter((c: any) => c.commercial_id === context.userId);
    const scopedIds = new Set(clientsScoped.map((c: any) => c.id));
    const nomClient = (id: string) => {
      const c = clientsScoped.find((x: any) => x.id === id);
      return c?.nom_boutique || c?.nom || "Client";
    };

    const il90j = new Date(Date.now() - 90 * 86400000);
    const { data: colisRows } = await supabaseAdmin
      .from("colis").select("client_id, prix_colis, date_creation")
      .in("client_id", clientsScoped.length ? Array.from(scopedIds) : ["__none__"])
      .gte("date_creation", il90j.toISOString());

    const parClient: Record<string, { recent: number; precedent: number; caRecent: number; total: number }> = {};
    for (const id of scopedIds) parClient[id] = { recent: 0, precedent: 0, caRecent: 0, total: 0 };
    for (const c of colisRows ?? []) {
      const d = new Date(c.date_creation);
      const bucket = parClient[c.client_id as string];
      if (!bucket) continue;
      bucket.total++;
      if (d >= il30j) { bucket.recent++; bucket.caRecent += Number(c.prix_colis ?? 0); }
      else if (d >= il60j) bucket.precedent++;
    }

    const clients_inactifs: { id: string; nom: string }[] = [];
    const clients_en_baisse: { id: string; nom: string; detail: string }[] = [];
    const clients_croissance: { id: string; nom: string; detail: string }[] = [];
    for (const [id, b] of Object.entries(parClient)) {
      if (b.total > 0 && b.recent === 0) clients_inactifs.push({ id, nom: nomClient(id) });
      if (b.precedent >= 3 && b.recent <= b.precedent / 2) {
        clients_en_baisse.push({ id, nom: nomClient(id), detail: `${b.precedent} → ${b.recent} colis (30j)` });
      }
      if (b.precedent >= 1 && b.recent >= b.precedent * 2 && b.recent >= 4) {
        clients_croissance.push({ id, nom: nomClient(id), detail: `${b.precedent} → ${b.recent} colis (30j)` });
      }
    }
    // Client premium potentiel : gros CA sur 30j, pas déjà signalé ailleurs
    const clients_premium = Object.entries(parClient)
      .filter(([, b]) => b.caRecent >= 50000)
      .sort((a, b) => b[1].caRecent - a[1].caRecent)
      .slice(0, 5)
      .map(([id, b]) => ({ id, nom: nomClient(id), detail: `${b.caRecent.toLocaleString("fr-FR")} DA (30j)` }));

    // ── Aujourd'hui : tâches + RDV du jour ──
    let tachesQ = supabaseAdmin.from("taches").select("id, titre, echeance, client_id, priorite").eq("statut", "a_faire")
      .gte("echeance", debutJour.toISOString()).lt("echeance", finJour.toISOString());
    if (!scopeAll) tachesQ = tachesQ.eq("owner_id", context.userId);
    const { data: tachesJour } = await tachesQ;

    let rdvQ = supabaseAdmin.from("interactions_client").select("id, titre, date_prevue, client_id").eq("type", "rdv")
      .gte("date_prevue", debutJour.toISOString()).lt("date_prevue", finJour.toISOString());
    if (!scopeAll) rdvQ = rdvQ.eq("created_by", context.userId);
    const { data: rdvJour } = await rdvQ;

    const aujourdhui = [
      ...(tachesJour ?? []).map((t: any) => ({ id: t.id, titre: t.titre, heure: t.echeance, type: "tache" as const, client_id: t.client_id, priorite: t.priorite })),
      ...(rdvJour ?? []).map((r: any) => ({ id: r.id, titre: r.titre, heure: r.date_prevue, type: "rdv" as const, client_id: r.client_id, priorite: null })),
    ].sort((a, b) => new Date(a.heure).getTime() - new Date(b.heure).getTime());

    // ── Objectif bientôt atteint ──
    const { data: monProfil } = await supabaseAdmin.from("profiles").select("objectif_ca_mensuel").eq("id", context.userId).maybeSingle();
    const debutMois = new Date(now.getFullYear(), now.getMonth(), 1);
    let objectif_proche: { pct: number } | null = null;
    if (monProfil?.objectif_ca_mensuel) {
      const { data: colisMois } = await supabaseAdmin.from("colis").select("prix_colis, client_id")
        .in("client_id", clientsScoped.length ? Array.from(scopedIds) : ["__none__"])
        .gte("date_creation", debutMois.toISOString());
      const caMois = (colisMois ?? []).reduce((s: number, c: any) => s + Number(c.prix_colis ?? 0), 0);
      const pct = Math.round((caMois / monProfil.objectif_ca_mensuel) * 100);
      if (pct >= 80 && pct < 100) objectif_proche = { pct };
    }

    return {
      relances_oubliees: (relances ?? []).map((r: any) => ({ id: r.id, nom: r.nom_boutique, jours: Math.floor((Date.now() - new Date(r.derniere_relance).getTime()) / 86400000) })),
      clients_inactifs: clients_inactifs.slice(0, 8),
      clients_en_baisse,
      clients_croissance,
      clients_premium,
      aujourdhui,
      objectif_proche,
    };
  });

// ═══════════════════════════════════════════════════════════
// CALENDRIER — agenda unifié tâches + RDV, groupé par jour côté client
// ═══════════════════════════════════════════════════════════

export const listAgenda = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const roles = await getRoles(context.supabase, context.userId);
    if (!canCommercial(roles)) throw new Error("Forbidden");
    const scopeAll = seeAllCommercial(roles);

    let tachesQ = supabaseAdmin.from("taches").select("id, titre, echeance, client_id, priorite, statut").not("echeance", "is", null);
    if (!scopeAll) tachesQ = tachesQ.eq("owner_id", context.userId);
    const { data: taches } = await tachesQ;

    let rdvQ = supabaseAdmin.from("interactions_client").select("id, titre, description, date_prevue, client_id").eq("type", "rdv").not("date_prevue", "is", null);
    if (!scopeAll) rdvQ = rdvQ.eq("created_by", context.userId);
    const { data: rdv } = await rdvQ;

    const clientIds = Array.from(new Set([...(taches ?? []).map((t: any) => t.client_id), ...(rdv ?? []).map((r: any) => r.client_id)].filter(Boolean)));
    const { data: profs } = clientIds.length
      ? await supabaseAdmin.from("profiles").select("id, nom, nom_boutique").in("id", clientIds)
      : { data: [] as any[] };
    const nomClient = (id: string | null) => {
      if (!id) return null;
      const p = (profs ?? []).find((x: any) => x.id === id);
      return p?.nom_boutique || p?.nom || "Client";
    };

    const items = [
      ...(taches ?? []).map((t: any) => ({ id: t.id, titre: t.titre, date: t.echeance, type: "tache" as const, client_id: t.client_id, client_nom: nomClient(t.client_id), priorite: t.priorite, fait: t.statut === "fait" })),
      ...(rdv ?? []).map((r: any) => ({ id: r.id, titre: r.titre, description: r.description, date: r.date_prevue, type: "rdv" as const, client_id: r.client_id, client_nom: nomClient(r.client_id), priorite: null, fait: false })),
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return { items };
  });

// ═══════════════════════════════════════════════════════════
// CARTE DES CLIENTS — positions GPS déjà collectées à la création du compte
// (profiles.ramassage_lat/lng), enrichies avec volume/CA pour les filtres.
// ═══════════════════════════════════════════════════════════

export const listClientsCarte = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const roles = await getRoles(context.supabase, context.userId);
    if (!canCommercial(roles) && !roles.some((r) => r === "admin_operations" || r === "admin_service_client")) throw new Error("Forbidden");
    const scopeAll = seeAllCommercial(roles) || roles.some((r) => r === "admin_operations" || r === "admin_service_client");

    const { data: clientRoles } = await supabaseAdmin.from("user_roles").select("user_id").eq("role", "client");
    const clientIds = (clientRoles ?? []).map((r: any) => r.user_id);
    const { data: allProfiles } = await supabaseAdmin
      .from("profiles")
      .select("id, nom, nom_boutique, wilaya, ramassage_commune, ramassage_lat, ramassage_lng, commercial_id")
      .in("id", clientIds.length ? clientIds : ["__none__"]);
    const scopedAll = scopeAll ? (allProfiles ?? []) : (allProfiles ?? []).filter((p: any) => p.commercial_id === context.userId);
    const scoped = scopedAll.filter((p: any) => p.ramassage_lat != null && p.ramassage_lng != null);
    const scopedIds = scoped.map((p: any) => p.id);

    const { data: colisRows } = await supabaseAdmin.from("colis").select("client_id, prix_colis").in("client_id", scopedIds.length ? scopedIds : ["__none__"]);
    const agg: Record<string, { nb: number; ca: number }> = {};
    for (const c of colisRows ?? []) {
      const a = agg[c.client_id as string] ?? (agg[c.client_id as string] = { nb: 0, ca: 0 });
      a.nb++; a.ca += Number(c.prix_colis ?? 0);
    }

    let commerciauxNoms: Record<string, string> = {};
    if (scopeAll) {
      const commercialIds = Array.from(new Set(scoped.map((p: any) => p.commercial_id).filter(Boolean)));
      if (commercialIds.length) {
        const { data: comProfs } = await supabaseAdmin.from("profiles").select("id, nom").in("id", commercialIds);
        commerciauxNoms = Object.fromEntries((comProfs ?? []).map((p: any) => [p.id, p.nom ?? "—"]));
      }
    }

    return {
      clients: scoped.map((p: any) => ({
        id: p.id, nom: p.nom_boutique || p.nom || "Client",
        wilaya: p.wilaya, commune: p.ramassage_commune,
        lat: p.ramassage_lat, lng: p.ramassage_lng,
        commercial_nom: p.commercial_id ? (commerciauxNoms[p.commercial_id] ?? null) : null,
        nb_colis: agg[p.id]?.nb ?? 0, ca: agg[p.id]?.ca ?? 0,
      })),
      sansPosition: scopedAll.length - scoped.length,
    };
  });

const SetObjectifInput = z.object({ objectif_ca_mensuel: z.number().min(0).nullable() });

export const setMonObjectif = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => SetObjectifInput.parse(data))
  .handler(async ({ data, context }) => {
    const roles = await getRoles(context.supabase, context.userId);
    if (!canCommercial(roles)) throw new Error("Forbidden");
    const { error } = await supabaseAdmin.from("profiles").update({ objectif_ca_mensuel: data.objectif_ca_mensuel }).eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
