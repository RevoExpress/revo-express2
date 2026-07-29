import { X, Package, MapPin, Phone, Calendar, Tag, Ruler } from "lucide-react";
import { TrackingBadge } from "@/components/tracking-badge";
import { STATUTS } from "@/lib/tarifs";
import { ModalPortal } from "@/components/modal-portal";
import { useI18n, Ltr, statutLabel } from "@/hooks/use-i18n";

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
  const { t } = useI18n();
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
              <h2 className="shrink-0 font-bold">{t("cdm.title")}</h2>
              <Ltr className="truncate rounded-md bg-info/15 px-2 py-0.5 font-mono text-sm font-bold text-info">
                {colis.tracking}
              </Ltr>
              <TrackingBadge typeColis={colis.type_colis} />
            </div>
            <button
              onClick={onClose}
              aria-label={t("common.close")}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="max-h-[75vh] overflow-y-auto p-5">
            {/* Statut */}
            <div className="mb-4 flex justify-center">
              <span className={`inline-block rounded-full px-4 py-1.5 text-sm font-black ${colorMap[s?.color ?? "info"]}`}>
                {statutLabel(colis.statut, t)}
              </span>
            </div>

            {/* Dates */}
            <Section icon={Calendar} title={t("cdm.dates")}>
              {fmtDate(colis.date_creation) && <Line label={t("cdm.creation")} value={fmtDate(colis.date_creation)!} ltr />}
              {fmtDate(colis.date_expedition) && <Line label={t("cdm.expedition")} value={fmtDate(colis.date_expedition)!} ltr />}
            </Section>

            {/* Destinataire */}
            <Section icon={Phone} title={t("cdm.recipient")}>
              <Line label={t("cdm.name")} value={colis.destinataire_nom} />
              <Line label={t("cdm.phone")} value={colis.destinataire_tel} ltr />
              <Line
                label={t("cdm.address")}
                value={`${colis.destinataire_adresse}${colis.destinataire_wilaya ? `, ${colis.destinataire_wilaya}` : ""}${colis.destinataire_cp ? ` (${colis.destinataire_cp})` : ""}`}
              />
            </Section>

            {/* Trajet */}
            <Section icon={MapPin} title={t("cdm.trip")}>
              <div className="flex items-center gap-2 text-sm">
                <span className="font-semibold">{colis.depart || "—"}</span>
                <span className="text-muted-foreground rtl:-scale-x-100">→</span>
                <span className="font-semibold">{colis.destinataire_wilaya || "—"}</span>
                {colis.type_livraison === "urgent" && (
                  <span className="ms-1 inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-xs font-bold text-warning">
                    {t("common.urgent")}
                  </span>
                )}
              </div>
            </Section>

            {/* Contenu / Prix */}
            <Section icon={Tag} title={t("cdm.colis")}>
              <Line label={t("cdm.designation")} value={colis.description || "—"} />
              <Line label={t("cdm.colisPrice")} value={`${Number(colis.prix_colis ?? 0).toLocaleString("fr-FR")} DA`} ltr />
              <Line label={t("cdm.deliveryFees")} value={`${Number(colis.prix ?? 0).toLocaleString("fr-FR")} DA`} ltr />
              {colis.valeur_declaree != null && (
                <Line label={t("cdm.declaredValue")} value={`${Number(colis.valeur_declaree).toLocaleString("fr-FR")} DA`} ltr />
              )}
              {colis.produit_retour && <Line label={t("cdm.returnProduct")} value={colis.produit_retour} />}
            </Section>

            {/* Dimensions / poids — affichés seulement si connus */}
            {(colis.dimensions || colis.poids) && (
              <Section icon={Ruler} title={t("cdm.physicalPackage")}>
                {colis.dimensions && <Line label={t("cdm.dimensions")} value={colis.dimensions} />}
                {colis.poids != null && <Line label={t("cdm.weight")} value={`${colis.poids} kg`} ltr />}
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

function Line({ label, value, ltr }: { label: string; value: string; ltr?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span dir={ltr ? "ltr" : undefined} className="text-end font-semibold">{value}</span>
    </div>
  );
}