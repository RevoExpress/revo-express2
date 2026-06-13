import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Package, Download, Check, UserCircle2, LayoutDashboard } from "lucide-react";
import { ProPageHeader } from "@/components/pro-page-header";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { STATUTS, type StatutKey } from "@/lib/tarifs";
import { exportColisToXLSX } from "@/lib/export-csv";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { AdminStats } from "@/components/admin-stats";

// Visual styling for each status: pill background + dot color.
// Uses brand orange + semantic tokens so it works in light and dark mode.
const STATUT_STYLES: Record<StatutKey, { pill: string; dot: string }> = {
  "en-attente": {
    pill: "bg-warning/15 text-warning border-warning/40",
    dot: "bg-warning",
  },
  "pris-en-charge": {
    pill: "bg-primary/15 text-primary border-primary/40",
    dot: "bg-primary",
  },
  "en-cours": {
    pill: "bg-primary/20 text-primary border-primary/50 shadow-[0_0_0_3px_oklch(var(--primary)/0.08)]",
    dot: "bg-primary animate-pulse",
  },
  "livre": {
    pill: "bg-success/15 text-success border-success/40",
    dot: "bg-success",
  },
  "echec": {
    pill: "bg-destructive/15 text-destructive border-destructive/40",
    dot: "bg-destructive",
  },
};


export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — REVO EXPRESS" }] }),
  component: AdminPage,
});

function AdminPage() {
  const { role, loading } = useAuth();
  const [colis, setColis] = useState<any[]>([]);
  const [livreurs, setLivreurs] = useState<any[]>([]);

  useEffect(() => {
    if (role !== "admin") return;
    refresh();
    supabase.from("user_roles").select("user_id, role").eq("role", "livreur")
      .then(async ({ data }) => {
        if (!data?.length) { setLivreurs([]); return; }
        const ids = data.map((r) => r.user_id);
        const { data: profs } = await supabase.from("profiles").select("id, nom, email").in("id", ids);
        setLivreurs(profs || []);
      });

    const ch = supabase.channel("admin-colis")
      .on("postgres_changes", { event: "*", schema: "public", table: "colis" }, refresh)
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [role]);

  async function refresh() {
    const { data } = await supabase.from("colis").select("*").order("date_creation", { ascending: false }).limit(200);
    setColis(data || []);
  }

  async function updateStatut(id: string, statut: string) {
    const { error } = await supabase.from("colis").update({ statut }).eq("id", id);
    if (error) toast.error(error.message); else toast.success("Statut mis à jour");
  }

  async function assignLivreur(id: string, livreur_id: string) {
    const { error } = await supabase.from("colis").update({ livreur_id: livreur_id || null }).eq("id", id);
    if (error) toast.error(error.message); else toast.success("Livreur assigné");
  }

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (role !== "admin") return <Navigate to="/" />;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <section className="container mx-auto flex-1 px-4 py-10">
        <ProPageHeader
          icon={LayoutDashboard}
          title="Tableau de bord admin"
          subtitle="Gérez tous les colis et assignez les livreurs en temps réel."
          action={
            <Button
              variant="outline"
              className="gap-2"
              onClick={async () => {
                const { data, error } = await supabase
                  .from("colis")
                  .select("*")
                  .order("date_creation", { ascending: false });
                if (error) { toast.error(error.message); return; }
                if (!data?.length) { toast.info("Aucun colis à exporter"); return; }
                const livreurIds = Array.from(new Set(data.map((c: any) => c.livreur_id).filter(Boolean)));
                const livreurById = new Map<string, { nom?: string | null; telephone?: string | null }>();
                if (livreurIds.length) {
                  const { data: profs } = await supabase
                    .from("profiles")
                    .select("id, nom, telephone")
                    .in("id", livreurIds);
                  (profs ?? []).forEach((p: any) => livreurById.set(p.id, { nom: p.nom, telephone: p.telephone }));
                }
                exportColisToXLSX(data, `revo-export-${new Date().toISOString().slice(0, 10)}.xlsx`, { livreurById });
                toast.success(`${data.length} colis exportés`);
              }}
            >
              <Download className="h-4 w-4" /> Exporter tous les colis
            </Button>
          }
        />

        <div className="mt-2">
          <AdminStats />
        </div>


        <div className="mt-8 overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
          <table className="w-full text-sm">
            <thead className="bg-muted text-foreground">
              <tr>
                <th className="px-3 py-3 text-left">Tracking</th>
                <th className="px-3 py-3 text-left">Destinataire</th>
                <th className="px-3 py-3 text-left">Trajet</th>
                <th className="px-3 py-3 text-left">Livreur</th>
                <th className="px-3 py-3 text-left">Statut</th>
                <th className="px-3 py-3 text-right">Prix</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {colis.map((c) => (
                <tr key={c.id} className="hover:bg-accent/40">
                  <td className="px-3 py-2 font-mono text-xs">{c.tracking}</td>
                  <td className="px-3 py-2">{c.destinataire_nom}<br /><span className="text-xs text-muted-foreground">{c.destinataire_tel}</span></td>
                  <td className="px-3 py-2 text-xs">{c.depart} → {c.destinataire_wilaya}</td>
                  <td className="px-3 py-2">
                    <Select value={c.livreur_id || "none"} onValueChange={(v) => assignLivreur(c.id, v === "none" ? "" : v)}>
                      <SelectTrigger className="h-8 w-[180px] gap-2 rounded-full border-border bg-background text-xs font-medium hover:border-primary/50 hover:bg-accent focus:ring-primary/40">
                        <UserCircle2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <SelectValue placeholder="— Aucun —" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— Aucun —</SelectItem>
                        {livreurs.map((l) => (
                          <SelectItem key={l.id} value={l.id}>{l.nom || l.email}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-3 py-2">
                    <Select value={c.statut} onValueChange={(v) => updateStatut(c.id, v)}>
                      <SelectTrigger
                        className={cn(
                          "h-8 w-[210px] gap-2 rounded-full border px-3 text-xs font-semibold transition-all hover:opacity-90 focus:ring-2 focus:ring-primary/40 [&>svg:last-child]:opacity-60",
                          STATUT_STYLES[c.statut as StatutKey]?.pill ?? "",
                        )}
                      >
                        <span className={cn("h-2 w-2 rounded-full", STATUT_STYLES[c.statut as StatutKey]?.dot ?? "bg-muted")} />
                        <span className="flex-1 text-left">
                          {STATUTS.find((s) => s.key === c.statut)?.label ?? c.statut}
                        </span>
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-border/70 p-1">
                        {STATUTS.map((s) => {
                          const st = STATUT_STYLES[s.key];
                          const active = c.statut === s.key;
                          return (
                            <SelectItem
                              key={s.key}
                              value={s.key}
                              className="rounded-lg py-2 pl-2 pr-8 text-xs focus:bg-accent/60 [&>span:last-child]:hidden"
                            >
                              <span className="flex items-center gap-2">
                                <span className={cn("h-2 w-2 rounded-full", st.dot)} />
                                <span className="font-medium">{s.label}</span>
                                {active && <Check className="ml-auto h-3.5 w-3.5 text-primary" />}
                              </span>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-3 py-2 text-right font-bold">{c.prix} DA</td>
                </tr>
              ))}
              {colis.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">
                  <Package className="mx-auto mb-2 h-8 w-8" /> Aucun colis pour le moment
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-card">
          <h2 className="font-bold">Gestion des livreurs</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Pour transformer un client en livreur : demandez-lui de créer un compte, puis exécutez la commande SQL dans votre backend pour lui attribuer le rôle "livreur". Une page de gestion plus avancée sera ajoutée prochainement.
          </p>
          <div className="mt-3">
            <strong className="text-sm">Livreurs actuels :</strong>
            <ul className="mt-1 text-sm text-muted-foreground">
              {livreurs.length === 0 ? <li>— Aucun —</li> : livreurs.map((l) => <li key={l.id}>• {l.nom || l.email}</li>)}
            </ul>
          </div>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
