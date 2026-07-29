import { createFileRoute, useParams, Link, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft, Phone, MapPin, Store, Loader2, Wallet, Package, TrendingUp, RotateCcw,
  CheckCircle2, Clock, AlertTriangle, Plus, PhoneCall, MessageSquareWarning, StickyNote,
  CalendarClock, X, Check, ListTodo, Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { ClientDashboardPanel } from "@/components/client-dashboard-panel";
import { ColisBoard, type ColisBoardPermissions } from "@/components/colis-board";
import { useI18n } from "@/hooks/use-i18n";
import { getSoldeClient } from "@/lib/finance.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  listInteractions, creerInteraction, resoudreReclamation,
  listTaches, creerTache, toggleTache, supprimerTache, getStatsClient,
} from "@/lib/crm.functions";

export const Route = createFileRoute("/_authenticated/boutique/$id")({
  head: () => ({ meta: [{ title: "Fiche boutique — REVO EXPRESS" }] }),
  component: BoutiquePage,
});

const STAFF_ROLES = new Set([
  "admin", "admin_operations", "admin_service_client", "service_client",
  "directeur_commercial", "admin_commercial", "commercial",
]);

function fmtDA(n: number) {
  return new Intl.NumberFormat("fr-DZ").format(Math.round(n)) + " DA";
}

const INTERACTION_META: Record<string, { label: string; icon: any; tone: string }> = {
  appel: { label: "Appel", icon: PhoneCall, tone: "text-info bg-info/10" },
  reclamation: { label: "Réclamation", icon: MessageSquareWarning, tone: "text-destructive bg-destructive/10" },
  note: { label: "Note", icon: StickyNote, tone: "text-muted-foreground bg-muted" },
  rdv: { label: "Rendez-vous", icon: CalendarClock, tone: "text-primary bg-primary/10" },
};

const PRIORITE_META: Record<string, { label: string; tone: string }> = {
  urgent: { label: "Urgent", tone: "bg-destructive/10 text-destructive" },
  haute: { label: "Haute", tone: "bg-warning/10 text-warning" },
  normale: { label: "Normale", tone: "bg-info/10 text-info" },
  faible: { label: "Faible", tone: "bg-muted text-muted-foreground" },
};

function BoutiquePage() {
  const { id } = useParams({ from: "/_authenticated/boutique/$id" });
  const { role, loading: authLoading } = useAuth();
  const { t } = useI18n();
  const [profil, setProfil] = useState<any>(null);
  const [colis, setColis] = useState<any[]>([]);
  const [notesCount, setNotesCount] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [solde, setSolde] = useState<{ nb_colis: number; montant_du: number } | null>(null);
  const soldeFn = useServerFn(getSoldeClient);
  const statsFn = useServerFn(getStatsClient);
  const [stats, setStats] = useState<any | null>(null);

  const isOpsLevel = role === "admin" || role === "admin_operations";

  useEffect(() => {
    if (!role || !STAFF_ROLES.has(role)) return;
    const refresh = () =>
      supabase.from("colis").select("*").eq("client_id", id).order("date_creation", { ascending: false })
        .then(({ data }) => { setColis(data || []); setLoading(false); });
    void refresh();
    supabase.from("profiles").select("*").eq("id", id).maybeSingle().then(({ data }) => setProfil(data));
    if (isOpsLevel) soldeFn({ data: { client_id: id } }).then(setSolde).catch(() => {});
    statsFn({ data: { client_id: id } }).then(setStats).catch(() => {});
    supabase.from("colis_commentaires").select("colis_id")
      .then(({ data: rows, error }) => {
        if (error || !rows) return;
        const m: Record<string, number> = {};
        rows.forEach((r: any) => { m[r.colis_id] = (m[r.colis_id] ?? 0) + 1; });
        setNotesCount(m);
      });
    const ch = supabase.channel(`boutique-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "colis", filter: `client_id=eq.${id}` }, refresh)
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [id, role]);

  if (authLoading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!role || !STAFF_ROLES.has(role)) return <Navigate to="/" />;

  // Même logique de permissions que sur les boards principaux (admin.tsx / operations.tsx /
  // service-client.tsx) — un agent service client ou commercial qui ouvre la fiche d'une boutique
  // ne doit pas hériter de droits qu'il n'a pas sur le board principal.
  const permissions: ColisBoardPermissions = {
    canAssignLivreur: isOpsLevel,
    canEdit: isOpsLevel,
    canDelete: isOpsLevel,
    canChangeStatus: isOpsLevel,
    canEditPrice: true,
    showBlocked: isOpsLevel,
    showStatChips: true,
  };

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <section className="container mx-auto flex-1 px-4 pb-24 pt-10">
        <button onClick={() => window.history.back()} className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Retour
        </button>

        <div className="mb-6 flex items-center gap-4 rounded-2xl border border-border bg-card p-6 shadow-card">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Store className="h-7 w-7" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-black">{profil?.nom_boutique || profil?.nom || "Client"}</h1>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {profil?.telephone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{profil.telephone}</span>}
              {profil?.adresse && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{profil.adresse}</span>}
            </div>
          </div>
          {isOpsLevel && solde && (
            <div className="flex shrink-0 items-center gap-3 rounded-xl border border-warning/30 bg-warning/5 px-4 py-3">
              <Wallet className="h-5 w-5 text-warning" />
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Solde à reverser</div>
                <div className="text-lg font-black">{solde.montant_du.toLocaleString("fr-FR")} DA</div>
                <div className="text-xs text-muted-foreground">{solde.nb_colis} colis en attente</div>
              </div>
              {solde.montant_du > 0 && (
                <Link to="/finance">
                  <Button size="sm" variant="outline">Traiter dans Finance</Button>
                </Link>
              )}
            </div>
          )}
        </div>

        <Tabs defaultValue="apercu">
          <TabsList>
            <TabsTrigger value="apercu">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="commandes">Commandes</TabsTrigger>
            <TabsTrigger value="interactions">Appels & Réclamations</TabsTrigger>
            <TabsTrigger value="taches">Tâches</TabsTrigger>
          </TabsList>

          <TabsContent value="apercu">
            {stats && (
              <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                <StatCard icon={TrendingUp} label="CA généré" value={fmtDA(stats.ca_genere)} tone="primary" />
                <StatCard icon={Package} label="Colis" value={stats.nb_colis} tone="info" />
                <StatCard icon={CheckCircle2} label="Livrés" value={stats.livraisons_reussies} tone="success" />
                <StatCard icon={RotateCcw} label="Retours" value={stats.retours} tone="warning" />
                <StatCard icon={Clock} label="Retards" value={stats.retards} tone="warning" />
                <StatCard icon={AlertTriangle} label="Incidents" value={stats.incidents} tone="destructive" />
              </div>
            )}
            <ClientDashboardPanel colis={colis} />
          </TabsContent>

          <TabsContent value="commandes">
            {loading ? (
              <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : (
              <ColisBoard
                colis={colis}
                notesCount={notesCount}
                permissions={permissions}
                searchPlaceholder={t("adm.search.ph")}
                emptyMessage={t("adm.noColis")}
                onColisDeleted={(cid) => setColis((prev) => prev.filter((x) => x.id !== cid))}
              />
            )}
          </TabsContent>

          <TabsContent value="interactions">
            <InteractionsPanel clientId={id} />
          </TabsContent>

          <TabsContent value="taches">
            <TachesPanel clientId={id} />
          </TabsContent>
        </Tabs>
      </section>
      <SiteFooter />
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string | number; tone: string }) {
  const tones: Record<string, string> = {
    primary: "text-primary bg-primary/10", success: "text-success bg-success/10",
    warning: "text-warning bg-warning/10", destructive: "text-destructive bg-destructive/10", info: "text-info bg-info/10",
  };
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center gap-2.5">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tones[tone]}`}><Icon className="h-4 w-4" /></div>
        <div className="min-w-0">
          <div className="truncate text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className="text-lg font-black leading-tight">{value}</div>
        </div>
      </div>
    </div>
  );
}

function InteractionsPanel({ clientId }: { clientId: string }) {
  const listFn = useServerFn(listInteractions);
  const createFn = useServerFn(creerInteraction);
  const resoudreFn = useServerFn(resoudreReclamation);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: "appel" as "appel" | "reclamation" | "note" | "rdv", titre: "", description: "", date_prevue: "" });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try { setItems((await listFn({ data: { client_id: clientId } })).interactions); }
    catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, [clientId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await createFn({ data: {
        client_id: clientId, type: form.type, titre: form.titre.trim(),
        description: form.description.trim() || undefined,
        date_prevue: form.type === "rdv" && form.date_prevue ? new Date(form.date_prevue).toISOString() : undefined,
      }});
      toast.success("Enregistré");
      setForm({ type: "appel", titre: "", description: "", date_prevue: "" });
      setShowForm(false);
      void load();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  async function resoudre(id: string) {
    try { await resoudreFn({ data: { id } }); toast.success("Réclamation marquée résolue"); void load(); }
    catch (e: any) { toast.error(e.message); }
  }

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Button size="sm" className="gap-2 bg-gradient-primary" onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-4 w-4" /> Ajouter
        </Button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="mb-4 space-y-3 rounded-2xl border border-border bg-card p-4">
          <div className="flex flex-wrap gap-2">
            {(["appel", "reclamation", "note", "rdv"] as const).map((ty) => {
              const meta = INTERACTION_META[ty];
              const active = form.type === ty;
              return (
                <button type="button" key={ty} onClick={() => setForm({ ...form, type: ty })}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${active ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>
                  <meta.icon className="h-3.5 w-3.5" /> {meta.label}
                </button>
              );
            })}
          </div>
          <div><Label className="text-xs font-semibold">Titre *</Label><Input required value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })} className="mt-1" /></div>
          <div><Label className="text-xs font-semibold">Détails</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1" /></div>
          {form.type === "rdv" && (
            <div><Label className="text-xs font-semibold">Date prévue</Label><Input type="datetime-local" value={form.date_prevue} onChange={(e) => setForm({ ...form, date_prevue: e.target.value })} className="mt-1" /></div>
          )}
          <Button type="submit" disabled={saving} className="w-full gap-2 bg-gradient-primary">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Enregistrer
          </Button>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">Aucun appel, réclamation ou note pour ce client.</div>
      ) : (
        <div className="space-y-2">
          {items.map((it) => {
            const meta = INTERACTION_META[it.type];
            return (
              <div key={it.id} className="flex items-start gap-3 rounded-xl border border-border bg-card p-3">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${meta.tone}`}><meta.icon className="h-4 w-4" /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold">{it.titre}</span>
                    {it.type === "reclamation" && (
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${it.statut === "resolue" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                        {it.statut === "resolue" ? "Résolue" : "Ouverte"}
                      </span>
                    )}
                  </div>
                  {it.description && <p className="mt-0.5 text-xs text-muted-foreground">{it.description}</p>}
                  {it.date_prevue && <p className="mt-0.5 text-xs font-semibold text-primary">Prévu le {new Date(it.date_prevue).toLocaleString("fr-FR")}</p>}
                  <p className="mt-1 text-[11px] text-muted-foreground">{it.created_by_nom ?? "—"} · {new Date(it.created_at).toLocaleDateString("fr-FR")}</p>
                </div>
                {it.type === "reclamation" && it.statut === "ouverte" && (
                  <Button size="sm" variant="outline" className="shrink-0 gap-1.5" onClick={() => void resoudre(it.id)}>
                    <Check className="h-3.5 w-3.5" /> Résoudre
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TachesPanel({ clientId }: { clientId: string }) {
  const listFn = useServerFn(listTaches);
  const createFn = useServerFn(creerTache);
  const toggleFn = useServerFn(toggleTache);
  const deleteFn = useServerFn(supprimerTache);
  const [taches, setTaches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ titre: "", priorite: "normale" as "urgent" | "haute" | "normale" | "faible", echeance: "" });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try { setTaches((await listFn({ data: { client_id: clientId } })).taches); }
    catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, [clientId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await createFn({ data: { titre: form.titre.trim(), priorite: form.priorite, client_id: clientId, echeance: form.echeance ? new Date(form.echeance).toISOString() : undefined } });
      toast.success("Tâche ajoutée");
      setForm({ titre: "", priorite: "normale", echeance: "" });
      setShowForm(false);
      void load();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  async function toggle(t: any) {
    setTaches((prev) => prev.map((x) => x.id === t.id ? { ...x, statut: t.statut === "fait" ? "a_faire" : "fait" } : x));
    try { await toggleFn({ data: { id: t.id, fait: t.statut !== "fait" } }); }
    catch (e: any) { toast.error(e.message); void load(); }
  }

  async function remove(id: string) {
    try { await deleteFn({ data: { id } }); void load(); }
    catch (e: any) { toast.error(e.message); }
  }

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Button size="sm" className="gap-2 bg-gradient-primary" onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-4 w-4" /> Nouvelle tâche
        </Button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="mb-4 space-y-3 rounded-2xl border border-border bg-card p-4">
          <div><Label className="text-xs font-semibold">Titre *</Label><Input required value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })} className="mt-1" placeholder="Ex : Envoyer le devis" /></div>
          <div className="flex flex-wrap gap-2">
            {(["urgent", "haute", "normale", "faible"] as const).map((p) => (
              <button type="button" key={p} onClick={() => setForm({ ...form, priorite: p })}
                className={`rounded-full border px-3 py-1.5 text-xs font-bold ${form.priorite === p ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>
                {PRIORITE_META[p].label}
              </button>
            ))}
          </div>
          <div><Label className="text-xs font-semibold">Échéance</Label><Input type="datetime-local" value={form.echeance} onChange={(e) => setForm({ ...form, echeance: e.target.value })} className="mt-1" /></div>
          <Button type="submit" disabled={saving} className="w-full gap-2 bg-gradient-primary">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Ajouter
          </Button>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : taches.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          <ListTodo className="mx-auto mb-2 h-8 w-8" /> Aucune tâche pour ce client.
        </div>
      ) : (
        <div className="space-y-2">
          {taches.map((t) => (
            <div key={t.id} className={`flex items-center gap-3 rounded-xl border border-border bg-card p-3 ${t.statut === "fait" ? "opacity-60" : ""}`}>
              <button onClick={() => void toggle(t)} className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 ${t.statut === "fait" ? "border-success bg-success text-success-foreground" : "border-border"}`}>
                {t.statut === "fait" && <Check className="h-3.5 w-3.5" />}
              </button>
              <div className="min-w-0 flex-1">
                <span className={`text-sm font-semibold ${t.statut === "fait" ? "line-through" : ""}`}>{t.titre}</span>
                {t.echeance && <div className="text-xs text-muted-foreground">Échéance : {new Date(t.echeance).toLocaleString("fr-FR")}</div>}
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${PRIORITE_META[t.priorite].tone}`}>{PRIORITE_META[t.priorite].label}</span>
              <button onClick={() => void remove(t.id)} className="shrink-0 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
