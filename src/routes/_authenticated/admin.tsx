import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Download, LayoutDashboard } from "lucide-react";
import { ProPageHeader } from "@/components/pro-page-header";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { exportColisToXLSX } from "@/lib/export-csv";
import { AdminStats } from "@/components/admin-stats";
import { OpsStatsPanel } from "@/components/ops-stats-panel";
import { useI18n } from "@/hooks/use-i18n";
import { ColisBoard } from "@/components/colis-board";
import { CollapsibleStats } from "@/components/collapsible-stats";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — REVO EXPRESS" }] }),
  component: AdminPage,
});

function AdminPage() {
  const { role, loading } = useAuth();
  const { t, tf } = useI18n();
  const [colis, setColis] = useState<any[]>([]);
  const [livreurs, setLivreurs] = useState<any[]>([]);
  const [notesCount, setNotesCount] = useState<Record<string, number>>({});
  const [quickFilter, setQuickFilter] = useState<"aTraiter" | "enCours" | "livres" | "problemes" | null>(null);

  useEffect(() => {
    if (role !== "admin") return;
    refresh();
    supabase.from("user_roles").select("user_id, role").eq("role", "livreur")
      .then(async ({ data }) => {
        if (!data?.length) { setLivreurs([]); return; }
        const ids = data.map((r) => r.user_id);
        const { data: profs } = await supabase.from("profiles").select("id, nom, email").in("id", ids);
        setLivreurs(profs || []);
      });
    const ch = supabase.channel("admin-colis")
      .on("postgres_changes", { event: "*", schema: "public", table: "colis" }, refresh)
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [role]);

  async function refresh() {
    const { data } = await supabase.from("colis").select("*").order("date_creation", { ascending: false }).limit(500);
    setColis(data || []);
    supabase.from("colis_commentaires").select("colis_id")
      .then(({ data: rows, error }) => {
        if (error || !rows) return;
        const m: Record<string, number> = {};
        rows.forEach((r: any) => { m[r.colis_id] = (m[r.colis_id] ?? 0) + 1; });
        setNotesCount(m);
      });
  }

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (role !== "admin") return <Navigate to="/" />;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <section className="container mx-auto flex-1 px-4 pb-24 pt-10">
        <ProPageHeader
          icon={LayoutDashboard}
          title={t("adm.title")}
          subtitle={t("adm.subtitle")}
          action={
            <Button
              variant="outline"
              className="gap-2"
              onClick={async () => {
                const { data, error } = await supabase.from("colis").select("*").order("date_creation", { ascending: false });
                if (error) { toast.error(error.message); return; }
                if (!data?.length) { toast.info(t("adm.toast.noExport")); return; }
                exportColisToXLSX(data, `revo-export-${new Date().toISOString().slice(0, 10)}.xlsx`);
                toast.success(tf("adm.toast.exported", { n: data.length }));
              }}
            >
              <Download className="h-4 w-4" /> {t("adm.exportAll")}
            </Button>
          }
        />

        <CollapsibleStats>
          <AdminStats onFilterClick={setQuickFilter} activeFilter={quickFilter} />
          <OpsStatsPanel colis={colis} livreurs={livreurs} />
        </CollapsibleStats>

        <ColisBoard
          colis={colis}
          livreurs={livreurs}
          notesCount={notesCount}
          permissions={{ canAssignLivreur: true, canEdit: true, canDelete: true, canChangeStatus: true, canEditPrice: true, showBlocked: true, showStatChips: true }}
          searchPlaceholder={t("adm.search.ph")}
          emptyMessage={t("adm.noColis")}
          onColisDeleted={(id) => setColis((prev) => prev.filter((x) => x.id !== id))}
          quickFilter={quickFilter}
          onQuickFilterChange={setQuickFilter}
        />

        <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-card">
          <h2 className="font-bold">{t("adm.livreursTitle")}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{t("adm.livreursHint")}</p>
          <div className="mt-3">
            <strong className="text-sm">{t("adm.currentLivreurs")}</strong>
            <ul className="mt-1 text-sm text-muted-foreground">
              {livreurs.length === 0 ? <li>{t("adm.noneMasc")}</li> : livreurs.map((l) => <li key={l.id}>• {l.nom || l.email}</li>)}
            </ul>
          </div>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
