import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Package, Plus, Loader2, Search, Eye, TrendingUp, Clock, CheckCircle2, XCircle,
  Download, Copy, Printer, Zap, Filter as FilterIcon, Pencil, ChevronDown,
  ArrowUp, ArrowDown, ArrowUpDown, ChevronLeft, ChevronRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { TrackingBadge } from "@/components/tracking-badge";
import { STATUTS, COMMUNES } from "@/lib/tarifs";
import { exportColisToXLSX } from "@/lib/export-csv";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/mes-colis")({
  head: () => ({ meta: [{ title: "Mes colis — REVO EXPRESS" }] }),
  component: MesColisPage,
});

type SortKey = "date" | "tracking" | "statut" | "destinataire" | "commune" | "total";
type SortDir = "asc" | "desc";

const PAGE_SIZES = [10, 25, 50, 100];

function MesColisPage() {
  const { user } = useAuth();
  const [colis, setColis] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statutFilter, setStatutFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [communeFilter, setCommuneFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    if (!user) return;
    const load = () =>
      supabase.from("colis").select("*").eq("client_id", user.id)
        .order("date_creation", { ascending: false })
        .then(({ data }) => { setColis(data || []); setLoading(false); });
    void load();
    const ch = supabase.channel("my-colis")
      .on("postgres_changes", { event: "*", schema: "public", table: "colis", filter: `client_id=eq.${user.id}` },
        () => { void load(); })
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [user]);

  const stats = useMemo(() => {
    const total = colis.length;
    const enCours = colis.filter((c) => ["en-attente", "pris-en-charge", "en-cours"].includes(c.statut)).length;
    const livres = colis.filter((c) => c.statut === "livre").length;
    const echecs = colis.filter((c) => c.statut === "echec").length;
    const cod = colis.filter((c) => c.statut === "livre").reduce((s, c) => s + Number(c.prix_colis ?? 0), 0);
    return { total, enCours, livres, echecs, cod };
  }, [colis]);

  const filtered = useMemo(() => {
    const fromTs = dateFrom ? new Date(dateFrom).getTime() : null;
    const toTs = dateTo ? new Date(dateTo).getTime() + 24 * 3600 * 1000 - 1 : null;
    return colis.filter((c) => {
      if (statutFilter !== "all" && c.statut !== statutFilter) return false;
      if (typeFilter !== "all" && c.type_livraison !== typeFilter) return false;
      if (communeFilter !== "all") {
        const m = communeFilter === c.destinataire_wilaya || communeFilter === c.depart;
        if (!m) return false;
      }
      if (fromTs !== null || toTs !== null) {
        const ts = new Date(c.date_creation).getTime();
        if (fromTs !== null && ts < fromTs) return false;
        if (toTs !== null && ts > toTs) return false;
      }
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        c.tracking?.toLowerCase().includes(q) ||
        c.destinataire_nom?.toLowerCase().includes(q) ||
        c.destinataire_wilaya?.toLowerCase().includes(q) ||
        c.destinataire_tel?.toLowerCase().includes(q)
      );
    });
  }, [colis, query, statutFilter, typeFilter, communeFilter, dateFrom, dateTo]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    const dir = sortDir === "asc" ? 1 : -1;
    const get = (c: any): string | number => {
      switch (sortKey) {
        case "tracking": return c.tracking || "";
        case "statut": return c.statut || "";
        case "destinataire": return c.destinataire_nom || "";
        case "commune": return c.destinataire_wilaya || "";
        case "total": return Number(c.prix_colis ?? 0) + Number(c.prix ?? 0);
        case "date":
        default: return new Date(c.date_creation).getTime();
      }
    };
    arr.sort((a, b) => {
      const va = get(a), vb = get(b);
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
      return String(va).localeCompare(String(vb), "fr") * dir;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, safePage, pageSize]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [query, statutFilter, typeFilter, communeFilter, dateFrom, dateTo, pageSize]);

  const allSelected = pageRows.length > 0 && pageRows.every((c) => selected.has(c.id));
  const someSelected = pageRows.some((c) => selected.has(c.id));

  const toggleAll = () => {
    const next = new Set(selected);
    if (allSelected) pageRows.forEach((c) => next.delete(c.id));
    else pageRows.forEach((c) => next.add(c.id));
    setSelected(next);
  };
  const toggleOne = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const selectedRows = sorted.filter((c) => selected.has(c.id));
  const rowsForActions = selectedRows.length > 0 ? selectedRows : sorted;

  const copyTracking = async (t: string) => {
    try { await navigator.clipboard.writeText(t); toast.success(`${t} copié`); }
    catch { toast.error("Impossible de copier"); }
  };

  const printSelected = () => {
    if (rowsForActions.length === 0) return;
    if (rowsForActions.length === 1) {
      window.open(`/colis/${rowsForActions[0].tracking}?print=1`, "_blank");
      return;
    }
    const ids = rowsForActions.map((c) => c.id).join(",");
    window.open(`/print-bordereaux?ids=${encodeURIComponent(ids)}`, "_blank");
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir(key === "date" ? "desc" : "asc"); }
  };

  // Counters per statut for filter chips
  const countByStatut = useMemo(() => {
    const m: Record<string, number> = {};
    colis.forEach((c) => { m[c.statut] = (m[c.statut] ?? 0) + 1; });
    return m;
  }, [colis]);

  const resetFilters = () => {
    setQuery(""); setStatutFilter("all"); setTypeFilter("all");
    setCommuneFilter("all"); setDateFrom(""); setDateTo("");
  };

  const hasActiveFilters =
    query !== "" || statutFilter !== "all" || typeFilter !== "all" ||
    communeFilter !== "all" || dateFrom !== "" || dateTo !== "";

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <section className="container mx-auto flex-1 px-4 py-10">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.25em] text-primary">Tableau de bord</div>
            <h1 className="mt-1 text-3xl font-black md:text-4xl">Mes colis</h1>
            <p className="text-sm text-muted-foreground">Suivez, imprimez et exportez tous vos bordereaux.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/commander">
              <Button className="gap-2 bg-gradient-primary shadow-glow">
                <Plus className="h-4 w-4" /> Nouvelle commande
              </Button>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="gap-2 bg-warning font-bold text-warning-foreground hover:bg-warning/90">
                  <Zap className="h-4 w-4" /> Actions <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel>
                  {selectedRows.length > 0 ? `${selectedRows.length} sélectionné(s)` : `${sorted.length} colis`}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={printSelected} disabled={rowsForActions.length === 0}>
                  <Printer className="mr-2 h-4 w-4" /> Imprimer
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => exportColisToXLSX(rowsForActions, `mes-colis-${new Date().toISOString().slice(0, 10)}.xlsx`)}
                  disabled={rowsForActions.length === 0}
                >
                  <Download className="mr-2 h-4 w-4" /> Exporter
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Stat cards */}
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard icon={Package} label="Total" value={stats.total} />
          <StatCard icon={Clock} label="En cours" value={stats.enCours} accent="info" />
          <StatCard icon={CheckCircle2} label="Livrés" value={stats.livres} accent="success" />
          <StatCard icon={XCircle} label="Échecs" value={stats.echecs} accent="destructive" />
          <StatCard icon={TrendingUp} label="COD encaissé" value={`${stats.cod} DA`} accent="primary" />
        </div>

        {/* Filter chips — par statut */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <button onClick={() => setStatutFilter("all")} className={chipCls(statutFilter === "all")}>
            Tous <span className="ml-1 rounded-full bg-background/30 px-1.5 text-[10px]">{colis.length}</span>
          </button>
          {STATUTS.map((s) => (
            <button key={s.key} onClick={() => setStatutFilter(s.key)} className={chipCls(statutFilter === s.key)}>
              {s.label}
              <span className="ml-1 rounded-full bg-background/30 px-1.5 text-[10px]">{countByStatut[s.key] ?? 0}</span>
            </button>
          ))}
        </div>

        {/* Search + filters */}
        <div className="mb-4 grid gap-3 rounded-xl border border-border bg-card p-3 md:grid-cols-[1fr_auto_auto_auto_auto_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Tracking, nom, téléphone, commune..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            title="Type de livraison"
          >
            <option value="all">Tous les types</option>
            <option value="standard">Standard</option>
            <option value="urgent">Urgent</option>
          </select>
          <select
            value={communeFilter}
            onChange={(e) => setCommuneFilter(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            title="Commune (Alger)"
          >
            <option value="all">Toutes les communes</option>
            {COMMUNES.map((c) => (
              <option key={c.name} value={c.name}>{c.name}</option>
            ))}
          </select>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-[150px]"
            title="Date du"
          />
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-[150px]"
            title="Date au"
          />
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={resetFilters}
            disabled={!hasActiveFilters}
          >
            <FilterIcon className="h-4 w-4" /> Réinitialiser
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : sorted.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
            <Package className="mx-auto h-12 w-12 text-muted-foreground" />
            <h2 className="mt-3 font-bold">{colis.length === 0 ? "Aucun colis" : "Aucun résultat"}</h2>
            <p className="text-sm text-muted-foreground">
              {colis.length === 0 ? "Passez votre première commande pour commencer." : "Modifiez vos filtres pour voir d'autres colis."}
            </p>
            {colis.length === 0 ? (
              <Link to="/commander" className="mt-4 inline-block">
                <Button className="bg-gradient-primary">Commander</Button>
              </Link>
            ) : (
              <Button variant="outline" className="mt-4" onClick={resetFilters}>
                Réinitialiser les filtres
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            {/* Select-all bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/40 px-4 py-2.5">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
                <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                {someSelected
                  ? `${selectedRows.length} sélectionné(s) sur ${sorted.length}`
                  : `Sélectionner cette page (${pageRows.length})`}
              </label>
              <div className="text-xs text-muted-foreground">
                {sorted.length} colis {hasActiveFilters && `(filtré sur ${colis.length})`}
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/30">
                  <tr className="text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    <th className="w-10 px-3 py-3"></th>
                    <SortableTh label="Tracking" k="tracking" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                    <th className="px-3 py-3">Type</th>
                    <SortableTh label="Statut" k="statut" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                    <SortableTh label="Destinataire" k="destinataire" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                    <SortableTh label="Commune" k="commune" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                    <SortableTh label="Date" k="date" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                    <SortableTh label="Total" k="total" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} align="right" />
                    <th className="px-3 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((c) => {
                    const isSel = selected.has(c.id);
                    return (
                      <tr key={c.id} className={`border-t border-border transition-colors hover:bg-muted/30 ${isSel ? "bg-primary/5" : ""}`}>
                        <td className="px-3 py-3">
                          <Checkbox checked={isSel} onCheckedChange={() => toggleOne(c.id)} />
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1.5">
                            <span className="rounded-md bg-info/15 px-2 py-0.5 font-mono text-xs font-bold text-info">
                              {c.tracking}
                            </span>
                            <TrackingBadge typeColis={c.type_colis} />
                            <button
                              onClick={() => copyTracking(c.tracking)}
                              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                              aria-label="Copier"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          {c.type_livraison === "urgent" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-xs font-bold text-warning">
                              <Zap className="h-3 w-3" /> Urgent
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                              Standard
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3"><Badge statut={c.statut} /></td>
                        <td className="px-3 py-3">
                          <div className="font-medium">{c.destinataire_nom}</div>
                          <div className="text-xs text-muted-foreground">{c.destinataire_tel}</div>
                        </td>
                        <td className="px-3 py-3">
                          <span className="inline-block rounded border border-border bg-background px-2 py-0.5 text-xs">
                            {c.destinataire_wilaya ?? "—"}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-xs text-muted-foreground">
                          {new Date(c.date_creation).toLocaleDateString("fr-FR")}
                        </td>
                        <td className="px-3 py-3 text-right font-bold">
                          {Number(c.prix_colis ?? 0) + Number(c.prix ?? 0)} DA
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Link to="/colis/$tracking" params={{ tracking: c.tracking }}>
                              <Button size="icon" variant="outline" className="h-8 w-8 text-info" title="Détails">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Link to="/colis/$tracking" params={{ tracking: c.tracking }} search={{ print: 1 } as any}>
                              <Button size="icon" variant="outline" className="h-8 w-8 text-info" title="Imprimer">
                                <Printer className="h-4 w-4" />
                              </Button>
                            </Link>
                            {c.statut === "en-attente" && (
                              <Link to="/commander">
                                <Button size="icon" variant="outline" className="h-8 w-8 text-muted-foreground" title="Modifier">
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/30 px-4 py-2.5 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Par page&nbsp;:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="rounded-md border border-input bg-background px-2 py-1 text-sm"
                >
                  {PAGE_SIZES.map((n) => (<option key={n} value={n}>{n}</option>))}
                </select>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="px-3 text-sm font-semibold">
                  Page {safePage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </section>
      <SiteFooter />
    </div>
  );
}

function SortableTh({
  label, k, sortKey, sortDir, onClick, align,
}: {
  label: string; k: SortKey; sortKey: SortKey; sortDir: SortDir;
  onClick: (k: SortKey) => void; align?: "right";
}) {
  const active = sortKey === k;
  return (
    <th className={`px-3 py-3 ${align === "right" ? "text-right" : ""}`}>
      <button
        onClick={() => onClick(k)}
        className={`inline-flex items-center gap-1 hover:text-foreground ${active ? "text-foreground" : ""}`}
      >
        {label}
        {active
          ? (sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)
          : <ArrowUpDown className="h-3 w-3 opacity-50" />}
      </button>
    </th>
  );
}

function chipCls(active: boolean) {
  return `inline-flex items-center rounded-full border border-border bg-card px-3 py-1 text-xs font-bold transition-colors hover:bg-muted ${
    active ? "ring-2 ring-primary bg-primary text-primary-foreground border-primary" : "text-foreground"
  }`;
}

function StatCard({
  icon: Icon, label, value, accent,
}: {
  icon: any; label: string; value: string | number;
  accent?: "info" | "success" | "destructive" | "primary";
}) {
  const accentMap: Record<string, string> = {
    info: "text-info bg-info/10",
    success: "text-success bg-success/10",
    destructive: "text-destructive bg-destructive/10",
    primary: "text-primary bg-primary/10",
  };
  const cls = accent ? accentMap[accent] : "text-foreground bg-muted";
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${cls}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="text-xl font-black">{value}</div>
        </div>
      </div>
    </div>
  );
}

function Badge({ statut }: { statut: string }) {
  const s = STATUTS.find((x) => x.key === statut);
  const colorMap: Record<string, string> = {
    warning: "bg-warning/20 text-warning",
    info: "bg-info/20 text-info",
    success: "bg-success/20 text-success",
    destructive: "bg-destructive/20 text-destructive",
  };
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${colorMap[s?.color ?? "info"]}`}>{s?.label ?? statut}</span>;
}
