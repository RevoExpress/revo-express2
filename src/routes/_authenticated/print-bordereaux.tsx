import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { ArrowLeft, Printer, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Bordereau } from "@/components/bordereau";
import { Button } from "@/components/ui/button";

const searchSchema = z.object({
  ids: z.string().optional().default(""),
});

export const Route = createFileRoute("/_authenticated/print-bordereaux")({
  validateSearch: searchSchema.parse,
  head: () => ({ meta: [{ title: "Impression groupée — REVO EXPRESS" }] }),
  component: PrintBordereauxPage,
});

function PrintBordereauxPage() {
  const { ids } = Route.useSearch();
  const navigate = useNavigate();
  const [rows, setRows] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const list = ids
      .split(",")
      .map((s: string) => s.trim())
      .filter((s: string) => /^[a-f0-9-]{10,}$/i.test(s));
    if (list.length === 0) {
      setError("Aucun colis sélectionné");
      setRows([]);
      return;
    }
    supabase
      .from("colis")
      .select("*")
      .in("id", list)
      .then(({ data, error: e }) => {
        if (e) {
          setError(e.message);
          setRows([]);
        } else {
          // Preserve original order
          const byId = new Map((data || []).map((c) => [c.id, c]));
          setRows(list.map((id: string) => byId.get(id)).filter(Boolean) as any[]);
        }
      });
  }, [ids]);

  // Auto-trigger print once rows are loaded
  useEffect(() => {
    if (rows && rows.length > 0) {
      const t = setTimeout(() => window.print(), 400);
      return () => clearTimeout(t);
    }
  }, [rows]);

  if (rows === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="container mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-muted-foreground">{error ?? "Aucun bordereau à imprimer."}</p>
        <Button onClick={() => navigate({ to: "/mes-colis" })} variant="outline" className="mt-4 gap-2">
          <ArrowLeft className="h-4 w-4" /> Retour
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="no-print sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between gap-3 px-4 py-3">
          <Button variant="ghost" onClick={() => navigate({ to: "/mes-colis" })} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Retour
          </Button>
          <div className="text-sm font-semibold">
            {rows.length} bordereau{rows.length > 1 ? "x" : ""} prêt{rows.length > 1 ? "s" : ""} à imprimer
          </div>
          <Button onClick={() => window.print()} className="gap-2 bg-gradient-primary shadow-glow">
            <Printer className="h-4 w-4" /> Imprimer
          </Button>
        </div>
      </div>

      <div id="print-root" className="container mx-auto max-w-[480px] space-y-6 px-4 py-6">
        {rows.map((c) => (
          <div key={c.id} className="bordereau-sheet">
            <Bordereau colis={c} />
          </div>
        ))}
      </div>
    </div>
  );
}
