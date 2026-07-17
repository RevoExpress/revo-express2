import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Inbox, Loader2, CheckCircle2, XCircle, Phone, MapPin, Package, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { listCommandesApiEnAttente, validerCommandeApi } from "@/lib/api.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/commandes-api")({
  head: () => ({ meta: [{ title: "Commandes web — REVO EXPRESS" }] }),
  component: CommandesApiPage,
});

function CommandesApiPage() {
  const [commandes, setCommandes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    try {
      const res = await listCommandesApiEnAttente();
      setCommandes(res.commandes ?? []);
    } catch {
      toast.error("Impossible de charger les commandes");
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function traiter(cmd: any, accepter: boolean) {
    if (!accepter) {
      const ok = window.confirm(
        `Refuser la commande de ${cmd.destinataire_nom} ?\n\nElle sera marquée comme rejetée et aucun colis ne sera créé.`
      );
      if (!ok) return;
    }
    setBusyId(cmd.id);
    try {
      const res = await validerCommandeApi({
        data: { commande_id: cmd.id, accepter },
      });
      if (accepter) {
        toast.success(`Colis créé : ${res.tracking}`);
      } else {
        toast.success("Commande refusée");
      }
      await load();
    } catch (err: any) {
      toast.error(err?.message ?? "Action échouée");
    }
    setBusyId(null);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <section className="container mx-auto flex-1 px-4 py-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.25em] text-primary">Boutique connectée</div>
            <h1 className="mt-1 text-3xl font-black md:text-4xl">Commandes web</h1>
            <p className="text-sm text-muted-foreground">
              Commandes envoyées par votre boutique. Acceptez-les pour créer les colis, ou refusez-les.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="gap-2" onClick={() => { setLoading(true); void load(); }}>
              <RefreshCw className="h-4 w-4" /> Actualiser
            </Button>
            <Link to="/mes-colis">
              <Button variant="ghost" className="gap-2">
                <Package className="h-4 w-4" /> Mes colis
              </Button>
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : commandes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
            <Inbox className="mx-auto h-12 w-12 text-muted-foreground" />
            <h2 className="mt-3 font-bold">Aucune commande en attente</h2>
            <p className="text-sm text-muted-foreground">
              Les nouvelles commandes envoyées par votre boutique apparaîtront ici.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {commandes.map((cmd) => {
              const busy = busyId === cmd.id;
              return (
                <div key={cmd.id} className="flex flex-col rounded-xl border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate font-bold">{cmd.destinataire_nom}</div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Phone className="h-3.5 w-3.5 shrink-0" />
                        {cmd.destinataire_tel}
                      </div>
                    </div>
                    <div className="shrink-0 rounded-lg bg-primary/10 px-3 py-1.5 text-right">
                      <div className="text-lg font-black text-primary">
                        {Number(cmd.prix_colis ?? 0)} DA
                      </div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        À encaisser
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-start gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>
                      {cmd.destinataire_adresse}
                      {(cmd.destinataire_commune || cmd.destinataire_wilaya) && (
                        <> — {[cmd.destinataire_commune, cmd.destinataire_wilaya].filter(Boolean).join(", ")}</>
                      )}
                    </span>
                  </div>

                  {cmd.description && (
                    <div className="mt-2 rounded-lg bg-muted/40 px-3 py-2 text-sm">
                      {cmd.description}
                    </div>
                  )}

                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {cmd.ref_externe && <span>Réf. boutique : <b>{cmd.ref_externe}</b></span>}
                    {cmd.source && <span>Source : {cmd.source}</span>}
                    <span>Reçue le {new Date(cmd.created_at).toLocaleString("fr-FR")}</span>
                  </div>

                  <div className="mt-4 flex gap-2 border-t border-border pt-3">
                    <Button
                      className="flex-1 gap-2 bg-gradient-primary font-bold"
                      disabled={busy}
                      onClick={() => void traiter(cmd, true)}
                    >
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      Accepter
                    </Button>
                    <Button
                      variant="outline"
                      className="gap-2 text-destructive hover:text-destructive"
                      disabled={busy}
                      onClick={() => void traiter(cmd, false)}
                    >
                      <XCircle className="h-4 w-4" /> Refuser
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
      <SiteFooter />
    </div>
  );
}