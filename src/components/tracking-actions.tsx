import { useState } from "react";
import { Eye, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ColisDetailsModal } from "@/components/colis-details-modal";

// Icônes réutilisables à poser à côté de chaque tracking :
// 🖨️ imprime le bordereau (nouvel onglet) — 👁️ ouvre la fiche complète (fenêtre)
export function TrackingActions({ colis, size = "icon" }: { colis: any; size?: "icon" | "sm" }) {
  const [showDetails, setShowDetails] = useState(false);

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
      </div>

      {showDetails && (
        <ColisDetailsModal colis={colis} onClose={() => setShowDetails(false)} />
      )}
    </>
  );
}