import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import {
  Package,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Truck,
  Wallet,
  Clock,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { STATUTS, type StatutKey } from "@/lib/tarifs";
import { cn } from "@/lib/utils";
import { useI18n, Ltr, statutLabel } from "@/hooks/use-i18n";

type Colis = {
  id: string;
  statut: string;
  prix: number | null;
  prix_colis: number | null;
  date_creation: string;
  destinataire_wilaya: string | null;
  livreur_id: string | null;
};

type Livreur = { id: string; nom: string | null; email: string | null };

/* Couleurs directes (hex) — les graphiques ne comprennent pas oklch(var(...)) */
const C = {
  orange: "#f97316",
  orangeClair: "#fb923c",
  orangeDoux: "#fdba74",
  vert: "#22c55e",
  jaune: "#f59e0b",
  jauneDoux: "#fcd34d",
  rouge: "#dc2626",
  rougeDoux: "#f87171",
  gris: "#9ca3af",
  grille: "#e5e7eb",
  axe: "#9ca3af",
};

const STATUT_COLORS: Record<StatutKey, string> = {
  "en-preparation": C.jaune,
  "ramasse": C.orangeDoux,
  "expedie": C.orangeClair,
  "en-livraison": C.orange,
  "contact-client": C.jauneDoux,
  "livre": C.vert,
  "reporte": C.jauneDoux,
  "echec-livraison": C.rouge,
  "retourne-vendeur": C.rougeDoux,
  "annule": C.gris,
};

const STATUTS_EN_ROUTE = ["ramasse", "expedie", "en-livraison", "contact-client", "reporte"];
const STATUTS_TERMINES_SANS_CA = ["echec-livraison", "retourne-vendeur", "annule"];

function fmtDA(n: number) {
  return new Intl.NumberFormat("fr-DZ").format(Math.round(n)) + " DA";
}

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function ChartTooltip(props: any) {
  const { active, payload, label } = props;
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      {label && <div className="mb-1 font-semibold text-foreground">{label}</div>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-muted-foreground">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.fill }} />
          <span className="font-medium text-foreground">{p.name}:</span>
          <span>{p.value}</span>
        </div>
      ))}
    </div>
  );
}

type QuickFilterKey = "aTraiter" | "enCours" | "livres" | "problemes" | null;

export function AdminStats({
  onFilterClick, activeFilter,
}: {
  /** Facultatif : si fourni, les cartes deviennent cliquables et pilotent le filtre rapide du
   * ColisBoard affiché plus bas sur la même page (ex. cliquer "Échecs / Retours" ne montre que
   * les colis en échec dans le tableau en dessous). */
  onFilterClick?: (key: QuickFilterKey) => void;
  activeFilter?: QuickFilterKey;
} = {}) {
  const { t, tf, lang } = useI18n();
  const [colis, setColis] = useState<Colis[]>([]);
  const [livreurs, setLivreurs] = useState<Livreur[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const [{ data: c }, { data: r }] = await Promise.all([
        supabase
          .from("colis")
          .select("id, statut, prix, prix_colis, date_creation, destinataire_wilaya, livreur_id")
          .order("date_creation", { ascending: false })
          .limit(2000),
        supabase.from("user_roles").select("user_id").eq("role", "livreur"),
      ]);
      if (!mounted) return;
      setColis((c as Colis[]) || []);
      const ids = (r ?? []).map((x: any) => x.user_id);
      if (ids.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, nom, email")
          .in("id", ids);
        if (mounted) setLivreurs((profs as Livreur[]) || []);
      }
      if (mounted) setLoading(false);
    }
    void load();
    const ch = supabase
      .channel("admin-stats-colis")
      .on("postgres_changes", { event: "*", schema: "public", table: "colis" }, () => void load())
      .subscribe();
    return () => {
      mounted = false;
      void supabase.removeChannel(ch);
    };
  }, []);

  const kpis = useMemo(() => {
    const total = colis.length;
    const livre = colis.filter((c) => c.statut === "livre").length;
    const enCours = colis.filter((c) => STATUTS_EN_ROUTE.includes(c.statut)).length;
    const enPreparation = colis.filter((c) => c.statut === "en-preparation").length;
    const echec = colis.filter((c) => c.statut === "echec-livraison" || c.statut === "retourne-vendeur").length;
    const caLivre = colis
      .filter((c) => c.statut === "livre")
      .reduce((s, c) => s + Number(c.prix || 0), 0);
    const caEnCours = colis
      .filter((c) => c.statut !== "livre" && !STATUTS_TERMINES_SANS_CA.includes(c.statut))
      .reduce((s, c) => s + Number(c.prix || 0), 0);
    const taux = total ? Math.round((livre / total) * 100) : 0;
    return { total, livre, enCours, enPreparation, echec, caLivre, caEnCours, taux };
  }, [colis]);

  const series30 = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days: { date: string; label: string; total: number; livre: number }[] = [];
    const map = new Map<string, { total: number; livre: number }>();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const k = dayKey(d);
      map.set(k, { total: 0, livre: 0 });
      days.push({
        date: k,
        label: d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
        total: 0,
        livre: 0,
      });
    }
    for (const c of colis) {
      const k = dayKey(new Date(c.date_creation));
      const slot = map.get(k);
      if (!slot) continue;
      slot.total += 1;
      if (c.statut === "livre") slot.livre += 1;
    }
    return days.map((d) => ({ ...d, ...(map.get(d.date) || { total: 0, livre: 0 }) }));
  }, [colis]);

  const statutData = useMemo(() => {
    return STATUTS.map((s) => ({
      name: statutLabel(s.key, t),
      key: s.key,
      value: colis.filter((c) => c.statut === s.key).length,
      color: STATUT_COLORS[s.key],
    })).filter((x) => x.value > 0);
  }, [colis, lang]);

  const wilayaData = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of colis) {
      const w = (c.destinataire_wilaya || "—").trim();
      map.set(w, (map.get(w) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [colis]);

  const livreurData = useMemo(() => {
    const byId = new Map<string, { livre: number; encours: number }>();
    for (const c of colis) {
      if (!c.livreur_id) continue;
      const cur = byId.get(c.livreur_id) || { livre: 0, encours: 0 };
      if (c.statut === "livre") cur.livre += 1;
      else if (!STATUTS_TERMINES_SANS_CA.includes(c.statut)) cur.encours += 1;
      byId.set(c.livreur_id, cur);
    }
    const byName = new Map(livreurs.map((l) => [l.id, l.nom || l.email || t("ast.livreurDefault")]));
    return Array.from(byId.entries())
      .map(([id, v]) => ({ name: byName.get(id) || t("ast.livreurDefault"), ...v, total: v.livre + v.encours }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [colis, livreurs, lang]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl border border-border bg-card" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard icon={Package} label={t("ast.kpi.total")} value={kpis.total} tone="primary"
          onClick={onFilterClick ? () => onFilterClick(null) : undefined} active={!activeFilter} />
        <KpiCard icon={CheckCircle2} label={t("ast.kpi.livres")} value={kpis.livre} sub={tf("ast.kpi.deliveryRate", { n: kpis.taux })} tone="success"
          onClick={onFilterClick ? () => onFilterClick(activeFilter === "livres" ? null : "livres") : undefined} active={activeFilter === "livres"} />
        <KpiCard icon={Truck} label={t("ast.kpi.enCours")} value={kpis.enCours} tone="primary"
          onClick={onFilterClick ? () => onFilterClick(activeFilter === "enCours" ? null : "enCours") : undefined} active={activeFilter === "enCours"} />
        <KpiCard icon={Clock} label={t("ast.kpi.enPreparation")} value={kpis.enPreparation} tone="warning"
          onClick={onFilterClick ? () => onFilterClick(activeFilter === "aTraiter" ? null : "aTraiter") : undefined} active={activeFilter === "aTraiter"} />
        <KpiCard icon={Wallet} label={t("ast.kpi.caEncaisse")} value={<Ltr>{fmtDA(kpis.caLivre)}</Ltr>} sub={t("ast.kpi.colisLivres")} tone="success" wide
          onClick={onFilterClick ? () => onFilterClick(activeFilter === "livres" ? null : "livres") : undefined} active={activeFilter === "livres"} />
        <KpiCard icon={TrendingUp} label={t("ast.kpi.caEnCours")} value={<Ltr>{fmtDA(kpis.caEnCours)}</Ltr>} sub={t("ast.kpi.aEncaisser")} tone="primary" wide
          onClick={onFilterClick ? () => onFilterClick(activeFilter === "enCours" ? null : "enCours") : undefined} active={activeFilter === "enCours"} />
        <KpiCard icon={XCircle} label={t("ast.kpi.echecsRetours")} value={kpis.echec} tone="destructive"
          onClick={onFilterClick ? () => onFilterClick(activeFilter === "problemes" ? null : "problemes") : undefined} active={activeFilter === "problemes"} />
        <KpiCard icon={Users} label={t("ast.kpi.livreurs")} value={livreurs.length} tone="muted" />
      </div>

      {/* Daily chart */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
              {t("ast.activity30d")}
            </h3>
            <p className="text-xs text-muted-foreground">{t("ast.activity30d.sub")}</p>
          </div>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series30} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={C.orange} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={C.orange} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradLivre" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={C.vert} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={C.vert} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={C.grille} vertical={false} />
              <XAxis dataKey="label" stroke={C.axe} fontSize={11} tickLine={false} axisLine={false} interval={3} />
              <YAxis stroke={C.axe} fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: C.grille }} />
              <Area type="monotone" name={t("ast.chart.created")} dataKey="total" stroke={C.orange} strokeWidth={2} fill="url(#gradTotal)" />
              <Area type="monotone" name={t("ast.chart.delivered")} dataKey="livre" stroke={C.vert} strokeWidth={2} fill="url(#gradLivre)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Two-column row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Statuts pie */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-muted-foreground">
            {t("ast.breakdown")}
          </h3>
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <div className="h-56 w-full sm:w-1/2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statutData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2} stroke="#ffffff" strokeWidth={2}>
                    {statutData.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="w-full space-y-2 sm:w-1/2">
              {statutData.length === 0 && <li className="text-sm text-muted-foreground">{t("ast.noData")}</li>}
              {statutData.map((s) => (
                <li key={s.key} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm">
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                    {s.name}
                  </span>
                  <span className="font-bold">{s.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Top wilayas */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-muted-foreground">
            {t("ast.topDest")}
          </h3>
          <div className="h-56 w-full">
            {wilayaData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                {t("ast.noData")}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={wilayaData} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.grille} horizontal={false} />
                  <XAxis type="number" stroke={C.axe} fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" stroke={C.axe} fontSize={11} tickLine={false} axisLine={false} width={110} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
                  <Bar dataKey="value" name={t("ast.chart.colis")} fill={C.orange} radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Top livreurs */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-muted-foreground">
          {t("ast.driverPerf")}
        </h3>
        <div className="h-64 w-full">
          {livreurData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              {t("ast.noAssigned")}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={livreurData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.grille} vertical={false} />
                <XAxis dataKey="name" stroke={C.axe} fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke={C.axe} fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
                <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
                <Bar dataKey="livre" name={t("ast.kpi.livres")} stackId="a" fill={C.vert} radius={[0, 0, 0, 0]} />
                <Bar dataKey="encours" name={t("ast.kpi.enCours")} stackId="a" fill={C.orange} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  tone = "primary",
  wide,
  onClick,
  active,
}: {
  icon: any;
  label: string;
  value: React.ReactNode;
  sub?: string;
  tone?: "primary" | "success" | "warning" | "destructive" | "muted";
  wide?: boolean;
  onClick?: () => void;
  active?: boolean;
}) {
  const tones: Record<string, string> = {
    primary: "text-primary",
    success: "text-success",
    warning: "text-warning",
    destructive: "text-destructive",
    muted: "text-muted-foreground",
  };
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "rounded-2xl border bg-card p-4 shadow-card transition-all",
        wide && "md:col-span-2",
        onClick && "cursor-pointer text-left hover:-translate-y-0.5 hover:shadow-glow",
        active ? "border-primary ring-2 ring-primary/30" : "border-border",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className="mt-1 truncate text-2xl font-black text-foreground">{value}</div>
          {sub && <div className="mt-0.5 text-[11px] text-muted-foreground">{sub}</div>}
        </div>
        <div className={cn("rounded-xl bg-muted p-2", tones[tone])}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </Tag>
  );
}