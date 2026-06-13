import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Undo2, Loader2, Search, Eye, Download, XCircle, RefreshCw, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { exportColisToXLSX } from "@/lib/export-csv";

export const Route = createFileRoute("/_authenticated/mes-retours")({
  head: () => ({ meta: [{ title: "Mes retours — REVO EXPRESS" }] }),
  component: MesRetoursPage,
});

function MesRetoursPage() {
  const { user } = useAuth();
  const [colis, setColis] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!user) return;
    const load = () =>
      supabase
        .from("colis")
        .select("*")
        .eq("client_id", user.id)
        .eq("statut", "echec")
        .order("date_creation", { ascending: false })
        .then(({ data }) => {
          setColis(data || []);
          setLoading(false);
        });
    void load();

    const ch = supabase
      .channel("my-retours")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "colis", filter: `client_id=eq.${user.id}` },
        () => {
          void load();
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [user]);

  const stats = useMemo(() => {
    const total = colis.length;
    const valeur = colis.reduce((s, c) => s + Number(c.prix_colis ?? 0), 0);
    const fraisPerdus = colis.reduce((s, c) => s + Number(c.prix ?? 0), 0);
    return { total, valeur, fraisPerdus };
  }, [colis]);

  const filtered = useMemo(() => {
    if (!query.trim()) return colis;
    const q = query.toLowerCase();
    return colis.filter(
      (c) =>
        c.tracking.toLowerCase().includes(q) ||
        c.destinataire_nom?.toLowerCase().includes(q) ||
        c.destinataire_wilaya?.toLowerCase().includes(q),
    );
  }, [colis, query]);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <section className="container mx-auto flex-1 px-4 py-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.25em] text-primary">Tableau de bord</div>
            <h1 className="mt-1 text-3xl font-black md:text-4xl">Mes retours</h1>
            <p className="text-sm text-muted-foreground">
              Colis non livrés et retournés à l'expéditeur.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="gap-2"
              disabled={filtered.length === 0}
              onClick={() =>
                exportColisToXLSX(filtered, `mes-retours-${new Date().toISOString().slice(0, 10)}.xlsx`)
              }
            >
              <Download className="h-4 w-4" /> Exporter ({filtered.length})
            </Button>
            <Link to="/mes-colis">
              <Button variant="ghost" className="gap-2">
                <RefreshCw className="h-4 w-4" /> Voir tous mes colis
              </Button>
            </Link>
          </div>
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <StatCard icon={Undo2} label="Total retours" value={stats.total} accent="destructive" />
          <StatCard icon={AlertTriangle} label="Valeur non livrée" value={`${stats.valeur} DA`} accent="warning" />
          <StatCard icon={XCircle} label="Frais perdus" value={`${stats.fraisPerdus} DA`} accent="destructive" />
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher par tracking, nom, wilaya..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
            <Undo2 className="mx-auto h-12 w-12 text-muted-foreground" />
            <h2 className="mt-3 font-bold">
              {colis.length === 0 ? "Aucun retour" : "Aucun résultat"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {colis.length === 0
                ? "Tous vos colis ont été livrés avec succès."
                : "Modifiez votre recherche pour voir d'autres retours."}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="hidden grid-cols-[1.2fr_1.5fr_1fr_0.9fr_0.9fr_auto] gap-4 border-b border-border bg-muted/40 px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground md:grid">
              <div>Tracking</div>
              <div>Destinataire</div>
              <div>Wilaya</div>
              <div>Valeur</div>
              <div>Date</div>
              <div className="w-20" />
            </div>
            {filtered.map((c) => (
              <div
                key={c.id}
                className="grid grid-cols-1 gap-2 border-b border-border px-4 py-4 transition-colors last:border-b-0 hover:bg-muted/30 md:grid-cols-[1.2fr_1.5fr_1fr_0.9fr_0.9fr_auto] md:items-center md:gap-4"
              >
                <div className="font-mono text-sm font-bold">{c.tracking}</div>
                <div className="text-sm">
                  <div className="font-medium">{c.destinataire_nom}</div>
                  <div className="text-xs text-muted-foreground">{c.destinataire_tel}</div>
                </div>
                <div className="text-sm text-muted-foreground">{c.destinataire_wilaya ?? "—"}</div>
                <div className="text-sm font-bold">{Number(c.prix_colis ?? 0)} DA</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(c.date_creation).toLocaleDateString("fr-FR")}
                </div>
                <div className="flex justify-end">
                  <Link to="/colis/$tracking" params={{ tracking: c.tracking }}>
                    <Button size="sm" variant="outline" className="gap-1">
                      <Eye className="h-3.5 w-3.5" /> Détails
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      <SiteFooter />
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: any;
  label: string;
  value: string | number;
  accent?: "warning" | "destructive" | "primary";
}) {
  const accentMap: Record<string, string> = {
    warning: "text-warning bg-warning/10",
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
