import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Printer, ArrowLeft, Truck, Package, MapPin, Banknote } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { listLivreurs } from "@/lib/clients.functions";

type Search = { livreur?: string; all?: string };

export const Route = createFileRoute("/_authenticated/feuille-de-route")({
  head: () => ({ meta: [{ title: "Feuille de route — REVO EXPRESS" }] }),
  validateSearch: (s: Record<string, unknown>): Search => ({
    livreur: typeof s.livreur === "string" ? s.livreur : undefined,
    all: typeof s.all === "string" ? s.all : undefined,
  }),
  component: FeuilleDeRoutePage,
});

function FeuilleDeRoutePage() {
  const { user, role, loading } = useAuth();
  const { livreur: livreurParam, all } = Route.useSearch();
  const listLivreursFn = useServerFn(listLivreurs);
  const [livreurs, setLivreurs] = useState<{ id: string; nom: string | null; telephone: string | null }[]>([]);
  const [colis, setColis] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [includeDone, setIncludeDone] = useState(all === "1");

  const isStaff = role === "admin" || role === "admin_operations";
  const targetLivreurId = isStaff ? (livreurParam ?? "") : user?.id ?? "";

  useEffect(() => {
    if (!isStaff) return;
    listLivreursFn().then((r) => setLivreurs(r.livreurs ?? [])).catch(() => {});
  }, [isStaff, listLivreursFn]);

  useEffect(() => {
    if (!targetLivreurId) { setColis([]); setLoadingData(false); return; }
    setLoadingData(true);
    const q = supabase
      .from("colis")
      .select("*")
      .eq("livreur_id", targetLivreurId)
      .order("destinataire_wilaya", { ascending: true })
      .order("date_creation", { ascending: true });
    q.then(({ data }) => {
      const list = data ?? [];
      setColis(includeDone ? list : list.filter((c: any) => c.statut !== "livre" && c.statut !== "echec"));
      setLoadingData(false);
    });
  }, [targetLivreurId, includeDone]);

  const livreurInfo = useMemo(
    () => livreurs.find((l) => l.id === targetLivreurId),
    [livreurs, targetLivreurId]
  );

  const totals = useMemo(() => {
    const totalCOD = colis.reduce((s, c) => s + Number(c.prix_colis || 0), 0);
    const totalLivraison = colis.reduce((s, c) => s + Number(c.prix || 0), 0);
    return { count: colis.length, totalCOD, totalLivraison };
  }, [colis]);

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (role !== "livreur" && !isStaff) return <Navigate to="/" />;

  const today = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Toolbar (no print) */}
      <div className="no-print sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur">
        <div className="container mx-auto flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link to={role === "livreur" ? "/livreur" : "/operations"}>
            <Button variant="ghost" size="sm" className="gap-2"><ArrowLeft className="h-4 w-4" /> Retour</Button>
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            {isStaff && (
              <select
                value={targetLivreurId}
                onChange={(e) => {
                  const v = e.target.value;
                  window.history.replaceState({}, "", `/feuille-de-route?livreur=${v}${includeDone ? "&all=1" : ""}`);
                  window.location.reload();
                }}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">— Choisir un livreur —</option>
                {livreurs.map((l) => <option key={l.id} value={l.id}>{l.nom ?? l.id.slice(0, 8)}</option>)}
              </select>
            )}
            <label className="flex items-center gap-2 text-xs font-semibold">
              <input type="checkbox" checked={includeDone} onChange={(e) => setIncludeDone(e.target.checked)} />
              Inclure livrés / échecs
            </label>
            <Button onClick={() => window.print()} disabled={!colis.length} className="gap-2 bg-gradient-primary shadow-glow">
              <Printer className="h-4 w-4" /> Imprimer
            </Button>
          </div>
        </div>
      </div>

      {/* Printable area */}
      <div id="print-root" className="container mx-auto max-w-[860px] px-4 py-6">
        {loadingData ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : !targetLivreurId ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
            <Truck className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-3 font-bold">Sélectionnez un livreur pour générer sa feuille de route.</p>
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-white p-8 text-black shadow-card print:rounded-none print:border-0 print:p-4 print:shadow-none">
            {/* Header */}
            <div className="flex items-start justify-between border-b-2 border-black pb-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.3em] text-primary">REVO EXPRESS</div>
                <h1 className="mt-1 text-2xl font-black">Feuille de route</h1>
                <div className="text-sm capitalize">{today}</div>
              </div>
              <div className="text-right text-sm">
                <div className="font-bold uppercase tracking-wider text-muted-foreground">Livreur</div>
                <div className="text-lg font-black">{livreurInfo?.nom ?? (role === "livreur" ? "Moi" : "—")}</div>
                {livreurInfo?.telephone && <div className="font-mono text-xs">{livreurInfo.telephone}</div>}
              </div>
            </div>

            {/* KPIs */}
            <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
              <Kpi icon={Package} label="Colis" value={String(totals.count)} />
              <Kpi icon={Banknote} label="COD à encaisser" value={`${totals.totalCOD.toLocaleString()} DA`} />
              <Kpi icon={MapPin} label="Frais de livraison" value={`${totals.totalLivraison.toLocaleString()} DA`} />
            </div>

            {/* Table */}
            <table className="mt-5 w-full border-collapse text-xs">
              <thead>
                <tr className="border-b-2 border-black text-left uppercase">
                  <th className="px-2 py-2 w-8">#</th>
                  <th className="px-2 py-2">Tracking</th>
                  <th className="px-2 py-2">Destinataire</th>
                  <th className="px-2 py-2">Adresse</th>
                  <th className="px-2 py-2 text-right">COD</th>
                  <th className="px-2 py-2 w-28">Signature</th>
                </tr>
              </thead>
              <tbody>
                {colis.map((c, i) => (
                  <tr key={c.id} className="border-b border-gray-300 align-top">
                    <td className="px-2 py-2 font-bold">{i + 1}</td>
                    <td className="px-2 py-2 font-mono text-[11px] font-bold">{c.tracking}</td>
                    <td className="px-2 py-2">
                      <div className="font-bold">{c.destinataire_nom}</div>
                      <div className="font-mono text-[10px]">{c.destinataire_tel}</div>
                    </td>
                    <td className="px-2 py-2">
                      <div>{c.destinataire_adresse}</div>
                      <div className="text-[10px] uppercase text-gray-600">{c.destinataire_wilaya}</div>
                    </td>
                    <td className="px-2 py-2 text-right font-bold">{Number(c.prix_colis || 0).toLocaleString()} DA</td>
                    <td className="px-2 py-2"></td>
                  </tr>
                ))}
                {colis.length === 0 && (
                  <tr><td colSpan={6} className="py-8 text-center text-gray-500">Aucun colis à livrer.</td></tr>
                )}
              </tbody>
              {colis.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-black font-black">
                    <td colSpan={4} className="px-2 py-2 text-right uppercase">Total COD</td>
                    <td className="px-2 py-2 text-right">{totals.totalCOD.toLocaleString()} DA</td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>

            {/* Footer signatures */}
            <div className="mt-10 grid grid-cols-2 gap-8 text-xs">
              <div>
                <div className="border-t border-black pt-1 font-bold">Signature livreur</div>
                <div className="h-16"></div>
              </div>
              <div>
                <div className="border-t border-black pt-1 font-bold">Signature responsable</div>
                <div className="h-16"></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Kpi({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-gray-300 bg-gray-50 px-3 py-2">
      <Icon className="h-4 w-4 text-primary" />
      <div>
        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-600">{label}</div>
        <div className="text-sm font-black">{value}</div>
      </div>
    </div>
  );
}
