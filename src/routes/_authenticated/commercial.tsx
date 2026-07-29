import { createFileRoute, Navigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import {
  Loader2, UserPlus, Store, Phone, MapPin, Mail, KeyRound, Briefcase, Tag, X,
  Users, UserCheck, UserX, FileCheck, Wallet, Package, Target, Trophy, Pencil, Check,
  ListTodo, Plus, Trash2, Bell, TrendingDown, TrendingUp, Star, CalendarClock, AlertTriangle,
} from "lucide-react";
import { ProPageHeader } from "@/components/pro-page-header";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { ModalPortal } from "@/components/modal-portal";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { createClientFull, listMyClients, getTarifClient, setTarifClient } from "@/lib/comptes.functions";
import { getDashboardCommercial, setMonObjectif, getInsightsCommercial } from "@/lib/commercial.functions";
import { listTaches, creerTache, toggleTache, supprimerTache } from "@/lib/crm.functions";
import { STANDARD_PRICE, TARIFFS } from "@/lib/tarifs";

const PRIORITE_META: Record<string, { label: string; tone: string }> = {
  urgent: { label: "Urgent", tone: "bg-destructive/10 text-destructive" },
  haute: { label: "Haute", tone: "bg-warning/10 text-warning" },
  normale: { label: "Normale", tone: "bg-info/10 text-info" },
  faible: { label: "Faible", tone: "bg-muted text-muted-foreground" },
};

function MesTachesWidget() {
  const listFn = useServerFn(listTaches);
  const createFn = useServerFn(creerTache);
  const toggleFn = useServerFn(toggleTache);
  const deleteFn = useServerFn(supprimerTache);
  const [taches, setTaches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [nouvelle, setNouvelle] = useState("");
  const [adding, setAdding] = useState(false);

  async function load() {
    setLoading(true);
    try { setTaches((await listFn({ data: {} })).taches.filter((t: any) => t.statut === "a_faire")); }
    catch (e: any) { /* pas autorisé */ }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  async function addQuick(e: React.FormEvent) {
    e.preventDefault();
    if (!nouvelle.trim()) return;
    setAdding(true);
    try { await createFn({ data: { titre: nouvelle.trim(), priorite: "normale" } }); setNouvelle(""); void load(); }
    catch (e: any) { toast.error(e.message); }
    finally { setAdding(false); }
  }

  async function toggle(t: any) {
    setTaches((prev) => prev.filter((x) => x.id !== t.id));
    try { await toggleFn({ data: { id: t.id, fait: true } }); }
    catch (e: any) { toast.error(e.message); void load(); }
  }

  const today = new Date(); today.setHours(23, 59, 59, 999);
  const enRetard = (t: any) => t.echeance && new Date(t.echeance) < new Date();

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <h3 className="mb-3 flex items-center gap-2 font-bold"><ListTodo className="h-4 w-4 text-primary" /> Mes tâches</h3>
      <form onSubmit={addQuick} className="mb-3 flex gap-2">
        <Input value={nouvelle} onChange={(e) => setNouvelle(e.target.value)} placeholder="Ajouter une tâche…" className="h-8 text-sm" />
        <Button type="submit" size="icon" disabled={adding} className="h-8 w-8 shrink-0 bg-gradient-primary"><Plus className="h-4 w-4" /></Button>
      </form>
      {loading ? (
        <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : taches.length === 0 ? (
        <p className="py-3 text-center text-xs text-muted-foreground">Aucune tâche en attente 🎉</p>
      ) : (
        <div className="max-h-64 space-y-1.5 overflow-y-auto">
          {taches.map((t) => (
            <div key={t.id} className="flex items-center gap-2 rounded-lg border border-border/60 px-2.5 py-2">
              <button onClick={() => void toggle(t)} className="h-4 w-4 shrink-0 rounded border-2 border-border hover:border-success" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{t.titre}</div>
                {t.echeance && (
                  <div className={`text-[11px] ${enRetard(t) ? "font-bold text-destructive" : "text-muted-foreground"}`}>
                    {new Date(t.echeance).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </div>
                )}
              </div>
              <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${PRIORITE_META[t.priorite].tone}`}>{PRIORITE_META[t.priorite].label}</span>
              <button onClick={() => void deleteFn({ data: { id: t.id } }).then(load)} className="shrink-0 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/commercial")({
  head: () => ({ meta: [{ title: "Espace commercial — REVO EXPRESS" }] }),
  component: CommercialPage,
});

const empty = {
  email: "", password: "", nom: "", nom_boutique: "",
  telephone: "", adresse: "", wilaya: "Alger",
};

function fmtDA(n: number) {
  return new Intl.NumberFormat("fr-DZ").format(Math.round(n)) + " DA";
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <div className="mb-1 font-semibold text-foreground">{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-muted-foreground">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.fill }} />
          {p.name} : <b className="text-foreground">{p.dataKey === "ca" ? fmtDA(p.value) : p.value}</b>
        </div>
      ))}
    </div>
  );
}

function DashCard({ icon: Icon, label, value, tone, subtitle, to }: {
  icon: any; label: string; value: string | number; tone: "primary" | "success" | "warning" | "destructive" | "info";
  subtitle?: string; to?: string;
}) {
  const tones: Record<string, string> = {
    primary: "text-primary bg-primary/10",
    success: "text-success bg-success/10",
    warning: "text-warning bg-warning/10",
    destructive: "text-destructive bg-destructive/10",
    info: "text-info bg-info/10",
  };
  const body = (
    <>
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className="text-xl font-black leading-tight">{value}</div>
        </div>
      </div>
      {subtitle && <div className="mt-1.5 text-xs text-muted-foreground">{subtitle}</div>}
    </>
  );
  const cls = `block rounded-2xl border border-border bg-card p-4 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card ${to ? "cursor-pointer hover:border-primary/40" : ""}`;
  return to ? <Link to={to} className={cls}>{body}</Link> : <div className={cls}>{body}</div>;
}

function NotifRow({ icon: Icon, text, tone }: { icon: any; text: string; tone: "primary" | "success" | "warning" | "destructive" | "muted" }) {
  const tones: Record<string, string> = {
    primary: "text-primary bg-primary/10", success: "text-success bg-success/10",
    warning: "text-warning bg-warning/10", destructive: "text-destructive bg-destructive/10",
    muted: "text-muted-foreground bg-muted",
  };
  return (
    <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-accent/40">
      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${tones[tone]}`}><Icon className="h-3.5 w-3.5" /></div>
      <span className="min-w-0 flex-1 truncate">{text}</span>
    </div>
  );
}

function CommercialPage() {
  const { role, loading } = useAuth();
  const createFn = useServerFn(createClientFull);
  const listFn = useServerFn(listMyClients);
  const getTarifFn = useServerFn(getTarifClient);
  const setTarifFn = useServerFn(setTarifClient);
  const dashFn = useServerFn(getDashboardCommercial);
  const objectifFn = useServerFn(setMonObjectif);
  const insightsFn = useServerFn(getInsightsCommercial);

  const [form, setForm] = useState(empty);
  const [submitting, setSubmitting] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [tarifClient, setTarifClientSel] = useState<any | null>(null);
  const [tarifForm, setTarifForm] = useState({ standard: "", proche: "", moyen: "", loin: "" });
  const [tarifLoading, setTarifLoading] = useState(false);
  const [tarifSaving, setTarifSaving] = useState(false);

  const [dash, setDash] = useState<any | null>(null);
  const [dashLoading, setDashLoading] = useState(true);
  const [editingObjectif, setEditingObjectif] = useState(false);
  const [objectifValue, setObjectifValue] = useState("");
  const [insights, setInsights] = useState<any | null>(null);

  const allowed = role === "admin" || role === "directeur_commercial" || role === "admin_commercial" || role === "commercial";

  async function refresh() {
    try {
      const r = await listFn();
      setClients(r.clients ?? []);
    } catch (e: any) { toast.error(e.message); }
  }
  async function refreshDash() {
    setDashLoading(true);
    try { setDash(await dashFn()); } catch (e: any) { toast.error(e.message); }
    finally { setDashLoading(false); }
  }
  async function refreshInsights() {
    try { setInsights(await insightsFn()); } catch (e: any) { /* silencieux, non bloquant */ }
  }

  useEffect(() => {
    if (allowed) { void refresh(); void refreshDash(); void refreshInsights(); }
  }, [role]);

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!allowed) return <Navigate to="/" />;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createFn({ data: form });
      toast.success(`Compte créé : ${form.nom_boutique}`);
      setForm(empty);
      setShowCreate(false);
      void refresh();
      void refreshDash();
    } catch (err: any) {
      toast.error(err.message ?? "Création échouée");
    } finally {
      setSubmitting(false);
    }
  }

  async function openTarifs(c: any) {
    setTarifClientSel(c);
    setTarifLoading(true);
    try {
      const res = await getTarifFn({ data: { client_id: c.id } });
      const t = res.tarif as any;
      setTarifForm({
        standard: t?.tarif_standard != null ? String(t.tarif_standard) : "",
        proche: t?.tarif_urgent_proche != null ? String(t.tarif_urgent_proche) : "",
        moyen: t?.tarif_urgent_moyen != null ? String(t.tarif_urgent_moyen) : "",
        loin: t?.tarif_urgent_loin != null ? String(t.tarif_urgent_loin) : "",
      });
    } catch (e: any) {
      toast.error(e.message ?? "Impossible de charger les tarifs");
    } finally {
      setTarifLoading(false);
    }
  }

  async function saveTarifs() {
    if (!tarifClient) return;
    setTarifSaving(true);
    try {
      await setTarifFn({
        data: {
          client_id: tarifClient.id,
          tarif_standard: tarifForm.standard.trim() === "" ? null : Number(tarifForm.standard),
          tarif_urgent_proche: tarifForm.proche.trim() === "" ? null : Number(tarifForm.proche),
          tarif_urgent_moyen: tarifForm.moyen.trim() === "" ? null : Number(tarifForm.moyen),
          tarif_urgent_loin: tarifForm.loin.trim() === "" ? null : Number(tarifForm.loin),
        },
      });
      toast.success(`Tarifs mis à jour pour ${tarifClient.nom_boutique ?? tarifClient.nom}`);
      setTarifClientSel(null);
    } catch (e: any) {
      toast.error(e.message ?? "Échec de l'enregistrement");
    } finally {
      setTarifSaving(false);
    }
  }

  async function saveObjectif() {
    const n = objectifValue.trim() === "" ? null : Number(objectifValue);
    try {
      await objectifFn({ data: { objectif_ca_mensuel: n } });
      toast.success("Objectif mis à jour");
      setEditingObjectif(false);
      void refreshDash();
    } catch (e: any) { toast.error(e.message); }
  }

  const progression = dash?.objectif_ca_mensuel ? Math.min(100, Math.round((dash.ca_mois / dash.objectif_ca_mensuel) * 100)) : null;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <section className="container mx-auto flex-1 px-4 pb-24 pt-10">
        <ProPageHeader
          icon={Briefcase}
          title="Espace commercial"
          subtitle={dash?.scope === "all" ? "Vue d'ensemble de toute l'équipe commerciale." : "Votre portefeuille et votre pipeline, en un coup d'œil."}
          action={
            <Button onClick={() => setShowCreate(true)} className="gap-2 bg-gradient-primary shadow-glow">
              <UserPlus className="h-4 w-4" /> Nouveau client
            </Button>
          }
        />

        {dashLoading ? (
          <div className="mt-8 flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : dash && (
          <>
            {/* KPIs */}
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <DashCard icon={Target} label="Prospects en cours" value={dash.nb_prospects} tone="info" to="/prospection" />
              <DashCard icon={UserPlus} label="Nouveaux clients" value={dash.nouveaux_clients_30j} tone="primary" subtitle="30 derniers jours" />
              <DashCard icon={UserCheck} label="Clients actifs" value={dash.clients_actifs} tone="success" subtitle="Commande < 30j" />
              <DashCard icon={UserX} label="Clients inactifs" value={dash.clients_inactifs} tone="warning" subtitle="Rien depuis 30j" />
              <DashCard icon={FileCheck} label="Contrats signés" value={dash.contrats_signes_total} tone="success" subtitle={`dont ${dash.contrats_signes_mois} ce mois-ci`} to="/prospection" />
              <DashCard icon={Package} label="Colis ce mois" value={dash.nb_colis_mois} tone="primary" to="/carte-clients" />
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-4">
              {/* Objectif */}
              <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 font-bold"><Wallet className="h-4 w-4 text-primary" /> CA du mois</h3>
                  {!editingObjectif && (
                    <button onClick={() => { setEditingObjectif(true); setObjectifValue(dash.objectif_ca_mensuel != null ? String(dash.objectif_ca_mensuel) : ""); }} className="text-xs font-semibold text-primary hover:underline">
                      <Pencil className="inline h-3 w-3" /> Objectif
                    </button>
                  )}
                </div>
                <div className="text-2xl font-black">{fmtDA(dash.ca_mois)}</div>
                {editingObjectif ? (
                  <div className="mt-3 flex items-center gap-2">
                    <Input type="number" min={0} value={objectifValue} onChange={(e) => setObjectifValue(e.target.value)} placeholder="Objectif DA" className="h-8" />
                    <Button size="icon" className="h-8 w-8 shrink-0 bg-gradient-primary" onClick={() => void saveObjectif()}><Check className="h-4 w-4" /></Button>
                  </div>
                ) : dash.objectif_ca_mensuel ? (
                  <div className="mt-3">
                    <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                      <span>Objectif : {fmtDA(dash.objectif_ca_mensuel)}</span>
                      <span className="font-bold text-foreground">{progression}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-gradient-primary transition-all" style={{ width: `${progression}%` }} />
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-muted-foreground">Aucun objectif défini — cliquez sur "Objectif" pour en fixer un.</p>
                )}
              </div>

              <MesTachesWidget />

              {/* Evolution */}
              <div className="rounded-2xl border border-border bg-card p-5 shadow-soft lg:col-span-2">
                <h3 className="mb-3 font-bold">Évolution du CA (6 derniers mois)</h3>
                <ResponsiveContainer width="100%" height={140}>
                  <AreaChart data={dash.evolution}>
                    <defs>
                      <linearGradient id="caGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f97316" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="mois" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={0} />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="ca" name="CA" stroke="#f97316" strokeWidth={2} fill="url(#caGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Notifications & Recommandations */}
            {insights && (
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
                  <h3 className="mb-3 flex items-center gap-2 font-bold"><Bell className="h-4 w-4 text-warning" /> Notifications</h3>
                  <div className="space-y-2">
                    {insights.objectif_proche && (
                      <NotifRow icon={Target} tone="success" text={`Objectif mensuel presque atteint (${insights.objectif_proche.pct}%) !`} />
                    )}
                    {insights.aujourdhui.map((a: any) => {
                      const row = <NotifRow icon={CalendarClock} tone="primary" text={`${a.type === "rdv" ? "RDV" : "Tâche"} aujourd'hui ${new Date(a.heure).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} — ${a.titre}`} />;
                      return a.client_id ? <Link key={a.id} to="/boutique/$id" params={{ id: a.client_id }}>{row}</Link> : <div key={a.id}>{row}</div>;
                    })}
                    {insights.relances_oubliees.map((r: any) => (
                      <NotifRow key={r.id} icon={AlertTriangle} tone="warning" text={`Relance oubliée : ${r.nom} (${r.jours}j sans contact)`} />
                    ))}
                    {insights.clients_inactifs.slice(0, 4).map((c: any) => (
                      <Link key={c.id} to="/boutique/$id" params={{ id: c.id }}>
                        <NotifRow icon={UserX} tone="muted" text={`${c.nom} — inactif depuis 30j`} />
                      </Link>
                    ))}
                    {!insights.objectif_proche && insights.aujourdhui.length === 0 && insights.relances_oubliees.length === 0 && insights.clients_inactifs.length === 0 && (
                      <p className="py-4 text-center text-xs text-muted-foreground">Rien à signaler — tout est à jour 👍</p>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
                  <h3 className="mb-3 flex items-center gap-2 font-bold"><Star className="h-4 w-4 text-primary" /> Recommandations</h3>
                  <div className="space-y-2">
                    {insights.clients_croissance.map((c: any) => (
                      <Link key={c.id} to="/boutique/$id" params={{ id: c.id }}>
                        <NotifRow icon={TrendingUp} tone="success" text={`${c.nom} — croissance exceptionnelle (${c.detail})`} />
                      </Link>
                    ))}
                    {insights.clients_premium.map((c: any) => (
                      <Link key={c.id} to="/boutique/$id" params={{ id: c.id }}>
                        <NotifRow icon={Star} tone="primary" text={`${c.nom} — client premium potentiel (${c.detail})`} />
                      </Link>
                    ))}
                    {insights.clients_en_baisse.map((c: any) => (
                      <Link key={c.id} to="/boutique/$id" params={{ id: c.id }}>
                        <NotifRow icon={TrendingDown} tone="destructive" text={`${c.nom} — volume en baisse (${c.detail})`} />
                      </Link>
                    ))}
                    {insights.clients_croissance.length === 0 && insights.clients_premium.length === 0 && insights.clients_en_baisse.length === 0 && (
                      <p className="py-4 text-center text-xs text-muted-foreground">Pas assez de données pour des recommandations pour l'instant.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Classement (visible uniquement en vue d'ensemble) */}
            {dash.scope === "all" && (
              <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
                <div className="border-b border-border p-4"><h3 className="flex items-center gap-2 font-bold"><Trophy className="h-4 w-4 text-warning" /> Classement commerciaux — ce mois-ci</h3></div>
                {dash.classement.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">Aucun commercial "terrain" pour l'instant.</div>
                ) : (
                  <Table className="text-sm">
                    <TableHeader className="bg-muted/30 text-xs uppercase text-muted-foreground">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="px-4 py-2">#</TableHead>
                        <TableHead className="px-4 py-2">Commercial</TableHead>
                        <TableHead className="px-4 py-2 text-end">Clients</TableHead>
                        <TableHead className="px-4 py-2 text-end">CA du mois</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="[&_tr]:divide-border">
                      {dash.classement.map((c: any, i: number) => (
                        <TableRow key={c.commercial_id}>
                          <TableCell className="px-4 py-2 font-black text-muted-foreground">{i + 1}</TableCell>
                          <TableCell className="px-4 py-2 font-semibold">{c.nom}</TableCell>
                          <TableCell className="px-4 py-2 text-end">{c.nb_clients}</TableCell>
                          <TableCell className="px-4 py-2 text-end font-bold">{fmtDA(c.ca_mois)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            )}
          </>
        )}

        <div className="mt-6 flex items-center justify-between">
          <h2 className="font-bold">Clients ({clients.length})</h2>
          <Link to="/prospection" className="text-sm font-semibold text-primary hover:underline">Voir le pipeline de prospection →</Link>
        </div>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
          <Table className="text-sm">
            <TableHeader className="bg-muted/50 text-xs uppercase">
              <TableRow className="hover:bg-transparent">
                <TableHead className="px-3 py-2">Boutique</TableHead>
                <TableHead className="px-3 py-2">Gérant</TableHead>
                <TableHead className="px-3 py-2">Tél</TableHead>
                <TableHead className="px-3 py-2">Adresse</TableHead>
                <TableHead className="px-3 py-2 text-end">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="[&_tr]:divide-border">
              {clients.map((c) => (
                <TableRow key={c.id} className="hover:bg-accent/40">
                  <TableCell className="px-3 py-2 font-bold">{c.nom_boutique ?? "—"}</TableCell>
                  <TableCell className="px-3 py-2">{c.nom ?? "—"}<br /><span className="text-xs text-muted-foreground">{c.email}</span></TableCell>
                  <TableCell className="px-3 py-2 font-mono text-xs">{c.telephone ?? "—"}</TableCell>
                  <TableCell className="px-3 py-2 text-xs">{c.adresse ?? "—"}<br /><span className="text-muted-foreground">{c.wilaya ?? ""}</span></TableCell>
                  <TableCell className="px-3 py-2 text-end">
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => void openTarifs(c)}>
                      <Tag className="h-3.5 w-3.5" /> Tarifs
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {clients.length === 0 && (
                <TableRow><TableCell colSpan={5} className="p-8 text-center text-muted-foreground">Aucun client créé</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      <Sheet open={showCreate} onOpenChange={setShowCreate}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5 text-primary" /> Nouveau client</SheetTitle>
          </SheetHeader>
          <form onSubmit={onSubmit} className="mt-4 space-y-4 px-1">
            <Field icon={Store} label="Nom de la boutique" value={form.nom_boutique} onChange={(v) => setForm({ ...form, nom_boutique: v })} placeholder="Ex: Revo Express Alger" />
            <Field icon={UserPlus} label="Nom du gérant" value={form.nom} onChange={(v) => setForm({ ...form, nom: v })} placeholder="Nom complet" />
            <Field icon={Phone} label="Téléphone" value={form.telephone} onChange={(v) => setForm({ ...form, telephone: v })} type="tel" placeholder="0661234567" />
            <Field icon={MapPin} label="Adresse" value={form.adresse} onChange={(v) => setForm({ ...form, adresse: v })} placeholder="Bab Ezzouar, Alger" />
            <Field icon={MapPin} label="Wilaya" value={form.wilaya} onChange={(v) => setForm({ ...form, wilaya: v })} />
            <div className="h-px bg-border" />
            <Field icon={Mail} label="Email (login)" value={form.email} onChange={(v) => setForm({ ...form, email: v })} type="email" />
            <Field icon={KeyRound} label="Mot de passe" value={form.password} onChange={(v) => setForm({ ...form, password: v })} type="text" placeholder="Min. 6 caractères" />
            <Button type="submit" disabled={submitting} className="w-full bg-gradient-primary shadow-glow">
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Créer le compte
            </Button>
          </form>
        </SheetContent>
      </Sheet>

      {tarifClient && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm"
            onClick={() => setTarifClientSel(null)}
          >
            <div
              className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-card"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-1 flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-bold">
                  <Tag className="h-4 w-4 text-primary" /> Tarifs négociés
                </h3>
                <button onClick={() => setTarifClientSel(null)}><X className="h-5 w-5 text-muted-foreground" /></button>
              </div>
              <p className="mb-4 text-sm text-muted-foreground">{tarifClient.nom_boutique ?? tarifClient.nom}</p>

              {tarifLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
              ) : (
                <div className="space-y-3">
                  <TarifField
                    label="Standard (toutes distances)"
                    placeholder={String(STANDARD_PRICE)}
                    value={tarifForm.standard}
                    onChange={(v) => setTarifForm({ ...tarifForm, standard: v })}
                  />
                  <TarifField
                    label={`Urgent ≤ ${TARIFFS[0].maxKm} km`}
                    placeholder={String(TARIFFS[0].price)}
                    value={tarifForm.proche}
                    onChange={(v) => setTarifForm({ ...tarifForm, proche: v })}
                  />
                  <TarifField
                    label={`Urgent ≤ ${TARIFFS[1].maxKm} km`}
                    placeholder={String(TARIFFS[1].price)}
                    value={tarifForm.moyen}
                    onChange={(v) => setTarifForm({ ...tarifForm, moyen: v })}
                  />
                  <TarifField
                    label={`Urgent ≤ ${TARIFFS[2].maxKm} km`}
                    placeholder={String(TARIFFS[2].price)}
                    value={tarifForm.loin}
                    onChange={(v) => setTarifForm({ ...tarifForm, loin: v })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Laissez vide pour appliquer le tarif standard Revo.
                  </p>
                  <Button
                    className="w-full gap-2 bg-gradient-primary shadow-glow"
                    disabled={tarifSaving}
                    onClick={() => void saveTarifs()}
                  >
                    {tarifSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                    Enregistrer
                  </Button>
                </div>
              )}
            </div>
          </div>
        </ModalPortal>
      )}

      <SiteFooter />
    </div>
  );
}

function TarifField({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string;
}) {
  return (
    <div>
      <Label className="text-xs font-semibold">{label}</Label>
      <div className="mt-1 flex items-center gap-2">
        <Input
          type="number"
          min={0}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
        <span className="shrink-0 text-xs text-muted-foreground">DA</span>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder, icon: Icon }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; icon?: any;
}) {
  return (
    <div>
      <Label className="flex items-center gap-1.5 text-xs font-semibold">
        {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}{label}
      </Label>
      <Input required type={type} value={value} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)} className="mt-1" />
    </div>
  );
}
