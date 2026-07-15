import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Résout un numéro de téléphone vers l'email du compte, pour permettre
// la connexion par téléphone (le commerçant tape son tel au lieu de l'email).
// Retourne l'email si trouvé, sinon null. (Pas d'info sensible exposée.)
export const resolvePhoneToEmail = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z.object({ phone: z.string().trim().min(4).max(20) }).parse(data)
  )
  .handler(async ({ data }) => {
    // Normalise : on retire espaces et tirets pour comparer
    const raw = data.phone.replace(/[\s-]/g, "");
    const { data: rows } = await supabaseAdmin
      .from("profiles")
      .select("email, telephone")
      .not("telephone", "is", null);

    const match = (rows ?? []).find((r: any) => {
      const t = (r.telephone ?? "").replace(/[\s-]/g, "");
      return t === raw || t.endsWith(raw) || raw.endsWith(t);
    });
    return { email: match?.email ?? null };
  });
