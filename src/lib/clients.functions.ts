import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type AppRole = "admin" | "admin_commercial" | "admin_operations" | "admin_service_client" | "commercial" | "service_client" | "livreur" | "client";

async function getRoles(supabase: any, userId: string): Promise<AppRole[]> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  if (error) throw new Error("Forbidden");
  return (data ?? []).map((r: any) => r.role as AppRole);
}

const CreateClientInput = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(128),
  nom: z.string().trim().min(2).max(100),
  nom_boutique: z.string().trim().min(1).max(100),
  telephone: z.string().trim().min(8).max(20),
  adresse: z.string().trim().min(3).max(255),
  wilaya: z.string().trim().min(2).max(100),
});

export const createClientAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => CreateClientInput.parse(data))
  .handler(async ({ data, context }) => {
    const roles = await getRoles(context.supabase, context.userId);
    const allowed = roles.some((r) => r === "admin" || r === "admin_commercial" || r === "commercial" || r === "admin_service_client" || r === "service_client");
    if (!allowed) throw new Error("Forbidden");

    const { data: created, error: cErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { nom: data.nom, nom_boutique: data.nom_boutique },
    });
    if (cErr || !created.user) throw new Error(cErr?.message ?? "Création échouée");

    const uid = created.user.id;

    const { error: pErr } = await supabaseAdmin.from("profiles").upsert({
      id: uid,
      email: data.email,
      nom: data.nom,
      nom_boutique: data.nom_boutique,
      telephone: data.telephone,
      adresse: data.adresse,
      wilaya: data.wilaya,
    });
    if (pErr) throw new Error(pErr.message);

    // Assign client role
    const { error: rErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: uid, role: "client" });
    if (rErr && !rErr.message.includes("duplicate")) throw new Error(rErr.message);

    return { ok: true, user_id: uid };
  });

export const listClients = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const roles = await getRoles(context.supabase, context.userId);
    const allowed = roles.some((r) => r === "admin" || r === "admin_commercial" || r === "commercial" || r === "admin_service_client" || r === "service_client");
    if (!allowed) throw new Error("Forbidden");

    const { data: clientRows } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "client");
    const ids = (clientRows ?? []).map((r) => r.user_id);
    if (!ids.length) return { clients: [] };
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, nom, nom_boutique, email, telephone, adresse, wilaya, created_at")
      .in("id", ids)
      .order("created_at", { ascending: false });
    return { clients: profiles ?? [] };
  });

// ---------- Livreur (créé par admin ou admin_operations) ----------
const CreateLivreurInput = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(128),
  nom: z.string().trim().min(2).max(100),
  telephone: z.string().trim().min(8).max(20),
});

export const createLivreurAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => CreateLivreurInput.parse(data))
  .handler(async ({ data, context }) => {
    const roles = await getRoles(context.supabase, context.userId);
    const allowed = roles.some((r) => r === "admin" || r === "admin_operations");
    if (!allowed) throw new Error("Forbidden: admin ou admin opérations uniquement");

    const { data: created, error: cErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { nom: data.nom },
    });
    if (cErr || !created.user) throw new Error(cErr?.message ?? "Création échouée");
    const uid = created.user.id;

    await supabaseAdmin.from("profiles").upsert({
      id: uid, email: data.email, nom: data.nom, telephone: data.telephone,
    });

    // remove default 'client' role inserted by trigger, replace with 'livreur'
    await supabaseAdmin.from("user_roles").delete().eq("user_id", uid);
    const { error: rErr } = await supabaseAdmin
      .from("user_roles").insert({ user_id: uid, role: "livreur" });
    if (rErr) throw new Error(rErr.message);

    return { ok: true, user_id: uid };
  });

// ---------- Staff (admin commercial / admin opérations / admin service client) — super-admin uniquement ----------
const StaffRole = z.enum(["admin_commercial", "admin_operations", "admin_service_client"]);
const CreateStaffInput = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(128),
  nom: z.string().trim().min(2).max(100),
  telephone: z.string().trim().min(8).max(20),
  role: StaffRole,
});

export const createStaffAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => CreateStaffInput.parse(data))
  .handler(async ({ data, context }) => {
    const roles = await getRoles(context.supabase, context.userId);
    if (!roles.includes("admin")) throw new Error("Forbidden: super-admin uniquement");

    const { data: created, error: cErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { nom: data.nom },
    });
    if (cErr || !created.user) throw new Error(cErr?.message ?? "Création échouée");
    const uid = created.user.id;

    await supabaseAdmin.from("profiles").upsert({
      id: uid, email: data.email, nom: data.nom, telephone: data.telephone,
    });

    await supabaseAdmin.from("user_roles").delete().eq("user_id", uid);
    const { error: rErr } = await supabaseAdmin
      .from("user_roles").insert({ user_id: uid, role: data.role });
    if (rErr) throw new Error(rErr.message);

    return { ok: true, user_id: uid };
  });

export const listStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const roles = await getRoles(context.supabase, context.userId);
    if (!roles.includes("admin")) throw new Error("Forbidden");

    const { data: rows } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role")
      .in("role", ["admin_commercial", "admin_operations", "admin_service_client", "commercial", "service_client"]);
    const ids = (rows ?? []).map((r) => r.user_id);
    if (!ids.length) return { staff: [] };
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, nom, email, telephone, created_at")
      .in("id", ids)
      .order("created_at", { ascending: false });
    const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
    return {
      staff: (rows ?? []).map((r) => ({
        ...(byId.get(r.user_id) ?? { id: r.user_id }),
        role: r.role,
      })),
    };
  });

export const listLivreurs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const roles = await getRoles(context.supabase, context.userId);
    const allowed = roles.some((r) => r === "admin" || r === "admin_operations");
    if (!allowed) throw new Error("Forbidden");

    const { data: rows } = await supabaseAdmin
      .from("user_roles").select("user_id").eq("role", "livreur");
    const ids = (rows ?? []).map((r) => r.user_id);
    if (!ids.length) return { livreurs: [] };
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, nom, email, telephone, created_at")
      .in("id", ids)
      .order("created_at", { ascending: false });
    return { livreurs: profiles ?? [] };
  });

// ---------- Service client agent (créé par admin ou admin_service_client) ----------
const CreateServiceClientInput = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(128),
  nom: z.string().trim().min(2).max(100),
  telephone: z.string().trim().min(8).max(20),
});

export const createServiceClientAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => CreateServiceClientInput.parse(data))
  .handler(async ({ data, context }) => {
    const roles = await getRoles(context.supabase, context.userId);
    const allowed = roles.some((r) => r === "admin" || r === "admin_service_client");
    if (!allowed) throw new Error("Forbidden: admin ou admin service client uniquement");

    const { data: created, error: cErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { nom: data.nom },
    });
    if (cErr || !created.user) throw new Error(cErr?.message ?? "Création échouée");
    const uid = created.user.id;

    await supabaseAdmin.from("profiles").upsert({
      id: uid, email: data.email, nom: data.nom, telephone: data.telephone,
    });

    await supabaseAdmin.from("user_roles").delete().eq("user_id", uid);
    const { error: rErr } = await supabaseAdmin
      .from("user_roles").insert({ user_id: uid, role: "service_client" });
    if (rErr) throw new Error(rErr.message);

    return { ok: true, user_id: uid };
  });

export const listServiceClients = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const roles = await getRoles(context.supabase, context.userId);
    const allowed = roles.some((r) => r === "admin" || r === "admin_service_client");
    if (!allowed) throw new Error("Forbidden");

    const { data: rows } = await supabaseAdmin
      .from("user_roles").select("user_id").eq("role", "service_client");
    const ids = (rows ?? []).map((r) => r.user_id);
    if (!ids.length) return { agents: [] };
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, nom, email, telephone, created_at")
      .in("id", ids)
      .order("created_at", { ascending: false });
    return { agents: profiles ?? [] };
  });

// ---------- Admin actions : suppression & reset mot de passe ----------
const TargetUserInput = z.object({ user_id: z.string().uuid() });
const ResetPasswordInput = z.object({
  user_id: z.string().uuid(),
  password: z.string().min(6).max(128),
});

export const deleteUserAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => TargetUserInput.parse(data))
  .handler(async ({ data, context }) => {
    const roles = await getRoles(context.supabase, context.userId);
    if (!roles.includes("admin")) throw new Error("Forbidden: super-admin uniquement");
    if (data.user_id === context.userId) throw new Error("Vous ne pouvez pas vous supprimer vous-même");

    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const resetUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => ResetPasswordInput.parse(data))
  .handler(async ({ data, context }) => {
    const roles = await getRoles(context.supabase, context.userId);
    if (!roles.includes("admin")) throw new Error("Forbidden: super-admin uniquement");

    const { error } = await supabaseAdmin.auth.admin.updateUserById(
      data.user_id, { password: data.password }
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });
