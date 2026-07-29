import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  Package, MapPin, Clock, Loader2, CheckCircle2, Truck, AlertCircle, Copy,
  Box, Send, PhoneCall, CalendarClock, Undo2, XCircle, Eye, Printer, MessageCircle,
} from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteFooter } from "@/components/site-footer";
import { STATUTS } from "@/lib/tarifs";
import { TrackingBadge } from "@/components/tracking-badge";
import { ColisDetailsModal } from "@/components/colis-details-modal";
import { getPublicTracking, type PublicEvent } from "@/lib/tracking.functions";
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
    <div className="flex min-h-screen flex-col bg-muted/30">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="REVO EXPRESS" className="h-9 w-auto" />
          </Link>
          <Link to="/suivi" className="text-sm text-muted-foreground hover:text-foreground">
            Rechercher un autre colis
          </Link>
        </div>
      </header>

      <section className="flex-1 pb-24 pt-12">
        <div className="container mx-auto max-w-xl px-4">
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
    <div className="rounded-2xl border border-border bg-card p-10 text-center shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)]">
      <Package className="mx-auto h-10 w-10 text-muted-foreground" />
      <h2 className="mt-4 text-lg font-semibold">Colis introuvable</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Aucun colis ne correspond au numéro <span className="font-mono">{code}</span>.
      </p>
      <p className="mt-1 text-sm text-muted-foreground">Vérifiez le numéro auprès de l'expéditeur.</p>
    </div>
  );
}

const ETAPES = [
  { key: "en-preparation", label: "Préparation", icon: Package },
  { key: "ramasse", label: "Ramassé", icon: Box },
  { key: "expedie", label: "Expédié", icon: Send },
  { key: "en-livraison", label: "En livraison", icon: Truck },
  { key: "livre", label: "Livré", icon: CheckCircle2 },
] as const;

function etapeIndex(statut: string): number {
  const i = ETAPES.findIndex((e) => e.key === statut);
  if (i !== -1) return i;
  if (statut === "contact-client" || statut === "reporte") return 3;
  return 3;
}

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
      <div className="absolute left-0 right-0 top-[9px] mx-[9%] h-px bg-border" />
      <div
        className={cn(
          "absolute left-0 top-[9px] ml-[9%] h-[2px] transition-all duration-700",
          negatif ? "bg-muted-foreground/40" : "bg-primary",
        )}
        style={{ width: `calc((82%) * ${current / (ETAPES.length - 1)})` }}
      />

      <ol className="relative flex justify-between">
        {ETAPES.map((e, i) => {
          const done = i < current || livre;
          const active = i === current && !livre && !negatif;
          const failed = i === current && negatif && !livre;
          return (
            <li key={e.key} className="flex w-14 flex-col items-center">
              <div
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full transition-colors",
                  done && !active && !failed && "bg-foreground",
                  active && "bg-primary shadow-[0_2px_6px_rgba(217,119,6,0.35)]",
                  failed && "bg-destructive shadow-[0_2px_6px_rgba(220,38,38,0.35)]",
                  !done && !active && !failed && "border border-border bg-card",
                )}
              >
                {failed && <XCircle className="h-3.5 w-3.5 text-destructive-foreground" strokeWidth={2.5} />}
              </div>
              <span
                className={cn(
                  "mt-3 text-center text-[10px] font-medium leading-tight",
                  active ? "text-primary" : failed ? "text-destructive" : done ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {failed ? "Échec" : e.label}
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
    warning: "border-warning/30 bg-warning/5 text-warning",
    destructive: "border-destructive/30 bg-destructive/5 text-destructive",
    muted: "border-border text-muted-foreground",
  };
  return (
    <div className={cn("mt-6 flex items-start gap-3 rounded-lg border p-4", tones[b.tone])}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <div className="text-sm font-semibold">{b.titre}</div>
        <div className="mt-0.5 text-sm opacity-90">{b.texte}</div>
      </div>
    </div>
  );
}

function TrackingCard({ colis, events }: { colis: any; events: PublicEvent[] }) {
  const [copied, setCopied] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const statut = STATUTS.find((s) => s.key === colis.statut);

  const colorMap: Record<string, string> = {
    warning: "bg-warning/15 text-warning",
    info: "bg-info/15 text-info",
    success: "bg-success/15 text-success",
    destructive: "bg-destructive/15 text-destructive",
  };
  const dotMap: Record<string, string> = {
    warning: "bg-warning", info: "bg-info", success: "bg-success", destructive: "bg-destructive",
  };

  function copyLink() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast.success("Lien copié");
    setTimeout(() => setCopied(false), 1500);
  }

  const waLink = (() => {
    const raw = String(colis.destinataire_tel || "").replace(/\D/g, "");
    if (!raw) return null;
    const intl = raw.startsWith("0") ? "213" + raw.slice(1) : raw;
    const origin = typeof window !== "undefined" ? window.location.origin : "https://revo-express.com";
    const url = `${origin}/track/${colis.tracking}`;
    const msg = `Bonjour, votre colis ${colis.tracking} est actuellement : ${statut?.label ?? colis.statut}. Suivez-le ici : ${url}`;
    return `https://wa.me/${intl}?text=${encodeURIComponent(msg)}`;
  })();

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-7 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)]">
        <div className="text-center">
          <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Numéro de suivi</div>
          <div className="mt-1.5 font-mono text-3xl font-semibold tracking-tight">
            {colis.tracking}
            <TrackingBadge typeColis={colis.type_colis} />
          </div>
        </div>

        <div className="mt-5 text-center">
          <span className={cn("inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold", colorMap[statut?.color ?? "info"])}>
            <span className={cn("h-1.5 w-1.5 rounded-full", dotMap[statut?.color ?? "info"])} />
            {(statut?.label ?? colis.statut).toUpperCase()}
          </span>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2.5 border-t border-border pt-5 text-sm text-muted-foreground">
          <span>{colis.depart || "—"}</span>
          <MapPin className="h-3.5 w-3.5 text-border" />
          <span className="font-semibold text-foreground">
            {colis.destinataire_commune || colis.destinataire_wilaya || "—"}
            {colis.destinataire_commune ? `, ${colis.destinataire_wilaya}` : ""}
          </span>
        </div>

        <div className="mt-8 border-t border-border pt-8">
          <Progression statut={colis.statut} />
          <Bandeau statut={colis.statut} />
        </div>

        <div className="mt-8 flex gap-2">
          <Button onClick={copyLink} variant="ghost" size="sm" className="flex-1 gap-2 bg-muted font-medium hover:bg-muted/70">
            <Copy className="h-3.5 w-3.5" />
            {copied ? "Copié !" : "Copier le lien"}
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 bg-muted hover:bg-muted/70" title="Voir les détails" onClick={() => setShowDetails(true)}>
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 bg-muted hover:bg-muted/70" title="Imprimer le bordereau" onClick={() => window.open(`/print/${colis.tracking}`, "_blank")}>
            <Printer className="h-4 w-4" />
          </Button>
          {waLink && (
            <Button variant="ghost" size="icon" className="h-9 w-9 bg-success/10 text-success hover:bg-success/20" title="WhatsApp" onClick={() => window.open(waLink, "_blank")}>
              <MessageCircle className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-7 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)]">
        <div className="mb-5 flex items-center gap-2 text-sm font-semibold">
          <Clock className="h-4 w-4 text-muted-foreground" />
          Historique
          <span className="ml-auto flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
            Temps réel
          </span>
        </div>

        {events.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Aucun évènement enregistré pour le moment.
          </div>
        )}

        <ol className="space-y-4">
          {events.map((e) => (
            <li key={e.id} className="flex gap-4 text-sm">
              <div className="w-16 shrink-0 pt-0.5 font-mono text-xs text-muted-foreground">
                {new Date(e.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
              </div>
              <div>
                <div className="font-medium">{labelOf(e.statut)}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {new Date(e.created_at).toLocaleDateString("fr-FR")}
                  {e.lieu && ` • ${e.lieu}`}
                </div>
                {e.description && <div className="mt-1 text-xs text-muted-foreground">{e.description}</div>}
              </div>
            </li>
          ))}
        </ol>
      </div>

      {showDetails && <ColisDetailsModal colis={colis} onClose={() => setShowDetails(false)} />}
    </div>
  );
}

function labelOf(key: string) {
  return STATUTS.find((s) => s.key === key)?.label ?? key;
}