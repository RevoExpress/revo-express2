import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { ArrowLeft, Printer, Loader2, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Bordereau } from "@/components/bordereau";
import { Button } from "@/components/ui/button";

const searchSchema = z.object({
  ids: z.string().optional().default(""),
  format: z.enum(["a4", "a6"]).optional().default("a4"),
});

export const Route = createFileRoute("/_authenticated/print-bordereaux")({
  validateSearch: searchSchema.parse,
  head: () => ({ meta: [{ title: "Impression bordereaux — REVO EXPRESS" }] }),
  component: PrintBordereauxPage,
});

function chunk4(arr: any[]): (any | null)[][] {
  const pages: (any | null)[][] = [];
  for (let i = 0; i < arr.length; i += 4) {
    const slice = arr.slice(i, i + 4) as (any | null)[];
    while (slice.length < 4) slice.push(null);
    pages.push(slice);
  }
  return pages;
}

// Positions fixes des 4 quadrants sur une page A4 (mm) — évite le bug Chrome grid+print
const QUAD_POS = [
  { top: 0, left: 0 },
  { top: 0, left: 105 },
  { top: 148.5, left: 0 },
  { top: 148.5, left: 105 },
];

function PrintBordereauxPage() {
  const { ids, format } = Route.useSearch();
  const navigate = useNavigate();
  const [rows, setRows] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const list = ids.split(",").map(s => s.trim()).filter(s => /^[a-f0-9-]{10,}$/i.test(s));
    if (list.length === 0) { setError("Aucun colis sélectionné"); setRows([]); return; }
    supabase.from("colis").select("*").in("id", list).then(({ data, error: e }) => {
      if (e) { setError(e.message); setRows([]); return; }
      const byId = new Map((data || []).map((c: any) => [c.id, c]));
      setRows(list.map(id => byId.get(id)).filter(Boolean) as any[]);
    });
  }, [ids]);

  useEffect(() => {
    if (!rows || rows.length === 0) return;
    const doPrint = () => window.print();
    if (document.readyState === "complete") {
      const t = setTimeout(doPrint, 700);
      return () => clearTimeout(t);
    }
    window.addEventListener("load", doPrint);
    return () => window.removeEventListener("load", doPrint);
  }, [rows, format]);

  if (rows === null) {
    return <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}><Loader2 style={{ width: 32, height: 32 }} className="animate-spin" /></div>;
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

  const switchFormat = (f: "a4" | "a6") => {
    navigate({ to: "/print-bordereaux", search: { ids, format: f } as any, replace: true });
  };

  const nbPages = format === "a4" ? Math.ceil(rows.length / 4) : rows.length;

  return (
    <>
      <style>{`
        html, body { background: #f4f4f4; margin: 0; padding: 0; }
        @media screen {
          .page { margin: 20px auto; box-shadow: 0 4px 24px rgba(0,0,0,0.12); background: #fff; }
        }
        @media print {
          body { background: #fff; }
          .no-print { display: none !important; }
          .page { box-shadow: none; margin: 0; }
        }

        .mode-a4 .page {
          width: 210mm; height: 297mm;
          box-sizing: border-box;
          position: relative;
          page-break-after: always;
          overflow: hidden;
        }
        .mode-a4 .page:last-child { page-break-after: auto; }
        .mode-a4 .quad {
          position: absolute;
          width: 105mm; height: 148.5mm;
          display: flex; align-items: center; justify-content: center;
          overflow: hidden;
          box-sizing: border-box;
        }
        .mode-a4 .cut-v {
          position: absolute; top: 0; bottom: 0; left: 105mm;
          border-left: 1px dashed #999; pointer-events: none;
        }
        .mode-a4 .cut-h {
          position: absolute; left: 0; right: 0; top: 148.5mm;
          border-top: 1px dashed #999; pointer-events: none;
        }

        .mode-a6 .page {
          width: 105mm; height: 148.5mm;
          box-sizing: border-box;
          position: relative;
          page-break-after: always;
        }
        .mode-a6 .page:last-child { page-break-after: auto; }
        .mode-a6 .quad {
          position: absolute;
          top: 0; left: 0;
          width: 105mm; height: 148.5mm;
          display: flex; align-items: center; justify-content: center;
        }

        @page { size: ${format === "a6" ? "A6 portrait" : "A4 portrait"}; margin: 0; }
      `}</style>

      <div className="no-print sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
        <div className="container mx-auto flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Button variant="ghost" onClick={() => window.close()} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Fermer
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant={format === "a4" ? "default" : "outline"}
              size="sm"
              onClick={() => switchFormat("a4")}
              className={format === "a4" ? "gap-2 bg-primary text-primary-foreground" : "gap-2"}
            >
              <FileText className="h-4 w-4" /> A4 (4 par feuille)
            </Button>
            <Button
              variant={format === "a6" ? "default" : "outline"}
              size="sm"
              onClick={() => switchFormat("a6")}
              className={format === "a6" ? "gap-2 bg-primary text-primary-foreground" : "gap-2"}
            >
              <FileText className="h-4 w-4" /> A6 direct
            </Button>
          </div>
          <div className="text-sm font-semibold whitespace-nowrap">
            {rows.length} bordereau{rows.length > 1 ? "x" : ""} — {nbPages} page{nbPages > 1 ? "s" : ""}
          </div>
          <Button onClick={() => window.print()} className="gap-2 bg-gradient-primary shadow-glow">
            <Printer className="h-4 w-4" /> Imprimer / PDF
          </Button>
        </div>
      </div>

      {format === "a4" && (
        <div className="mode-a4">
          {chunk4(rows).map((pageRows, i) => (
            <div key={i} className="page">
              {pageRows.map((c, k) => (
                <div
                  key={k}
                  className="quad"
                  style={{ top: `${QUAD_POS[k].top}mm`, left: `${QUAD_POS[k].left}mm` }}
                >
                  {c ? <Bordereau colis={c} /> : null}
                </div>
              ))}
              <div className="cut-v" />
              <div className="cut-h" />
            </div>
          ))}
        </div>
      )}

      {format === "a6" && (
        <div className="mode-a6">
          {rows.map((c) => (
            <div key={c.id} className="page">
              <div className="quad">
                <Bordereau colis={c} />
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}