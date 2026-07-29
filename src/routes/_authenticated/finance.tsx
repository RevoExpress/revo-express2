import { createFileRoute, Navigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Wallet, Store, Printer, Check, X, Coins, Truck, Ban } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { ProPageHeader } from "@/components/pro-page-header";
import { confirmAction } from "@/components/confirm-dialog";
import {
  listSoldesTousClients, creerReversement, listReversementsTous, annulerReversement,
  listColisLivresNonEncaisses, marquerEncaisse,
  listSoldesLivreurs, creerRemiseLivreur, listRemisesLivreurTous,
} from "@/lib/finance.functions";
import { ModalPortal } from "@/components/modal-portal";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/finance")({
  head: () => ({ meta: [{ title: "Finance — REVO EXPRESS" }] }),
  component: FinancePage,
});

function FinancePage() {
  const { role, loading } = useAuth();
  const soldesFn = useServerFn(listSoldesTousClients);
  const creerFn = useServerFn(creerReversement);
  const reversementsFn = useServerFn(listReversementsTous);
  const nonEncaissesFn = useServerFn(listColisLivresNonEncaisses);
  const marquerFn = useServerFn(marquerEncaisse);
  const soldesLivreursFn = useServerFn(listSoldesLivreurs);
  const creerRemiseFn = useServerFn(creerRemiseLivreur);
  const remisesLivreurFn = useServerFn(listRemisesLivreurTous);
  const annulerFn = useServerFn(annulerReversement);

  const canAccess = role === "admin" || role === "admin_operations";

  const [soldes, setSoldes] = useState<any[]>([]);
  const [reversements, setReversements] = useState<any[]>([]);
  const [nonEncaisses, setNonEncaisses] = useState<any[]>([]);
  const [selectedNonEncaisses, setSelectedNonEncaisses] = useState<Set<string>>(new Set());
  const [marquant, setMarquant] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [colisClient, setColisClient] = useState<any[]>([]);
  const [selectedColis, setSelectedColis] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const [soldesLivreurs, setSoldesLivreurs] = useState<any[]>([]);
  const [remisesLivreur, setRemisesLivreur] = useState<any[]>([]);
  const [selectedLivreur, setSelectedLivreur] = useState<any | null>(null);
  const [colisLivreur, setColisLivreur] = useState<any[]>([]);
  const [selectedColisLivreur, setSelectedColisLivreur] = useState<Set<string>>(new Set());
  const [creatingRemise, setCreatingRemise] = useState(false);
  const [annulingId, setAnnulingId] = useState<string | null>(null);

  async function refresh() {
    const [s, r, n, sl, rl] = await Promise.all([soldesFn(), reversementsFn(), nonEncaissesFn(), soldesLivreursFn(), remisesLivreurFn()]);
    setSoldes(s.soldes ?? []);
    setReversements(r.reversements ?? []);
    setNonEncaisses(n.colis ?? []);
    setSoldesLivreurs(sl.soldes ?? []);
    setRemisesLivreur(rl.remises ?? []);
    setDataLoading(false);
  }

  useEffect(() => { if (canAccess) void refresh(); }, [canAccess]);

  function toggleNonEncaisse(id: string) {
    const next = new Set(selectedNonEncaisses);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedNonEncaisses(next);
  }

  async function handleMarquerEncaisse() {
    if (selectedNonEncaisses.size === 0) return;
    setMarquant(true);
    try {
      const res = await marquerFn({ data: { colis_ids: Array.from(selectedNonEncaisses) } });
      toast.success(`${res.count} colis marqué(s) encaissé(s)`);
      setSelectedNonEncaisses(new Set());
      void refresh();
    } catch (e: any) {
      toast.error(e.message ?? "Échec");
    }
    setMarquant(false);
  }

  async function openClient(s: any) {
    setSelectedClient(s);
    const { data } = await supabase
      .from("colis")
      .select("id, tracking, destinataire_nom, prix_colis, prix, frais_payes_par_expediteur, date_creation")
      .eq("client_id", s.client_id)
      .eq("statut", "livre")
      .eq("cod_encaisse", true)
      .is("reversement_id", null)
      .eq("archive", false)
      .eq("type_colis", "REV")
      .order("date_creation", { ascending: false });
    setColisClient(data ?? []);
    setSelectedColis(new Set((data ?? []).map((c) => c.id)));
  }

  async function handleCreer() {
    if (!selectedClient || selectedColis.size === 0) return;
    setCreating(true);
    try {
      const res = await creerFn({ data: { client_id: selectedClient.client_id, colis_ids: Array.from(selectedColis) } });
      toast.success(`Reversement ${res.reversement.reference} créé : ${Number(res.reversement.montant_total).toLocaleString("fr-FR")} DA`);
      if (res.partiel) {
        toast.warning("Certains colis sélectionnés avaient déjà été reversés entre-temps (par quelqu'un d'autre) — ils ont été exclus automatiquement.");
      }
      setSelectedClient(null);
      void refresh();
    } catch (e: any) {
      toast.error(e.message ?? "Échec de la création");
    }
    setCreating(false);
  }

  const totalSelection = useMemo(() => {
    return colisClient
      .filter((c) => selectedColis.has(c.id))
      .reduce((s, c) => s + (c.frais_payes_par_expediteur ? Number(c.prix_colis) - Number(c.prix) : Number(c.prix_colis)), 0);
  }, [colisClient, selectedColis]);

  async function handleAnnuler(r: any) {
    const ok = await confirmAction({
      title: `Annuler le reversement ${r.reference} ?`,
      description: `${Number(r.montant_total).toLocaleString("fr-FR")} DA / ${r.nb_colis} colis redeviendront "à reverser". Cette action est tracée mais pas réversible.`,
      confirmLabel: "Annuler le reversement",
      cancelLabel: "Retour",
      destructive: true,
    });
    if (!ok) return;
    setAnnulingId(r.id);
    try {
      await annulerFn({ data: { id: r.id } });
      toast.success(`Reversement ${r.reference} annulé — les colis sont de nouveau à reverser`);
      void refresh();
    } catch (e: any) {
      toast.error(e.message ?? "Échec de l'annulation");
    }
    setAnnulingId(null);
  }

  async function openLivreur(s: any) {
    setSelectedLivreur(s);
    const { data } = await supabase
      .from("colis")
      .select("id, tracking, destinataire_nom, prix_colis, prix, date_creation")
      .eq("livreur_id", s.livreur_id)
      .eq("statut", "livre")
      .is("remis_livreur_id", null)
      .order("date_creation", { ascending: false });
    setColisLivreur(data ?? []);
    setSelectedColisLivreur(new Set((data ?? []).map((c) => c.id)));
  }

  async function handleCreerRemise() {
    if (!selectedLivreur || selectedColisLivreur.size === 0) return;
    setCreatingRemise(true);
    try {
      const res = await creerRemiseFn({ data: { livreur_id: selectedLivreur.livreur_id, colis_ids: Array.from(selectedColisLivreur) } });
      toast.success(`Remise ${res.remise.reference} enregistrée : ${Number(res.remise.montant_total).toLocaleString("fr-FR")} DA`);
      setSelectedLivreur(null);
      void refresh();
    } catch (e: any) {
      toast.error(e.message ?? "Échec de la création");
    }
    setCreatingRemise(false);
  }

  const totalSelectionLivreur = useMemo(() => {
    return colisLivreur
      .filter((c) => selectedColisLivreur.has(c.id))
      .reduce((s, c) => s + Number(c.prix_colis ?? 0) + Number(c.prix ?? 0), 0);
  }, [colisLivreur, selectedColisLivreur]);

  if (loading || dataLoading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!canAccess) return <Navigate to="/" />;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <section className="container mx-auto flex-1 px-4 pb-24 pt-10">
        <ProPageHeader icon={Wallet} title="Finance" subtitle="Soldes à reverser et historique des reversements." dense />

        {/* Colis livrés à marquer encaissés */}
        <div className="mt-6 overflow-hidden rounded-xl border border-warning/30 bg-card">
          <div className="flex items-center justify-between border-b border-border p-4">
            <h2 className="flex items-center gap-2 font-bold text-warning"><Coins className="h-4 w-4" /> Colis livrés à marquer encaissés ({nonEncaisses.length})</h2>
            <Button size="sm" className="gap-1.5 bg-gradient-primary" disabled={marquant || selectedNonEncaisses.size === 0} onClick={() => void handleMarquerEncaisse()}>
              {marquant ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Marquer {selectedNonEncaisses.size > 0 ? `(${selectedNonEncaisses.size})` : ""} encaissé
            </Button>
          </div>
          {nonEncaisses.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Aucun colis livré en attente d'encaissement</div>
          ) : (
            <div className="max-h-72 overflow-y-auto">
              <Table className="text-sm">
                <TableHeader className="bg-muted/30 text-xs uppercase text-muted-foreground">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-8 px-3 py-2"></TableHead>
                    <TableHead className="px-3 py-2">Tracking</TableHead>
                    <TableHead className="px-3 py-2">Boutique</TableHead>
                    <TableHead className="px-3 py-2">Destinataire</TableHead>
                    <TableHead className="px-3 py-2 text-end">Montant</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="[&_tr]:divide-border">
                  {nonEncaisses.map((c) => (
                    <TableRow key={c.id} className="hover:bg-accent/40">
                      <TableCell className="px-3 py-2"><input type="checkbox" checked={selectedNonEncaisses.has(c.id)} onChange={() => toggleNonEncaisse(c.id)} /></TableCell>
                      <TableCell className="px-3 py-2 font-mono text-xs">{c.tracking}</TableCell>
                      <TableCell className="px-3 py-2 text-xs">{c.profil?.nom_boutique || c.profil?.nom || "—"}</TableCell>
                      <TableCell className="px-3 py-2">{c.destinataire_nom}</TableCell>
                      <TableCell className="px-3 py-2 text-end font-bold">{Number(c.prix_colis).toLocaleString("fr-FR")} DA</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
          <div className="border-b border-border p-4"><h2 className="font-bold">Soldes à reverser ({soldes.length})</h2></div>
          {soldes.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">Aucun solde en attente</div>
          ) : (
            <Table className="text-sm">
              <TableHeader className="bg-muted/30 text-xs uppercase text-muted-foreground">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="px-4 py-2">Boutique</TableHead>
                  <TableHead className="px-4 py-2 text-end">Colis</TableHead>
                  <TableHead className="px-4 py-2 text-end">Montant dû</TableHead>
                  <TableHead className="px-4 py-2 text-end">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="[&_tr]:divide-border">
                {soldes.map((s) => (
                  <TableRow key={s.client_id} className="hover:bg-accent/40">
                    <TableCell className="px-4 py-2">
                      <Link to="/boutique/$id" params={{ id: s.client_id }} className="flex items-center gap-2 font-semibold text-primary hover:underline">
                        <Store className="h-4 w-4" /> {s.profil?.nom_boutique || s.profil?.nom || "—"}
                      </Link>
                    </TableCell>
                    <TableCell className="px-4 py-2 text-end">{s.nb_colis}</TableCell>
                    <TableCell className="px-4 py-2 text-end font-bold">{Number(s.montant_du).toLocaleString("fr-FR")} DA</TableCell>
                    <TableCell className="px-4 py-2 text-end">
                      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => void openClient(s)}>Créer le reversement</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
          <div className="border-b border-border p-4"><h2 className="flex items-center gap-2 font-bold"><Truck className="h-4 w-4" /> Soldes livreurs — argent non remis au bureau ({soldesLivreurs.length})</h2></div>
          {soldesLivreurs.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">Aucun livreur ne détient d'argent en attente</div>
          ) : (
            <Table className="text-sm">
              <TableHeader className="bg-muted/30 text-xs uppercase text-muted-foreground">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="px-4 py-2">Livreur</TableHead>
                  <TableHead className="px-4 py-2 text-end">Colis livrés</TableHead>
                  <TableHead className="px-4 py-2 text-end">Montant détenu</TableHead>
                  <TableHead className="px-4 py-2 text-end">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="[&_tr]:divide-border">
                {soldesLivreurs.map((s) => (
                  <TableRow key={s.livreur_id} className={Number(s.montant_du) >= 20000 ? "bg-destructive/5 hover:bg-destructive/10" : "hover:bg-accent/40"}>
                    <TableCell className="px-4 py-2">
                      <span className="flex items-center gap-2 font-semibold">
                        <Truck className="h-4 w-4 text-muted-foreground" /> {s.profil?.nom || "—"}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 py-2 text-end">{s.nb_colis}</TableCell>
                    <TableCell className={`px-4 py-2 text-end font-bold ${Number(s.montant_du) >= 20000 ? "text-destructive" : ""}`}>{Number(s.montant_du).toLocaleString("fr-FR")} DA</TableCell>
                    <TableCell className="px-4 py-2 text-end">
                      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => void openLivreur(s)}>Pointer la remise</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
          <div className="border-b border-border p-4"><h2 className="font-bold">Historique remises livreurs ({remisesLivreur.length})</h2></div>
          <Table className="text-sm">
            <TableHeader className="bg-muted/30 text-xs uppercase text-muted-foreground">
              <TableRow className="hover:bg-transparent">
                <TableHead className="px-4 py-2">Référence</TableHead>
                <TableHead className="px-4 py-2">Date</TableHead>
                <TableHead className="px-4 py-2 text-end">Colis</TableHead>
                <TableHead className="px-4 py-2 text-end">Montant</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="[&_tr]:divide-border">
              {remisesLivreur.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="px-4 py-2 font-mono text-xs">{r.reference}</TableCell>
                  <TableCell className="px-4 py-2 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("fr-FR")}</TableCell>
                  <TableCell className="px-4 py-2 text-end">{r.nb_colis}</TableCell>
                  <TableCell className="px-4 py-2 text-end font-bold">{Number(r.montant_total).toLocaleString("fr-FR")} DA</TableCell>
                </TableRow>
              ))}
              {remisesLivreur.length === 0 && <TableRow><TableCell colSpan={4} className="p-8 text-center text-muted-foreground">Aucune remise</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>

        <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
          <div className="border-b border-border p-4"><h2 className="font-bold">Historique ({reversements.length})</h2></div>
          <Table className="text-sm">
            <TableHeader className="bg-muted/30 text-xs uppercase text-muted-foreground">
              <TableRow className="hover:bg-transparent">
                <TableHead className="px-4 py-2">Référence</TableHead>
                <TableHead className="px-4 py-2">Date</TableHead>
                <TableHead className="px-4 py-2">Créé par</TableHead>
                <TableHead className="px-4 py-2 text-end">Colis</TableHead>
                <TableHead className="px-4 py-2 text-end">Montant</TableHead>
                <TableHead className="px-4 py-2">Statut</TableHead>
                <TableHead className="px-4 py-2 text-end">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="[&_tr]:divide-border">
              {reversements.map((r) => {
                const annule = !!r.annule_at;
                return (
                  <TableRow key={r.id} className={annule ? "opacity-60" : ""}>
                    <TableCell className="px-4 py-2 font-mono text-xs">{r.reference}</TableCell>
                    <TableCell className="px-4 py-2 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("fr-FR")}</TableCell>
                    <TableCell className="px-4 py-2 text-xs">{r.cree_par_nom || "—"}</TableCell>
                    <TableCell className="px-4 py-2 text-end">{r.nb_colis}</TableCell>
                    <TableCell className={`px-4 py-2 text-end font-bold ${annule ? "line-through" : ""}`}>{Number(r.montant_total).toLocaleString("fr-FR")} DA</TableCell>
                    <TableCell className="px-4 py-2">
                      {annule ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-bold text-destructive" title={`Annulé par ${r.annule_par_nom || "—"} le ${new Date(r.annule_at).toLocaleString("fr-FR")}`}>
                          <Ban className="h-3 w-3" /> Annulé
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-success/10 px-2 py-0.5 text-xs font-bold text-success">Actif</span>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-2 text-end">
                      <div className="flex justify-end gap-1.5">
                        <Link to="/print-reversement/$id" params={{ id: r.id }} target="_blank">
                          <Button size="sm" variant="outline" className="gap-1.5"><Printer className="h-3.5 w-3.5" /> Reçu</Button>
                        </Link>
                        {!annule && (
                          <Button
                            size="sm" variant="outline"
                            className="gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10"
                            disabled={annulingId === r.id}
                            onClick={() => void handleAnnuler(r)}
                          >
                            {annulingId === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" />} Annuler
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {reversements.length === 0 && <TableRow><TableCell colSpan={7} className="p-8 text-center text-muted-foreground">Aucun reversement</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      </section>

      {selectedClient && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm" onClick={() => setSelectedClient(null)}>
            <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-card" onClick={(e) => e.stopPropagation()}>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-bold">{selectedClient.profil?.nom_boutique || selectedClient.profil?.nom}</h3>
                <button onClick={() => setSelectedClient(null)}><X className="h-5 w-5 text-muted-foreground" /></button>
              </div>
              <div className="space-y-1.5">
                {colisClient.map((c) => {
                  const montant = c.frais_payes_par_expediteur ? Number(c.prix_colis) - Number(c.prix) : Number(c.prix_colis);
                  const checked = selectedColis.has(c.id);
                  return (
                    <label key={c.id} className="flex items-center gap-2 rounded-lg border border-border p-2 text-sm">
                      <input type="checkbox" checked={checked} onChange={() => {
                        const next = new Set(selectedColis);
                        checked ? next.delete(c.id) : next.add(c.id);
                        setSelectedColis(next);
                      }} />
                      <span className="flex-1 font-mono text-xs">{c.tracking}</span>
                      <span className="text-xs text-muted-foreground">{c.destinataire_nom}</span>
                      <span className="font-bold">{montant.toLocaleString("fr-FR")} DA</span>
                    </label>
                  );
                })}
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                <span className="text-sm font-bold">Total sélectionné</span>
                <span className="text-xl font-black text-primary">{totalSelection.toLocaleString("fr-FR")} DA</span>
              </div>
              <Button className="mt-4 w-full gap-2 bg-gradient-primary shadow-glow" disabled={creating || selectedColis.size === 0} onClick={() => void handleCreer()}>
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Confirmer le reversement
              </Button>
            </div>
          </div>
        </ModalPortal>
      )}

      {selectedLivreur && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm" onClick={() => setSelectedLivreur(null)}>
            <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-card" onClick={(e) => e.stopPropagation()}>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-bold">{selectedLivreur.profil?.nom || "Livreur"}</h3>
                <button onClick={() => setSelectedLivreur(null)}><X className="h-5 w-5 text-muted-foreground" /></button>
              </div>
              <p className="mb-3 text-xs text-muted-foreground">Cochez les colis dont le livreur vous a remis l'argent en main propre.</p>
              <div className="space-y-1.5">
                {colisLivreur.map((c) => {
                  const montant = Number(c.prix_colis ?? 0) + Number(c.prix ?? 0);
                  const checked = selectedColisLivreur.has(c.id);
                  return (
                    <label key={c.id} className="flex items-center gap-2 rounded-lg border border-border p-2 text-sm">
                      <input type="checkbox" checked={checked} onChange={() => {
                        const next = new Set(selectedColisLivreur);
                        checked ? next.delete(c.id) : next.add(c.id);
                        setSelectedColisLivreur(next);
                      }} />
                      <span className="flex-1 font-mono text-xs">{c.tracking}</span>
                      <span className="text-xs text-muted-foreground">{c.destinataire_nom}</span>
                      <span className="font-bold">{montant.toLocaleString("fr-FR")} DA</span>
                    </label>
                  );
                })}
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                <span className="text-sm font-bold">Total sélectionné</span>
                <span className="text-xl font-black text-primary">{totalSelectionLivreur.toLocaleString("fr-FR")} DA</span>
              </div>
              <Button className="mt-4 w-full gap-2 bg-gradient-primary shadow-glow" disabled={creatingRemise || selectedColisLivreur.size === 0} onClick={() => void handleCreerRemise()}>
                {creatingRemise ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Confirmer la remise reçue
              </Button>
            </div>
          </div>
        </ModalPortal>
      )}

      <SiteFooter />
    </div>
  );
}