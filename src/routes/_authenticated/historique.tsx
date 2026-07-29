import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, History, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { ProPageHeader } from "@/components/pro-page-header";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { listAudit } from "@/lib/audit.functions";

export const Route = createFileRoute("/_authenticated/historique")({
  head: () => ({ meta: [{ title: "Historique — REVO EXPRESS" }] }),
  component: HistoriquePage,
});

const ACTION_LABELS: Record<string, string> = {
  changement_etape: "Changement d'étape",
  affectation_masse: "Affectation en masse",
};

function HistoriquePage() {
  const { role, loading } = useAuth();
  const listFn = useServerFn(listAudit);
  const [rows, setRows] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [domaine, setDomaine] = useState("");

  const allowed = !!role && role !== "client";

  useEffect(() => {
    if (!allowed) return;
    setDataLoading(true);
    listFn({ data: { domaine: domaine || undefined } }).then((r) => setRows(r.audit)).catch(() => {}).finally(() => setDataLoading(false));
  }, [role, domaine]);

  const domaines = useMemo(() => Array.from(new Set(rows.map((r) => r.domaine))).sort(), [rows]);

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!allowed) return <Navigate to="/" />;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <section className="container mx-auto flex-1 px-4 pb-24 pt-10">
        <ProPageHeader icon={History} title="Historique" subtitle="Qui a fait quoi, quand — traçabilité complète des actions internes." />

        <div className="mt-4 mb-3">
          <select value={domaine} onChange={(e) => setDomaine(e.target.value)} className="h-9 rounded-lg border border-input bg-background px-3 text-sm">
            <option value="">Tous les domaines</option>
            {domaines.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        {dataLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
            <Table className="text-sm">
              <TableHeader className="bg-muted/50 text-xs uppercase">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="px-3 py-2">Date</TableHead>
                  <TableHead className="px-3 py-2">Domaine</TableHead>
                  <TableHead className="px-3 py-2">Action</TableHead>
                  <TableHead className="px-3 py-2">Cible</TableHead>
                  <TableHead className="px-3 py-2">Changement</TableHead>
                  <TableHead className="px-3 py-2">Utilisateur</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="[&_tr]:divide-border">
                {rows.map((r) => (
                  <TableRow key={r.id} className="hover:bg-accent/40">
                    <TableCell className="px-3 py-2 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("fr-FR")}</TableCell>
                    <TableCell className="px-3 py-2"><span className="rounded-full bg-muted px-2 py-0.5 text-xs font-bold">{r.domaine}</span></TableCell>
                    <TableCell className="px-3 py-2 font-semibold">{ACTION_LABELS[r.action] ?? r.action}</TableCell>
                    <TableCell className="px-3 py-2">{r.cible ?? "—"}</TableCell>
                    <TableCell className="px-3 py-2 text-xs">
                      {r.ancienne_valeur || r.nouvelle_valeur ? (
                        <span className="flex items-center gap-1.5">
                          {r.ancienne_valeur && <span className="text-muted-foreground line-through">{r.ancienne_valeur}</span>}
                          {r.ancienne_valeur && r.nouvelle_valeur && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
                          {r.nouvelle_valeur && <span className="font-semibold">{r.nouvelle_valeur}</span>}
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="px-3 py-2 text-xs">{r.user_nom ?? "—"}</TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="p-8 text-center text-muted-foreground">Aucune action enregistrée pour l'instant.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
      <SiteFooter />
    </div>
  );
}
