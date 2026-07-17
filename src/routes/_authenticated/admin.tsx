import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Package, Download, Check, UserCircle2, LayoutDashboard, Search, UserX, ChevronDown } from "lucide-react";
import { ProPageHeader } from "@/components/pro-page-header";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { STATUTS } from "@/lib/tarifs";
import { exportColisToXLSX } from "@/lib/export-csv";
import { TrackingBadge } from "@/components/tracking-badge";
import { cn } from "@/lib/utils";
import { AdminStats } from "@/components/admin-stats";

/* Couleur de chaque statut, en dur (hex) — visible partout, tout le temps */
const STATUT_HEX: Record<string, string> = {
  "en-preparation": "#f59e0b",
  "ramasse": "#fdba74",
  "expedie": "#fb923c",
  "en-livraison": "#f97316",
  "contact-client": "#fcd34d",
  "livre": "#22c55e",
  "reporte": "#fcd34d",
  "echec-livraison": "#dc2626",
  "retourne-vendeur": "#f87171",
  "annule": "#9ca3af",
};
const hexFor = (statut: string) => STATUT_HEX[statut] ?? "#9ca3af";

const STATUT_PILL: Record<string, string> = {
  "en-preparation": "border-warning/40 bg-warning/10 text-warning",
  "ramasse": "border-primary/40 bg-primary/10 text-primary",
  "expedie": "border-primary/40 bg-primary/10 text-primary",
  "en-livraison": "border-primary/50 bg-primary/15 text-primary",
  "contact-client": "border-warning/40 bg-warning/10 text-warning",
  "livre": "border-success/40 bg-success/10 text-success",
  "reporte": "border-warning/40 bg-warning/10 text-warning",
  "echec-livraison": "border-destructive/40 bg-destructive/10 text-destructive",
  "retourne-vendeur": "border-destructive/40 bg-destructive/10 text-destructive",
  "annule": "border-border bg-muted text-muted-foreground",
};
const pillFor = (statut: string) => STATUT_PILL[statut] ?? "border-border bg-muted text-muted-foreground";

type MenuState = { id: string; kind: "statut" | "livreur"; x: number; y: number } | null;

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — REVO EXPRESS" }] }),
  component: AdminPage,
});

function AdminPage() {
  const { role, loading } = useAuth();
  const [colis, setColis] = useState<any[]>([]);
  const [livreurs, setLivreurs] = useState<any[]>([]);
  const [recherche, setRecherche] = useState("");
  const [filtreStatut, setFiltreStatut] = useState("tous");
  const [menu, setMenu] = useState<MenuState>(null);

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
  }

  async function updateStatut(id: string, statut: string) {
    const { error } = await supabase.from("colis").update({ statut }).eq("id", id);
    if (error) toast.error(error.message);
    else toast.success(`Statut : ${STATUTS.find((s) => s.key === statut)?.label ?? statut}`);
  }

  async function assignLivreur(id: string, livreur_id: string) {
    const { error } = await supabase.from("colis").update({ livreur_id: livreur_id || null }).eq("id", id);
    if (error) toast.error(error.message);
    else toast.success(livreur_id ? "Livreur assigné" : "Livreur retiré");
  }

  const livreurName = (id: string | null) => {
    if (!id) return null;
    const l = livreurs.find((x) => x.id === id);
    return l ? (l.nom || l.email) : null;
  };

  /* Ouvre un menu custom sous le bouton cliqué (position fixe = jamais coupé) */
  function openMenu(e: React.MouseEvent<HTMLButtonElement>, id: string, kind: "statut" | "livreur") {
    if (menu?.id === id && menu.kind === kind) { setMenu(null); return; }
    const r = e.currentTarget.getBoundingClientRect();
    const width = 240;
    const x = Math.min(r.left, window.innerWidth - width - 12);
    let y = r.bottom + 6;
    if (y + 340 > window.innerHeight) y = Math.max(12, r.top - 346);
    setMenu({ id, kind, x, y });
  }

  const colisAffiches = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return colis.filter((c) => {
      if (filtreStatut !== "tous" && c.statut !== filtreStatut) return false;
      if (!q) return true;
      return Object.values(c).some(
        (v) => typeof v === "string" && v.toLowerCase().includes(q),
      );
    });
  }, [colis, recherche, filtreStatut]);

  const menuColis = menu ? colis.find((c) => c.id === menu.id) : null;

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (role !== "admin") return <Navigate to="/" />;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <section className="container mx-auto flex-1 px-4 py-10">
        <ProPageHeader
          icon={LayoutDashboard}
          title="Tableau de bord admin"
          subtitle="Gérez tous les colis et assignez les livreurs en temps réel."
          action={
            <Button
              variant="outline"
              className="gap-2"
              onClick={async () => {
                const { data, error } = await supabase
                  .from("colis")
                  .select("*")
                  .order("date_creation", { ascending: false });
                if (error) { toast.error(error.message); return; }
                if (!data?.length) { toast.info("Aucun colis à exporter"); return; }
                const livreurIds = Array.from(new Set(data.map((c: any) => c.livreur_id).filter(Boolean)));
                const livreurById = new Map<string, { nom?: string | null; telephone?: string | null }>();
                if (livreurIds.length) {
                  const { data: profs } = await supabase
                    .from("profiles")
                    .select("id, nom, telephone")
                    .in("id", livreurIds);
                  (profs ?? []).forEach((p: any) => livreurById.set(p.id, { nom: p.nom, telephone: p.telephone }));
                }
                exportColisToXLSX(data, `revo-export-${new Date().toISOString().slice(0, 10)}.xlsx`, { livreurById });
                toast.success(`${data.length} colis exportés`);
              }}
            >
              <Download className="h-4 w-4" /> Exporter tous les colis
            </Button>
          }
        />

        <div className="mt-2">
          <AdminStats />
        </div>

        {/* Recherche + filtre statut + compteur */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher : tracking, nom, téléphone, commune, adresse, boutique…"
              className="h-10 w-full rounded-full border border-border bg-background pl-9 pr-4 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <select
            value={filtreStatut}
            onChange={(e) => setFiltreStatut(e.target.value)}
            className="h-10 w-full rounded-full border border-border px-4 text-sm sm:w-[220px]"
          >
            <option value="tous">Tous les statuts</option>
            {STATUTS.map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
          <span className="shrink-0 text-sm font-medium text-muted-foreground">
            {colisAffiches.length} colis
          </span>
        </div>

        <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
          <table className="w-full text-sm">
            <thead className="bg-muted text-foreground">
              <tr>
                <th className="px-3 py-3 text-left">Tracking</th>
                <th className="px-3 py-3 text-left">Destinataire</th>
                <th className="px-3 py-3 text-left">Trajet</th>
                <th className="px-3 py-3 text-left">Livreur</th>
                <th className="px-3 py-3 text-left">Statut</th>
                <th className="px-3 py-3 text-right">Prix</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {colisAffiches.map((c) => {
                const assigned = !!c.livreur_id;
                return (
                  <tr key={c.id} className="hover:bg-accent/40">
                    <td className="px-3 py-2 font-mono text-xs">
                      {c.tracking}
                      <TrackingBadge typeColis={c.type_colis} />
                    </td>
                    <td className="px-3 py-2">{c.destinataire_nom}<br /><span className="text-xs text-muted-foreground">{c.destinataire_tel}</span></td>
                    <td className="px-3 py-2 text-xs">{c.depart} → {c.destinataire_wilaya}</td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={(e) => openMenu(e, c.id, "livreur")}
                        className={cn(
                          "inline-flex h-8 w-[180px] items-center gap-2 rounded-full border px-3 text-xs transition-colors",
                          assigned
                            ? "border-primary/50 bg-primary/10 font-bold text-primary"
                            : "border-dashed border-border bg-background font-medium text-muted-foreground hover:border-primary/50 hover:text-foreground",
                        )}
                      >
                        <UserCircle2 className="h-3.5 w-3.5 shrink-0" />
                        <span className="flex-1 truncate text-left">
                          {livreurName(c.livreur_id) ?? "Assigner…"}
                        </span>
                        <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
                      </button>
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={(e) => openMenu(e, c.id, "statut")}
                        className={cn(
                          "inline-flex h-8 w-[210px] items-center gap-2 rounded-full border px-3 text-xs font-semibold transition-all hover:opacity-90",
                          pillFor(c.statut),
                        )}
                      >
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: hexFor(c.statut) }} />
                        <span className="flex-1 truncate text-left">
                          {STATUTS.find((s) => s.key === c.statut)?.label ?? c.statut}
                        </span>
                        <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
                      </button>
                    </td>
                    <td className="px-3 py-2 text-right font-bold">{c.prix} DA</td>
                  </tr>
                );
              })}
              {colisAffiches.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">
                  <Package className="mx-auto mb-2 h-8 w-8" /> Aucun colis trouvé
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-card">
          <h2 className="font-bold">Gestion des livreurs</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Les livreurs se créent depuis la page <strong>/comptes</strong> (réservée au DG).
          </p>
          <div className="mt-3">
            <strong className="text-sm">Livreurs actuels :</strong>
            <ul className="mt-1 text-sm text-muted-foreground">
              {livreurs.length === 0 ? <li>— Aucun —</li> : livreurs.map((l) => <li key={l.id}>• {l.nom || l.email}</li>)}
            </ul>
          </div>
        </div>
      </section>

      {/* MENU CUSTOM (statut / livreur) — HTML simple, toujours visible */}
      {menu && menuColis && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenu(null)} />
          <div
            className="fixed z-50 max-h-[340px] w-[240px] overflow-y-auto rounded-xl border p-1 shadow-xl"
            style={{ left: menu.x, top: menu.y, backgroundColor: "#ffffff", borderColor: "#e5e7eb" }}
          >
            {menu.kind === "statut" &&
              STATUTS.map((s) => {
                const active = menuColis.statut === s.key;
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => { void updateStatut(menu.id, s.key); setMenu(null); }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium"
                    style={{ color: "#111111", backgroundColor: active ? "#fff7ed" : "transparent" }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#fff7ed")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = active ? "#fff7ed" : "transparent")}
                  >
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: hexFor(s.key) }} />
                    <span className="flex-1">{s.label}</span>
                    {active && <Check className="h-3.5 w-3.5" style={{ color: "#f97316" }} />}
                  </button>
                );
              })}

            {menu.kind === "livreur" && (
              <>
                {livreurs.length === 0 && (
                  <div className="px-3 py-2 text-xs" style={{ color: "#6b7280" }}>
                    Aucun livreur — créez-en un via /comptes
                  </div>
                )}
                {livreurs.map((l) => {
                  const active = menuColis.livreur_id === l.id;
                  return (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => { void assignLivreur(menu.id, l.id); setMenu(null); }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium"
                      style={{ color: "#111111", backgroundColor: active ? "#fff7ed" : "transparent" }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#fff7ed")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = active ? "#fff7ed" : "transparent")}
                    >
                      <UserCircle2 className="h-4 w-4 shrink-0" style={{ color: "#f97316" }} />
                      <span className="flex-1 truncate">{l.nom || l.email}</span>
                      {active && <Check className="h-3.5 w-3.5" style={{ color: "#f97316" }} />}
                    </button>
                  );
                })}
                {menuColis.livreur_id && (
                  <button
                    type="button"
                    onClick={() => { void assignLivreur(menu.id, ""); setMenu(null); }}
                    className="mt-1 flex w-full items-center gap-2 rounded-lg border-t px-3 py-2 text-left text-xs font-medium"
                    style={{ color: "#dc2626", borderColor: "#f3f4f6" }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#fef2f2")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    <UserX className="h-4 w-4 shrink-0" />
                    Retirer le livreur
                  </button>
                )}
              </>
            )}
          </div>
        </>
      )}

      <SiteFooter />
    </div>
  );
}