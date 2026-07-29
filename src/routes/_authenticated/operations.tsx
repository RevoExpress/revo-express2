import { createFileRoute, Navigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Truck, Mail, KeyRound, User as UserIcon, Phone, FileText, RadioTower, ChevronRight } from "lucide-react";
import { ProPageHeader } from "@/components/pro-page-header";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { createLivreurAccount, listLivreurs } from "@/lib/clients.functions";
import { AdminStats } from "@/components/admin-stats";
import { OpsStatsPanel } from "@/components/ops-stats-panel";
import { CollapsibleStats } from "@/components/collapsible-stats";
import { useI18n } from "@/hooks/use-i18n";
import { ColisBoard } from "@/components/colis-board";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

const empty = { email: "", password: "", nom: "", telephone: "" };

export const Route = createFileRoute("/_authenticated/operations")({
  head: () => ({ meta: [{ title: "Opérations — REVO EXPRESS" }] }),
  component: OperationsPage,
});

function OperationsPage() {
  const { role, loading } = useAuth();
  const { t } = useI18n();
  const createFn = useServerFn(createLivreurAccount);
  const listFn = useServerFn(listLivreurs);
  const [form, setForm] = useState(empty);
  const [submitting, setSubmitting] = useState(false);
  const [livreurs, setLivreurs] = useState<any[]>([]);
  const [colis, setColis] = useState<any[]>([]);
  const [notesCount, setNotesCount] = useState<Record<string, number>>({});
  const [ramassagesEnAttente, setRamassagesEnAttente] = useState(0);
  const [quickFilter, setQuickFilter] = useState<"aTraiter" | "enCours" | "livres" | "problemes" | null>(null);
  const canAccess = role === "admin" || role === "admin_operations";

  async function refreshLivreurs() {
    try { const r = await listFn(); setLivreurs(r.livreurs ?? []); }
    catch (e: any) { toast.error(e.message); }
  }
  async function refreshColis() {
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
  async function refreshRamassages() {
    const { count } = await supabase
      .from("demandes_ramassage")
      .select("id", { count: "exact", head: true })
      .eq("statut", "en-attente");
    setRamassagesEnAttente(count ?? 0);
  }

  useEffect(() => {
    if (!canAccess) return;
    void refreshLivreurs();
    void refreshColis();
    void refreshRamassages();
    const ch = supabase.channel("ops-colis").on("postgres_changes", { event: "*", schema: "public", table: "colis" }, refreshColis).subscribe();
    const chRamassages = supabase
      .channel("ops-ramassages")
      .on("postgres_changes", { event: "*", schema: "public", table: "demandes_ramassage" }, () => void refreshRamassages())
      .subscribe();
    return () => { void supabase.removeChannel(ch); void supabase.removeChannel(chRamassages); };
  }, [canAccess]);

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!canAccess) return <Navigate to="/" />;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createFn({ data: form });
      toast.success(`Livreur créé : ${form.nom}`);
      setForm(empty);
      void refreshLivreurs();
    } catch (err: any) { toast.error(err.message ?? "Création échouée"); }
    finally { setSubmitting(false); }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <section className="container mx-auto flex-1 px-4 pb-24 pt-10">
        <ProPageHeader
          icon={Truck}
          title="Espace opérations"
          subtitle="Tous les colis, les livreurs, et le suivi en direct."
          action={
            <Link to="/suivi-livreurs">
              <Button size="lg" className="gap-2 bg-gradient-primary shadow-glow">
                <RadioTower className="h-5 w-5" /> Suivi en direct
              </Button>
            </Link>
          }
        />

        <CollapsibleStats>
          <AdminStats onFilterClick={setQuickFilter} activeFilter={quickFilter} />
          <OpsStatsPanel colis={colis} livreurs={livreurs} />
        </CollapsibleStats>

        <Link
          to="/ramassages"
          className={`mb-6 flex items-center justify-between rounded-2xl border p-4 shadow-card transition-colors ${
            ramassagesEnAttente > 0
              ? "border-warning/40 bg-warning/10 hover:bg-warning/15"
              : "border-border bg-card hover:bg-muted/40"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${ramassagesEnAttente > 0 ? "bg-warning/20 text-warning" : "bg-muted text-muted-foreground"}`}>
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <div className="font-bold">Demandes de ramassage</div>
              <div className="text-xs text-muted-foreground">
                {ramassagesEnAttente > 0
                  ? `${ramassagesEnAttente} demande${ramassagesEnAttente > 1 ? "s" : ""} en attente`
                  : "Aucune demande en attente"}
              </div>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </Link>

        <ColisBoard
          colis={colis}
          livreurs={livreurs}
          notesCount={notesCount}
          permissions={{ canAssignLivreur: true, canEdit: true, canDelete: true, canChangeStatus: true, canEditPrice: true, showBlocked: true, showStatChips: true }}
          searchPlaceholder={t("adm.search.ph")}
          emptyMessage={t("adm.noColis")}
          onColisDeleted={(id) => setColis((prev) => prev.filter((x) => x.id !== id))}
          quickFilter={quickFilter}
          onQuickFilterChange={setQuickFilter}
        />

        <div className="mt-10 grid gap-6 lg:grid-cols-5">
          <form onSubmit={onSubmit} className="lg:col-span-2 space-y-4 rounded-2xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-center gap-2"><Truck className="h-5 w-5 text-primary" /><h2 className="font-bold">Nouveau livreur</h2></div>
            <Field icon={UserIcon} label="Nom complet" value={form.nom} onChange={(v) => setForm({ ...form, nom: v })} />
            <Field icon={Phone} label="Téléphone" value={form.telephone} onChange={(v) => setForm({ ...form, telephone: v })} type="tel" />
            <Field icon={Mail} label="Email (login)" value={form.email} onChange={(v) => setForm({ ...form, email: v })} type="email" />
            <Field icon={KeyRound} label="Mot de passe" value={form.password} onChange={(v) => setForm({ ...form, password: v })} placeholder="Min. 6 caractères" />
            <Button type="submit" disabled={submitting} className="w-full bg-gradient-primary shadow-glow">
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Créer le livreur
            </Button>
          </form>
          <div className="lg:col-span-3 overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
            <div className="border-b border-border p-4"><h2 className="font-bold">Livreurs ({livreurs.length})</h2></div>
            <Table className="text-sm">
              <TableHeader className="bg-muted/50 text-xs uppercase">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="px-3 py-2">Nom</TableHead>
                  <TableHead className="px-3 py-2">Email</TableHead>
                  <TableHead className="px-3 py-2">Tél</TableHead>
                  <TableHead className="px-3 py-2 text-end">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="[&_tr]:divide-border">
                {livreurs.map((l) => (
                  <TableRow key={l.id} className="hover:bg-accent/40">
                    <TableCell className="px-3 py-2 font-bold">{l.nom ?? "—"}</TableCell>
                    <TableCell className="px-3 py-2 text-xs">{l.email ?? "—"}</TableCell>
                    <TableCell className="px-3 py-2 font-mono text-xs">{l.telephone ?? "—"}</TableCell>
                    <TableCell className="px-3 py-2 text-end"><Link to="/feuille-de-route" search={{ livreur: l.id }}><Button size="sm" variant="outline" className="gap-1.5"><FileText className="h-3.5 w-3.5" /> Feuille</Button></Link></TableCell>
                  </TableRow>
                ))}
                {livreurs.length === 0 && <TableRow><TableCell colSpan={4} className="p-8 text-center text-muted-foreground">Aucun livreur</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder, icon: Icon }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; icon?: any }) {
  return (
    <div>
      <Label className="flex items-center gap-1.5 text-xs font-semibold">{Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}{label}</Label>
      <Input required type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="mt-1" />
    </div>
  );
}
