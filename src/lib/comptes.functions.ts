import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type AppRole =
  | "admin" | "directeur_commercial" | "admin_commercial" | "admin_operations"
  | "admin_service_client" | "commercial" | "service_client" | "livreur" | "client";

async function getRoles(supabase: any, userId: string): Promise<AppRole[]> {
  const { data, error } = await supabase
    .from("user_roles").select("role").eq("user_id", userId);
  if (error) throw new Error("Forbidden");
  return (data ?? []).map((r: any) => r.role as AppRole);
}

// ═══════════════════════════════════════════════════════════
// CRÉATION : Directeur Commercial (par le DG uniquement)
// ═══════════════════════════════════════════════════════════
const CreateDirCommercialInput = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(128),
  nom: z.string().trim().min(2).max(100),
  telephone: z.string().trim().min(8).max(20),
});

export const createDirCommercialAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => CreateDirCommercialInput.parse(data))
  .handler(async ({ data, context }) => {
    const roles = await getRoles(context.supabase, context.userId);
    if (!roles.includes("admin")) throw new Error("Forbidden: DG uniquement");

    const { data: created, error: cErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email, password: data.password, email_confirm: true,
      user_metadata: { nom: data.nom },
    });
    if (cErr || !created.user) throw new Error(cErr?.message ?? "Création échouée");
    const uid = created.user.id;

    await supabaseAdmin.from("profiles").upsert({
      id: uid, email: data.email, nom: data.nom, telephone: data.telephone,
    });
    await supabaseAdmin.from("user_roles").delete().eq("user_id", uid);
    const { error: rErr } = await supabaseAdmin
      .from("user_roles").insert({ user_id: uid, role: "directeur_commercial" });
    if (rErr) throw new Error(rErr.message);
    return { ok: true, user_id: uid };
  });

// ═══════════════════════════════════════════════════════════
// CRÉATION : Commercial (par DG, Directeur Commercial, ou admin_commercial)
// ═══════════════════════════════════════════════════════════
const CreateCommercialInput = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(128),
  nom: z.string().trim().min(2).max(100),
  telephone: z.string().trim().min(8).max(20),
});

export const createCommercialAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => CreateCommercialInput.parse(data))
  .handler(async ({ data, context }) => {
    const roles = await getRoles(context.supabase, context.userId);
    const allowed = roles.some((r) => r === "admin" || r === "directeur_commercial" || r === "admin_commercial");
    if (!allowed) throw new Error("Forbidden");

    const { data: created, error: cErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email, password: data.password, email_confirm: true,
      user_metadata: { nom: data.nom },
    });
    if (cErr || !created.user) throw new Error(cErr?.message ?? "Création échouée");
    const uid = created.user.id;

    await supabaseAdmin.from("profiles").upsert({
      id: uid, email: data.email, nom: data.nom, telephone: data.telephone,
    });
    await supabaseAdmin.from("user_roles").delete().eq("user_id", uid);
    const { error: rErr } = await supabaseAdmin
      .from("user_roles").insert({ user_id: uid, role: "commercial" });
    if (rErr) throw new Error(rErr.message);
    return { ok: true, user_id: uid };
  });

export const listCommerciaux = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const roles = await getRoles(context.supabase, context.userId);
    const allowed = roles.some((r) => r === "admin" || r === "directeur_commercial" || r === "admin_commercial");
    if (!allowed) throw new Error("Forbidden");

    const { data: rows } = await supabaseAdmin
      .from("user_roles").select("user_id").eq("role", "commercial");
    const ids = (rows ?? []).map((r) => r.user_id);
    if (!ids.length) return { commerciaux: [] };
    const { data: profiles } = await supabaseAdmin
      .from("profiles").select("id, nom, email, telephone, actif, created_at")
      .in("id", ids).order("created_at", { ascending: false });
    return { commerciaux: profiles ?? [] };
  });

// ═══════════════════════════════════════════════════════════
// CRÉATION CLIENT étendue : avec GPS ramassage + commercial référent
// ═══════════════════════════════════════════════════════════
const CreateClientFullInput = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(128),
  nom: z.string().trim().min(2).max(100),
  nom_boutique: z.string().trim().min(1).max(100),
  telephone: z.string().trim().min(8).max(20),
  adresse: z.string().trim().min(3).max(255),
  wilaya: z.string().trim().min(2).max(100),
  ramassage_commune: z.string().trim().max(100).optional(),
  ramassage_lat: z.number().optional(),
  ramassage_lng: z.number().optional(),
});

export const createClientFull = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => CreateClientFullInput.parse(data))
  .handler(async ({ data, context }) => {
    const roles = await getRoles(context.supabase, context.userId);
    const allowed = roles.some((r) =>
      r === "admin" || r === "directeur_commercial" || r === "admin_commercial" || r === "commercial");
    if (!allowed) throw new Error("Forbidden");

    const { data: created, error: cErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email, password: data.password, email_confirm: true,
      user_metadata: { nom: data.nom, nom_boutique: data.nom_boutique },
    });
    if (cErr || !created.user) throw new Error(cErr?.message ?? "Création échouée");
    const uid = created.user.id;

    // Le commercial créateur devient référent par défaut (si c'est un commercial)
    const isCommercial = roles.includes("commercial") &&
      !roles.some((r) => r === "admin" || r === "directeur_commercial" || r === "admin_commercial");
    const commercialId = isCommercial ? context.userId : null;

    await supabaseAdmin.from("profiles").upsert({
      id: uid, email: data.email, nom: data.nom, nom_boutique: data.nom_boutique,
      telephone: data.telephone, adresse: data.adresse, wilaya: data.wilaya,
      ramassage_commune: data.ramassage_commune ?? null,
      ramassage_lat: data.ramassage_lat ?? null,
      ramassage_lng: data.ramassage_lng ?? null,
      commercial_id: commercialId,
    });
    await supabaseAdmin.from("user_roles").delete().eq("user_id", uid);
    const { error: rErr } = await supabaseAdmin
      .from("user_roles").insert({ user_id: uid, role: "client" });
    if (rErr && !rErr.message.includes("duplicate")) throw new Error(rErr.message);
    return { ok: true, user_id: uid };
  });

// Liste des clients — un commercial ne voit QUE les siens ; DG/dir. commercial voient tout
export const listMyClients = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const roles = await getRoles(context.supabase, context.userId);
    const seeAll = roles.some((r) =>
      r === "admin" || r === "directeur_commercial" || r === "admin_commercial" ||
      r === "service_client" || r === "admin_service_client");
    const isCommercial = roles.includes("commercial");
    if (!seeAll && !isCommercial) throw new Error("Forbidden");

    const { data: clientRows } = await supabaseAdmin
      .from("user_roles").select("user_id").eq("role", "client");
    const ids = (clientRows ?? []).map((r) => r.user_id);
    if (!ids.length) return { clients: [] };

    let query = supabaseAdmin
      .from("profiles")
      .select("id, nom, nom_boutique, email, telephone, adresse, wilaya, ramassage_commune, ramassage_lat, ramassage_lng, commercial_id, actif, created_at")
      .in("id", ids);

    // Commercial simple → filtre sur ses clients
    if (isCommercial && !seeAll) query = query.eq("commercial_id", context.userId);

    const { data: profiles } = await query.order("created_at", { ascending: false });
    return { clients: profiles ?? [] };
  });

// ═══════════════════════════════════════════════════════════
// TRANSFERT d'un client d'un commercial à un autre (Directeur Commercial / DG)
// ═══════════════════════════════════════════════════════════
const TransferClientInput = z.object({
  client_id: z.string().uuid(),
  new_commercial_id: z.string().uuid().nullable(),
});

export const transferClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => TransferClientInput.parse(data))
  .handler(async ({ data, context }) => {
    const roles = await getRoles(context.supabase, context.userId);
    const allowed = roles.some((r) => r === "admin" || r === "directeur_commercial");
    if (!allowed) throw new Error("Forbidden: Directeur Commercial ou DG uniquement");

    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ commercial_id: data.new_commercial_id })
      .eq("id", data.client_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ═══════════════════════════════════════════════════════════
// TARIFS NÉGOCIABLES par client (Commercial / dir. commercial / DG)
// ═══════════════════════════════════════════════════════════
const SetTarifInput = z.object({
  client_id: z.string().uuid(),
  tarif_standard: z.number().nullable().optional(),
  tarif_urgent_proche: z.number().nullable().optional(),
  tarif_urgent_moyen: z.number().nullable().optional(),
  tarif_urgent_loin: z.number().nullable().optional(),
});

export const setTarifClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => SetTarifInput.parse(data))
  .handler(async ({ data, context }) => {
    const roles = await getRoles(context.supabase, context.userId);
    const allowed = roles.some((r) =>
      r === "admin" || r === "directeur_commercial" || r === "admin_commercial" || r === "commercial");
    if (!allowed) throw new Error("Forbidden");

    const { error } = await supabaseAdmin.from("tarifs_client").upsert({
      client_id: data.client_id,
      tarif_standard: data.tarif_standard ?? null,
      tarif_urgent_proche: data.tarif_urgent_proche ?? null,
      tarif_urgent_moyen: data.tarif_urgent_moyen ?? null,
      tarif_urgent_loin: data.tarif_urgent_loin ?? null,
      updated_at: new Date().toISOString(),
      updated_by: context.userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getTarifClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ client_id: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const { data: row } = await supabaseAdmin
      .from("tarifs_client").select("*").eq("client_id", data.client_id).maybeSingle();
    return { tarif: row ?? null };
  });

// ═══════════════════════════════════════════════════════════
// SUSPENSION / RÉACTIVATION d'un compte (DG uniquement)
// ═══════════════════════════════════════════════════════════
const SuspendInput = z.object({
  user_id: z.string().uuid(),
  actif: z.boolean(),
});

export const setAccountActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => SuspendInput.parse(data))
  .handler(async ({ data, context }) => {
    const roles = await getRoles(context.supabase, context.userId);
    if (!roles.includes("admin")) throw new Error("Forbidden: DG uniquement");
    if (data.user_id === context.userId) throw new Error("Vous ne pouvez pas vous suspendre vous-même");

    // Met à jour le flag profil
    const { error } = await supabaseAdmin
      .from("profiles").update({ actif: data.actif }).eq("id", data.user_id);
    if (error) throw new Error(error.message);

    // Bannir/débannir côté Auth (empêche la connexion si suspendu)
    await supabaseAdmin.auth.admin.updateUserById(data.user_id, {
      ban_duration: data.actif ? "none" : "876000h", // ~100 ans si suspendu
    });
    return { ok: true };
  });

// ═══════════════════════════════════════════════════════════
// PERMISSIONS GRANULAIRES (DG accorde/retire une permission)
// ═══════════════════════════════════════════════════════════
const PermInput = z.object({
  user_id: z.string().uuid(),
  permission: z.string().min(2).max(100),
  grant: z.boolean(),
});

export const setUserPermission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => PermInput.parse(data))
  .handler(async ({ data, context }) => {
    const roles = await getRoles(context.supabase, context.userId);
    if (!roles.includes("admin")) throw new Error("Forbidden: DG uniquement");

    if (data.grant) {
      const { error } = await supabaseAdmin.from("user_permissions").upsert({
        user_id: data.user_id, permission: data.permission, granted_by: context.userId,
      });
      if (error && !error.message.includes("duplicate")) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.from("user_permissions")
        .delete().eq("user_id", data.user_id).eq("permission", data.permission);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const listUserPermissions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ user_id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const roles = await getRoles(context.supabase, context.userId);
    if (!roles.includes("admin")) throw new Error("Forbidden");
    const { data: rows } = await supabaseAdmin
      .from("user_permissions").select("permission").eq("user_id", data.user_id);
    return { permissions: (rows ?? []).map((r) => r.permission) };
  });
