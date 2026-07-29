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

// Le service client doit pouvoir corriger un prix (erreur de saisie, geste commercial) sans
// pour autant pouvoir toucher au statut, aux adresses ou à l'assignation d'un livreur — la
// policy RLS générale sur colis.UPDATE reste donc restreinte à Ops/DG. Cette fonction, en
// SECURITY DEFINER via supabaseAdmin, n'expose volontairement que ces deux colonnes.
const UpdateColisPriceInput = z.object({
  colis_id: z.string().uuid(),
  prix_colis: z.number().min(0).max(10_000_000),
  prix: z.number().min(0).max(10_000_000),
});

export const updateColisPrice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => UpdateColisPriceInput.parse(data))
  .handler(async ({ data, context }) => {
    const roles = await getRoles(context.supabase, context.userId);
    const allowed = roles.some((r) =>
      r === "admin" || r === "admin_operations" || r === "admin_service_client" || r === "service_client"
    );
    if (!allowed) throw new Error("Forbidden");

    const { error } = await supabaseAdmin
      .from("colis")
      .update({ prix_colis: data.prix_colis, prix: data.prix })
      .eq("id", data.colis_id);
    if (error) throw new Error(error.message);

    return { ok: true };
  });
