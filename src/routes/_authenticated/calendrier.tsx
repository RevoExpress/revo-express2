import { createFileRoute, Navigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, CalendarDays, CalendarClock, ListTodo, Store, AlertTriangle } from "lucide-react";
import { ProPageHeader } from "@/components/pro-page-header";
import { useAuth } from "@/hooks/use-auth";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { listAgenda } from "@/lib/commercial.functions";

export const Route = createFileRoute("/_authenticated/calendrier")({
  head: () => ({ meta: [{ title: "Calendrier — REVO EXPRESS" }] }),
  component: CalendrierPage,
});

const PRIORITE_TONE: Record<string, string> = {
  urgent: "bg-destructive/10 text-destructive", haute: "bg-warning/10 text-warning",
  normale: "bg-info/10 text-info", faible: "bg-muted text-muted-foreground",
};

function groupeDe(date: Date, now: Date): "retard" | "aujourdhui" | "demain" | "semaine" | "plus_tard" {
  const jour = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const j0 = jour(now);
  const jd = jour(date);
  if (jd < j0) return "retard";
  if (jd === j0) return "aujourdhui";
  if (jd === j0 + 86400000) return "demain";
  if (jd <= j0 + 7 * 86400000) return "semaine";
  return "plus_tard";
}
const GROUPES: { key: string; label: string }[] = [
  { key: "retard", label: "En retard" },
  { key: "aujourdhui", label: "Aujourd'hui" },
  { key: "demain", label: "Demain" },
  { key: "semaine", label: "Cette semaine" },
  { key: "plus_tard", label: "Plus tard" },
];

function CalendrierPage() {
  const { role, loading } = useAuth();
  const listFn = useServerFn(listAgenda);
  const [items, setItems] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const allowed = role === "admin" || role === "directeur_commercial" || role === "admin_commercial" || role === "commercial";

  useEffect(() => {
    if (!allowed) return;
    listFn().then((r) => setItems(r.items)).catch(() => {}).finally(() => setDataLoading(false));
  }, [role]);

  const groupes = useMemo(() => {
    const now = new Date();
    const actifs = items.filter((it) => !it.fait);
    const m: Record<string, any[]> = { retard: [], aujourdhui: [], demain: [], semaine: [], plus_tard: [] };
    for (const it of actifs) m[groupeDe(new Date(it.date), now)].push(it);
    return m;
  }, [items]);

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!allowed) return <Navigate to="/" />;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <section className="container mx-auto flex-1 px-4 pb-24 pt-10">
        <ProPageHeader icon={CalendarDays} title="Calendrier" subtitle="Tâches et rendez-vous à venir, groupés par échéance." />

        {dataLoading ? (
          <div className="mt-8 flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (
          <div className="mt-6 space-y-6">
            {GROUPES.map((g) => {
              const list = groupes[g.key] ?? [];
              if (list.length === 0 && g.key !== "aujourdhui") return null;
              return (
                <div key={g.key}>
                  <h2 className={`mb-2 flex items-center gap-2 text-sm font-black uppercase tracking-wide ${g.key === "retard" ? "text-destructive" : "text-muted-foreground"}`}>
                    {g.key === "retard" && <AlertTriangle className="h-4 w-4" />}
                    {g.label} <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-bold text-foreground">{list.length}</span>
                  </h2>
                  {list.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">Rien de prévu</p>
                  ) : (
                    <div className="space-y-1.5">
                      {list.map((it) => (
                        <div key={it.id} className={`flex items-center gap-3 rounded-xl border bg-card p-3 ${g.key === "retard" ? "border-destructive/40" : "border-border"}`}>
                          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${it.type === "rdv" ? "bg-primary/10 text-primary" : "bg-info/10 text-info"}`}>
                            {it.type === "rdv" ? <CalendarClock className="h-4 w-4" /> : <ListTodo className="h-4 w-4" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-semibold">{it.titre}</span>
                              {it.priorite && <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${PRIORITE_TONE[it.priorite]}`}>{it.priorite}</span>}
                            </div>
                            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <span>{new Date(it.date).toLocaleString("fr-FR", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                              {it.client_nom && (
                                <Link to="/boutique/$id" params={{ id: it.client_id }} className="flex items-center gap-1 font-semibold text-primary hover:underline">
                                  <Store className="h-3 w-3" /> {it.client_nom}
                                </Link>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
      <SiteFooter />
    </div>
  );
}
