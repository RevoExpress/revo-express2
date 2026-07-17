import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  Package, MapPin, Clock, Loader2, CheckCircle2, Truck, AlertCircle, Copy,
  Box, Send, PhoneCall, CalendarClock, Undo2, XCircle,
} from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteFooter } from "@/components/site-footer";
import { STATUTS } from "@/lib/tarifs";
import { TrackingBadge } from "@/components/tracking-badge";
import { getPublicTracking, type PublicEvent, type PublicColis } from "@/lib/tracking.functions";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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

  // Temps réel : rafraîchit à chaque changement sur ce colis
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

// ─── Frise de progression ───────────────────────────────────────
// Les 5 grandes étapes du parcours normal d'un colis
const ETAPES = [
  { key: "en-preparation", label: "Préparation", icon: Package },
  { key: "ramasse", label: "Ramassé", icon: Box },
  { key: "expedie", label: "Expédié", icon: Send },
  { key: "en-livraison", label: "En livraison", icon: Truck },
  { key: "livre", label: "Livré", icon: CheckCircle2 },
] as const;

// Position du colis sur la frise selon son statut
function etapeIndex(statut: string): number {
  const i = ETAPES.findIndex((e) => e.key === statut);
  if (i !== -1) return i;
  // Contact client / Reporté : le colis est dans la phase "en livraison"
  if (statut === "contact-client" || statut === "reporte") return 3;
  // Échec / retour / annulé : la frise s'arrête, le bandeau explique
  return 3;
}

// Bandeaux d'information pour les statuts particuliers
const BANDEAUX: Record<string, { icon: any; titre: string; texte: string; tone: "warning" | "destructive" | "muted" }> = {
  "contact-client": {
    icon: PhoneCall,
    titre: "Nous essayons de vous joindre",
    texte: "Notre livreur tente de vous contacter pour organiser la livraison. Merci de rester joignable.",
    tone: "warning",
  },
  "reporte": {
    icon: CalendarClock,
    titre: "Livraison reportée",
    texte: "La livraison a été reportée. Elle sera reprogrammée très prochainement.",
    tone: "warning",
  },
  "echec-livraison": {
    icon: AlertCircle,
    titre: "Échec de livraison",
    texte: "La livraison n'a pas pu aboutir. L'expéditeur a été informé.",
    tone: "destructive",
  },
  "retourne-vendeur": {
    icon: Undo2,
    titre: "Colis retourné à l'expéditeur",
    texte: "Ce colis a été retourné à l'expéditeur. Contactez-le pour plus d'informations.",
    tone: "destructive",
  },
  "annule": {
    icon: XCircle,
    titre: "Commande annulée",
    texte: "Cette commande a été annulée par l'expéditeur.",
    tone: "muted",
  },
};

function Progression({ statut }: { statut: string }) {
  const current = etapeIndex(statut);
  const negatif = ["echec-livraison", "retourne-vendeur", "annule"].includes(statut);
  const livre = statut === "livre";

  return (
    <div className="relative">
      {/* Barre de fond + barre de progression */}
      <div className="absolute left-0 right-0 top-5 mx-8 h-1 rounded-full bg-muted sm:mx-10" />
      <div
        className={cn(
          "absolute left-0 top-5 ml-8 h-1 rounded-full transition-all duration-700 sm:ml-10",
          negatif ? "bg-muted-foreground/40" : livre ? "bg-success" : "bg-primary",
        )}
        style={{ width: `calc((100% - ${64}px) * ${current / (ETAPES.length - 1)})` }}
      />

      <ol className="relative flex justify-between">
        {ETAPES.map((e, i) => {
          const done = i < current || livre;
          const active = i === current && !livre && !negatif;
          const Icon = e.icon;
          return (
            <li key={e.key} className="flex w-16 flex-col items-center sm:w-20">
              <div
                className={cn(
                  "relative flex h-10 w-10 items-center justify-center rounded-full border-2 bg-card transition-colors",
                  done && !negatif && "border-success bg-success text-white",
                  done && negatif && "border-muted-foreground/40 bg-muted text-muted-foreground",
                  active && "border-primary bg-primary text-white shadow-glow",
                  !done && !active && "border-border text-muted-foreground",
                )}
              >
                {active && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-30" />
                )}
                <Icon className="relative h-5 w-5" />
              </div>
              <span
                className={cn(
                  "mt-2 text-center text-[10px] font-bold uppercase leading-tight sm:text-[11px]",
                  active ? "text-primary" : done && !negatif ? "text-success" : "text-muted-foreground",
                )}
              >
                {e.label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function Bandeau({ statut }: { statut: string }) {
  const b = BANDEAUX[statut];
  if (!b) return null;
  const Icon = b.icon;
  const tones = {
    warning: "border-warning/40 bg-warning/10 text-warning",
    destructive: "border-destructive/40 bg-destructive/10 text-destructive",
    muted: "border-border bg-muted text-muted-foreground",
  };
  return (
    <div className={cn("mt-6 flex items-start gap-3 rounded-xl border p-4", tones[b.tone])}>
      <Icon className="mt-0.5 h-5 w-5 shrink-0" />
      <div>
        <div className="font-bold">{b.titre}</div>
        <div className="mt-0.5 text-sm opacity-90">{b.texte}</div>
      </div>
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
            <div className="font-mono text-2xl font-black">
              {colis.tracking}
              <TrackingBadge typeColis={(colis as any).type_colis} />
            </div>
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

      {/* Frise de progression */}
      <div className="border-b border-border px-4 py-8 sm:px-6">
        <Progression statut={colis.statut} />
        <Bandeau statut={colis.statut} />
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
  if (statut === "echec-livraison" || statut === "retourne-vendeur") return <AlertCircle className="h-4 w-4" />;
  if (statut === "annule") return <XCircle className="h-4 w-4" />;
  if (statut === "contact-client") return <PhoneCall className="h-4 w-4" />;
  if (statut === "reporte") return <CalendarClock className="h-4 w-4" />;
  if (statut === "expedie" || statut === "en-livraison" || statut === "ramasse") return <Truck className="h-4 w-4" />;
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