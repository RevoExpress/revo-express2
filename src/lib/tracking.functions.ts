import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const Input = z.object({
  code: z.string().trim().min(3).max(40).regex(/^[A-Z0-9-]+$/i),
});

export type PublicEvent = {
  id: string;
  statut: string;
  lieu: string | null;
  description: string | null;
  motif: string | null;
  created_at: string;
};

/**
 * Public tracking lookup — no authentification requise.
 * Quiconque a le numéro de tracking a accès à toutes les infos du colis
 * (décision Jimmy, 24/07/2026) : mêmes données que côté connecté.
 */
export const getPublicTracking = createServerFn({ method: "POST" })
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data }): Promise<{ colis: any; events: PublicEvent[] } | { notFound: true }> => {
    const clean = data.code.trim().toUpperCase();

    const { data: c, error } = await supabaseAdmin
      .from("colis")
      .select("*")
      .eq("tracking", clean)
      .maybeSingle();

    if (error) throw new Error("Lookup failed");
    if (!c) return { notFound: true };

    const { data: hist } = await supabaseAdmin
      .from("colis_historique")
      .select("id, statut, lieu, description, motif, created_at")
      .eq("colis_id", c.id)
      .order("created_at", { ascending: false });

    return {
      colis: c,
      events: (hist ?? []) as PublicEvent[],
    };
  });