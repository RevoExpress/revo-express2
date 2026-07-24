import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { X, Loader2, Clock, ArrowRight, Package, MessageSquare, MessageCircle } from "lucide-react";
import { getPublicTracking, type PublicEvent } from "@/lib/tracking.functions";
import { STATUTS } from "@/lib/tarifs";
import { TrackingBadge } from "@/components/tracking-badge";
import { ColisCommentaires } from "@/components/colis-commentaires";
import { useAuth } from "@/hooks/use-auth";

export function ColisHistoriqueModal({
  tracking,
  typeColis,
  onClose,
}: {
  tracking: string;
  typeColis?: string | null;
  onClose: () => void;
}) {
  const { role } = useAuth();
  const isStaff = !!role && role !== "client";
  const lookup = useServerFn(getPublicTracking);
  const [loading, setLoading] = useState(true);
  const [statut, setStatut] = useState<string>("");
  const [lieu, setLieu] = useState<string>("");
  const [colisId, setColisId] = useState<string | null>(null);
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState<"historique" | "commentaires" | "notes">("historique");

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

  const groups: Array<{ date: string; items: PublicEvent[] }> = [];
  for (const e of events) {
    const d = new Date(e.created_at).toLocaleDateString("fr-FR", {
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
    return STATUTS.find((x) => x.key === key)?.label ?? key;
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
            <h2 className="shrink-0 font-bold">Suivi du colis</h2>
            <span className="truncate rounded-md bg-info/15 px-2 py-0.5 font-mono text-sm font-bold text-info">
              {tracking}
            </span>
            <TrackingBadge typeColis={typeColis} />
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
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
              Impossible de charger l'historique de ce colis.
            </p>
          </div>
        ) : (
          <>
            <div className="border-b border-border bg-secondary/50 px-6 py-6 text-center">
              <div
                className={`inline-block rounded-full px-4 py-1.5 text-lg font-black ${statutCls}`}
              >
                {s?.label ?? statut}
              </div>
              {lieu && <div className="mt-2 text-sm text-muted-foreground">{lieu}</div>}
              {events[0] && (
                <div className="mt-1 text-xs text-muted-foreground">
                  {new Date(events[0].created_at).toLocaleString("fr-FR")}
                </div>
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
                  <Clock className="mr-1.5 inline h-4 w-4" />
                  Historique
                </button>
                <button
                  onClick={() => setTab("commentaires")}
                  className={`shrink-0 rounded-t-lg px-4 py-2 text-sm font-bold transition-colors ${
                    tab === "commentaires"
                      ? "border-b-2 border-primary text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <MessageCircle className="mr-1.5 inline h-4 w-4" />
                  Commentaires
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
                    <MessageSquare className="mr-1.5 inline h-4 w-4" />
                    Notes internes
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
                    Historique détaillé
                  </h3>
                )}

                {groups.length === 0 && (
                  <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                    Aucun évènement enregistré pour le moment.
                  </div>
                )}

                {groups.map((g) => (
                  <div key={g.date} className="mb-3">
                    <div className="rounded-lg bg-muted px-3 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {g.date}
                    </div>
                    <ol>
                      {g.items.map((e) => (
                        <li
                          key={e.id}
                          className="flex gap-3 border-b border-border px-2 py-3 last:border-b-0"
                        >
                          <div className="w-14 shrink-0 pt-0.5 font-mono text-sm font-bold text-foreground/80">
                            {new Date(e.created_at).toLocaleTimeString("fr-FR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-semibold">{labelOf(e.statut)}</div>
                            {(e.lieu || e.description) && (
                              <div className="mt-0.5 text-xs text-muted-foreground">
                                {[e.lieu, e.description].filter(Boolean).join(" — ")}
                              </div>
                            )}
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t border-border px-5 py-3 text-right">
              <Link
                to="/track/$code"
                params={{ code: tracking }}
                onClick={onClose}
                className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline"
              >
                Page de suivi complète <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}