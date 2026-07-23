import { createFileRoute, Navigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Loader2, Package, Download, UserCircle2, LayoutDashboard, Search, UserX,
  ChevronDown, MessageSquare, X, Pencil, Trash2,
} from "lucide-react";
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
import { TrackingActions } from "@/components/tracking-actions";
import { AdminStats } from "@/components/admin-stats";
import { OpsStatsPanel } from "@/components/ops-stats-panel";
import { ColisCommentaires } from "@/components/colis-commentaires";
import { ColisStatusPill, ColisStatusModal } from "@/components/colis-status-menu";

type LivreurMenuState = { id: string; x: number; y: number } | null;

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — REVO EXPRESS" }] }),
  component: AdminPage,
});

function initiales(nom: string) {
  return nom.split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "?";
}

const GROUP_BG: Record<string, string> = {
  "en-preparation": "bg-warning/10", "ramasse": "bg-primary/10", "expedie": "bg-primary/10",
  "en-livraison": "bg-primary/15", "contact-client": "bg-warning/10", "client": "bg-info/10",
  "livre": "bg-success/10", "reporte": "bg-warning/10", "echec-livraison": "bg-destructive/10",
  "retourne-vendeur": "bg-destructive/10", "annule": "bg-muted",
};
const GROUP_TEXT: Record<string, string> = {
  "en-preparation": "text-warning", "ramasse": "text-primary", "expedie": "text-primary",
  "en-livraison": "text-primary", "contact-client": "text-warning", "client": "text-info",
  "livre": "text-success", "reporte": "text-warning", "echec-livraison": "text-destructive",
  "retourne-vendeur": "text-destructive", "annule": "text-muted-foreground",
};

function AdminPage() {
  const { role, loading } = useAuth();
  const [colis, setColis] = useState<any[]>([]);
  const [livreurs, setLivreurs] = useState<any[]>([]);
  const [recherche, setRecherche] = useState("");
  const [livreurMenu, setLivreurMenu] = useState<LivreurMenuState>(null);
  const [statutColis, setStatutColis] = useState<any | null>(null);
  const [notesColis, setNotesColis] = useState<any | null>(null);
  const [notesCount, setNotesCount] = useState<Record<string, number>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set(["livre", "annule"]));

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

  function openLivreurMenu(e: React.MouseEvent<HTMLButtonElement>, id: string) {
    if (livreurMenu?.id === id) { setLivreurMenu(null); return; }
    const r = e.currentTarget.getBoundingClientRect();
    const width = 240;
    const x = Math.min(r.left, window.innerWidth - width - 12);
    let y = r.bottom + 6;
    if (y + 340 > window.innerHeight) y = Math.max(12, r.top - 346);
    setLivreurMenu({ id, x, y });
  }

  async function handleDelete(c: any) {
    const ok = window.confirm(`Supprimer définitivement le colis ${c.tracking} ?\n\nCette action est irréversible.`);
    if (!ok) return;
    setDeletingId(c.id);
    const { error } = await supabase.from("colis").delete().eq("id", c.id);
    setDeletingId(null);
    if (error) { toast.error("Échec de la suppression", { description: error.message }); return; }
    toast.success(`Colis ${c.tracking} supprimé`);
    setColis((prev) => prev.filter((x) => x.id !== c.id));
  }

  const colisAffiches = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    if (!q) return colis;
    return colis.filter((c) => Object.values(c).some((v) => typeof v === "string" && v.toLowerCase().includes(q)));
  }, [colis, recherche]);

  const groupes = useMemo(() => {
    return STATUTS.map((s) => {
      const rows = colisAffiches.filter((c) => c.statut === s.key);
      const total = rows.reduce((sum, c) => sum + Number(c.prix_colis ?? 0), 0);
      const bloques = s.key === "en-preparation"
        ? rows.filter((c) => Date.now() - new Date(c.date_creation).getTime() > 48 * 3600 * 1000).length
        : 0;
      return { ...s, rows, total, bloques };
    }).filter((g) => g.rows.length > 0);
  }, [colisAffiches]);

  function toggleGroup(key: string) {
    setCollapsed((prev) => { const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next; });
  }

  const livreurMenuColis = livreurMenu ? colis.find((c) => c.id === livreurMenu.id) : null;

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
                const { data, error } = await supabase.from("colis").select("*").order("date_creation", { ascending: false });
                if (error) { toast.error(error.message); return; }
                if (!data?.length) { toast.info("Aucun colis à exporter"); return; }
                exportColisToXLSX(data, `revo-export-${new Date().toISOString().slice(0, 10)}.xlsx`);
                toast.success(`${data.length} colis exportés`);
              }}
            >
              <Download className="h-4 w-4" /> Exporter tous les colis
            </Button>
          }
        />

        <div className="mt-2"><AdminStats /></div>
        <OpsStatsPanel colis={colis} livreurs={livreurs} />

        <div className="mb-4 flex flex-wrap gap-2">
          {groupes.map((g) => (
            <button
              key={g.key}
              onClick={() => toggleGroup(g.key)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${GROUP_BG[g.key]} ${GROUP_TEXT[g.key]}`}
            >
              {g.label}
              <span className="rounded-full bg-white/70 px-1.5 py-0.5 text-[10px] dark:bg-black/20">{g.rows.length}</span>
              <span className="opacity-70">{g.total.toLocaleString("fr-FR")} DA</span>
            </button>
          ))}
        </div>

        <div className="mb-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher : tracking, nom, téléphone, commune, adresse, boutique…"
              className="h-10 w-full rounded-full border border-border bg-background pl-9 pr-4 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        {groupes.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
            <Package className="mx-auto mb-2 h-8 w-8" /> Aucun colis trouvé
          </div>
        )}

        {groupes.map((g) => {
          const isCollapsed = collapsed.has(g.key);
          return (
            <div key={g.key} className="mb-3 overflow-hidden rounded-2xl border border-border">
              <button
                onClick={() => toggleGroup(g.key)}
                className={`flex w-full items-center justify-between px-4 py-2.5 ${GROUP_BG[g.key]}`}
              >
                <span className={`flex items-center gap-2 font-bold ${GROUP_TEXT[g.key]}`}>
                  <ChevronDown className={`h-4 w-4 transition-transform ${isCollapsed ? "-rotate-90" : ""}`} />
                  {g.label}
                  <span className="rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-black dark:bg-black/20">{g.rows.length}</span>
                </span>
                <span className={`flex items-center gap-3 text-xs ${GROUP_TEXT[g.key]}`}>
                  <span>{g.total.toLocaleString("fr-FR")} DA</span>
                  {g.bloques > 0 && (
                    <span className="rounded-full bg-destructive px-2 py-0.5 font-bold text-destructive-foreground">
                      {g.bloques} bloqué{g.bloques > 1 ? "s" : ""}
                    </span>
                  )}
                </span>
              </button>

              {!isCollapsed && (
                <div className="divide-y divide-border bg-card">
                  {g.rows.map((c) => {
                    const bloque = g.key === "en-preparation" && Date.now() - new Date(c.date_creation).getTime() > 48 * 3600 * 1000;
                    const nNotes = notesCount[c.id] ?? 0;
                    const premierMot = c.description ? c.description.trim().split(/\s+/)[0] : null;
                    return (
                      <div
                        key={c.id}
                        className={`grid grid-cols-1 gap-2 px-4 py-3 md:grid-cols-[32px_1fr_140px_190px_36px_80px_auto] md:items-center md:gap-3 ${bloque ? "border-l-4 border-destructive" : ""}`}
                      >
                        <div className="hidden h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary md:flex">
                          {initiales(c.expediteur_nom || "?")}
                        </div>
                        <div className="min-w-0">
                          <Link
                            to="/boutique/$id"
                            params={{ id: c.client_id }}
                            className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary transition-colors hover:bg-primary/20"
                          >
                            {c.expediteur_nom || "Boutique"}
                          </Link>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                            <span className="font-mono">{c.tracking}</span>
                            <TrackingBadge typeColis={c.type_colis} />
                            <span>· {c.destinataire_nom} · {c.destinataire_tel}</span>
                            {premierMot && (
                              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">{premierMot}…</span>
                            )}
                            {bloque && <span className="font-bold text-destructive">depuis plus de 48h</span>}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                          <span>{c.depart}</span>
                          <span>→</span>
                          <span className="rounded-full bg-muted px-2 py-0.5 font-semibold text-muted-foreground">{c.destinataire_wilaya}</span>
                          {c.destinataire_commune && (
                            <span className="rounded-full bg-info/15 px-2 py-0.5 font-bold text-info">{c.destinataire_commune}</span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={(e) => openLivreurMenu(e, c.id)}
                          className="inline-flex h-8 items-center gap-2 rounded-full border border-dashed border-border bg-background px-3 text-xs font-medium text-muted-foreground hover:border-primary/50 hover:text-foreground"
                        >
                          <UserCircle2 className="h-3.5 w-3.5 shrink-0" />
                          <span className="flex-1 truncate text-left">{livreurName(c.livreur_id) ?? "Assigner…"}</span>
                          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
                        </button>
                        <button onClick={() => setNotesColis(c)} title="Notes" className="relative flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground hover:border-primary/50 hover:text-primary">
                          <MessageSquare className="h-4 w-4" />
                          {nNotes > 0 && <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-black text-white">{nNotes}</span>}
                        </button>
                        <div className="text-right font-bold">{c.prix_colis} DA</div>
                        <div className="flex justify-end gap-1">
                          <ColisStatusPill statut={c.statut} onClick={() => setStatutColis(c)} />
                          <TrackingActions colis={c} />
                          <Link to="/commander" search={{ colis: c.id } as any}>
                            <Button size="icon" variant="outline" className="h-8 w-8 text-muted-foreground" title="Modifier">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button size="icon" variant="outline" className="h-8 w-8 text-destructive hover:bg-destructive/10" title="Supprimer" disabled={deletingId === c.id} onClick={() => void handleDelete(c)}>
                            {deletingId === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-card">
          <h2 className="font-bold">Gestion des livreurs</h2>
          <p className="mt-1 text-xs text-muted-foreground">Les livreurs se créent depuis la page <strong>/comptes</strong> (réservée au DG).</p>
          <div className="mt-3">
            <strong className="text-sm">Livreurs actuels :</strong>
            <ul className="mt-1 text-sm text-muted-foreground">
              {livreurs.length === 0 ? <li>— Aucun —</li> : livreurs.map((l) => <li key={l.id}>• {l.nom || l.email}</li>)}
            </ul>
          </div>
        </div>
      </section>

      {livreurMenu && livreurMenuColis && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setLivreurMenu(null)} />
          <div className="fixed z-50 max-h-[340px] w-[240px] overflow-y-auto rounded-xl border p-1 shadow-xl" style={{ left: livreurMenu.x, top: livreurMenu.y, backgroundColor: "#ffffff", borderColor: "#e5e7eb" }}>
            {livreurs.length === 0 && <div className="px-3 py-2 text-xs" style={{ color: "#6b7280" }}>Aucun livreur — créez-en un via /comptes</div>}
            {livreurs.map((l) => {
              const active = livreurMenuColis.livreur_id === l.id;
              return (
                <button
                  key={l.id}
                  onClick={() => { void assignLivreur(livreurMenu.id, l.id); setLivreurMenu(null); }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium"
                  style={{ color: "#111111", backgroundColor: active ? "#fff7ed" : "transparent" }}
                >
                  <UserCircle2 className="h-4 w-4 shrink-0" style={{ color: "#f97316" }} />
                  <span className="flex-1 truncate">{l.nom || l.email}</span>
                </button>
              );
            })}
            {livreurMenuColis.livreur_id && (
              <button onClick={() => { void assignLivreur(livreurMenu.id, ""); setLivreurMenu(null); }} className="mt-1 flex w-full items-center gap-2 rounded-lg border-t px-3 py-2 text-left text-xs font-medium" style={{ color: "#dc2626", borderColor: "#f3f4f6" }}>
                <UserX className="h-4 w-4 shrink-0" /> Retirer le livreur
              </button>
            )}
          </div>
        </>
      )}

      {statutColis && (
        <ColisStatusModal
          statutActuel={statutColis.statut}
          onChoose={(key) => { void updateStatut(statutColis.id, key); setStatutColis(null); }}
          onClose={() => setStatutColis(null)}
        />
      )}

      {notesColis && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 px-4 py-10 backdrop-blur-sm" onClick={() => { setNotesColis(null); void refresh(); }}>
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-card shadow-card" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
              <div className="flex min-w-0 items-center gap-2">
                <MessageSquare className="h-5 w-5 shrink-0 text-primary" />
                <h2 className="shrink-0 font-bold">Notes internes</h2>
                <span className="truncate rounded-md bg-info/15 px-2 py-0.5 font-mono text-sm font-bold text-info">{notesColis.tracking}</span>
              </div>
              <button onClick={() => { setNotesColis(null); void refresh(); }} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-5"><ColisCommentaires colisId={notesColis.id} /></div>
          </div>
        </div>
      )}

      <SiteFooter />
    </div>
  );
}