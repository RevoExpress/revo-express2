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

const STATUT_COLORS: Record<StatutKey, string> = {
  "en-attente": "oklch(var(--warning))",
  "pris-en-charge": "oklch(var(--primary))",
  "en-cours": "oklch(var(--primary) / 0.7)",
  "livre": "oklch(var(--success))",
  "echec": "oklch(var(--destructive))",
};

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

export function AdminStats() {
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
    const enCours = colis.filter((c) => c.statut === "en-cours" || c.statut === "pris-en-charge").length;
    const enAttente = colis.filter((c) => c.statut === "en-attente").length;
    const echec = colis.filter((c) => c.statut === "echec").length;
    const caLivre = colis
      .filter((c) => c.statut === "livre")
      .reduce((s, c) => s + Number(c.prix || 0), 0);
    const caEnCours = colis
      .filter((c) => c.statut !== "livre" && c.statut !== "echec")
      .reduce((s, c) => s + Number(c.prix || 0), 0);
    const taux = total ? Math.round((livre / total) * 100) : 0;
    return { total, livre, enCours, enAttente, echec, caLivre, caEnCours, taux };
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
      name: s.label,
      key: s.key,
      value: colis.filter((c) => c.statut === s.key).length,
      color: STATUT_COLORS[s.key],
    })).filter((x) => x.value > 0);
  }, [colis]);

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
      else if (c.statut !== "echec") cur.encours += 1;
      byId.set(c.livreur_id, cur);
    }
    const byName = new Map(livreurs.map((l) => [l.id, l.nom || l.email || "Livreur"]));
    return Array.from(byId.entries())
      .map(([id, v]) => ({ name: byName.get(id) || "Livreur", ...v, total: v.livre + v.encours }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [colis, livreurs]);

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
        <KpiCard icon={Package} label="Total colis" value={kpis.total} tone="primary" />
        <KpiCard icon={CheckCircle2} label="Livrés" value={kpis.livre} sub={`${kpis.taux}% taux livraison`} tone="success" />
        <KpiCard icon={Truck} label="En cours" value={kpis.enCours} tone="primary" />
        <KpiCard icon={Clock} label="En attente" value={kpis.enAttente} tone="warning" />
        <KpiCard icon={Wallet} label="CA encaissé" value={fmtDA(kpis.caLivre)} sub="colis livrés" tone="success" wide />
        <KpiCard icon={TrendingUp} label="CA en cours" value={fmtDA(kpis.caEnCours)} sub="à encaisser" tone="primary" wide />
        <KpiCard icon={XCircle} label="Échecs" value={kpis.echec} tone="destructive" />
        <KpiCard icon={Users} label="Livreurs" value={livreurs.length} tone="muted" />
      </div>

      {/* Daily chart */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
              Activité — 30 derniers jours
            </h3>
            <p className="text-xs text-muted-foreground">Colis créés et livrés par jour</p>
          </div>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series30} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="oklch(var(--primary))" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="oklch(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradLivre" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="oklch(var(--success))" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="oklch(var(--success))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(var(--border))" vertical={false} />
              <XAxis dataKey="label" stroke="oklch(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} interval={3} />
              <YAxis stroke="oklch(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: "oklch(var(--border))" }} />
              <Area type="monotone" name="Créés" dataKey="total" stroke="oklch(var(--primary))" strokeWidth={2} fill="url(#gradTotal)" />
              <Area type="monotone" name="Livrés" dataKey="livre" stroke="oklch(var(--success))" strokeWidth={2} fill="url(#gradLivre)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Two-column row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Statuts pie */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-muted-foreground">
            Répartition par statut
          </h3>
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <div className="h-56 w-full sm:w-1/2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statutData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2} stroke="oklch(var(--card))" strokeWidth={2}>
                    {statutData.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="w-full space-y-2 sm:w-1/2">
              {statutData.length === 0 && <li className="text-sm text-muted-foreground">Aucune donnée</li>}
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
            Top destinations
          </h3>
          <div className="h-56 w-full">
            {wilayaData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Aucune donnée
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={wilayaData} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(var(--border))" horizontal={false} />
                  <XAxis type="number" stroke="oklch(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" stroke="oklch(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} width={110} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "oklch(var(--muted) / 0.4)" }} />
                  <Bar dataKey="value" name="Colis" fill="oklch(var(--primary))" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Top livreurs */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-muted-foreground">
          Performance des livreurs
        </h3>
        <div className="h-64 w-full">
          {livreurData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Aucun colis assigné pour le moment
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={livreurData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(var(--border))" vertical={false} />
                <XAxis dataKey="name" stroke="oklch(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="oklch(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "oklch(var(--muted) / 0.4)" }} />
                <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
                <Bar dataKey="livre" name="Livrés" stackId="a" fill="oklch(var(--success))" radius={[0, 0, 0, 0]} />
                <Bar dataKey="encours" name="En cours" stackId="a" fill="oklch(var(--primary))" radius={[6, 6, 0, 0]} />
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
}: {
  icon: any;
  label: string;
  value: string | number;
  sub?: string;
  tone?: "primary" | "success" | "warning" | "destructive" | "muted";
  wide?: boolean;
}) {
  const tones: Record<string, string> = {
    primary: "from-primary/10 to-primary/0 text-primary",
    success: "from-success/10 to-success/0 text-success",
    warning: "from-warning/10 to-warning/0 text-warning",
    destructive: "from-destructive/10 to-destructive/0 text-destructive",
    muted: "from-muted to-transparent text-muted-foreground",
  };
  return (
    <div className={cn("relative overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-card", wide && "md:col-span-2")}>
      <div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-br", tones[tone])} />
      <div className="relative flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className="mt-1 truncate text-2xl font-black text-foreground">{value}</div>
          {sub && <div className="mt-0.5 text-[11px] text-muted-foreground">{sub}</div>}
        </div>
        <div className={cn("rounded-xl bg-background/70 p-2 ring-1 ring-border", tones[tone].split(" ").pop())}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}
