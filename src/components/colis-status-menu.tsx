import { useState } from "react";
import { Check, ChevronDown, ChevronLeft, Wallet } from "lucide-react";
import { STATUTS, STATUTS_FREQUENTS } from "@/lib/tarifs";
import { ModalPortal } from "@/components/modal-portal";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useI18n, statutLabel } from "@/hooks/use-i18n";

export type SplitLivraisonInfo = { article1Livre: boolean; article2Livre: boolean; prixColis: number };

// Certains statuts méritent une vraie raison plutôt qu'un simple changement sec —
// ça évite de perdre "pourquoi" dès que l'historique remonte de quelques jours.
const MOTIFS_PAR_STATUT: Record<string, string[]> = {
  "reporte": ["motif.reporte.nouvelleDate", "motif.reporte.absent", "motif.reporte.adresse", "motif.reporte.meteo", "motif.autre"],
};

// 3 niveaux seulement : vert = normal, orange = à surveiller, rouge = problème acté.
const HEX_NORMAL = "#22c55e";
const HEX_ATTENTION = "#f59e0b";
const HEX_PROBLEME = "#dc2626";

const STATUT_HEX: Record<string, string> = {
  "en-preparation": HEX_ATTENTION,
  "ramasse": HEX_NORMAL,
  "expedie": HEX_NORMAL,
  "en-livraison": HEX_NORMAL,
  "contact-client": HEX_ATTENTION,
  "client-injoignable-1": HEX_ATTENTION,
  "client-injoignable-2": HEX_ATTENTION,
  "client-injoignable-3": HEX_ATTENTION,
  "livre": HEX_NORMAL,
  "reporte": HEX_ATTENTION,
  "echec-livraison": HEX_PROBLEME,
  "retourne-vendeur": HEX_PROBLEME,
  "annule": HEX_PROBLEME,
};
const hexFor = (k: string) => STATUT_HEX[k] ?? HEX_ATTENTION;

const PILL_NORMAL = "border-success/40 bg-success/10 text-success";
const PILL_ATTENTION = "border-warning/40 bg-warning/10 text-warning";
const PILL_PROBLEME = "border-destructive/40 bg-destructive/10 text-destructive";

const STATUT_PILL: Record<string, string> = {
  "en-preparation": PILL_ATTENTION,
  "ramasse": PILL_NORMAL,
  "expedie": PILL_NORMAL,
  "en-livraison": PILL_NORMAL,
  "contact-client": PILL_ATTENTION,
  "client-injoignable-1": PILL_ATTENTION,
  "client-injoignable-2": PILL_ATTENTION,
  "client-injoignable-3": PILL_ATTENTION,
  "livre": PILL_NORMAL,
  "reporte": PILL_ATTENTION,
  "echec-livraison": PILL_PROBLEME,
  "retourne-vendeur": PILL_PROBLEME,
  "annule": PILL_PROBLEME,
};
export const pillFor = (k: string) => STATUT_PILL[k] ?? PILL_ATTENTION;
export { hexFor };

export function ColisStatusPill({
  statut, onClick, paid,
}: { statut: string; onClick: () => void; paid?: boolean }) {
  const { t } = useI18n();
  const showPaidBadge = statut === "livre" && paid;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex h-8 max-w-[170px] items-center gap-2 rounded-full border px-3 text-xs font-semibold transition-all hover:opacity-90 ${pillFor(statut)}`}
      >
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: hexFor(statut) }} />
        <span className="min-w-0 flex-1 truncate text-start">{statutLabel(statut, t)}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
      </button>
      {showPaidBadge && (
        <span className="inline-flex h-8 items-center gap-1 rounded-full border border-warning/50 bg-warning text-warning-foreground px-2.5 text-xs font-bold">
          <Wallet className="h-3.5 w-3.5" />
          {t("st.paye.badge")}
        </span>
      )}
    </div>
  );
}

export function ColisStatusModal({
  statutActuel, colis, onChoose, onClose, title,
}: {
  statutActuel: string;
  /** Colis complet — nécessaire pour proposer le pointage des 2 articles sur un colis Split
   * quand on passe au statut "livré". Omis pour un changement groupé (bulk). */
  colis?: any;
  onChoose: (key: string, motif?: string, splitInfo?: SplitLivraisonInfo) => void;
  onClose: () => void;
  title?: string;
}) {
  const { t, tf } = useI18n();
  const [showMore, setShowMore] = useState(false);
  const [pendingStatut, setPendingStatut] = useState<string | null>(null);
  const [motifChoice, setMotifChoice] = useState<string | null>(null);
  const [motifAutre, setMotifAutre] = useState("");
  const isSplitColis = colis?.type_colis === "SPL" && (colis?.split_article1_prix != null || colis?.split_article2_prix != null);
  const [showSplitCheck, setShowSplitCheck] = useState(false);
  const [splitArt1, setSplitArt1] = useState(colis?.split_article1_livre ?? true);
  const [splitArt2, setSplitArt2] = useState(colis?.split_article2_livre ?? true);
  const frequents = STATUTS.filter((s) => STATUTS_FREQUENTS.includes(s.key as any));
  const autres = STATUTS.filter((s) => !STATUTS_FREQUENTS.includes(s.key as any));

  function pick(key: string) {
    if (key === "livre" && isSplitColis) {
      setShowSplitCheck(true);
    } else if (MOTIFS_PAR_STATUT[key]) {
      setPendingStatut(key);
      setMotifChoice(null);
      setMotifAutre("");
    } else {
      onChoose(key);
    }
  }

  function confirmerSplit() {
    const prixColis =
      (splitArt1 ? Number(colis.split_article1_prix ?? 0) : 0) +
      (splitArt2 ? Number(colis.split_article2_prix ?? 0) : 0);
    onChoose("livre", undefined, { article1Livre: splitArt1, article2Livre: splitArt2, prixColis });
  }

  function confirmerMotif() {
    if (!pendingStatut || !motifChoice) return;
    const isAutre = motifChoice === "motif.autre";
    const motifTexte = isAutre ? motifAutre.trim() : t(motifChoice as any);
    if (isAutre && !motifTexte) return;
    onChoose(pendingStatut, motifTexte);
  }

  if (showSplitCheck) {
    const prixColis =
      (splitArt1 ? Number(colis.split_article1_prix ?? 0) : 0) +
      (splitArt2 ? Number(colis.split_article2_prix ?? 0) : 0);
    return (
      <ModalPortal>
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm" onClick={onClose}>
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-4 shadow-card" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowSplitCheck(false)}
              className="mb-2 flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-3.5 w-3.5 rtl:rotate-180" /> {t("csm.motif.back")}
            </button>
            <h3 className="mb-1 text-sm font-bold text-muted-foreground">{t("csm.split.title")}</h3>
            <p className="mb-3 text-xs text-muted-foreground">{t("csm.split.hint")}</p>
            <div className="space-y-2">
              {colis.split_article1_prix != null && (
                <label className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm">
                  <Checkbox checked={splitArt1} onCheckedChange={(v) => setSplitArt1(!!v)} />
                  <span className="flex-1">{colis.split_article1_nom || t("csm.split.article1")}</span>
                  <span className="font-bold">{Number(colis.split_article1_prix).toLocaleString("fr-FR")} DA</span>
                </label>
              )}
              {colis.split_article2_prix != null && (
                <label className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm">
                  <Checkbox checked={splitArt2} onCheckedChange={(v) => setSplitArt2(!!v)} />
                  <span className="flex-1">{colis.split_article2_nom || t("csm.split.article2")}</span>
                  <span className="font-bold">{Number(colis.split_article2_prix).toLocaleString("fr-FR")} DA</span>
                </label>
              )}
            </div>
            <div className="mt-3 flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
              <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{t("csm.split.total")}</span>
              <span className="text-lg font-black text-primary">{prixColis.toLocaleString("fr-FR")} DA</span>
            </div>
            <Button className="mt-4 w-full gap-2 bg-gradient-primary" onClick={confirmerSplit}>
              {t("csm.motif.confirm")}
            </Button>
          </div>
        </div>
      </ModalPortal>
    );
  }

  if (pendingStatut) {
    const motifs = MOTIFS_PAR_STATUT[pendingStatut];
    return (
      <ModalPortal>
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm" onClick={onClose}>
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-4 shadow-card" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPendingStatut(null)}
              className="mb-2 flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-3.5 w-3.5 rtl:rotate-180" /> {t("csm.motif.back")}
            </button>
            <h3 className="mb-3 text-sm font-bold text-muted-foreground">
              {tf("csm.motif.title", { s: statutLabel(pendingStatut, t) })}
            </h3>
            <div className="space-y-1.5">
              {motifs.map((mKey) => {
                const active = motifChoice === mKey;
                return (
                  <button
                    key={mKey}
                    onClick={() => setMotifChoice(mKey)}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-start text-sm font-medium transition-colors ${
                      active ? "bg-primary/10 text-primary" : "hover:bg-muted"
                    }`}
                  >
                    <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${active ? "border-primary bg-primary" : "border-border"}`}>
                      {active && <Check className="h-3 w-3 text-primary-foreground" />}
                    </span>
                    <span className="flex-1">{t(mKey as any)}</span>
                  </button>
                );
              })}
            </div>
            {motifChoice === "motif.autre" && (
              <Input
                value={motifAutre}
                onChange={(e) => setMotifAutre(e.target.value)}
                placeholder={t("csm.motif.autrePlaceholder")}
                className="mt-2"
                autoFocus
              />
            )}
            <Button
              className="mt-4 w-full gap-2 bg-gradient-primary"
              disabled={!motifChoice || (motifChoice === "motif.autre" && !motifAutre.trim())}
              onClick={confirmerMotif}
            >
              {t("csm.motif.confirm")}
            </Button>
          </div>
        </div>
      </ModalPortal>
    );
  }

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
          <h3 className="mb-3 text-sm font-bold text-muted-foreground">{title ?? t("csm.changeStatus")}</h3>
          <div className="grid grid-cols-2 gap-2">
            {frequents.map((s) => {
              const active = statutActuel === s.key;
              return (
                <button
                  key={s.key}
                  onClick={() => pick(s.key)}
                  className={`flex items-center gap-2 rounded-xl border-2 p-3 text-start text-sm font-semibold transition-colors ${
                    active ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"
                  }`}
                >
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: hexFor(s.key) }} />
                  <span className="flex-1">{statutLabel(s.key, t)}</span>
                  {active && <Check className="h-4 w-4 text-primary" />}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setShowMore((v) => !v)}
            className="mt-3 flex w-full items-center justify-center gap-1 rounded-lg py-2 text-xs font-bold text-muted-foreground hover:bg-muted"
          >
            {t("csm.otherStatuses")} <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showMore ? "rotate-180" : ""}`} />
          </button>

          {showMore && (
            <div className="mt-1 grid grid-cols-1 gap-1.5 border-t border-border pt-2">
              {autres.map((s) => {
                const active = statutActuel === s.key;
                return (
                  <button
                    key={s.key}
                    onClick={() => pick(s.key)}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-start text-sm font-medium transition-colors ${
                      active ? "bg-primary/10 text-primary" : "hover:bg-muted"
                    }`}
                  >
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: hexFor(s.key) }} />
                    <span className="flex-1">{statutLabel(s.key, t)}</span>
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