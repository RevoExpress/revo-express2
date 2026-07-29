import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Truck, UserCircle2, CheckCircle2, Clock, ChevronDown, UserX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { ProPageHeader } from "@/components/pro-page-header";
import { toast } from "sonner";
import { confirmAction } from "@/components/confirm-dialog";

export const Route = createFileRoute("/_authenticated/ramassages")({
  head: () => ({ meta: [{ title: "Demandes de ramassage — REVO EXPRESS" }] }),
  component: RamassagesPage,
});

type LivreurMenuState = { id: string; x: number; y: number } | null;

function RamassagesPage() {
  const { role, loading: authLoading } = useAuth();
  const [demandes, setDemandes] = useState<any[]>([]);
  const [clients, setClients] = useState<Record<string, any>>({});
  const [livreurs, setLivreurs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [livreurMenu, setLivreurMenu] = useState<LivreurMenuState>(null);
  const [completing, setCompletingId] = useState<string | null>(null);

  const canAccess = role === "admin" || role === "admin_operations";

  useEffect(() => {
    if (!canAccess) return;
    void refresh();

    supabase.from("user_roles").select("user_id, role").eq("role", "livreur")
      .then(async ({ data }) => {
        if (!data?.length) { setLivreurs([]); return; }
        const ids = data.map((r) => r.user_id);
        const { data: profs } = await supabase.from("profiles").select("id, nom, email").in("id", ids);
        setLivreurs(profs || []);
      });

    const ch = supabase.channel("ramassages")
      .on("postgres_changes", { event: "*", schema: "public", table: "demandes_ramassage" }, () => void refresh())
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [canAccess]);

  async function refresh() {
    const { data } = await supabase
      .from("demandes_ramassage")
      .select("*, demande_ramassage_colis(colis_id, colis(tracking, destinataire_nom, destinataire_wilaya, destinataire_commune))")
      .order("created_at", { ascending: false });
    setDemandes(data || []);
    setLoading(false);

    const clientIds = Array.from(new Set((data || []).map((d: any) => d.client_id)));
    if (clientIds.length) {
      const { data: profs } = await supabase.from("profiles").select("id, nom, email").in("id", clientIds);
      const map: Record<string, any> = {};
      (profs || []).forEach((p: any) => { map[p.id] = p; });
      setClients(map);
    }
  }

  const enAttente = useMemo(() => demandes.filter((d) => d.statut === "en-attente"), [demandes]);
  const assignees = useMemo(() => demandes.filter((d) => d.statut === "assignee"), [demandes]);
  const terminees = useMemo(() => demandes.filter((d) => d.statut === "terminee"), [demandes]);

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

  async function assignerLivreur(demandeId: string, livreurId: string) {
    const patch = {
      livreur_id: livreurId || null,
      statut: livreurId ? "assignee" : "en-attente",
      assigned_at: livreurId ? new Date().toISOString() : null,
    };
    const { error } = await supabase
      .from("demandes_ramassage")
      .update(patch)
      .eq("id", demandeId);
    if (error) { toast.error(error.message); return; }
    // Update local state immediately — don't wait on the realtime round-trip to reflect the change.
    setDemandes((prev) => prev.map((d) => (d.id === demandeId ? { ...d, ...patch } : d)));
    toast.success(livreurId ? "Livreur assigné" : "Livreur retiré");
  }

  async function marquerTerminee(demande: any) {
    const ok = await confirmAction({
      title: "Marquer cette demande comme terminée ?",
      description: `Les ${demande.nb_colis} colis passeront au statut "Ramassé".`,
      confirmLabel: "Marquer terminée",
    });
    if (!ok) return;
    setCompletingId(demande.id);
    const colisIds = (demande.demande_ramassage_colis || []).map((l: any) => l.colis_id);

    const { error: colisError } = await supabase.from("colis").update({ statut: "ramasse" }).in("id", colisIds);
    if (colisError) {
      setCompletingId(null);
      toast.error("Échec de la mise à jour des colis", { description: colisError.message });
      return;
    }

    const { error } = await supabase
      .from("demandes_ramassage")
      .update({ statut: "terminee", completed_at: new Date().toISOString() })
      .eq("id", demande.id);

    setCompletingId(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Demande marquée terminée — colis passés en Ramassé");
  }

  if (authLoading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!canAccess) return <Navigate to="/" />;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <section className="container mx-auto flex-1 px-4 pb-24 pt-10">
        <ProPageHeader
          icon={Truck}
          title="Demandes de ramassage"
          subtitle="Assignez un livreur à chaque demande groupée, puis marquez-la terminée une fois le ramassage effectué."
        />

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (
          <div className="space-y-8">
            <Section title="En attente" count={enAttente.length} icon={Clock} accent="warning">
              {enAttente.length === 0 ? (
                <EmptyRow text="Aucune demande en attente" />
              ) : (
                enAttente.map((d) => (
                  <DemandeRow
                    key={d.id}
                    demande={d}
                    client={clients[d.client_id]}
                    livreurName={livreurName(d.livreur_id)}
                    onAssignClick={(e) => openLivreurMenu(e, d.id)}
                    onComplete={() => void marquerTerminee(d)}
                    completing={completing === d.id}
                  />
                ))
              )}
            </Section>

            <Section title="Assignées — en cours" count={assignees.length} icon={Truck} accent="info">
              {assignees.length === 0 ? (
                <EmptyRow text="Aucune demande assignée en cours" />
              ) : (
                assignees.map((d) => (
                  <DemandeRow
                    key={d.id}
                    demande={d}
                    client={clients[d.client_id]}
                    livreurName={livreurName(d.livreur_id)}
                    onAssignClick={(e) => openLivreurMenu(e, d.id)}
                    onComplete={() => void marquerTerminee(d)}
                    completing={completing === d.id}
                  />
                ))
              )}
            </Section>

            <Section title="Terminées" count={terminees.length} icon={CheckCircle2} accent="success" collapsedByDefault>
              {terminees.length === 0 ? (
                <EmptyRow text="Aucune demande terminée" />
              ) : (
                terminees.map((d) => (
                  <DemandeRow
                    key={d.id}
                    demande={d}
                    client={clients[d.client_id]}
                    livreurName={livreurName(d.livreur_id)}
                    onAssignClick={(e) => openLivreurMenu(e, d.id)}
                    onComplete={() => void marquerTerminee(d)}
                    completing={completing === d.id}
                    readOnly
                  />
                ))
              )}
            </Section>
          </div>
        )}
      </section>
      <SiteFooter />

      {livreurMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setLivreurMenu(null)} />
          <div
            className="fixed z-50 max-h-[340px] w-[240px] overflow-y-auto rounded-xl border p-1 shadow-xl"
            style={{ left: livreurMenu.x, top: livreurMenu.y, backgroundColor: "#ffffff", borderColor: "#e5e7eb" }}
          >
            {livreurs.length === 0 && <div className="px-3 py-2 text-xs" style={{ color: "#6b7280" }}>Aucun livreur — créez-en un via /comptes</div>}
            {livreurs.map((l) => {
              const demande = demandes.find((d) => d.id === livreurMenu.id);
              const active = demande?.livreur_id === l.id;
              return (
                <button
                  key={l.id}
                  onClick={() => { void assignerLivreur(livreurMenu.id, l.id); setLivreurMenu(null); }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium"
                  style={{ color: "#111111", backgroundColor: active ? "#fff7ed" : "transparent" }}
                >
                  <UserCircle2 className="h-4 w-4 shrink-0" style={{ color: "#f97316" }} />
                  <span className="flex-1 truncate">{l.nom || l.email}</span>
                </button>
              );
            })}
            {demandes.find((d) => d.id === livreurMenu.id)?.livreur_id && (
              <button
                onClick={() => { void assignerLivreur(livreurMenu.id, ""); setLivreurMenu(null); }}
                className="mt-1 flex w-full items-center gap-2 rounded-lg border-t px-3 py-2 text-left text-xs font-medium"
                style={{ color: "#dc2626", borderColor: "#f3f4f6" }}
              >
                <UserX className="h-4 w-4 shrink-0" /> Retirer le livreur
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Section({
  title, count, icon: Icon, accent, children, collapsedByDefault,
}: {
  title: string; count: number; icon: any; accent: "warning" | "info" | "success";
  children: React.ReactNode; collapsedByDefault?: boolean;
}) {
  const [open, setOpen] = useState(!collapsedByDefault);
  const accentMap: Record<string, string> = {
    warning: "text-warning bg-warning/10",
    info: "text-info bg-info/10",
    success: "text-success bg-success/10",
  };
  return (
    <div className="overflow-hidden rounded-2xl border border-border">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center justify-between px-4 py-3 ${accentMap[accent]}`}
      >
        <span className="flex items-center gap-2 font-bold">
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? "" : "-rotate-90"}`} />
          <Icon className="h-4 w-4" />
          {title}
          <span className="rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-black dark:bg-black/20">{count}</span>
        </span>
      </button>
      {open && <div className="divide-y divide-border bg-card">{children}</div>}
    </div>
  );
}

function EmptyRow({ text }: { text: string }) {
  return <div className="px-4 py-8 text-center text-sm text-muted-foreground">{text}</div>;
}

function DemandeRow({
  demande, client, livreurName, onAssignClick, onComplete, completing, readOnly,
}: {
  demande: any; client: any; livreurName: string | null;
  onAssignClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onComplete: () => void; completing: boolean; readOnly?: boolean;
}) {
  const colisLinks = demande.demande_ramassage_colis || [];
  return (
    <div className="flex flex-col gap-2 px-4 py-3 md:flex-row md:items-center md:justify-between md:gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold">{client?.nom || client?.email || "Commerçant"}</span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-bold text-muted-foreground">
            {demande.nb_colis} colis
          </span>
          <span className="text-xs text-muted-foreground">
            {new Date(demande.created_at).toLocaleString("fr-FR")}
          </span>
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {colisLinks.map((l: any) => (
            <span key={l.colis_id} className="rounded-md bg-info/15 px-2 py-0.5 font-mono text-[11px] font-bold text-info">
              {l.colis?.tracking}
            </span>
          ))}
        </div>
      </div>

      {!readOnly && (
        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onAssignClick}
            className="h-9 gap-2 text-xs font-medium text-muted-foreground"
          >
            <UserCircle2 className="h-3.5 w-3.5" />
            {livreurName ?? "Assigner un livreur"}
          </Button>
          <Button
            size="sm"
            className="h-9 gap-1.5 bg-success text-white hover:bg-success/90"
            disabled={completing}
            onClick={onComplete}
          >
            {completing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            Terminée
          </Button>
        </div>
      )}
      {readOnly && (
        <div className="shrink-0 text-xs text-muted-foreground">
          Livreur : {livreurName ?? "—"}
        </div>
      )}
    </div>
  );
}