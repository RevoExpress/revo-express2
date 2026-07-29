import { useState } from "react";
import { Eye, Printer, MessageCircle, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ColisDetailsModal } from "@/components/colis-details-modal";
import { useI18n, statutLabel } from "@/hooks/use-i18n";

function buildWhatsAppLinkDestinataire(colis: any, label: string): string | null {
  const raw = String(colis.destinataire_tel || "").replace(/\D/g, "");
  if (!raw) return null;
  const intl = raw.startsWith("0") ? "213" + raw.slice(1) : raw;
  const origin = typeof window !== "undefined" ? window.location.origin : "https://revo-express.com";
  const url = `${origin}/track/${colis.tracking}`;
  const msg = `Bonjour ${colis.destinataire_nom || ""}, votre colis ${colis.tracking} est actuellement : ${label}. Suivez-le ici : ${url}`;
  return `https://wa.me/${intl}?text=${encodeURIComponent(msg)}`;
}

function buildWhatsAppLinkExpediteur(colis: any, label: string): string | null {
  const raw = String(colis.expediteur_tel || "").replace(/\D/g, "");
  if (!raw) return null;
  const intl = raw.startsWith("0") ? "213" + raw.slice(1) : raw;
  const origin = typeof window !== "undefined" ? window.location.origin : "https://revo-express.com";
  const url = `${origin}/track/${colis.tracking}`;
  const msg = `Bonjour ${colis.expediteur_nom || ""}, concernant votre colis ${colis.tracking} (destinataire : ${colis.destinataire_nom || "—"}) — statut actuel : ${label}. Suivi : ${url}`;
  return `https://wa.me/${intl}?text=${encodeURIComponent(msg)}`;
}

export function TrackingActions({ colis, size = "icon", hidePrint = false }: { colis: any; size?: "icon" | "sm"; hidePrint?: boolean }) {
  const { t } = useI18n();
  const [showDetails, setShowDetails] = useState(false);
  const label = statutLabel(colis.statut, t) ?? colis.statut;
  const waLinkDestinataire = buildWhatsAppLinkDestinataire(colis, label);
  const waLinkExpediteur = buildWhatsAppLinkExpediteur(colis, label);

  return (
    <>
      <div className="flex items-center gap-1">
        <Button
          size={size as any}
          variant="outline"
          className={size === "icon" ? "h-8 w-8 text-info" : "gap-1.5 text-info"}
          onClick={() => setShowDetails(true)}
          title={t("ta.viewDetails")}
        >
          <Eye className="h-4 w-4" />
          {size !== "icon" && t("common.details")}
        </Button>
        {!hidePrint && (
          <Button
            size={size as any}
            variant="outline"
            className={size === "icon" ? "h-8 w-8 text-info" : "gap-1.5 text-info"}
            onClick={() => window.open(`/print/${colis.tracking}`, "_blank")}
            title={t("ta.print")}
          >
            <Printer className="h-4 w-4" />
            {size !== "icon" && t("common.print")}
          </Button>
        )}
        {waLinkDestinataire && (
          <Button
            size={size as any}
            variant="outline"
            className={size === "icon" ? "h-8 w-8 text-success hover:bg-success/10" : "gap-1.5 text-success hover:bg-success/10"}
            onClick={() => window.open(waLinkDestinataire, "_blank")}
            title={t("ta.waRecipientTitle")}
          >
            <MessageCircle className="h-4 w-4" />
            {size !== "icon" && t("ta.waRecipient")}
          </Button>
        )}
        {waLinkExpediteur && (
          <Button
            size={size as any}
            variant="outline"
            className={size === "icon" ? "h-8 w-8 text-success hover:bg-success/10" : "gap-1.5 text-success hover:bg-success/10"}
            onClick={() => window.open(waLinkExpediteur, "_blank")}
            title={t("ta.waSenderTitle")}
          >
            <Store className="h-4 w-4" />
            {size !== "icon" && t("ta.waSender")}
          </Button>
        )}
      </div>

      {showDetails && (
        <ColisDetailsModal colis={colis} onClose={() => setShowDetails(false)} />
      )}
    </>
  );
}