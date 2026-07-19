import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { COMMUNES, haversineKm, priceForDelivery } from "@/lib/tarifs";

type AppRole =
  | "admin" | "directeur_commercial" | "admin_commercial" | "admin_operations"
  | "admin_service_client" | "commercial" | "service_client" | "livreur" | "client";

async function getRoles(supabase: any, userId: string): Promise<AppRole[]> {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  return (data ?? []).map((r: any) => r.role as AppRole);
}
const canCommercial = (roles: AppRole[]) =>
  roles.some((r) => r === "admin" || r === "directeur_commercial" || r === "admin_commercial" || r === "commercial");
const seeAllProspects = (roles: AppRole[]) =>
  roles.some((r) => r === "admin" || r === "directeur_commercial" || r === "admin_commercial");
const canOps = (roles: AppRole[]) =>
  roles.some((r) => r === "admin" || r === "admin_operations");

const ETAPES = ["a_contacter", "en_discussion", "en_test", "gagne", "perdu"] as const;

// ═══════════════════════════════════════════════════════════
// PROSPECTION — CRUD
// ═══════════════════════════════════════════════════════════
const CreateProspectInput = z.object({
  nom_boutique: z.string().trim().min(1).max(100),
  contact_nom: z.string().trim().max(100).optional(),
  telephone: z.string().trim().max(20).optional(),
  email: z.string().email().optional().or(z.literal("")),
  wilaya: z.string().trim().max(100).optional(),
  commune: z.string().trim().max(100).optional(),
  note: z.string().trim().max(1000).optional(),
});

export const creerProspect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => CreateProspectInput.parse(data))
  .handler(async ({ data, context }) => {
    const roles = await getRoles(context.supabase, context.userId);
    if (!canCommercial(roles)) throw new Error("Forbidden");

    const { data: row, error } = await supabaseAdmin.from("prospects").insert({
      commercial_id: context.userId,
      nom_boutique: data.nom_boutique,
      contact_nom: data.contact_nom ?? null,
      telephone: data.telephone ?? null,
      email: data.email || null,
      wilaya: data.wilaya ?? null,
      commune: data.commune ?? null,
      note: data.note ?? null,
      etape: "a_contacter",
      derniere_relance: new Date().toISOString(),
    }).select().single();
    if (error) throw new Error(error.message);
    return { ok: true, prospect: row };
  });

export const listProspects = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const roles = await getRoles(context.supabase, context.userId);
    if (!canCommercial(roles)) throw new Error("Forbidden");

    let q = supabaseAdmin.from("prospects").select("*").order("updated_at", { ascending: false });
    if (!seeAllProspects(roles)) q = q.eq("commercial_id", context.userId);
    const { data: rows } = await q;
    return { prospects: rows ?? [] };
  });

const UpdateEtapeInput = z.object({
  id: z.string().uuid(),
  etape: z.enum(ETAPES),
});

export const changerEtapeProspect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => UpdateEtapeInput.parse(data))
  .handler(async ({ data, context }) => {
    const roles = await getRoles(context.supabase, context.userId);
    if (!canCommercial(roles)) throw new Error("Forbidden");
    const { error } = await supabaseAdmin.from("prospects")
      .update({ etape: data.etape, derniere_relance: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const marquerRelance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid(), note: z.string().max(1000).optional() }).parse(data))
  .handler(async ({ data, context }) => {
    const roles = await getRoles(context.supabase, context.userId);
    if (!canCommercial(roles)) throw new Error("Forbidden");
    const patch: any = { derniere_relance: new Date().toISOString(), updated_at: new Date().toISOString() };
    if (data.note !== undefined) patch.note = data.note;
    const { error } = await supabaseAdmin.from("prospects").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const ConvertProspectInput = z.object({
  prospect_id: z.string().uuid(),
  email: z.string().email(),
  password: z.string().min(6).max(128),
  nom: z.string().trim().min(2).max(100),
  telephone: z.string().trim().min(8).max(20),
  adresse: z.string().trim().min(3).max(255),
  wilaya: z.string().trim().min(2).max(100),
});

export const convertirProspectEnClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => ConvertProspectInput.parse(data))
  .handler(async ({ data, context }) => {
    const roles = await getRoles(context.supabase, context.userId);
    if (!canCommercial(roles)) throw new Error("Forbidden");

    const { data: prospect } = await supabaseAdmin
      .from("prospects").select("*").eq("id", data.prospect_id).single();
    if (!prospect) throw new Error("Prospect introuvable");

    const { data: created, error: cErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email, password: data.password, email_confirm: true,
      user_metadata: { nom: data.nom, nom_boutique: prospect.nom_boutique },
    });
    if (cErr || !created.user) throw new Error(cErr?.message ?? "Création échouée");
    const uid = created.user.id;

    await supabaseAdmin.from("profiles").upsert({
      id: uid, email: data.email, nom: data.nom, nom_boutique: prospect.nom_boutique,
      telephone: data.telephone, adresse: data.adresse, wilaya: data.wilaya,
      commercial_id: prospect.commercial_id,
    });
    await supabaseAdmin.from("user_roles").delete().eq("user_id", uid);
    await supabaseAdmin.from("user_roles").insert({ user_id: uid, role: "client" });

    await supabaseAdmin.from("prospects")
      .update({ etape: "gagne", converti_client_id: uid, updated_at: new Date().toISOString() })
      .eq("id", data.prospect_id);

    return { ok: true, client_id: uid };
  });

export const listProspectsARelancer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const roles = await getRoles(context.supabase, context.userId);
    if (!canCommercial(roles)) throw new Error("Forbidden");
    let q = supabaseAdmin.from("prospects_a_relancer").select("*");
    if (!seeAllProspects(roles)) q = q.eq("commercial_id", context.userId);
    const { data: rows } = await q;
    return { prospects: rows ?? [] };
  });

// ═══════════════════════════════════════════════════════════
// AFFECTATION LIVREURS EN MASSE (Ops)
// ═══════════════════════════════════════════════════════════
const AffecterMasseInput = z.object({
  colis_ids: z.array(z.string().uuid()).min(1),
  livreur_id: z.string().uuid(),
});

export const affecterLivreurMasse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => AffecterMasseInput.parse(data))
  .handler(async ({ data, context }) => {
    const roles = await getRoles(context.supabase, context.userId);
    if (!canOps(roles)) throw new Error("Forbidden");

    const { error } = await supabaseAdmin.from("colis")
      .update({ livreur_id: data.livreur_id }).in("id", data.colis_ids);
    if (error) throw new Error(error.message);

    await supabaseAdmin.rpc("log_audit", {
      _domaine: "operations", _action: "affectation_masse",
      _cible: `${data.colis_ids.length} colis`, _nouvelle: data.livreur_id,
    });
    return { ok: true, count: data.colis_ids.length };
  });

// ═══════════════════════════════════════════════════════════
// IMPORT EXCEL — validation puis création
// Accepte le modèle Revo ET les exports CRM des commerçants
// (le parsing/mapping des colonnes se fait côté client, voir import-excel.ts).
// La commune de départ vient TOUJOURS du profil, jamais du fichier.
// ═══════════════════════════════════════════════════════════

// Normalise une commune (accents/espaces/casse) pour la comparer sans
// se soucier de la mise en forme exacte.
function normalizeCommune(s: string): string {
  return String(s ?? "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

// Alias supplémentaires pour les fautes/variantes d'écriture courantes
// (en plus de la normalisation accents/espaces qui couvre déjà beaucoup de cas)
const COMMUNE_ALIASES: Record<string, string> = {
  "alger": "Alger Centre",
  "algercentre": "Alger Centre",
  "babezouar": "Bab Ezzouar",
  "babzouar": "Bab Ezzouar",
  "bordjkiffan": "Bordj El Kiffan",
  "darbeida": "Dar El Beïda",
  "birmradrais": "Bir Mourad Raïs",
  "guedeconstantine": "Gué de Constantine",
};

// Retrouve la commune officielle (parmi les 57 d'Alger) correspondant
// à une valeur brute du fichier importé, ou null si hors zone de couverture.
function matchCommuneAlger(raw: string): string | null {
  const norm = normalizeCommune(raw);
  if (!norm) return null;
  const direct = COMMUNES.find((c) => normalizeCommune(c.name) === norm);
  if (direct) return direct.name;
  const alias = COMMUNE_ALIASES[norm];
  if (alias && COMMUNES.some((c) => c.name === alias)) return alias;
  return null;
}

const ImportRow = z.object({
  destinataire_nom: z.string().trim().min(1, "Nom du destinataire manquant"),
  destinataire_tel: z.string().trim().min(6, "Téléphone invalide"),
  destinataire_adresse: z.string().trim().min(1, "Adresse manquante"),
  destinataire_wilaya: z.string().trim().min(1, "Ville/commune manquante"),
  prix_colis: z.number().min(0, "Prix invalide"),
  description: z.string().trim().optional(),
});
const ImportInput = z.object({ rows: z.array(z.any()).min(1) });

function genTracking() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return "REV-" + s;
}

type LigneOk = { ok: true; data: z.infer<typeof ImportRow> & { commune: string } };
type LigneKo = { ok: false; message: string };

// Valide une ligne : format des champs, puis correspondance de la
// destination avec une commune d'Alger. Utilisé par validerImport ET
// executerImport pour garantir exactement la même logique.
function validerLigne(r: any): LigneOk | LigneKo {
  const parsed = ImportRow.safeParse({
    ...r,
    prix_colis: typeof r.prix_colis === "string" ? Number(r.prix_colis) : r.prix_colis,
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Ligne invalide" };
  }
  const commune = matchCommuneAlger(parsed.data.destinataire_wilaya);
  if (!commune) {
    return { ok: false, message: `Destination hors zone de couverture (${parsed.data.destinataire_wilaya})` };
  }
  return { ok: true, data: { ...parsed.data, commune } };
}

// Valide les lignes SANS créer (prévisualisation des erreurs)
export const validerImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => ImportInput.parse(data))
  .handler(async ({ data, context }) => {
    const { data: prof } = await supabaseAdmin
      .from("profiles").select("adresse, ramassage_commune, wilaya").eq("id", context.userId).single();
    const depart = matchCommuneAlger(prof?.ramassage_commune || prof?.wilaya || "");
    if (!prof?.adresse || !depart) {
      return {
        total: data.rows.length, valides: 0,
        erreurs: [{ ligne: 0, message: "Votre profil est incomplet (adresse ou commune de départ manquante) — complétez-le avant d'importer." }],
      };
    }

    const erreurs: { ligne: number; message: string }[] = [];
    let valides = 0;
    data.rows.forEach((r: any, i: number) => {
      const res = validerLigne(r);
      if (res.ok) valides++;
      else erreurs.push({ ligne: i + 2, message: res.message });
    });
    return { total: data.rows.length, valides, erreurs };
  });

// Crée les colis après validation
export const executerImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => ImportInput.parse(data))
  .handler(async ({ data, context }) => {
    const roles = await getRoles(context.supabase, context.userId);
    const isClient = roles.includes("client");
    const isStaff = roles.some((r) => r === "admin" || r === "commercial" || r === "service_client" || r === "admin_service_client");
    if (!isClient && !isStaff) throw new Error("Forbidden");

    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("nom_boutique, nom, telephone, adresse, ramassage_commune, wilaya")
      .eq("id", context.userId).single();

    const depart = matchCommuneAlger(prof?.ramassage_commune || prof?.wilaya || "");
    if (!prof?.adresse || !depart) {
      return {
        ok: false, created: 0,
        erreurs: [{ ligne: 0, message: "Votre profil est incomplet (adresse ou commune de départ manquante) — complétez-le avant d'importer." }],
      };
    }
    const departCommune = COMMUNES.find((c) => c.name === depart)!;

    let created = 0;
    const erreurs: { ligne: number; message: string }[] = [];
    for (let i = 0; i < data.rows.length; i++) {
      const res = validerLigne(data.rows[i]);
      if (!res.ok) { erreurs.push({ ligne: i + 2, message: res.message }); continue; }
      const d = res.data;

      const arriveeCommune = COMMUNES.find((c) => c.name === d.commune)!;
      const km = Math.max(1, Math.round(haversineKm(departCommune, arriveeCommune) * 10) / 10);
      const prix = priceForDelivery(km, "standard");

      const { error } = await supabaseAdmin.from("colis").insert({
        tracking: genTracking(),
        client_id: context.userId,
        expediteur_nom: prof?.nom_boutique || prof?.nom || "Boutique",
        expediteur_tel: prof?.telephone || "",
        expediteur_adresse: prof?.adresse || "",
        expediteur_commune: depart,
        depart,
        destinataire_nom: d.destinataire_nom,
        destinataire_tel: d.destinataire_tel,
        destinataire_adresse: d.destinataire_adresse,
        destinataire_wilaya: d.commune,
        distance_km: km,
        prix,
        prix_colis: d.prix_colis,
        type_livraison: "standard",
        type_colis: "REV",
        description: d.description ?? null,
        statut: "en-preparation",
      });
      if (error) erreurs.push({ ligne: i + 2, message: error.message });
      else created++;
    }
    return { ok: true, created, erreurs };
  });