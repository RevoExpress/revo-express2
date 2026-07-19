import { X, Package, MapPin, Phone, Calendar, Tag, Ruler } from "lucide-react";
import { TrackingBadge } from "@/components/tracking-badge";
import { STATUTS } from "@/lib/tarifs";
import { ModalPortal } from "@/components/modal-portal";

type ColisDetails = {
  tracking: string;
  type_colis?: string | null;
  date_creation?: string | null;
  date_expedition?: string | null;
  statut: string;
  destinataire_nom: string;
  destinataire_tel: string;
  destinataire_adresse: string;
  destinataire_wilaya?: string | null;
  destinataire_cp?: string | null;
  depart?: string | null;
  description?: string | null;
  prix_colis?: number | null;
  prix?: number | null;
  valeur_declaree?: number | null;
  dimensions?: string | null;
  poids?: number | null;
  produit_retour?: string | null;
  type_livraison?: string | null;
};

function fmtDate(d?: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function ColisDetailsModal({ colis, onClose }: { colis: ColisDetails; onClose: () => void }) {
  const s = STATUTS.find((x) => x.key === colis.statut);
  const colorMap: Record<string, string> = {
    warning: "bg-warning/15 text-warning",
    info: "bg-info/15 text-info",
    success: "bg-success/15 text-success",
    destructive: "bg-destructive/15 text-destructive",
  };

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 px-4 py-10 backdrop-blur-sm"
        onClick={onClose}
      >
        <div
          className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-card"
          onClick={(e) => e.stopPropagation()}
        >
          {/* En-tête */}
          <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
            <div className="flex min-w-0 items-center gap-2">
              <h2 className="shrink-0 font-bold">Détails du colis</h2>
              <span className="truncate rounded-md bg-info/15 px-2 py-0.5 font-mono text-sm font-bold text-info">
                {colis.tracking}
              </span>
              <TrackingBadge typeColis={colis.type_colis} />
            </div>
            <button
              onClick={onClose}
              aria-label="Fermer"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="max-h-[75vh] overflow-y-auto p-5">
            {/* Statut */}
            <div className="mb-4 flex justify-center">
              <span className={`inline-block rounded-full px-4 py-1.5 text-sm font-black ${colorMap[s?.color ?? "info"]}`}>
                {s?.label ?? colis.statut}
              </span>
            </div>

            {/* Dates */}
            <Section icon={Calendar} title="Dates">
              {fmtDate(colis.date_creation) && <Line label="Création" value={fmtDate(colis.date_creation)!} />}
              {fmtDate(colis.date_expedition) && <Line label="Expédition" value={fmtDate(colis.date_expedition)!} />}
            </Section>

            {/* Destinataire */}
            <Section icon={Phone} title="Destinataire">
              <Line label="Nom" value={colis.destinataire_nom} />
              <Line label="Téléphone" value={colis.destinataire_tel} />
              <Line
                label="Adresse"
                value={`${colis.destinataire_adresse}${colis.destinataire_wilaya ? `, ${colis.destinataire_wilaya}` : ""}${colis.destinataire_cp ? ` (${colis.destinataire_cp})` : ""}`}
              />
            </Section>

            {/* Trajet */}
            <Section icon={MapPin} title="Trajet">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-semibold">{colis.depart || "—"}</span>
                <span className="text-muted-foreground">→</span>
                <span className="font-semibold">{colis.destinataire_wilaya || "—"}</span>
                {colis.type_livraison === "urgent" && (
                  <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-xs font-bold text-warning">
                    Urgent
                  </span>
                )}
              </div>
            </Section>

            {/* Contenu / Prix */}
            <Section icon={Tag} title="Colis">
              <Line label="Désignation" value={colis.description || "—"} />
              <Line label="Prix du colis" value={`${Number(colis.prix_colis ?? 0).toLocaleString("fr-FR")} DA`} />
              <Line label="Frais de livraison" value={`${Number(colis.prix ?? 0).toLocaleString("fr-FR")} DA`} />
              {colis.valeur_declaree != null && (
                <Line label="Valeur déclarée" value={`${Number(colis.valeur_declaree).toLocaleString("fr-FR")} DA`} />
              )}
              {colis.produit_retour && <Line label="Produit retour" value={colis.produit_retour} />}
            </Section>

            {/* Dimensions / poids — affichés seulement si connus */}
            {(colis.dimensions || colis.poids) && (
              <Section icon={Ruler} title="Colis physique">
                {colis.dimensions && <Line label="Dimensions" value={colis.dimensions} />}
                {colis.poids != null && <Line label="Poids" value={`${colis.poids} kg`} />}
              </Section>
            )}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

function Section({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4 last:mb-0">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {title}
      </div>
      <div className="space-y-1.5 rounded-lg border border-border bg-secondary/40 p-3">{children}</div>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right font-semibold">{value}</span>
    </div>
  );
}