import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Package, Plus, Clock, CheckCircle2, XCircle, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { ClientDashboardPanel } from "@/components/client-dashboard-panel";
import { useI18n, Ltr } from "@/hooks/use-i18n";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Tableau de bord — REVO EXPRESS" }] }),
  component: DashboardPage,
});

const STATUTS_EN_COURS = [
  "en-preparation", "ramasse", "expedie", "en-livraison", "contact-client", "reporte",
];

function DashboardPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [colis, setColis] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const load = () =>
      supabase.from("colis").select("*").eq("client_id", user.id)
        .order("date_creation", { ascending: false })
        .then(({ data }) => setColis(data || []));
    void load();
    const ch = supabase.channel("dashboard-colis")
      .on("postgres_changes", { event: "*", schema: "public", table: "colis", filter: `client_id=eq.${user.id}` },
        () => { void load(); })
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [user]);

  const stats = useMemo(() => {
    const total = colis.length;
    const enCours = colis.filter((c) => STATUTS_EN_COURS.includes(c.statut)).length;
    const livres = colis.filter((c) => c.statut === "livre").length;
    const echecs = colis.filter((c) => c.statut === "echec-livraison" || c.statut === "retourne-vendeur").length;
    const cod = colis.filter((c) => c.statut === "livre").reduce((s, c) => s + Number(c.prix_colis ?? 0), 0);
    return { total, enCours, livres, echecs, cod };
  }, [colis]);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <section className="container mx-auto flex-1 px-4 pb-24 pt-10">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black md:text-4xl">{t("mc.dashboard")}</h1>
            <p className="text-sm text-muted-foreground">{t("dash.subtitle")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/commander">
              <Button className="gap-2 bg-gradient-primary shadow-glow">
                <Plus className="h-4 w-4" /> {t("mc.newOrder")}
              </Button>
            </Link>
            <Link to="/mes-colis">
              <Button variant="outline" className="gap-2">
                <Package className="h-4 w-4" /> {t("nav.quick.mycolis")}
              </Button>
            </Link>
          </div>
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard icon={Package} label={t("mc.stat.total")} value={stats.total} to="/mes-colis" />
          <StatCard icon={Clock} label={t("mc.stat.enCours")} value={stats.enCours} accent="info" to="/mes-colis" />
          <StatCard icon={CheckCircle2} label={t("mc.stat.livres")} value={stats.livres} accent="success" to="/mes-colis" />
          <StatCard icon={XCircle} label={t("mc.stat.echecs")} value={stats.echecs} accent="destructive" to="/mes-colis" />
          <StatCard icon={TrendingUp} label={t("mc.stat.cod")} value={<Ltr>{stats.cod} DA</Ltr>} accent="primary" to="/mon-paiement" />
        </div>

        <ClientDashboardPanel colis={colis} />
      </section>
      <SiteFooter />
    </div>
  );
}

function StatCard({
  icon: Icon, label, value, accent, to,
}: {
  icon: any; label: string; value: React.ReactNode;
  accent?: "info" | "success" | "destructive" | "primary";
  /** Rend la carte cliquable — elles avaient l'apparence de boutons sans rien déclencher. */
  to?: string;
}) {
  const accentMap: Record<string, string> = {
    info: "text-info bg-info/10",
    success: "text-success bg-success/10",
    destructive: "text-destructive bg-destructive/10",
    primary: "text-primary bg-primary/10",
  };
  const cls = accent ? accentMap[accent] : "text-foreground bg-muted";
  const body = (
    <div className="flex items-center gap-3">
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${cls}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="text-xl font-black">{value}</div>
      </div>
    </div>
  );
  const base = "block rounded-xl border border-border bg-card p-4 transition-all";
  return to
    ? <Link to={to} className={`${base} hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-card`}>{body}</Link>
    : <div className={base}>{body}</div>;
}
