import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Package, Phone, MapPin, Store } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { TrackingBadge } from "@/components/tracking-badge";
import { TrackingActions } from "@/components/tracking-actions";
import { STATUTS } from "@/lib/tarifs";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/boutique/$id")({
  head: () => ({ meta: [{ title: "Fiche boutique — REVO EXPRESS" }] }),
  component: BoutiquePage,
});

function BoutiquePage() {
  const { id } = useParams({ from: "/_authenticated/boutique/$id" });
  const [profil, setProfil] = useState<any>(null);
  const [colis, setColis] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: p }, { data: c }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", id).maybeSingle(),
        supabase.from("colis").select("*").eq("client_id", id).order("date_creation", { ascending: false }),
      ]);
      setProfil(p);
      setColis(c || []);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const totalCOD = colis.filter((c) => c.statut === "livre").reduce((s, c) => s + Number(c.prix_colis ?? 0), 0);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <section className="container mx-auto flex-1 px-4 py-10">
        <Link to="/admin" className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Retour
        </Link>

        <div className="mb-6 flex items-center gap-4 rounded-2xl border border-border bg-card p-6 shadow-card">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Store className="h-7 w-7" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-black">{profil?.nom_boutique || profil?.nom || "Client"}</h1>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {profil?.telephone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{profil.telephone}</span>}
              {profil?.adresse && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{profil.adresse}</span>}
            </div>
          </div>
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="text-xs font-bold uppercase text-muted-foreground">Total colis</div>
            <div className="mt-1 text-2xl font-black">{colis.length}</div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="text-xs font-bold uppercase text-muted-foreground">Livrés</div>
            <div className="mt-1 text-2xl font-black text-success">{colis.filter((c) => c.statut === "livre").length}</div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="text-xs font-bold uppercase text-muted-foreground">COD total encaissé</div>
            <div className="mt-1 text-2xl font-black text-primary">{totalCOD.toLocaleString("fr-FR")} DA</div>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="border-b border-border p-4"><h2 className="font-bold">Tous les colis ({colis.length})</h2></div>
          {colis.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground"><Package className="mx-auto mb-2 h-8 w-8" />Aucun colis</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">Tracking</th>
                    <th className="px-3 py-2 text-left">Destinataire</th>
                    <th className="px-3 py-2 text-left">Trajet</th>
                    <th className="px-3 py-2 text-left">Statut</th>
                    <th className="px-3 py-2 text-right">Prix</th>
                    <th className="px-3 py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {colis.map((c) => (
                    <tr key={c.id} className="hover:bg-accent/40">
                      <td className="px-3 py-2 font-mono text-xs">{c.tracking}<TrackingBadge typeColis={c.type_colis} /></td>
                      <td className="px-3 py-2">{c.destinataire_nom}<div className="text-xs text-muted-foreground">{c.destinataire_tel}</div></td>
                      <td className="px-3 py-2 text-xs">{c.depart} → {c.destinataire_wilaya}</td>
                      <td className="px-3 py-2">
                        <span className="inline-block rounded-full bg-muted px-2 py-0.5 text-xs font-bold">
                          {STATUTS.find((s) => s.key === c.statut)?.label ?? c.statut}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-bold">{c.prix_colis} DA</td>
                      <td className="px-3 py-2 text-right"><div className="flex justify-end"><TrackingActions colis={c} /></div></td>
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