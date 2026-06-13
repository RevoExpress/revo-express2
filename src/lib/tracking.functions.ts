import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const Input = z.object({
  code: z.string().trim().min(3).max(40).regex(/^[A-Z0-9-]+$/i),
});

export type PublicColis = {
  id: string;
  tracking: string;
  statut: string;
  depart: string | null;
  destinataire_wilaya: string | null;
  destinataire_cp: string | null;
  destinataire_nom_initial: string | null; // masked first name + initial
  date_creation: string;
};

export type PublicEvent = {
  id: string;
  statut: string;
  lieu: string | null;
  description: string | null;
  created_at: string;
};

/**
 * Public tracking lookup — no authentication required.
 * Returns ONLY non-sensitive fields (no phone numbers, no full addresses,
 * destinataire name is masked).
 */
export const getPublicTracking = createServerFn({ method: "POST" })
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data }): Promise<{ colis: PublicColis; events: PublicEvent[] } | { notFound: true }> => {
    const clean = data.code.trim().toUpperCase();

    const { data: c, error } = await supabaseAdmin
      .from("colis")
      .select("id, tracking, statut, depart, destinataire_wilaya, destinataire_cp, destinataire_nom, date_creation")
      .eq("tracking", clean)
      .maybeSingle();

    if (error) throw new Error("Lookup failed");
    if (!c) return { notFound: true };

    // Mask destinataire name: "Jean Dupont" -> "Jean D."
    let masked: string | null = null;
    if (c.destinataire_nom) {
      const parts = c.destinataire_nom.trim().split(/\s+/);
      if (parts.length === 1) masked = parts[0];
      else masked = `${parts[0]} ${parts[parts.length - 1][0]}.`;
    }

    const { data: hist } = await supabaseAdmin
      .from("colis_historique")
      .select("id, statut, lieu, description, created_at")
      .eq("colis_id", c.id)
      .order("created_at", { ascending: false });

    return {
      colis: {
        id: c.id,
        tracking: c.tracking,
        statut: c.statut,
        depart: c.depart,
        destinataire_wilaya: c.destinataire_wilaya,
        destinataire_cp: c.destinataire_cp,
        destinataire_nom_initial: masked,
        date_creation: c.date_creation,
      },
      events: (hist ?? []) as PublicEvent[],
    };
  });
