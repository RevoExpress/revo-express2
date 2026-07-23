import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Package, Phone, MapPin, Store } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { TrackingBadge } from "@/components/tracking-badge";
import { TrackingActions } from "@/components/tracking-actions";
import { ClientDashboardPanel } from "@/components/client-dashboard-panel";
import { ColisStatusPill, ColisStatusModal } from "@/components/colis-status-menu";
import { Button } from "@/components/ui/button";
import { STATUTS } from "@/lib/tarifs";
import { Loader2, Pencil, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/boutique/$id")({
  head: () => ({ meta: [{ title: "Fiche boutique — REVO EXPRESS" }] }),
  component: BoutiquePage,
});

function BoutiquePage() {
  const { id } = useParams({ from: "/_authenticated/boutique/$id" });
  const [profil, setProfil] = useState<any>(null);
  const [colis, setColis] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [statutColis, setStatutColis] = useState<any | null>(null);
  const [filtreStatut, setFiltreStatut] = useState<string>("tous");

  async function load() {
    const [{ data: p }, { data: c }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", id).maybeSingle(),
      supabase.from("colis").select("*").eq("client_id", id).order("date_creation", { ascending: false }),
    ]);
    setProfil(p);
    setColis(c || []);
    setLoading(false);
  }

  useEffect(() => { void load(); }, [id]);

  async function handleDelete(c: any) {
    const ok = window.confirm(`Supprimer définitivement le colis ${c.tracking} ?\n\nCette action est irréversible.`);
    if (!ok) return;
    setDeletingId(c.id);
    const { error } = await supabase.from("colis").delete().eq("id", c.id);
    setDeletingId(null);
    if (error) { toast.error("Échec de la suppression", { description: error.message }); return; }
    toast.success(`Colis ${c.tracking} supprimé`);
    setColis((prev) => prev.filter((x) => x.id !== c.id));
  }

  async function updateStatut(colisId: string, statut: string) {
    const { error } = await supabase.from("colis").update({ statut }).eq("id", colisId);
    if (error) { toast.error(error.message); return; }
    toast.success(`Statut : ${STATUTS.find((s) => s.key === statut)?.label ?? statut}`);
    setColis((prev) => prev.map((c) => (c.id === colisId ? { ...c, statut } : c)));
  }

  const countByStatut = useMemo(() => {
    const m: Record<string, number> = {};
    colis.forEach((c) => { m[c.statut] = (m[c.statut] ?? 0) + 1; });
    return m;
  }, [colis]);

  const colisAffiches = useMemo(() => {
    if (filtreStatut === "tous") return colis;
    return colis.filter((c) => c.statut === filtreStatut);
  }, [colis, filtreStatut]);

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

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

        {/* Statistiques du client (même panneau que /mes-colis) */}
        <ClientDashboardPanel colis={colis} />

        {/* Filtre par statut, comme mes-colis */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setFiltreStatut("tous")}
            className={`inline-flex items-center rounded-full border border-border bg-card px-3 py-1 text-xs font-bold transition-colors hover:bg-muted ${filtreStatut === "tous" ? "ring-2 ring-primary bg-primary text-primary-foreground border-primary" : "text-foreground"}`}
          >
            Tous <span className="ml-1 rounded-full bg-background/30 px-1.5 text-[10px]">{colis.length}</span>
          </button>
          {STATUTS.map((s) => (
            <button
              key={s.key}
              onClick={() => setFiltreStatut(s.key)}
              className={`inline-flex items-center rounded-full border border-border bg-card px-3 py-1 text-xs font-bold transition-colors hover:bg-muted ${filtreStatut === s.key ? "ring-2 ring-primary bg-primary text-primary-foreground border-primary" : "text-foreground"}`}
            >
              {s.label} <span className="ml-1 rounded-full bg-background/30 px-1.5 text-[10px]">{countByStatut[s.key] ?? 0}</span>
            </button>
          ))}
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="border-b border-border p-4"><h2 className="font-bold">Colis ({colisAffiches.length})</h2></div>
          {colisAffiches.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground"><Package className="mx-auto mb-2 h-8 w-8" />Aucun colis</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">Tracking</th>
                    <th className="px-3 py-2 text-left">Destinataire</th>
                    <th className="px-3 py-2 text-left">Destination</th>
                    <th className="px-3 py-2 text-left">Statut</th>
                    <th className="px-3 py-2 text-right">Prix</th>
                    <th className="px-3 py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {colisAffiches.map((c) => {
                    const premierMot = c.description ? c.description.trim().split(/\s+/)[0] : null;
                    return (
                      <tr key={c.id} className="hover:bg-accent/40">
                        <td className="px-3 py-2 font-mono text-xs">{c.tracking}<TrackingBadge typeColis={c.type_colis} /></td>
                        <td className="px-3 py-2">
                          <div>{c.destinataire_nom}</div>
                          <div className="text-xs text-muted-foreground">
                            {c.destinataire_tel}
                            {premierMot && <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">{premierMot}…</span>}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-1">
                            <span className="inline-block rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                              {c.destinataire_wilaya || "—"}
                            </span>
                            {c.destinataire_commune && (
                              <span className="inline-block rounded-full bg-info/15 px-2 py-0.5 text-xs font-bold text-info">
                                {c.destinataire_commune}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <ColisStatusPill statut={c.statut} onClick={() => setStatutColis(c)} />
                        </td>
                        <td className="px-3 py-2 text-right font-bold">{c.prix_colis} DA</td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex justify-end gap-1">
                            <TrackingActions colis={c} />
                            <Link to="/commander" search={{ colis: c.id } as any}>
                              <Button size="icon" variant="outline" className="h-8 w-8 text-muted-foreground" title="Modifier">
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                              title="Supprimer"
                              disabled={deletingId === c.id}
                              onClick={() => void handleDelete(c)}
                            >
                              {deletingId === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {statutColis && (
        <ColisStatusModal
          statutActuel={statutColis.statut}
          onChoose={(key) => { void updateStatut(statutColis.id, key); setStatutColis(null); }}
          onClose={() => setStatutColis(null)}
        />
      )}

      <SiteFooter />
    </div>
  );
}