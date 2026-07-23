import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Wallet, Package, Printer, Info } from "lucide-react";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { getMonSolde, getMesColisEnAttente, getMesReversements } from "@/lib/finance.functions";

export const Route = createFileRoute("/_authenticated/mon-paiement")({
  head: () => ({ meta: [{ title: "Mon paiement — REVO EXPRESS" }] }),
  component: MonPaiementPage,
});

function MonPaiementPage() {
  const soldeFn = useServerFn(getMonSolde);
  const colisFn = useServerFn(getMesColisEnAttente);
  const reversementsFn = useServerFn(getMesReversements);

  const [solde, setSolde] = useState<{ nb_colis: number; montant_du: number } | null>(null);
  const [colisEnAttente, setColisEnAttente] = useState<any[]>([]);
  const [reversements, setReversements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([soldeFn(), colisFn(), reversementsFn()])
      .then(([s, c, r]) => {
        setSolde(s);
        setColisEnAttente(c.colis ?? []);
        setReversements(r.reversements ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <section className="container mx-auto flex-1 px-4 py-10">
        <div className="mb-6">
          <div className="text-xs font-bold uppercase tracking-[0.25em] text-primary">Finance</div>
          <h1 className="mt-1 text-3xl font-black md:text-4xl">Mon paiement</h1>
          <p className="text-sm text-muted-foreground">Ce que Revo vous doit, et l'historique de vos reversements.</p>
        </div>

        {/* Solde en gros */}
        <div className="mb-6 rounded-2xl bg-gradient-navy p-8 text-center text-white shadow-card">
          <div className="flex items-center justify-center gap-2 text-sm text-white/70">
            <Wallet className="h-4 w-4" /> Revo vous doit actuellement
          </div>
          <div className="mt-2 text-5xl font-black text-primary">
            {(solde?.montant_du ?? 0).toLocaleString("fr-FR")} <span className="text-2xl font-medium text-white/70">DA</span>
          </div>
          <p className="mt-2 text-sm text-white/60">
            {solde?.nb_colis ?? 0} colis livré{(solde?.nb_colis ?? 0) > 1 ? "s" : ""} en attente de reversement
          </p>
        </div>

        {/* Colis en attente */}
        <div className="mb-6 overflow-hidden rounded-xl border border-border bg-card">
          <div className="border-b border-border p-4"><h2 className="font-bold">Colis en attente de reversement ({colisEnAttente.length})</h2></div>
          {colisEnAttente.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground"><Package className="mx-auto mb-2 h-8 w-8" />Aucun colis en attente</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
                  <tr><th className="px-4 py-2 text-left">Tracking</th><th className="px-4 py-2 text-left">Destinataire</th><th className="px-4 py-2 text-right">Montant</th></tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {colisEnAttente.map((c) => {
                    const montant = c.frais_payes_par_expediteur ? Number(c.prix_colis) - Number(c.prix) : Number(c.prix_colis);
                    return (
                      <tr key={c.id}>
                        <td className="px-4 py-2 font-mono text-xs">{c.tracking}</td>
                        <td className="px-4 py-2">{c.destinataire_nom}</td>
                        <td className="px-4 py-2 text-right font-bold">{montant.toLocaleString("fr-FR")} DA</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Historique des reversements */}
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="border-b border-border p-4"><h2 className="font-bold">Historique des reversements ({reversements.length})</h2></div>
          {reversements.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Info className="mx-auto mb-2 h-8 w-8" />Aucun reversement effectué pour le moment
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 text-left">Référence</th>
                    <th className="px-4 py-2 text-left">Date</th>
                    <th className="px-4 py-2 text-right">Colis</th>
                    <th className="px-4 py-2 text-right">Montant</th>
                    <th className="px-4 py-2 text-right">Reçu</th>
                  </tr>
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
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}