import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function checkAcces(userId: string, colisId: string) {
  const { data: col } = await supabaseAdmin.from("colis").select("client_id").eq("id", colisId).single();
  if (!col) throw new Error("Colis introuvable");
  const { data: rolesData } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId);
  const roles = (rolesData ?? []).map((r: any) => r.role as string);
  const estStaff = roles.some((r) => r !== "client");
  const estProprietaire = col.client_id === userId;
  if (!estStaff && !estProprietaire) throw new Error("Forbidden");
  return { estStaff, estProprietaire };
}

export const listCommentairesPartages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ colis_id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await checkAcces(context.userId, data.colis_id);
    const { data: rows } = await supabaseAdmin
      .from("colis_commentaires_partages")
      .select("*")
      .eq("colis_id", data.colis_id)
      .order("created_at", { ascending: true });
    return { commentaires: rows ?? [], me: context.userId };
  });

const AjouterInput = z.object({ colis_id: z.string().uuid(), contenu: z.string().trim().min(1).max(2000) });

export const ajouterCommentairePartage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => AjouterInput.parse(data))
  .handler(async ({ data, context }) => {
    const { estStaff } = await checkAcces(context.userId, data.colis_id);
    const { data: profil } = await supabaseAdmin
      .from("profiles").select("nom_boutique, nom").eq("id", context.userId).single();
    const auteur_nom = estStaff ? (profil?.nom || "Revo Express") : (profil?.nom_boutique || profil?.nom || "Client");

    const { error } = await supabaseAdmin.from("colis_commentaires_partages").insert({
      colis_id: data.colis_id,
      auteur_id: context.userId,
      auteur_nom,
      auteur_est_staff: estStaff,
      contenu: data.contenu.trim(),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const SupprimerInput = z.object({ id: z.string().uuid() });

export const supprimerCommentairePartage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => SupprimerInput.parse(data))
  .handler(async ({ data, context }) => {
    const { data: com } = await supabaseAdmin.from("colis_commentaires_partages").select("auteur_id").eq("id", data.id).single();
    if (!com || com.auteur_id !== context.userId) throw new Error("Forbidden");
    const { error } = await supabaseAdmin.from("colis_commentaires_partages").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });