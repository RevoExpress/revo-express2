import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { X, Loader2, Clock, ArrowRight, Package, MessageSquare, MessageCircle, Pencil, Copy } from "lucide-react";
import { toast } from "sonner";
import { getPublicTracking, type PublicEvent } from "@/lib/tracking.functions";
import { supabase } from "@/integrations/supabase/client";
import { STATUTS } from "@/lib/tarifs";
import { TrackingBadge } from "@/components/tracking-badge";
import { ColisCommentaires } from "@/components/colis-commentaires";
import { useAuth } from "@/hooks/use-auth";
import { useI18n, Ltr, statutLabel } from "@/hooks/use-i18n";

export function ColisHistoriqueModal({
  tracking,
  typeColis,
  onClose,
  onChangeStatus,
}: {
  tracking: string;
  typeColis?: string | null;
  onClose: () => void;
  /** Staff uniquement : affiche un bouton "changer le statut" sous le badge — le client ne l'a jamais. */
  onChangeStatus?: () => void;
}) {
  const { role } = useAuth();
  const { t, tf, lang } = useI18n();
  const isStaff = !!role && role !== "client";
  const lookup = useServerFn(getPublicTracking);
  const [loading, setLoading] = useState(true);
  const [statut, setStatut] = useState<string>("");
  const [lieu, setLieu] = useState<string>("");
  const [colisId, setColisId] = useState<string | null>(null);
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState<"historique" | "commentaires" | "notes">("historique");
  const [ancienStatuts, setAncienStatuts] = useState<Record<string, string>>({});
  const [auteurs, setAuteurs] = useState<Record<string, string>>({});

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setNotFound(false);
    lookup({ data: { code: tracking } })
      .then((res: any) => {
        if (!alive) return;
        if (!res || "notFound" in res) {
          setNotFound(true);
        } else {
          setStatut(res.colis.statut);
          setColisId(res.colis.id ?? null);
          setEvents(res.events ?? []);
          setLieu(res.events?.[0]?.lieu ?? "");
        }
      })
      .catch(() => {
        if (alive) setNotFound(true);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [tracking]);

  // Enrichissement staff uniquement : statut précédent + auteur du changement.
  // Passe par le client authentifié (RLS), séparément du lookup public ci-dessus,
  // pour ne jamais exposer d'identité d'employé sur la page de suivi publique.
  useEffect(() => {
    if (!isStaff || !colisId) return;
    let alive = true;
    (async () => {
      const { data: rows } = await supabase
        .from("colis_historique")
        .select("id, ancien_statut, user_id")
        .eq("colis_id", colisId);
      if (!alive || !rows) return;
      const statuts: Record<string, string> = {};
      const userIds = new Set<string>();
      rows.forEach((r: any) => {
        if (r.ancien_statut) statuts[r.id] = r.ancien_statut;
        if (r.user_id) userIds.add(r.user_id);
      });
      setAncienStatuts(statuts);
      if (userIds.size > 0) {
        const { data: profs } = await supabase.from("profiles").select("id, nom, email").in("id", [...userIds]);
        if (!alive || !profs) return;
        const noms: Record<string, string> = {};
        profs.forEach((p: any) => { noms[p.id] = p.nom || p.email || p.id; });
        const parEvenement: Record<string, string> = {};
        rows.forEach((r: any) => { if (r.user_id && noms[r.user_id]) parEvenement[r.id] = noms[r.user_id]; });
        setAuteurs(parEvenement);
      }
    })();
    return () => { alive = false; };
  }, [isStaff, colisId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const s = STATUTS.find((x) => x.key === statut);
  const colorMap: Record<string, string> = {
    warning: "bg-warning/15 text-warning",
    info: "bg-info/15 text-info",
    success: "bg-success/15 text-success",
    destructive: "bg-destructive/15 text-destructive",
  };
  const statutCls = colorMap[s?.color ?? "info"];
  const dateLocale = lang === "ar" ? "ar-DZ-u-nu-latn" : "fr-FR";

  const groups: Array<{ date: string; items: PublicEvent[] }> = [];
  for (const e of events) {
    const d = new Date(e.created_at).toLocaleDateString(dateLocale, {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const g = groups.find((x) => x.date === d);
    if (g) g.items.push(e);
    else groups.push({ date: d, items: [e] });
  }

  function labelOf(key: string) {
    return statutLabel(key, t);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 px-4 py-10 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="shrink-0 font-bold">{t("chm.title")}</h2>
            <Ltr className="truncate rounded-md bg-info/15 px-2 py-0.5 font-mono text-sm font-bold text-info">
              {tracking}
            </Ltr>
            <button
              onClick={async () => {
                try { await navigator.clipboard.writeText(tracking); toast.success(tf("mc.toast.copied", { n: tracking })); }
                catch { toast.error(t("mc.toast.copyFail")); }
              }}
              className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label={t("common.copy")}
              title={t("common.copy")}
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
            <TrackingBadge typeColis={typeColis} />
          </div>
          <button
            onClick={onClose}
            aria-label={t("common.close")}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : notFound ? (
          <div className="px-6 py-12 text-center">
            <Package className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              {t("chm.loadError")}
            </p>
          </div>
        ) : (
          <>
            <div className="border-b border-border bg-secondary/50 px-6 py-6 text-center">
              <div
                className={`inline-block rounded-full px-4 py-1.5 text-lg font-black ${statutCls}`}
              >
                {statutLabel(statut, t)}
              </div>
              {lieu && <div className="mt-2 text-sm text-muted-foreground">{lieu}</div>}
              {events[0] && (
                <Ltr className="mt-1 block text-xs text-muted-foreground">
                  {new Date(events[0].created_at).toLocaleString(dateLocale)}
                </Ltr>
              )}
              {onChangeStatus && (
                <button
                  onClick={onChangeStatus}
                  className="mx-auto mt-3 flex items-center gap-1.5 rounded-full border border-primary/40 bg-background px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/5"
                >
                  <Pencil className="h-3.5 w-3.5" /> {t("csm.changeStatus")}
                </button>
              )}
            </div>

            {/* Onglets : Historique / Commentaires (tout le monde) / Notes internes (staff) */}
            {colisId && (
              <div className="flex gap-1 overflow-x-auto border-b border-border px-5 pt-3">
                <button
                  onClick={() => setTab("historique")}
                  className={`shrink-0 rounded-t-lg px-4 py-2 text-sm font-bold transition-colors ${
                    tab === "historique"
                      ? "border-b-2 border-primary text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Clock className="me-1.5 inline h-4 w-4" />
                  {t("chm.tab.history")}
                </button>
                <button
                  onClick={() => setTab("commentaires")}
                  className={`shrink-0 rounded-t-lg px-4 py-2 text-sm font-bold transition-colors ${
                    tab === "commentaires"
                      ? "border-b-2 border-primary text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <MessageCircle className="me-1.5 inline h-4 w-4" />
                  {t("chm.tab.comments")}
                </button>
                {isStaff && (
                  <button
                    onClick={() => setTab("notes")}
                    className={`shrink-0 rounded-t-lg px-4 py-2 text-sm font-bold transition-colors ${
                      tab === "notes"
                        ? "border-b-2 border-primary text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <MessageSquare className="me-1.5 inline h-4 w-4" />
                    {t("chm.tab.notes")}
                  </button>
                )}
              </div>
            )}

            {colisId && tab === "notes" && isStaff ? (
              <div className="max-h-[50vh] overflow-y-auto px-5 py-4">
                <ColisCommentaires colisId={colisId} />
              </div>
            ) : colisId && tab === "commentaires" ? (
              <div className="max-h-[50vh] overflow-y-auto px-5 py-4">
                <ColisCommentaires colisId={colisId} visibleClient />
              </div>
            ) : (
              <div className="max-h-[50vh] overflow-y-auto px-5 py-4">
                {!isStaff && (
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-bold">
                    <Clock className="h-4 w-4 text-primary" />
                    {t("chm.detailTitle")}
                  </h3>
                )}

                {groups.length === 0 && (
                  <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                    {t("chm.noEvents")}
                  </div>
                )}

                {groups.map((g) => (
                  <div key={g.date} className="mb-3">
                    <div className="rounded-lg bg-muted px-3 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {g.date}
                    </div>
                    <ol>
                      {g.items.map((e) => {
                        const ancien = ancienStatuts[e.id];
                        const auteur = auteurs[e.id] ?? null;
                        return (
                          <li
                            key={e.id}
                            className="flex gap-3 border-b border-border px-2 py-3 last:border-b-0"
                          >
                            <Ltr className="w-14 shrink-0 pt-0.5 font-mono text-sm font-bold text-foreground/80">
                              {new Date(e.created_at).toLocaleTimeString("fr-FR", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </Ltr>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-semibold">
                                {ancien ? (
                                  <span className="inline-flex flex-wrap items-center gap-1.5">
                                    <span className="font-normal text-muted-foreground">{labelOf(ancien)}</span>
                                    <ArrowRight className="h-3 w-3 text-muted-foreground rtl:rotate-180" />
                                    {labelOf(e.statut)}
                                  </span>
                                ) : labelOf(e.statut)}
                              </div>
                              {(e.lieu || e.description) && (
                                <div className="mt-0.5 text-xs text-muted-foreground">
                                  {[e.lieu, e.description].filter(Boolean).join(" — ")}
                                </div>
                              )}
                              {e.motif && (
                                <div className="mt-0.5 text-xs font-medium text-foreground/80">{e.motif}</div>
                              )}
                              {isStaff && auteur && (
                                <div className="mt-0.5 text-xs text-muted-foreground">{t("chm.by")} {auteur}</div>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t border-border px-5 py-3 text-end">
              <Link
                to="/track/$code"
                params={{ code: tracking }}
                onClick={onClose}
                className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline"
              >
                {t("chm.fullPage")} <ArrowRight className="h-4 w-4 rtl:rotate-180" />
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}