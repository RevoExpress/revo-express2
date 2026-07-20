import { useState } from "react";
import { Eye, Printer, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ColisDetailsModal } from "@/components/colis-details-modal";
import { STATUTS } from "@/lib/tarifs";

function buildWhatsAppLink(colis: any): string | null {
  const raw = String(colis.destinataire_tel || "").replace(/\D/g, "");
  if (!raw) return null;
  const intl = raw.startsWith("0") ? "213" + raw.slice(1) : raw;
  const statutLabel = STATUTS.find((s) => s.key === colis.statut)?.label ?? colis.statut;
  const origin = typeof window !== "undefined" ? window.location.origin : "https://revo-express.com";
  const url = `${origin}/track/${colis.tracking}`;
  const msg = `Bonjour ${colis.destinataire_nom || ""}, votre colis ${colis.tracking} est actuellement : ${statutLabel}. Suivez-le ici : ${url}`;
  return `https://wa.me/${intl}?text=${encodeURIComponent(msg)}`;
}

export function TrackingActions({ colis, size = "icon" }: { colis: any; size?: "icon" | "sm" }) {
  const [showDetails, setShowDetails] = useState(false);
  const waLink = buildWhatsAppLink(colis);

  return (
    <>
      <div className="flex items-center gap-1">
        <Button
          size={size as any}
          variant="outline"
          className={size === "icon" ? "h-8 w-8 text-info" : "gap-1.5 text-info"}
          onClick={() => setShowDetails(true)}
          title="Voir les détails"
        >
          <Eye className="h-4 w-4" />
          {size !== "icon" && "Détails"}
        </Button>
        <Button
          size={size as any}
          variant="outline"
          className={size === "icon" ? "h-8 w-8 text-info" : "gap-1.5 text-info"}
          onClick={() => window.open(`/print/${colis.tracking}`, "_blank")}
          title="Imprimer le bordereau"
        >
          <Printer className="h-4 w-4" />
          {size !== "icon" && "Imprimer"}
        </Button>
        {waLink && (
          <Button
            size={size as any}
            variant="outline"
            className={size === "icon" ? "h-8 w-8 text-success hover:bg-success/10" : "gap-1.5 text-success hover:bg-success/10"}
            onClick={() => window.open(waLink, "_blank")}
            title="Envoyer le suivi par WhatsApp"
          >
            <MessageCircle className="h-4 w-4" />
            {size !== "icon" && "WhatsApp"}
          </Button>
        )}
      </div>

      {showDetails && (
        <ColisDetailsModal colis={colis} onClose={() => setShowDetails(false)} />
      )}
    </>
  );
}