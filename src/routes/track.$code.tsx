import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Package, MapPin, Clock, Loader2, CheckCircle2, Truck, AlertCircle, Copy } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { SiteFooter } from "@/components/site-footer";
import { STATUTS } from "@/lib/tarifs";
import { getPublicTracking, type PublicEvent, type PublicColis } from "@/lib/tracking.functions";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import logo from "@/assets/logo-light.png";

export const Route = createFileRoute("/track/$code")({
  head: ({ params }) => ({
    meta: [
      { title: `Suivi ${params.code} — REVO EXPRESS` },
      { name: "description", content: `Suivez en temps réel le colis ${params.code}.` },
      { property: "og:title", content: `Suivi de colis ${params.code}` },
      { property: "og:description", content: "Suivi en temps réel — REVO EXPRESS" },
    ],
  }),
  component: TrackPage,
});

function TrackPage() {
  const { code } = Route.useParams();
  const lookup = useServerFn(getPublicTracking);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["public-track", code],
    queryFn: () => lookup({ data: { code } }),
  });

  // Realtime: refetch on any change to this colis
  useEffect(() => {
    if (!data || "notFound" in data) return;
    const id = data.colis.id;
    const ch = supabase
      .channel(`public-track-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "colis", filter: `id=eq.${id}` }, () => refetch())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "colis_historique", filter: `colis_id=eq.${id}` }, () => refetch())
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [data, refetch]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="REVO EXPRESS" className="h-10 w-auto" />
          </Link>
          <Link to="/suivi" className="text-sm text-muted-foreground hover:text-foreground">
            Rechercher un autre colis
          </Link>
        </div>
      </header>

      <section className="bg-gradient-hero py-10 text-white">
        <div className="container mx-auto max-w-2xl px-4">
          <h1 className="text-3xl font-black md:text-4xl">Suivi de colis</h1>
          <p className="mt-1 text-white/80">Numéro de suivi&nbsp;: <span className="font-mono font-bold">{code}</span></p>
        </div>
      </section>

      <section className="flex-1 py-10">
        <div className="container mx-auto max-w-2xl px-4">
          {isLoading && (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {!isLoading && data && "notFound" in data && <NotFoundCard code={code} />}

          {!isLoading && data && !("notFound" in data) && (
            <TrackingCard colis={data.colis} events={data.events} />
          )}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function NotFoundCard({ code }: { code: string }) {
  return (
    <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center">
      <Package className="mx-auto h-12 w-12 text-destructive" />
      <h2 className="mt-3 text-lg font-bold">Colis introuvable</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Aucun colis ne correspond au numéro <span className="font-mono font-semibold">{code}</span>.
      </p>
      <p className="mt-1 text-sm text-muted-foreground">Vérifiez le numéro auprès de l'expéditeur.</p>
    </div>
  );
}

function TrackingCard({ colis, events }: { colis: PublicColis; events: PublicEvent[] }) {
  const [copied, setCopied] = useState(false);

  function copyLink() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast.success("Lien copié");
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="rounded-2xl border border-border bg-card shadow-card">
      <div className="rounded-t-2xl border-b border-border bg-gradient-navy p-6 text-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-white/60">Numéro de suivi</div>
            <div className="font-mono text-2xl font-black">{colis.tracking}</div>
            {colis.destinataire_nom_initial && (
              <div className="mt-1 text-sm text-white/80">Destinataire&nbsp;: {colis.destinataire_nom_initial}</div>
            )}
          </div>
          <StatutBadge statut={colis.statut} />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/80">
          <span className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            {colis.depart || "—"} → {colis.destinataire_wilaya || "—"}
            {colis.destinataire_cp && ` (${colis.destinataire_cp})`}
          </span>
        </div>
        <div className="mt-4">
          <Button onClick={copyLink} variant="secondary" size="sm" className="gap-2">
            <Copy className="h-3.5 w-3.5" />
            {copied ? "Copié !" : "Copier le lien de suivi"}
          </Button>
        </div>
      </div>

      <div className="p-6">
        <h3 className="mb-4 flex items-center gap-2 font-bold">
          <Clock className="h-4 w-4 text-primary" />
          Historique
          <span className="ml-auto inline-flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
            <span className="h-2 w-2 animate-pulse rounded-full bg-success" />
            Mise à jour temps réel
          </span>
        </h3>

        {events.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Aucun évènement enregistré pour le moment.
          </div>
        )}

        <ol className="space-y-4">
          {events.map((e, i) => (
            <li key={e.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full ${
                    i === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  <StatutIcon statut={e.statut} />
                </div>
                {i < events.length - 1 && <div className="mt-1 w-px flex-1 bg-border" />}
              </div>
              <div className="flex-1 pb-4">
                <div className="text-sm font-semibold">{labelOf(e.statut)}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(e.created_at).toLocaleString("fr-FR")}
                  {e.lieu && ` • ${e.lieu}`}
                </div>
                {e.description && <div className="mt-1 text-sm text-muted-foreground">{e.description}</div>}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function labelOf(key: string) {
  return STATUTS.find((s) => s.key === key)?.label ?? key;
}

function StatutIcon({ statut }: { statut: string }) {
  if (statut === "livre") return <CheckCircle2 className="h-4 w-4" />;
  if (statut === "echec") return <AlertCircle className="h-4 w-4" />;
  if (statut === "en-cours" || statut === "pris-en-charge") return <Truck className="h-4 w-4" />;
  return <Package className="h-4 w-4" />;
}

function StatutBadge({ statut }: { statut: string }) {
  const s = STATUTS.find((x) => x.key === statut);
  const colorMap: Record<string, string> = {
    warning: "bg-warning/20 text-warning border-warning/30",
    info: "bg-info/20 text-info border-info/30",
    success: "bg-success/20 text-success border-success/30",
    destructive: "bg-destructive/20 text-destructive border-destructive/30",
  };
  const cls = colorMap[s?.color ?? "info"];
  return (
    <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-bold uppercase ${cls}`}>
      {s?.label ?? statut}
    </span>
  );
}
