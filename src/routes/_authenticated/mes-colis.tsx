import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Package, Plus, Loader2, Search, CheckCircle2,
  Download, Upload, Copy, Printer, Zap, Filter as FilterIcon, Pencil, Trash2, ChevronDown,
  ArrowUp, ArrowDown, ArrowUpDown, ChevronLeft, ChevronRight, Truck, MessageCircle, AlertTriangle,
  SlidersHorizontal, Boxes, Clock3, XOctagon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { TrackingBadge } from "@/components/tracking-badge";
import { ColisHistoriqueModal } from "@/components/colis-historique-modal";
import { TrackingActions } from "@/components/tracking-actions";
import { ColisMessagesButton } from "@/components/colis-messages-button";
import { ModalPortal } from "@/components/modal-portal";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { STATUTS, COMMUNES } from "@/lib/tarifs";
import { exportColisToXLSX } from "@/lib/export-csv";
import { KpiChip } from "@/components/kpi-chip";
import { NewBadge } from "@/components/new-badge";
import { useI18n, Ltr, statutLabel } from "@/hooks/use-i18n";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { confirmAction } from "@/components/confirm-dialog";
import { useServerFn } from "@tanstack/react-start";
import { getMonSolde } from "@/lib/finance.functions";
import { Wallet } from "lucide-react";

export const Route = createFileRoute("/_authenticated/mes-colis")({
  head: () => ({ meta: [{ title: "Mes colis — REVO EXPRESS" }] }),
  component: MesColisPage,
});

type SortKey = "date" | "updated" | "tracking" | "statut" | "destinataire" | "commune" | "total";
type SortDir = "asc" | "desc";

const PAGE_SIZES = [10, 25, 50, 100];
const STATUTS_EN_ROUTE = new Set(["ramasse", "expedie", "en-livraison", "contact-client", "reporte"]);

const SERVICE_CLIENT_WHATSAPP = "213793461877";

function buildRamassageWhatsAppLink(nbColis: number, trackings: string[]): string {
  const msg = `Bonjour, nouvelle demande de ramassage : ${nbColis} colis. Trackings : ${trackings.join(", ")}`;
  return `https://wa.me/${SERVICE_CLIENT_WHATSAPP}?text=${encodeURIComponent(msg)}`;
}

function MesColisPage() {
  const { user } = useAuth();
  const { t, tf } = useI18n();
  const [colis, setColis] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statutFilter, setStatutFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [communeFilter, setCommuneFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // Par défaut, le colis dont le statut a été modifié le plus récemment remonte en haut de la liste.
  const [sortKey, setSortKey] = useState<SortKey>("updated");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [histoColis, setHistoColis] = useState<any | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [demandingRamassage, setDemandingRamassage] = useState(false);
  const [ramassageResult, setRamassageResult] = useState<{ nbColis: number; trackings: string[] } | null>(null);
  const [pendingRamassageIds, setPendingRamassageIds] = useState<Set<string>>(new Set());
  const [solde, setSolde] = useState<{ nb_colis: number; montant_du: number } | null>(null);
  const soldeFn = useServerFn(getMonSolde);

  useEffect(() => {
    if (!user) return;
    soldeFn().then(setSolde).catch(() => {});
  }, [user]);

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

  // Colis already covered by a pickup request that isn't finished yet — must not be requested again.
  useEffect(() => {
    if (!user) return;
    const loadPending = () =>
      supabase
        .from("demandes_ramassage")
        .select("id, demande_ramassage_colis(colis_id)")
        .eq("client_id", user.id)
        .neq("statut", "terminee")
        .then(({ data }) => {
          const ids = new Set<string>();
          (data || []).forEach((d: any) =>
            (d.demande_ramassage_colis || []).forEach((l: any) => ids.add(l.colis_id)));
          setPendingRamassageIds(ids);
        });
    void loadPending();
    const ch = supabase.channel("my-ramassages")
      .on("postgres_changes", { event: "*", schema: "public", table: "demandes_ramassage", filter: `client_id=eq.${user.id}` },
        () => { void loadPending(); })
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [user]);

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
        case "total": return Number(c.prix_colis ?? 0);
        case "date": return new Date(c.date_creation).getTime();
        case "updated":
        default: return new Date(c.updated_at ?? c.date_creation).getTime();
      }
    };
    arr.sort((a, b) => {
      const va = get(a), vb = get(b);
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
      return String(va).localeCompare(String(vb), "fr") * dir;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, safePage, pageSize]);

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
  const eligiblesRamassage = selectedRows.filter(
    (c) => c.statut === "en-preparation" && !pendingRamassageIds.has(c.id)
  );

  const copyTracking = async (tracking: string) => {
    try { await navigator.clipboard.writeText(tracking); toast.success(tf("mc.toast.copied", { n: tracking })); }
    catch { toast.error(t("mc.toast.copyFail")); }
  };

  const printSelected = () => {
    if (rowsForActions.length === 0) return;
    if (rowsForActions.length === 1) {
      window.open(`/print/${rowsForActions[0].tracking}`, "_blank");
      return;
    }
    const ids = rowsForActions.map((c) => c.id).join(",");
    window.open(`/print-bordereaux?ids=${encodeURIComponent(ids)}`, "_blank");
  };

  async function demanderRamassage() {
    if (!user || eligiblesRamassage.length === 0) {
      toast.error(t("mc.toast.selectPrep"));
      return;
    }
    if (eligiblesRamassage.length < selectedRows.length) {
      toast.info(tf("mc.toast.ignoredCount", { n: selectedRows.length - eligiblesRamassage.length }));
    }
    setDemandingRamassage(true);
    const { data: demande, error } = await supabase
      .from("demandes_ramassage")
      .insert({ client_id: user.id, nb_colis: eligiblesRamassage.length })
      .select()
      .single();
    if (error || !demande) {
      setDemandingRamassage(false);
      toast.error(t("mc.toast.reqFail"), { description: error?.message });
      return;
    }
    const { error: linkError } = await supabase
      .from("demande_ramassage_colis")
      .insert(eligiblesRamassage.map((c) => ({ demande_id: demande.id, colis_id: c.id })));
    setDemandingRamassage(false);
    if (linkError) {
      toast.error(t("mc.toast.reqFail"), { description: linkError.message });
      return;
    }
    toast.success(tf("mc.toast.pickupSent", { n: eligiblesRamassage.length }));
    setRamassageResult({
      nbColis: eligiblesRamassage.length,
      trackings: eligiblesRamassage.map((c) => c.tracking),
    });
    setSelected(new Set());
  }

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir(key === "date" ? "desc" : "asc"); }
  };

  const countByStatut = useMemo(() => {
    const m: Record<string, number> = {};
    colis.forEach((c) => { m[c.statut] = (m[c.statut] ?? 0) + 1; });
    return m;
  }, [colis]);

  const kpis = useMemo(() => ({
    total: colis.length,
    aTraiter: colis.filter((c) => c.statut === "en-preparation").length,
    enCours: colis.filter((c) => STATUTS_EN_ROUTE.has(c.statut)).length,
    livres: colis.filter((c) => c.statut === "livre").length,
    problemes: colis.filter((c) => c.statut === "echec-livraison" || c.statut === "retourne-vendeur" || c.statut === "annule").length,
  }), [colis]);

  const resetFilters = () => {
    setQuery(""); setStatutFilter("all"); setTypeFilter("all");
    setCommuneFilter("all"); setDateFrom(""); setDateTo("");
  };

  const hasActiveFilters =
    query !== "" || statutFilter !== "all" || typeFilter !== "all" ||
    communeFilter !== "all" || dateFrom !== "" || dateTo !== "";

  const advancedFilterCount =
    (statutFilter !== "all" ? 1 : 0) + (typeFilter !== "all" ? 1 : 0) +
    (communeFilter !== "all" ? 1 : 0) + (dateFrom !== "" ? 1 : 0) + (dateTo !== "" ? 1 : 0);

  async function handleDelete(c: any) {
    const ok = await confirmAction({
      title: tf("mc.confirm.deleteTitle", { t: c.tracking }),
      description: t("mc.confirm.deleteDesc"),
      confirmLabel: t("common.delete"),
      cancelLabel: t("common.cancel"),
      destructive: true,
    });
    if (!ok) return;
    setDeletingId(c.id);
    const { error } = await supabase.from("colis").delete().eq("id", c.id);
    setDeletingId(null);
    if (error) { toast.error(t("mc.toast.delFail"), { description: error.message }); return; }
    toast.success(tf("mc.toast.deleted", { t: c.tracking }));
    setColis((prev) => prev.filter((x) => x.id !== c.id));
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <section className="container mx-auto flex-1 px-4 pb-24 pt-10">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black md:text-4xl">{t("mc.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("mc.subtitle")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/commander">
              <Button className="gap-2 bg-gradient-primary shadow-glow">
                <Plus className="h-4 w-4" /> {t("mc.newOrder")}
              </Button>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="gap-2 bg-warning font-bold text-warning-foreground hover:bg-warning/90">
                  <Zap className="h-4 w-4" /> {t("common.actions")} <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  {selectedRows.length > 0 ? tf("mc.selectedCount", { n: selectedRows.length }) : tf("mc.colisCount", { n: sorted.length })}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={printSelected} disabled={rowsForActions.length === 0}>
                  <Printer className="me-2 h-4 w-4" /> {t("common.print")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => exportColisToXLSX(rowsForActions, `mes-colis-${new Date().toISOString().slice(0, 10)}.xlsx`)}
                  disabled={rowsForActions.length === 0}
                >
                  <Download className="me-2 h-4 w-4" /> {t("common.export")}
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/import" className="flex w-full cursor-pointer items-center">
                    <Upload className="me-2 h-4 w-4" /> {t("mc.importExcel")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => void demanderRamassage()}
                  disabled={demandingRamassage || eligiblesRamassage.length === 0}
                >
                  {demandingRamassage ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Truck className="me-2 h-4 w-4" />}
                  {t("mc.requestPickup")} {eligiblesRamassage.length > 0 && `(${eligiblesRamassage.length})`}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {solde && solde.montant_du > 0 && (
          <Link
            to="/mon-paiement"
            className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-gradient-navy p-5 text-white shadow-card transition-opacity hover:opacity-95"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs text-white/70">Mon solde</div>
                <div className="text-2xl font-black text-primary">
                  {solde.montant_du.toLocaleString("fr-FR")} <span className="text-base font-medium text-white/70">DA</span>
                </div>
              </div>
            </div>
            <span className="text-sm font-semibold text-white/80 underline-offset-2 hover:underline">
              {solde.nb_colis} colis livré{solde.nb_colis > 1 ? "s" : ""} en attente — voir mon paiement →
            </span>
          </Link>
        )}

        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
          <KpiChip icon={Boxes} label={t("adm.kpi.total")} value={kpis.total} tone="primary" />
          <KpiChip icon={Clock3} label={t("adm.kpi.aTraiter")} value={kpis.aTraiter} tone="warning" />
          <KpiChip icon={Truck} label={t("adm.kpi.enCours")} value={kpis.enCours} tone="primary" />
          <KpiChip icon={CheckCircle2} label={t("adm.kpi.livres")} value={kpis.livres} tone="success" />
          <KpiChip icon={XOctagon} label={t("adm.kpi.problemes")} value={kpis.problemes} tone="destructive" />
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t("mc.search.ph")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="ps-9"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline" size="icon" title={t("common.print")}
              disabled={rowsForActions.length === 0} onClick={printSelected}
              className={selectedRows.length > 0 ? "border-info/50 text-info hover:bg-info/10 hover:text-info" : ""}
            >
              <Printer className="h-4 w-4" />
            </Button>
            <Button
              variant="outline" size="icon" title={t("mc.requestPickup")}
              disabled={demandingRamassage || eligiblesRamassage.length === 0}
              onClick={() => void demanderRamassage()}
              className={`relative ${eligiblesRamassage.length > 0 ? "border-primary/50 text-primary hover:bg-primary/10 hover:text-primary" : ""}`}
            >
              <Truck className="h-4 w-4" />
              {eligiblesRamassage.length > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-black text-primary-foreground">
                  {eligiblesRamassage.length}
                </span>
              )}
            </Button>
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="relative gap-2">
                <NewBadge id="mc-filtres-avances" />
                <SlidersHorizontal className="h-4 w-4" /> {t("adm.filter.advanced")}
                {advancedFilterCount > 0 && (
                  <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-black text-primary-foreground">
                    {advancedFilterCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-[280px] space-y-3">
              <div>
                <div className="mb-1 text-xs font-bold text-muted-foreground">{t("mc.th.statut")}</div>
                <Select value={statutFilter} onValueChange={setStatutFilter}>
                  <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("common.all")}</SelectItem>
                    {STATUTS.map((s) => (
                      <SelectItem key={s.key} value={s.key}>{statutLabel(s.key, t)} ({countByStatut[s.key] ?? 0})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <div className="mb-1 text-xs font-bold text-muted-foreground">{t("cmd.type")}</div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("mc.allTypes")}</SelectItem>
                    <SelectItem value="standard">{t("common.standard")}</SelectItem>
                    <SelectItem value="urgent">{t("common.urgent")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <div className="mb-1 text-xs font-bold text-muted-foreground">{t("mc.communeTitle")}</div>
                <Select value={communeFilter} onValueChange={setCommuneFilter}>
                  <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("mc.allCommunes")}</SelectItem>
                    {COMMUNES.map((c) => (
                      <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="mb-1 text-xs font-bold text-muted-foreground">{t("mc.dateFrom")}</div>
                  <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                </div>
                <div>
                  <div className="mb-1 text-xs font-bold text-muted-foreground">{t("mc.dateTo")}</div>
                  <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full gap-2" onClick={resetFilters} disabled={!hasActiveFilters}>
                <FilterIcon className="h-4 w-4" /> {t("common.reset")}
              </Button>
            </PopoverContent>
          </Popover>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : sorted.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
            <Package className="mx-auto h-12 w-12 text-muted-foreground" />
            <h2 className="mt-3 font-bold">{colis.length === 0 ? t("mc.empty.none") : t("mc.empty.noResult")}</h2>
            <p className="text-sm text-muted-foreground">
              {colis.length === 0 ? t("mc.empty.startCta") : t("mc.empty.changeFilters")}
            </p>
            {colis.length === 0 ? (
              <Link to="/commander" className="mt-4 inline-block">
                <Button className="bg-gradient-primary">{t("mc.empty.order")}</Button>
              </Link>
            ) : (
              <Button variant="outline" className="mt-4" onClick={resetFilters}>
                {t("mc.empty.resetFilters")}
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/40 px-4 py-2.5">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
                <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                {someSelected
                  ? tf("mc.selectedOf", { n: selectedRows.length, m: sorted.length })
                  : tf("mc.selectPage", { n: pageRows.length })}
              </label>
              <div className="text-xs text-muted-foreground">
                {hasActiveFilters ? tf("mc.colisFiltered", { n: sorted.length, m: colis.length }) : tf("mc.colisCount", { n: sorted.length })}
              </div>
            </div>

            <Table className="text-sm">
                <TableHeader className="bg-muted/30">
                  <TableRow className="text-start text-xs font-bold uppercase tracking-wider text-muted-foreground hover:bg-transparent">
                    <TableHead className="w-10 px-3 py-3"></TableHead>
                    <SortableTh label={t("mc.th.tracking")} k="tracking" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                    <TableHead className="px-3 py-3">{t("mc.th.type")}</TableHead>
                    <SortableTh label={t("mc.th.statut")} k="statut" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                    <SortableTh label={t("mc.th.destinataire")} k="destinataire" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                    <SortableTh label={t("mc.th.commune")} k="commune" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                    <SortableTh label={t("mc.th.date")} k="date" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                    <SortableTh label={t("mc.th.prix")} k="total" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} align="right" />
                    <TableHead className="px-3 py-3 text-end">{t("mc.th.fraisLivraison")}</TableHead>
                    <TableHead className="px-3 py-3 text-end">{t("mc.th.action")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageRows.map((c) => {
                    const isSel = selected.has(c.id);
                    const peutSupprimer = c.statut === "en-preparation";
                    const premierMot = c.description ? c.description.trim().split(/\s+/)[0] : null;
                    const bloque = c.statut === "en-preparation" && Date.now() - new Date(c.date_creation).getTime() > 48 * 3600 * 1000;
                    return (
                      <TableRow key={c.id} className={`hover:bg-muted/30 ${isSel ? "bg-primary/5" : ""}`}>
                        <TableCell className="px-3 py-3">
                          <Checkbox checked={isSel} onCheckedChange={() => toggleOne(c.id)} />
                        </TableCell>
                        <TableCell className="px-3 py-3">
                          <div className="flex items-center gap-1.5">
                            <Ltr className="rounded-md bg-info/15 px-2 py-0.5 font-mono text-xs font-bold text-info">
                              {c.tracking}
                            </Ltr>
                            <TrackingBadge typeColis={c.type_colis} />
                            <button
                              onClick={() => copyTracking(c.tracking)}
                              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                              aria-label={t("common.copy")}
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </TableCell>
                        <TableCell className="px-3 py-3">
                          {c.type_livraison === "urgent" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-xs font-bold text-warning">
                              <Zap className="h-3 w-3" /> {t("common.urgent")}
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                              {t("common.standard")}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="px-3 py-3">
                          <div className="flex flex-wrap items-center gap-1">
                            <button
                              onClick={() => setHistoColis(c)}
                              title={t("common.viewHistory")}
                              className="cursor-pointer rounded-full transition-shadow hover:ring-2 hover:ring-primary/40"
                            >
                              <Badge statut={c.statut} />
                            </button>
                            {pendingRamassageIds.has(c.id) && (
                              <span
                                title={t("mc.pickupRequested")}
                                className="inline-flex items-center rounded-full bg-info/15 px-1.5 py-0.5 text-[10px] font-bold text-info"
                              >
                                <Truck className="h-3 w-3" />
                              </span>
                            )}
                            {bloque && (
                              <span
                                title={t("mc.blockedWarning")}
                                className="inline-flex items-center rounded-full bg-destructive/15 px-1.5 py-0.5 text-[10px] font-bold text-destructive"
                              >
                                <AlertTriangle className="h-3 w-3" />
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="px-3 py-3">
                          <div className="font-medium">{c.destinataire_nom}</div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Ltr>{c.destinataire_tel}</Ltr>
                            {premierMot && <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold">{premierMot}…</span>}
                          </div>
                        </TableCell>
                        <TableCell className="px-3 py-3">
                          <div className="flex flex-wrap gap-1">
                            <span className="inline-block rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                              {c.destinataire_wilaya ?? "—"}
                            </span>
                            {c.destinataire_commune && (
                              <span className="inline-block rounded-full bg-info/15 px-2 py-0.5 text-xs font-bold text-info">
                                {c.destinataire_commune}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="px-3 py-3 text-xs text-muted-foreground">
                          <Ltr>{new Date(c.date_creation).toLocaleDateString("fr-FR")}</Ltr>
                        </TableCell>
                        <TableCell className="px-3 py-3 text-end font-bold">
                          <Ltr>{Number(c.prix_colis ?? 0)} DA</Ltr>
                        </TableCell>
                        <TableCell className="px-3 py-3 text-end text-muted-foreground">
                          <Ltr>{Number(c.prix ?? 0)} DA</Ltr>
                        </TableCell>
                        <TableCell className="px-3 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <ColisMessagesButton colis={c} />
                            <TrackingActions colis={c} hidePrint />
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="icon" variant="outline" className="h-8 w-8 text-muted-foreground" title={t("adm.row.moreActions")}>
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => window.open(`/print/${c.tracking}`, "_blank")}>
                                  <Printer className="me-2 h-4 w-4" /> {t("common.print")}
                                </DropdownMenuItem>
                                {c.statut === "en-preparation" && (
                                  <DropdownMenuItem asChild>
                                    <Link to="/commander" search={{ colis: c.id } as any} className="flex w-full cursor-pointer items-center">
                                      <Pencil className="me-2 h-4 w-4" /> {t("common.edit")}
                                    </Link>
                                  </DropdownMenuItem>
                                )}
                                {peutSupprimer && (
                                  <DropdownMenuItem
                                    onClick={() => void handleDelete(c)}
                                    disabled={deletingId === c.id}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    {deletingId === c.id ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Trash2 className="me-2 h-4 w-4" />}
                                    {t("common.delete")}
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/30 px-4 py-2.5 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">{t("common.perPage")}</span>
                <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                  <SelectTrigger className="h-8 w-[72px] text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZES.map((n) => (<SelectItem key={n} value={String(n)}>{n}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                >
                  <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
                </Button>
                <span className="px-3 text-sm font-semibold">
                  {tf("common.pageOf", { n: safePage, m: totalPages })}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                >
                  <ChevronRight className="h-4 w-4 rtl:rotate-180" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </section>
      <SiteFooter />

      {histoColis && (
        <ColisHistoriqueModal
          tracking={histoColis.tracking}
          typeColis={histoColis.type_colis}
          onClose={() => setHistoColis(null)}
        />
      )}

      {ramassageResult && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
            onClick={() => setRamassageResult(null)}
          >
            <div
              className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-card"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="text-center text-lg font-bold">{t("mc.modal.sent")}</h3>
              <p className="mt-1 text-center text-sm text-muted-foreground">
                {tf("mc.modal.opsNotified", { n: ramassageResult.nbColis })}
              </p>
              <div className="mt-5 flex flex-col gap-2">
                <Button
                  className="w-full gap-2 bg-success text-white hover:bg-success/90"
                  onClick={() =>
                    window.open(
                      buildRamassageWhatsAppLink(ramassageResult.nbColis, ramassageResult.trackings),
                      "_blank",
                    )
                  }
                >
                  <MessageCircle className="h-4 w-4" /> {t("mc.modal.whatsapp")}
                </Button>
                <Button variant="outline" className="w-full" onClick={() => setRamassageResult(null)}>
                  {t("common.close")}
                </Button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
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
    <TableHead className={`px-3 py-3 ${align === "right" ? "text-end" : ""}`}>
      <button
        onClick={() => onClick(k)}
        className={`inline-flex items-center gap-1 hover:text-foreground ${active ? "text-foreground" : ""}`}
      >
        {label}
        {active
          ? (sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)
          : <ArrowUpDown className="h-3 w-3 opacity-50" />}
      </button>
    </TableHead>
  );
}

function Badge({ statut }: { statut: string }) {
  const { t } = useI18n();
  const s = STATUTS.find((x) => x.key === statut);
  const colorMap: Record<string, string> = {
    warning: "bg-warning/20 text-warning",
    info: "bg-info/20 text-info",
    success: "bg-success/20 text-success",
    destructive: "bg-destructive/20 text-destructive",
  };
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${colorMap[s?.color ?? "info"]}`}>{statutLabel(statut, t)}</span>;
}