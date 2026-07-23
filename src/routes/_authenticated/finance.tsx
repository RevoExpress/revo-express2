import { createFileRoute, Navigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Wallet, Store, Printer, Check, X, Coins } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { ProPageHeader } from "@/components/pro-page-header";
import {
  listSoldesTousClients, creerReversement, listReversementsTous,
  listColisLivresNonEncaisses, marquerEncaisse,
} from "@/lib/finance.functions";
import { ModalPortal } from "@/components/modal-portal";

export const Route = createFileRoute("/_authenticated/finance")({
  head: () => ({ meta: [{ title: "Finance — REVO EXPRESS" }] }),
  component: FinancePage,
});

function FinancePage() {
  const { role, loading } = useAuth();
  const soldesFn = useServerFn(listSoldesTousClients);
  const creerFn = useServerFn(creerReversement);
  const reversementsFn = useServerFn(listReversementsTous);
  const nonEncaissesFn = useServerFn(listColisLivresNonEncaisses);
  const marquerFn = useServerFn(marquerEncaisse);

  const canAccess = role === "admin" || role === "admin_operations";

  const [soldes, setSoldes] = useState<any[]>([]);
  const [reversements, setReversements] = useState<any[]>([]);
  const [nonEncaisses, setNonEncaisses] = useState<any[]>([]);
  const [selectedNonEncaisses, setSelectedNonEncaisses] = useState<Set<string>>(new Set());
  const [marquant, setMarquant] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [colisClient, setColisClient] = useState<any[]>([]);
  const [selectedColis, setSelectedColis] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);

  async function refresh() {
    const [s, r, n] = await Promise.all([soldesFn(), reversementsFn(), nonEncaissesFn()]);
    setSoldes(s.soldes ?? []);
    setReversements(r.reversements ?? []);
    setNonEncaisses(n.colis ?? []);
    setDataLoading(false);
  }

  useEffect(() => { if (canAccess) void refresh(); }, [canAccess]);

  function toggleNonEncaisse(id: string) {
    const next = new Set(selectedNonEncaisses);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedNonEncaisses(next);
  }

  async function handleMarquerEncaisse() {
    if (selectedNonEncaisses.size === 0) return;
    setMarquant(true);
    try {
      const res = await marquerFn({ data: { colis_ids: Array.from(selectedNonEncaisses) } });
      toast.success(`${res.count} colis marqué(s) encaissé(s)`);
      setSelectedNonEncaisses(new Set());
      void refresh();
    } catch (e: any) {
      toast.error(e.message ?? "Échec");
    }
    setMarquant(false);
  }

  async function openClient(s: any) {
    setSelectedClient(s);
    const { data } = await supabase
      .from("colis")
      .select("id, tracking, destinataire_nom, prix_colis, prix, frais_payes_par_expediteur, date_creation")
      .eq("client_id", s.client_id)
      .eq("statut", "livre")
      .eq("cod_encaisse", true)
      .is("reversement_id", null)
      .eq("archive", false)
      .eq("type_colis", "REV")
      .order("date_creation", { ascending: false });
    setColisClient(data ?? []);
    setSelectedColis(new Set((data ?? []).map((c) => c.id)));
  }

  async function handleCreer() {
    if (!selectedClient || selectedColis.size === 0) return;
    setCreating(true);
    try {
      const res = await creerFn({ data: { client_id: selectedClient.client_id, colis_ids: Array.from(selectedColis) } });
      toast.success(`Reversement ${res.reversement.reference} créé : ${Number(res.reversement.montant_total).toLocaleString("fr-FR")} DA`);
      setSelectedClient(null);
      void refresh();
    } catch (e: any) {
      toast.error(e.message ?? "Échec de la création");
    }
    setCreating(false);
  }

  const totalSelection = useMemo(() => {
    return colisClient
      .filter((c) => selectedColis.has(c.id))
      .reduce((s, c) => s + (c.frais_payes_par_expediteur ? Number(c.prix_colis) - Number(c.prix) : Number(c.prix_colis)), 0);
  }, [colisClient, selectedColis]);

  if (loading || dataLoading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!canAccess) return <Navigate to="/" />;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <section className="container mx-auto flex-1 px-4 py-10">
        <ProPageHeader icon={Wallet} title="Finance" subtitle="Soldes à reverser et historique des reversements." />

        {/* Colis livrés à marquer encaissés */}
        <div className="mt-6 overflow-hidden rounded-xl border border-warning/30 bg-card">
          <div className="flex items-center justify-between border-b border-border p-4">
            <h2 className="flex items-center gap-2 font-bold text-warning"><Coins className="h-4 w-4" /> Colis livrés à marquer encaissés ({nonEncaisses.length})</h2>
            <Button size="sm" className="gap-1.5 bg-gradient-primary" disabled={marquant || selectedNonEncaisses.size === 0} onClick={() => void handleMarquerEncaisse()}>
              {marquant ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Marquer {selectedNonEncaisses.size > 0 ? `(${selectedNonEncaisses.size})` : ""} encaissé
            </Button>
          </div>
          {nonEncaisses.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Aucun colis livré en attente d'encaissement</div>
          ) : (
            <div className="max-h-72 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
                  <tr><th className="w-8 px-3 py-2"></th><th className="px-3 py-2 text-left">Tracking</th><th className="px-3 py-2 text-left">Boutique</th><th className="px-3 py-2 text-left">Destinataire</th><th className="px-3 py-2 text-right">Montant</th></tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {nonEncaisses.map((c) => (
                    <tr key={c.id} className="hover:bg-accent/40">
                      <td className="px-3 py-2"><input type="checkbox" checked={selectedNonEncaisses.has(c.id)} onChange={() => toggleNonEncaisse(c.id)} /></td>
                      <td className="px-3 py-2 font-mono text-xs">{c.tracking}</td>
                      <td className="px-3 py-2 text-xs">{c.profil?.nom_boutique || c.profil?.nom || "—"}</td>
                      <td className="px-3 py-2">{c.destinataire_nom}</td>
                      <td className="px-3 py-2 text-right font-bold">{Number(c.prix_colis).toLocaleString("fr-FR")} DA</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
          <div className="border-b border-border p-4"><h2 className="font-bold">Soldes à reverser ({soldes.length})</h2></div>
          {soldes.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">Aucun solde en attente</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
                  <tr><th className="px-4 py-2 text-left">Boutique</th><th className="px-4 py-2 text-right">Colis</th><th className="px-4 py-2 text-right">Montant dû</th><th className="px-4 py-2 text-right">Action</th></tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {soldes.map((s) => (
                    <tr key={s.client_id} className="hover:bg-accent/40">
                      <td className="px-4 py-2">
                        <Link to="/boutique/$id" params={{ id: s.client_id }} className="flex items-center gap-2 font-semibold text-primary hover:underline">
                          <Store className="h-4 w-4" /> {s.profil?.nom_boutique || s.profil?.nom || "—"}
                        </Link>
                      </td>
                      <td className="px-4 py-2 text-right">{s.nb_colis}</td>
                      <td className="px-4 py-2 text-right font-bold">{Number(s.montant_du).toLocaleString("fr-FR")} DA</td>
                      <td className="px-4 py-2 text-right">
                        <Button size="sm" className="gap-1.5 bg-gradient-primary" onClick={() => void openClient(s)}>Créer le reversement</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
          <div className="border-b border-border p-4"><h2 className="font-bold">Historique ({reversements.length})</h2></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
                <tr><th className="px-4 py-2 text-left">Référence</th><th className="px-4 py-2 text-left">Date</th><th className="px-4 py-2 text-right">Colis</th><th className="px-4 py-2 text-right">Montant</th><th className="px-4 py-2 text-right">Reçu</th></tr>
              </thead>
              <tbody className="divide-y divide-border">
                {reversements.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-2 font-mono text-xs">{r.reference}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("fr-FR")}</td>
                    <td className="px-4 py-2 text-right">{r.nb_colis}</td>
                    <td className="px-4 py-2 text-right font-bold">{Number(r.montant_total).toLocaleString("fr-FR")} DA</td>
                    <td className="px-4 py-2 text-right">
                      <Link to="/print-reversement/$id" params={{ id: r.id }} target="_blank">
                        <Button size="sm" variant="outline" className="gap-1.5"><Printer className="h-3.5 w-3.5" /> Reçu</Button>
                      </Link>
                    </td>
                  </tr>
                ))}
                {reversements.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Aucun reversement</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {selectedClient && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm" onClick={() => setSelectedClient(null)}>
            <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-card" onClick={(e) => e.stopPropagation()}>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-bold">{selectedClient.profil?.nom_boutique || selectedClient.profil?.nom}</h3>
                <button onClick={() => setSelectedClient(null)}><X className="h-5 w-5 text-muted-foreground" /></button>
              </div>
              <div className="space-y-1.5">
                {colisClient.map((c) => {
                  const montant = c.frais_payes_par_expediteur ? Number(c.prix_colis) - Number(c.prix) : Number(c.prix_colis);
                  const checked = selectedColis.has(c.id);
                  return (
                    <label key={c.id} className="flex items-center gap-2 rounded-lg border border-border p-2 text-sm">
                      <input type="checkbox" checked={checked} onChange={() => {
                        const next = new Set(selectedColis);
                        checked ? next.delete(c.id) : next.add(c.id);
                        setSelectedColis(next);
                      }} />
                      <span className="flex-1 font-mono text-xs">{c.tracking}</span>
                      <span className="text-xs text-muted-foreground">{c.destinataire_nom}</span>
                      <span className="font-bold">{montant.toLocaleString("fr-FR")} DA</span>
                    </label>
                  );
                })}
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                <span className="text-sm font-bold">Total sélectionné</span>
                <span className="text-xl font-black text-primary">{totalSelection.toLocaleString("fr-FR")} DA</span>
              </div>
              <Button className="mt-4 w-full gap-2 bg-gradient-primary shadow-glow" disabled={creating || selectedColis.size === 0} onClick={() => void handleCreer()}>
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Confirmer le reversement
              </Button>
            </div>
          </div>
        </ModalPortal>
      )}

      <SiteFooter />
    </div>
  );
}