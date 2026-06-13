import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Printer, MapPin, Phone, Package, Clock, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { Bordereau } from "@/components/bordereau";
import { STATUTS } from "@/lib/tarifs";

export const Route = createFileRoute("/_authenticated/colis/$tracking")({
  head: () => ({ meta: [{ title: "Détails du colis — REVO EXPRESS" }] }),
  component: ColisDetailsPage,
});

function ColisDetailsPage() {
  const { tracking } = useParams({ from: "/_authenticated/colis/$tracking" });
  const { user } = useAuth();
  const [colis, setColis] = useState<any>(null);
  const [historique, setHistorique] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBordereau, setShowBordereau] = useState(false);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const { data: c } = await supabase.from("colis").select("*").eq("tracking", tracking).maybeSingle();
      if (!active) return;
      setColis(c);
      if (c) {
        const { data: h } = await supabase.from("colis_historique").select("*").eq("colis_id", c.id).order("created_at", { ascending: true });
        if (active) setHistorique(h ?? []);
      }
      setLoading(false);
    })();
    return () => { active = false; };
  }, [tracking, user]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteNav />
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <SiteFooter />
      </div>
    );
  }

  if (!colis) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteNav />
        <div className="container mx-auto flex-1 px-4 py-20 text-center">
          <Package className="mx-auto h-12 w-12 text-muted-foreground" />
          <h1 className="mt-4 text-2xl font-black">Colis introuvable</h1>
          <p className="mt-2 text-sm text-muted-foreground">Ce numéro de suivi n'existe pas ou ne vous appartient pas.</p>
          <Link to="/mes-colis" className="mt-4 inline-block">
            <Button variant="outline" className="gap-2"><ArrowLeft className="h-4 w-4" /> Mes colis</Button>
          </Link>
        </div>
        <SiteFooter />
      </div>
    );
  }

  const statut = STATUTS.find((s) => s.key === colis.statut);
  const colorMap: Record<string, string> = {
    warning: "bg-warning/20 text-warning border-warning/30",
    info: "bg-info/20 text-info border-info/30",
    success: "bg-success/20 text-success border-success/30",
    destructive: "bg-destructive/20 text-destructive border-destructive/30",
  };
  const badgeCls = colorMap[statut?.color ?? "info"];

  if (showBordereau) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteNav />
        <div className="container mx-auto max-w-3xl px-4 py-10">
          <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
            <Button variant="ghost" onClick={() => setShowBordereau(false)} className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Retour aux détails
            </Button>
            <Button onClick={() => window.print()} className="gap-2 bg-gradient-primary shadow-glow">
              <Printer className="h-4 w-4" /> Imprimer
            </Button>
          </div>
          <Bordereau colis={colis} />
        </div>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <section className="container mx-auto flex-1 px-4 py-10">
        <Link to="/mes-colis" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Mes colis
        </Link>

        {/* Header */}
        <div className="mb-6 rounded-2xl border border-border bg-gradient-navy p-6 text-white">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.3em] text-primary">Numéro de suivi</div>
              <div className="mt-1 font-mono text-2xl font-black md:text-3xl">{colis.tracking}</div>
              <div className="mt-2 text-xs text-white/60">
                Créé le {new Date(colis.date_creation).toLocaleString("fr-FR")}
              </div>
            </div>
            <div className={`rounded-full border px-3 py-1 text-xs font-bold ${badgeCls}`}>
              {statut?.label ?? colis.statut}
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={() => setShowBordereau(true)} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
              <Printer className="h-4 w-4" /> Réimprimer le bordereau
            </Button>
            <Link to="/suivi" search={{ t: colis.tracking } as any}>
              <Button variant="outline" className="gap-2 border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white">
                <Eye className="h-4 w-4" /> Page de suivi public
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div className="grid gap-6 md:grid-cols-2">
              <InfoCard title="Expéditeur" icon={Package}>
                <Line label="Nom" value={colis.expediteur_nom} />
                <Line label="Téléphone" value={colis.expediteur_tel} icon={Phone} />
                <Line label="Adresse" value={colis.expediteur_adresse} icon={MapPin} />
                <Line label="Départ" value={colis.depart ?? "—"} />
              </InfoCard>

              <InfoCard title="Destinataire" icon={MapPin}>
                <Line label="Nom" value={colis.destinataire_nom} />
                <Line label="Téléphone" value={colis.destinataire_tel} icon={Phone} />
                <Line label="Adresse" value={colis.destinataire_adresse} icon={MapPin} />
                <Line label="Wilaya" value={`${colis.destinataire_cp ?? ""} ${colis.destinataire_wilaya ?? ""}`.trim() || "—"} />
              </InfoCard>
            </div>

            <InfoCard title="Détails du colis" icon={Package}>
              <Line label="Description" value={colis.description || "Colis standard"} />
              <Line label="Distance" value={`${colis.distance_km ?? "—"} km`} />
            </InfoCard>

            <InfoCard title="Historique" icon={Clock}>
              {historique.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun événement enregistré.</p>
              ) : (
                <ol className="relative ml-3 space-y-4 border-l border-border pl-6">
                  {historique.map((h) => {
                    const hs = STATUTS.find((s) => s.key === h.statut);
                    return (
                      <li key={h.id} className="relative">
                        <span className="absolute -left-[31px] mt-1.5 flex h-3 w-3 items-center justify-center rounded-full bg-primary ring-4 ring-background" />
                        <div className="text-sm font-bold">{hs?.label ?? h.statut}</div>
                        {h.description && <div className="text-xs text-muted-foreground">{h.description}</div>}
                        <div className="text-xs text-muted-foreground">
                          {new Date(h.created_at).toLocaleString("fr-FR")}
                          {h.lieu ? ` • ${h.lieu}` : ""}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </InfoCard>
          </div>

          {/* Pricing */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-muted-foreground">Récapitulatif</h3>
              <Row label="Prix du colis (COD)" value={`${Number(colis.prix_colis ?? 0)} DA`} />
              <Row label="Frais de livraison" value={`${Number(colis.prix)} DA`} />
              <div className="my-3 h-px bg-border" />
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-bold">Total à encaisser</span>
                <span className="text-3xl font-black text-primary">
                  {Number(colis.prix_colis ?? 0) + Number(colis.prix)} <span className="text-base font-medium text-muted-foreground">DA</span>
                </span>
              </div>
            </div>

            <Button onClick={() => setShowBordereau(true)} className="w-full gap-2 bg-gradient-primary shadow-glow">
              <Printer className="h-4 w-4" /> Réimprimer le bordereau
            </Button>
          </div>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}

function InfoCard({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-bold uppercase tracking-wider">{title}</h3>
      </div>
      <div className="space-y-2.5">{children}</div>
    </div>
  );
}

function Line({ label, value, icon: Icon }: { label: string; value: string; icon?: any }) {
  return (
    <div className="text-sm">
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 flex items-start gap-1.5">
        {Icon && <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
        <span className="font-medium">{value}</span>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}
