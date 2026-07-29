import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ChevronDown, Package, Search, UserCircle2, UserX, Pencil, Trash2, Loader2, Filter as FilterIcon, Copy,
  Plus, Printer, SlidersHorizontal, Download, Truck, X, Boxes, Clock3, CheckCircle2, XOctagon,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { confirmAction } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { TrackingBadge } from "@/components/tracking-badge";
import { TrackingActions } from "@/components/tracking-actions";
import { ColisMessagesButton } from "@/components/colis-messages-button";
import { ColisStatusPill, ColisStatusModal, type SplitLivraisonInfo } from "@/components/colis-status-menu";
import { ColisHistoriqueModal } from "@/components/colis-historique-modal";
import { boutiqueColorClass } from "@/lib/boutique-colors";
import { useI18n, Ltr, statutLabel } from "@/hooks/use-i18n";
import { STATUT_GROUP_BG, STATUT_GROUP_TEXT, initiales } from "@/lib/board-shared";
import { STATUTS, COMMUNES } from "@/lib/tarifs";
import { exportColisToXLSX } from "@/lib/export-csv";
import { KpiChip } from "@/components/kpi-chip";
import { NewBadge } from "@/components/new-badge";
import { updateColisPrice } from "@/lib/colis.functions";

const STATUTS_EN_ROUTE = new Set(["ramasse", "expedie", "en-livraison", "contact-client", "reporte"]);
const STATUTS_PROBLEME = new Set(["echec-livraison", "retourne-vendeur", "annule"]);

export type ColisBoardPermissions = {
  /** Shows the expéditeur-initials avatar column and the livreur-assignment control. */
  canAssignLivreur: boolean;
  canEdit: boolean;
  canDelete: boolean;
  /** Status is delivery-state authority (Ops/livreur territory) — service client can view/comment but not alter it. */
  canChangeStatus: boolean;
  /** Quick inline edit of prix_colis/prix (e.g. price correction, goodwill discount) — separate from
   * canEdit, which opens the full order form and touches addresses/phone/etc. too. */
  canEditPrice: boolean;
  /** 48h-stuck badge on "en préparation" colis, both in the group header and per row. */
  showBlocked: boolean;
  /** The row of clickable status-count chips above the groups. */
  showStatChips: boolean;
};

type ColisBoardProps = {
  colis: any[];
  livreurs?: any[];
  notesCount?: Record<string, number>;
  permissions: ColisBoardPermissions;
  searchPlaceholder: string;
  emptyMessage: string;
  /** Optional: lets the parent optimistically drop the row from its own state instead of waiting for realtime. */
  onColisDeleted?: (id: string) => void;
  /** Contrôlé depuis l'extérieur (ex. clic sur une carte KPI d'AdminStats, au-dessus du board) —
   * si fourni, prend le pas sur le filtre interne des puces. Facultatif : sans ces deux props,
   * le board gère son propre filtre rapide (comportement inchangé pour les appelants existants). */
  quickFilter?: "aTraiter" | "enCours" | "livres" | "problemes" | null;
  onQuickFilterChange?: (f: "aTraiter" | "enCours" | "livres" | "problemes" | null) => void;
};

/**
 * The "tous les colis" board shared by Admin, Opérations and Service Client — previously three
 * independent, byte-for-byte-identical implementations that had already started drifting (see
 * "modal false dropdown menus" fix). Behavior differences between roles are expressed entirely
 * through the `permissions` prop rather than forked code.
 */
export function ColisBoard({
  colis, livreurs = [], notesCount = {}, permissions, searchPlaceholder, emptyMessage, onColisDeleted,
  quickFilter: quickFilterProp, onQuickFilterChange,
}: ColisBoardProps) {
  const { t, tf } = useI18n();
  const updateColisPriceFn = useServerFn(updateColisPrice);
  const [quickFilterState, setQuickFilterState] = useState<"aTraiter" | "enCours" | "livres" | "problemes" | null>(null);
  const quickFilter = onQuickFilterChange ? quickFilterProp ?? null : quickFilterState;
  const setQuickFilter = onQuickFilterChange ?? setQuickFilterState;
  const [recherche, setRecherche] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [communeFilter, setCommuneFilter] = useState("all");
  const [boutiqueFilter, setBoutiqueFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set(["livre", "annule"]));

  // "Livré"/"Annulé" sont repliés par défaut (bruit visuel), mais si une carte KPI filtre
  // justement sur l'un de ces statuts, le laisser replié rendrait la liste faussement vide —
  // on le déplie automatiquement pour que le filtre affiche bien ce qu'il promet.
  useEffect(() => {
    if (!quickFilter) return;
    const cibles = quickFilter === "aTraiter" ? ["en-preparation"]
      : quickFilter === "enCours" ? Array.from(STATUTS_EN_ROUTE)
      : quickFilter === "livres" ? ["livre"]
      : Array.from(STATUTS_PROBLEME);
    setCollapsed((prev) => {
      const next = new Set(prev);
      let changed = false;
      for (const key of cibles) { if (next.delete(key)) changed = true; }
      return changed ? next : prev;
    });
  }, [quickFilter]);
  const [statutColis, setStatutColis] = useState<any | null>(null);
  const [histoColis, setHistoColis] = useState<any | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatutOpen, setBulkStatutOpen] = useState(false);
  const [bulkApplying, setBulkApplying] = useState(false);
  const [priceEditId, setPriceEditId] = useState<string | null>(null);
  const [priceColisValue, setPriceColisValue] = useState("");
  const [priceLivraisonValue, setPriceLivraisonValue] = useState("");
  const [savingPrix, setSavingPrix] = useState(false);

  const kpis = useMemo(() => ({
    total: colis.length,
    aTraiter: colis.filter((c) => c.statut === "en-preparation").length,
    enCours: colis.filter((c) => STATUTS_EN_ROUTE.has(c.statut)).length,
    livres: colis.filter((c) => c.statut === "livre").length,
    problemes: colis.filter((c) => STATUTS_PROBLEME.has(c.statut)).length,
  }), [colis]);

  const boutiques = useMemo(() => {
    const m = new Map<string, string>();
    colis.forEach((c) => { if (c.client_id && !m.has(c.client_id)) m.set(c.client_id, c.expediteur_nom || t("adm.boutiqueDefault")); });
    return [...m.entries()].map(([id, nom]) => ({ id, nom })).sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
  }, [colis, t]);

  const hasActiveFilters =
    recherche !== "" || typeFilter !== "all" || communeFilter !== "all" || boutiqueFilter !== "all" || dateFrom !== "" || dateTo !== "" || !!quickFilter;

  function resetFilters() {
    setRecherche(""); setTypeFilter("all"); setCommuneFilter("all"); setBoutiqueFilter("all"); setDateFrom(""); setDateTo("");
    setQuickFilter(null);
  }

  function toggleQuickFilter(key: "aTraiter" | "enCours" | "livres" | "problemes") {
    setQuickFilter(quickFilter === key ? null : key);
  }

  const colisAffiches = useMemo(() => {
    const fromTs = dateFrom ? new Date(dateFrom).getTime() : null;
    const toTs = dateTo ? new Date(dateTo).getTime() + 24 * 3600 * 1000 - 1 : null;
    const q = recherche.trim().toLowerCase();
    return colis.filter((c) => {
      if (quickFilter === "aTraiter" && c.statut !== "en-preparation") return false;
      if (quickFilter === "enCours" && !STATUTS_EN_ROUTE.has(c.statut)) return false;
      if (quickFilter === "livres" && c.statut !== "livre") return false;
      if (quickFilter === "problemes" && !STATUTS_PROBLEME.has(c.statut)) return false;
      if (typeFilter !== "all" && c.type_livraison !== typeFilter) return false;
      if (communeFilter !== "all" && communeFilter !== c.destinataire_wilaya && communeFilter !== c.depart) return false;
      if (boutiqueFilter !== "all" && c.client_id !== boutiqueFilter) return false;
      if (fromTs !== null || toTs !== null) {
        const ts = new Date(c.date_creation).getTime();
        if (fromTs !== null && ts < fromTs) return false;
        if (toTs !== null && ts > toTs) return false;
      }
      if (!q) return true;
      return Object.values(c).some((v) => typeof v === "string" && v.toLowerCase().includes(q));
    });
  }, [colis, recherche, typeFilter, communeFilter, boutiqueFilter, dateFrom, dateTo, quickFilter]);

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

  function toggleSelect(id: string) {
    setSelected((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }

  function toggleSelectGroup(rows: any[]) {
    const rowIds = rows.map((r) => r.id);
    const allSelected = rowIds.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      rowIds.forEach((id) => { allSelected ? next.delete(id) : next.add(id); });
      return next;
    });
  }

  // Le trigger DB insère la ligne d'historique automatiquement à chaque changement de statut ;
  // le motif (facultatif) est posé juste après, sur la ligne la plus récente qui vient d'être créée.
  async function attacherMotif(colisId: string, statut: string, motif: string) {
    const { data: rows } = await supabase
      .from("colis_historique")
      .select("id")
      .eq("colis_id", colisId)
      .eq("statut", statut)
      .order("created_at", { ascending: false })
      .limit(1);
    if (rows?.[0]) await supabase.from("colis_historique").update({ motif }).eq("id", rows[0].id);
  }

  async function applyBulkStatut(statut: string, motif?: string) {
    const ids = [...selected];
    if (ids.length === 0) return;
    setBulkApplying(true);
    const { error } = await supabase.from("colis").update({ statut }).in("id", ids);
    if (!error && motif) await Promise.all(ids.map((id) => attacherMotif(id, statut, motif)));
    setBulkApplying(false);
    setBulkStatutOpen(false);
    if (error) { toast.error(error.message); return; }
    toast.success(tf("adm.bulk.toastUpdated", { n: ids.length }));
    setSelected(new Set());
  }

  async function updateStatut(id: string, statut: string, motif?: string, splitInfo?: SplitLivraisonInfo) {
    const payload: Record<string, any> = { statut };
    if (splitInfo) {
      payload.split_article1_livre = splitInfo.article1Livre;
      payload.split_article2_livre = splitInfo.article2Livre;
      payload.prix_colis = splitInfo.prixColis;
    }
    const { error } = await supabase.from("colis").update(payload).eq("id", id);
    if (error) { toast.error(error.message); return; }
    if (motif) await attacherMotif(id, statut, motif);
    toast.success(tf("adm.toast.statutLabel", { s: statutLabel(statut, t) }));
  }

  function openPriceEdit(c: any) {
    setPriceEditId(c.id);
    setPriceColisValue(String(c.prix_colis ?? 0));
    setPriceLivraisonValue(String(c.prix ?? 0));
  }

  async function savePrix(id: string) {
    const prix_colis = Number(priceColisValue);
    const prix = Number(priceLivraisonValue);
    if (Number.isNaN(prix_colis) || Number.isNaN(prix) || prix_colis < 0 || prix < 0) {
      toast.error(t("adm.price.invalid"));
      return;
    }
    setSavingPrix(true);
    try {
      await updateColisPriceFn({ data: { colis_id: id, prix_colis, prix } });
      toast.success(t("adm.price.updated"));
      setPriceEditId(null);
    } catch (e: any) {
      toast.error(e.message ?? t("adm.price.invalid"));
    } finally {
      setSavingPrix(false);
    }
  }

  async function copyTracking(tracking: string) {
    try { await navigator.clipboard.writeText(tracking); toast.success(tf("mc.toast.copied", { n: tracking })); }
    catch { toast.error(t("mc.toast.copyFail")); }
  }

  // Cliquer un numéro pour appeler passe automatiquement le colis en "Contact client" — sauf
  // s'il y est déjà, ou si son sort est déjà réglé (on n'a pas à faire régresser un colis livré).
  const STATUTS_TERMINAUX = new Set(["livre", "echec-livraison", "retourne-vendeur", "annule"]);
  function handlePhoneClick(c: any) {
    if (!permissions.canChangeStatus) return;
    if (c.statut === "contact-client" || STATUTS_TERMINAUX.has(c.statut)) return;
    void updateStatut(c.id, "contact-client");
  }

  async function assignLivreur(id: string, livreurId: string) {
    const { error } = await supabase.from("colis").update({ livreur_id: livreurId || null }).eq("id", id);
    if (error) toast.error(error.message);
    else toast.success(livreurId ? t("adm.toast.livreurAssigned") : t("adm.toast.livreurRemoved"));
  }

  async function assignLivreurBulk(livreurId: string) {
    const ids = [...selected];
    if (ids.length === 0) return;
    const { error } = await supabase.from("colis").update({ livreur_id: livreurId }).in("id", ids);
    if (error) { toast.error(error.message); return; }
    toast.success(tf("adm.bulk.toastAssigned", { n: ids.length }));
    setSelected(new Set());
  }

  function exportSelected() {
    const rows = colisAffiches.filter((c) => selected.has(c.id));
    exportColisToXLSX(rows, `revo-colis-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  function livreurName(id: string | null) {
    if (!id) return null;
    const l = livreurs.find((x) => x.id === id);
    return l ? (l.nom || l.email) : null;
  }

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
    onColisDeleted?.(c.id);
  }

  // minmax(0,1fr) — pas juste "1fr" : sans le plancher à 0, une ligne au contenu long (nom de
  // boutique + tracking + téléphone + description) forçait cette colonne à s'élargir au-delà de
  // sa part, décalant les colonnes suivantes par rapport aux autres lignes (effet "chevauchement").
  //
  // Dernière colonne en px fixe (330px), pas "auto" : chaque ligne est un grid indépendant (pas
  // un <table> partagé), donc une colonne "auto" se dimensionne sur SON PROPRE contenu — l'en-tête
  // ("Action", texte court) se retrouvait avec une piste bien plus étroite que les lignes (pastille
  // de statut + icônes), ce qui repoussait la colonne flexible 1fr et décalait tout le reste vers
  // la droite par rapport à l'en-tête. Une largeur fixe, identique pour toutes les lignes ET l'en-tête,
  // élimine le décalage. La pastille de statut est elle-même plafonnée (max-w-[170px] + truncate
  // dans ColisStatusPill) pour que 330px reste suffisant même avec les libellés les plus longs.
  const gridCols = permissions.canAssignLivreur
    ? "grid-cols-1 md:grid-cols-[24px_32px_minmax(0,1fr)_140px_190px_36px_80px_330px]"
    : "grid-cols-1 md:grid-cols-[24px_minmax(0,1fr)_140px_36px_80px_330px]";

  const advancedFilterCount =
    (typeFilter !== "all" ? 1 : 0) + (communeFilter !== "all" ? 1 : 0) +
    (boutiqueFilter !== "all" ? 1 : 0) + (dateFrom !== "" ? 1 : 0) + (dateTo !== "" ? 1 : 0);

  return (
    <div className="pb-20">
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <KpiChip icon={Boxes} label={t("adm.kpi.total")} value={kpis.total} tone="primary" onClick={() => setQuickFilter(null)} active={!quickFilter} />
        <KpiChip icon={Clock3} label={t("adm.kpi.aTraiter")} value={kpis.aTraiter} tone="warning" onClick={() => toggleQuickFilter("aTraiter")} active={quickFilter === "aTraiter"} />
        <KpiChip icon={Truck} label={t("adm.kpi.enCours")} value={kpis.enCours} tone="primary" onClick={() => toggleQuickFilter("enCours")} active={quickFilter === "enCours"} />
        <KpiChip icon={CheckCircle2} label={t("adm.kpi.livres")} value={kpis.livres} tone="success" onClick={() => toggleQuickFilter("livres")} active={quickFilter === "livres"} />
        <KpiChip icon={XOctagon} label={t("adm.kpi.problemes")} value={kpis.problemes} tone="destructive" onClick={() => toggleQuickFilter("problemes")} active={quickFilter === "problemes"} />
      </div>

      {permissions.showStatChips && (
        <div className="mb-4 flex flex-wrap gap-2">
          {groupes.map((g) => (
            <button
              key={g.key}
              onClick={() => toggleGroup(g.key)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${STATUT_GROUP_BG[g.key]} ${STATUT_GROUP_TEXT[g.key]}`}
            >
              {statutLabel(g.key, t)}
              <span className="rounded-full bg-white/70 px-1.5 py-0.5 text-[10px] dark:bg-black/20">{g.rows.length}</span>
              <Ltr className="opacity-70">{g.total.toLocaleString("fr-FR")} DA</Ltr>
            </button>
          ))}
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-10 w-full rounded-full border border-border bg-background ps-9 pe-4 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="relative gap-2">
              <NewBadge id="adm-filtres-avances" />
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
            <div>
              <div className="mb-1 text-xs font-bold text-muted-foreground">{t("adm.filter.boutique")}</div>
              <Select value={boutiqueFilter} onValueChange={setBoutiqueFilter}>
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("adm.filter.allBoutiques")}</SelectItem>
                  {boutiques.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.nom}</SelectItem>
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

        {recherche !== "" && (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground"
            onClick={() => setRecherche("")}
            title={t("common.clearSearch")}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {selected.size > 0 && (
        <div className="fixed inset-x-4 bottom-24 z-40 mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/40 bg-card/95 px-4 py-3 shadow-xl backdrop-blur animate-in fade-in slide-in-from-bottom-3 duration-300">
          <span className="text-sm font-bold">{tf("adm.bulk.selectedCount", { n: selected.size })}</span>
          <div className="flex flex-wrap gap-2">
            {permissions.canAssignLivreur && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-2">
                    <Truck className="h-4 w-4" /> {t("adm.bulk.assignLivreur")}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="max-h-[300px] w-[220px] overflow-y-auto">
                  {livreurs.length === 0 && (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">{t("adm.noLivreur")}</div>
                  )}
                  {livreurs.map((l) => (
                    <DropdownMenuItem key={l.id} onClick={() => void assignLivreurBulk(l.id)}>
                      <UserCircle2 className="h-4 w-4 shrink-0 text-primary" />
                      <span className="flex-1 truncate">{l.nom || l.email}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {permissions.canChangeStatus && (
              <Button size="sm" className="gap-2 bg-gradient-primary" onClick={() => setBulkStatutOpen(true)}>
                {t("adm.bulk.changeStatus")}
              </Button>
            )}
            <Button size="sm" variant="outline" className="gap-2" onClick={exportSelected}>
              <Download className="h-4 w-4" /> {t("adm.bulk.export")}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
              {t("adm.bulk.clear")}
            </Button>
          </div>
        </div>
      )}

      {groupes.length > 0 && (
        <div className={`mb-2 hidden gap-2 px-4 md:grid md:items-center md:gap-3 ${gridCols}`}>
          <span />
          {permissions.canAssignLivreur && <span />}
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("adm.th.boutique")}</span>
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("adm.th.destination")}</span>
          {permissions.canAssignLivreur && (
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("adm.th.livreur")}</span>
          )}
          <span />
          <span className="truncate text-end text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("adm.th.prix")}</span>
          <span className="text-end text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("mc.th.action")}</span>
        </div>
      )}

      {groupes.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
          <Package className="mx-auto mb-2 h-8 w-8" /> {emptyMessage}
        </div>
      )}

      {groupes.map((g) => {
        const isCollapsed = collapsed.has(g.key);
        return (
          <div key={g.key} className="mb-3 overflow-hidden rounded-2xl border border-border">
            <div className={`flex w-full items-center justify-between px-4 py-2.5 ${STATUT_GROUP_BG[g.key]}`}>
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={g.rows.every((r) => selected.has(r.id))}
                  onCheckedChange={() => toggleSelectGroup(g.rows)}
                  onClick={(e) => e.stopPropagation()}
                  title={t("adm.bulk.selectGroup")}
                />
                <button
                  onClick={() => toggleGroup(g.key)}
                  className={`flex items-center gap-2 font-bold ${STATUT_GROUP_TEXT[g.key]}`}
                >
                  <ChevronDown className={`h-4 w-4 transition-transform ${isCollapsed ? "-rotate-90" : ""}`} />
                  {statutLabel(g.key, t)}
                  <span className="rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-black dark:bg-black/20">{g.rows.length}</span>
                </button>
              </div>
              <button onClick={() => toggleGroup(g.key)} className={`flex items-center gap-3 text-xs ${STATUT_GROUP_TEXT[g.key]}`}>
                <Ltr>{g.total.toLocaleString("fr-FR")} DA</Ltr>
                {permissions.showBlocked && g.bloques > 0 && (
                  <span className="rounded-full bg-destructive px-2 py-0.5 font-bold text-destructive-foreground">
                    {tf("adm.blockedCount", { n: g.bloques })}
                  </span>
                )}
              </button>
            </div>

            {!isCollapsed && (
              <div className="divide-y divide-border bg-card">
                {g.rows.map((c) => {
                  const bloque = permissions.showBlocked && g.key === "en-preparation"
                    && Date.now() - new Date(c.date_creation).getTime() > 48 * 3600 * 1000;
                  const nNotes = notesCount[c.id] ?? 0;
                  const premierMot = c.description ? c.description.trim().split(/\s+/)[0] : null;
                  return (
                    <div
                      key={c.id}
                      className={`grid gap-2 px-4 py-3 md:items-center md:gap-3 ${gridCols} ${bloque ? "border-s-4 border-destructive" : ""}`}
                    >
                      <Checkbox checked={selected.has(c.id)} onCheckedChange={() => toggleSelect(c.id)} className="mt-1 md:mt-0" />
                      {permissions.canAssignLivreur && (
                        <div className="hidden h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary md:flex">
                          {initiales(c.expediteur_nom || "?")}
                        </div>
                      )}
                      <div className="min-w-0">
                        <Link
                          to="/boutique/$id"
                          params={{ id: c.client_id }}
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold transition-opacity hover:opacity-80 ${boutiqueColorClass(c.client_id)}`}
                        >
                          {c.expediteur_nom || t("adm.boutiqueDefault")}
                        </Link>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                          <Ltr className="font-mono">{c.tracking}</Ltr>
                          <button
                            onClick={() => void copyTracking(c.tracking)}
                            className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                            aria-label={t("common.copy")}
                            title={t("common.copy")}
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                          <TrackingBadge typeColis={c.type_colis} />
                          <span>
                            · {c.destinataire_nom} ·{" "}
                            <a
                              href={`tel:${c.destinataire_tel}`}
                              onClick={(e) => { e.stopPropagation(); handlePhoneClick(c); }}
                              title={t("adm.callTitle")}
                            >
                              <Ltr className="font-bold text-primary hover:underline">{c.destinataire_tel}</Ltr>
                            </a>
                          </span>
                          {premierMot && (
                            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">{premierMot}…</span>
                          )}
                          {bloque && <span className="font-bold text-destructive">{t("adm.blockedSince")}</span>}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                        <span>{c.depart}</span>
                        <span className="rtl:-scale-x-100">→</span>
                        <span className="rounded-full bg-muted px-2 py-0.5 font-semibold text-muted-foreground">{c.destinataire_wilaya}</span>
                        {c.destinataire_commune && (
                          <span className="rounded-full bg-info/15 px-2 py-0.5 font-bold text-info">{c.destinataire_commune}</span>
                        )}
                      </div>
                      {permissions.canAssignLivreur && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="inline-flex h-8 items-center gap-2 rounded-full border border-dashed border-border bg-background px-3 text-xs font-medium text-muted-foreground hover:border-primary/50 hover:text-foreground"
                            >
                              <UserCircle2 className="h-3.5 w-3.5 shrink-0" />
                              <span className="max-w-[130px] flex-1 truncate text-start">{livreurName(c.livreur_id) ?? t("adm.assign")}</span>
                              <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="max-h-[340px] w-[240px] overflow-y-auto">
                            {livreurs.length === 0 && (
                              <div className="px-2 py-1.5 text-xs text-muted-foreground">{t("adm.noLivreur")}</div>
                            )}
                            {livreurs.map((l) => (
                              <DropdownMenuItem key={l.id} onClick={() => void assignLivreur(c.id, l.id)}>
                                <UserCircle2 className="h-4 w-4 shrink-0 text-primary" />
                                <span className="flex-1 truncate">{l.nom || l.email}</span>
                              </DropdownMenuItem>
                            ))}
                            {c.livreur_id && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => void assignLivreur(c.id, "")} className="text-destructive focus:text-destructive">
                                  <UserX className="h-4 w-4 shrink-0" /> {t("adm.removeLivreur")}
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                      <ColisMessagesButton colis={c} count={nNotes} />
                      {permissions.canEditPrice ? (
                        <Popover open={priceEditId === c.id} onOpenChange={(open) => { if (!open) setPriceEditId(null); }}>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              onClick={() => openPriceEdit(c)}
                              className="flex items-center justify-end gap-1 text-end font-bold hover:text-primary hover:underline"
                              title={t("adm.price.edit")}
                            >
                              <Ltr>{c.prix_colis} DA</Ltr>
                              <Pencil className="h-3 w-3 shrink-0 opacity-50" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent align="end" className="w-64 space-y-3">
                            <div>
                              <div className="mb-1 text-xs font-bold text-muted-foreground">{t("adm.price.colis")}</div>
                              <Input type="number" min={0} value={priceColisValue} onChange={(e) => setPriceColisValue(e.target.value)} />
                            </div>
                            <div>
                              <div className="mb-1 text-xs font-bold text-muted-foreground">{t("adm.price.livraison")}</div>
                              <Input type="number" min={0} value={priceLivraisonValue} onChange={(e) => setPriceLivraisonValue(e.target.value)} />
                            </div>
                            <Button size="sm" className="w-full gap-2 bg-gradient-primary" disabled={savingPrix} onClick={() => void savePrix(c.id)}>
                              {savingPrix && <Loader2 className="h-4 w-4 animate-spin" />}
                              {t("common.save")}
                            </Button>
                          </PopoverContent>
                        </Popover>
                      ) : (
                        <Ltr className="block text-end font-bold">{c.prix_colis} DA</Ltr>
                      )}
                      <div className="flex justify-end gap-1">
                        <ColisStatusPill statut={c.statut} paid={!!c.reversement_id} onClick={() => setHistoColis(c)} />
                        <TrackingActions colis={c} hidePrint />
                        {(
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
                              {permissions.canEdit && (
                                <DropdownMenuItem asChild>
                                  <Link to="/commander" search={{ colis: c.id } as any} className="flex w-full cursor-pointer items-center">
                                    <Pencil className="me-2 h-4 w-4" /> {t("common.edit")}
                                  </Link>
                                </DropdownMenuItem>
                              )}
                              {permissions.canDelete && (
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
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {statutColis && (
        <ColisStatusModal
          statutActuel={statutColis.statut}
          colis={statutColis}
          onChoose={(key, motif, splitInfo) => {
            void updateStatut(statutColis.id, key, motif, splitInfo);
            const c = statutColis;
            setStatutColis(null);
            setHistoColis(c);
          }}
          onClose={() => setStatutColis(null)}
        />
      )}

      {bulkStatutOpen && (
        <ColisStatusModal
          statutActuel=""
          title={bulkApplying ? t("common.loading") : tf("csm.changeStatusBulk", { n: selected.size })}
          onChoose={(key, motif) => void applyBulkStatut(key, motif)}
          onClose={() => setBulkStatutOpen(false)}
        />
      )}

      {histoColis && (
        <ColisHistoriqueModal
          tracking={histoColis.tracking}
          typeColis={histoColis.type_colis}
          onClose={() => setHistoColis(null)}
          onChangeStatus={permissions.canChangeStatus ? () => { const c = histoColis; setHistoColis(null); setStatutColis(c); } : undefined}
        />
      )}
    </div>
  );
}
