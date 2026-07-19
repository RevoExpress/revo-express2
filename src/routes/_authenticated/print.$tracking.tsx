import { createFileRoute, useParams, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/print/$tracking")({
  head: () => ({ meta: [{ title: "Bordereau — REVO EXPRESS" }] }),
  component: PrintOnePage,
});

function PrintOnePage() {
  const { tracking } = useParams({ from: "/_authenticated/print/$tracking" });
  const [id, setId] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    void supabase.from("colis").select("id").eq("tracking", tracking).maybeSingle()
      .then(({ data }) => {
        if (!data) setNotFound(true);
        else setId(data.id as string);
      });
  }, [tracking]);

  if (notFound) return <div style={{ padding: 40, textAlign: "center", fontFamily: "Arial" }}><h1>Colis introuvable</h1></div>;
  if (!id) return <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}><Loader2 style={{ width: 32, height: 32 }} className="animate-spin" /></div>;

  return <Navigate to="/print-bordereaux" search={{ ids: id, format: "a4" } as any} replace />;
}