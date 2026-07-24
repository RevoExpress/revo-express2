import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { STATUTS, STATUTS_FREQUENTS } from "@/lib/tarifs";
import { ModalPortal } from "@/components/modal-portal";

const STATUT_HEX: Record<string, string> = {
  "en-preparation": "#f59e0b",
  "ramasse": "#fdba74",
  "expedie": "#fb923c",
  "en-livraison": "#f97316",
  "contact-client": "#fcd34d",
  "client-injoignable-1": "#fbbf24",
  "client-injoignable-2": "#f97316",
  "client-injoignable-3": "#dc2626",
  "livre": "#22c55e",
  "reporte": "#fcd34d",
  "echec-livraison": "#dc2626",
  "retourne-vendeur": "#f87171",
  "annule": "#9ca3af",
};
const hexFor = (k: string) => STATUT_HEX[k] ?? "#9ca3af";

const STATUT_PILL: Record<string, string> = {
  "en-preparation": "border-warning/40 bg-warning/10 text-warning",
  "ramasse": "border-primary/40 bg-primary/10 text-primary",
  "expedie": "border-primary/40 bg-primary/10 text-primary",
  "en-livraison": "border-primary/50 bg-primary/15 text-primary",
  "contact-client": "border-warning/40 bg-warning/10 text-warning",
  "client-injoignable-1": "border-warning/40 bg-warning/10 text-warning",
  "client-injoignable-2": "border-orange-400/50 bg-orange-500/15 text-orange-600",
  "client-injoignable-3": "border-destructive/40 bg-destructive/10 text-destructive",
  "livre": "border-success/40 bg-success/10 text-success",
  "reporte": "border-warning/40 bg-warning/10 text-warning",
  "echec-livraison": "border-destructive/40 bg-destructive/10 text-destructive",
  "retourne-vendeur": "border-destructive/40 bg-destructive/10 text-destructive",
  "annule": "border-border bg-muted text-muted-foreground",
};
export const pillFor = (k: string) => STATUT_PILL[k] ?? "border-border bg-muted text-muted-foreground";
export { hexFor };

export function ColisStatusPill({
  statut, onClick,
}: { statut: string; onClick: () => void }) {
  const s = STATUTS.find((x) => x.key === statut);
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-8 w-[190px] items-center gap-2 rounded-full border px-3 text-xs font-semibold transition-all hover:opacity-90 ${pillFor(statut)}`}
    >
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: hexFor(statut) }} />
      <span className="flex-1 truncate text-left">{s?.label ?? statut}</span>
      <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
    </button>
  );
}

export function ColisStatusModal({
  statutActuel, onChoose, onClose,
}: { statutActuel: string; onChoose: (key: string) => void; onClose: () => void }) {
  const [showMore, setShowMore] = useState(false);
  const frequents = STATUTS.filter((s) => STATUTS_FREQUENTS.includes(s.key as any));
  const autres = STATUTS.filter((s) => !STATUTS_FREQUENTS.includes(s.key as any));

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm"
        onClick={onClose}
      >
        <div
          className="w-full max-w-sm rounded-2xl border border-border bg-card p-4 shadow-card"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="mb-3 text-sm font-bold text-muted-foreground">Changer le statut</h3>
          <div className="grid grid-cols-2 gap-2">
            {frequents.map((s) => {
              const active = statutActuel === s.key;
              return (
                <button
                  key={s.key}
                  onClick={() => onChoose(s.key)}
                  className={`flex items-center gap-2 rounded-xl border-2 p-3 text-left text-sm font-semibold transition-colors ${
                    active ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"
                  }`}
                >
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: hexFor(s.key) }} />
                  <span className="flex-1">{s.label}</span>
                  {active && <Check className="h-4 w-4 text-primary" />}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setShowMore((v) => !v)}
            className="mt-3 flex w-full items-center justify-center gap-1 rounded-lg py-2 text-xs font-bold text-muted-foreground hover:bg-muted"
          >
            Autres statuts <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showMore ? "rotate-180" : ""}`} />
          </button>

          {showMore && (
            <div className="mt-1 grid grid-cols-1 gap-1.5 border-t border-border pt-2">
              {autres.map((s) => {
                const active = statutActuel === s.key;
                return (
                  <button
                    key={s.key}
                    onClick={() => onChoose(s.key)}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                      active ? "bg-primary/10 text-primary" : "hover:bg-muted"
                    }`}
                  >
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: hexFor(s.key) }} />
                    <span className="flex-1">{s.label}</span>
                    {active && <Check className="h-4 w-4" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </ModalPortal>
  );
}