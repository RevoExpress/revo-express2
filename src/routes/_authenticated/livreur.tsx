import { createFileRoute, Navigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Package, ScanLine, CheckCircle2, XCircle, Truck, ArrowRight, AlertTriangle, MapPin, MapPinOff } from "lucide-react";
import { ProPageHeader } from "@/components/pro-page-header";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useShareLocation } from "@/hooks/use-share-location";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { STATUTS } from "@/lib/tarifs";
import { Button } from "@/components/ui/button";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { TrackingBadge } from "@/components/tracking-badge";

export const Route = createFileRoute("/_authenticated/livreur")({
  head: () => ({ meta: [{ title: "Espace livreur — REVO EXPRESS" }] }),
  component: LivreurPage,
});

// Workflow : le prochain statut logique après le statut actuel
const NEXT_STATUT: Record<string, string> = {
  "en-preparation": "ramasse",
  "ramasse": "expedie",
  "expedie": "en-livraison",
  "en-livraison": "livre",
  "contact-client": "livre",
  "reporte": "en-livraison",
};

// Statuts "encore en route" (ni livré, ni échec, ni annulé, ni retourné)
const STATUTS_EN_COURS = [
  "en-preparation",
  "ramasse",
  "expedie",
  "en-livraison",
  "contact-client",
  "reporte",
];

function LivreurPage() {
  const { user, role, loading } = useAuth();
  const [colis, setColis] = useState<any[]>([]);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannedColis, setScannedColis] = useState<any | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || role !== "livreur") return;
    refresh();
    const ch = supabase.channel("livreur-colis")
      .on("postgres_changes", { event: "*", schema: "public", table: "colis", filter: `livreur_id=eq.${user.id}` }, refresh)
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
    async function refresh() {
      const { data } = await supabase.from("colis").select("*").eq("livreur_id", user!.id).order("date_creation", { ascending: false });
      setColis(data || []);
    }
  }, [user, role]);

  const geo = useShareLocation(user?.id);


  const stats = useMemo(() => {
    const total = colis.length;
    const aLivrer = colis.filter((c) => STATUTS_EN_COURS.includes(c.statut)).length;
    const livres = colis.filter((c) => c.statut === "livre").length;
    return { total, aLivrer, livres };
  }, [colis]);

  async function updateStatut(id: string, statut: string) {
    const { error } = await supabase.from("colis").update({ statut }).eq("id", id);
    if (error) toast.error(error.message); else toast.success("Statut mis à jour");
  }

  function handleDetected(text: string) {
    // Normalisation : le tracking est en majuscules, on accepte aussi une URL /track/REV-XXXX
    let code = text.trim().toUpperCase();
    const m = code.match(/(REV|ECH|SPL)-[A-Z0-9]+/);
    if (m) code = m[0];

    const found = colis.find((c) => c.tracking?.toUpperCase() === code);
    setScannerOpen(false);
    if (!found) {
      setScanError(`Aucun colis assigné ne correspond à ${code}`);
      setScannedColis(null);
      return;
    }
    setScanError(null);
    setScannedColis(found);
  }

  async function quickUpdate(id: string, statut: string) {
    await updateStatut(id, statut);
    setScannedColis((s: any) => (s && s.id === id ? { ...s, statut } : s));
  }

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (role !== "livreur") return <Navigate to="/" />;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <section className="container mx-auto flex-1 px-4 py-10">
        <ProPageHeader
          icon={Truck}
          title="Mes livraisons"
          subtitle="Tournée du jour — scannez un code-barres pour mettre à jour rapidement."
          action={
            <>
              <Link to="/feuille-de-route">
                <Button size="lg" variant="outline" className="gap-2">
                  <Package className="h-5 w-5" /> Feuille de route
                </Button>
              </Link>
              <Button
                size="lg"
                variant={geo.sharing ? "outline" : "default"}
                className={geo.sharing ? "gap-2 border-success text-success" : "gap-2"}
                onClick={() => (geo.sharing ? geo.stop() : geo.start())}
              >
                {geo.sharing ? <MapPinOff className="h-5 w-5" /> : <MapPin className="h-5 w-5" />}
                {geo.sharing ? "Arrêter le GPS" : "Activer le GPS"}
              </Button>
              <Button
                size="lg"
                className="gap-2 bg-gradient-primary shadow-glow"
                onClick={() => { setScanError(null); setScannerOpen(true); }}
              >
                <ScanLine className="h-5 w-5" /> Scanner un colis
              </Button>
            </>
          }
        />

        {/* GPS status banner */}
        {geo.sharing && (
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-success/30 bg-success/5 p-3">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-success" />
            </span>
            <div className="flex-1 text-sm">
              <span className="font-bold text-success">Partage de position actif</span>
              {geo.lastFix && (
                <span className="ml-2 text-xs text-muted-foreground">
                  ({geo.lastFix.lat.toFixed(5)}, {geo.lastFix.lng.toFixed(5)})
                </span>
              )}
            </div>
          </div>
        )}
        {geo.status === "denied" && (
          <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            Localisation refusée. Autorisez l'accès à la position dans les réglages de votre téléphone.
          </div>
        )}


        {/* Stat cards */}
        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <StatCard icon={Package} label="Total assignés" value={stats.total} />
          <StatCard icon={Truck} label="À livrer" value={stats.aLivrer} accent="info" />
          <StatCard icon={CheckCircle2} label="Livrés" value={stats.livres} accent="success" />
        </div>

        {/* Scan result banner */}
        {scanError && (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" />
            <div className="flex-1">
              <div className="font-bold text-destructive">Colis non reconnu</div>
              <div className="text-sm text-muted-foreground">{scanError}</div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setScanError(null)}>Fermer</Button>
          </div>
        )}

        {scannedColis && (
          <div className="mb-6 rounded-2xl border-2 border-primary bg-primary/5 p-4 shadow-glow">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-primary">Colis scanné</div>
                <div className="mt-1 font-mono text-lg font-black">
                  {scannedColis.tracking}
                  <TrackingBadge typeColis={scannedColis.type_colis} />
                </div>
                <div className="mt-1 text-sm">
                  <strong>{scannedColis.destinataire_nom}</strong> — {scannedColis.destinataire_tel}
                </div>
                <div className="text-xs text-muted-foreground">
                  {scannedColis.destinataire_adresse} ({scannedColis.destinataire_wilaya})
                </div>
                <div className="mt-1 text-xs">
                  Statut actuel : <Badge statut={scannedColis.statut} />
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setScannedColis(null)}>Fermer</Button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {NEXT_STATUT[scannedColis.statut] && (
                <Button
                  className="gap-2 bg-success text-success-foreground hover:bg-success/90"
                  onClick={() => quickUpdate(scannedColis.id, NEXT_STATUT[scannedColis.statut])}
                >
                  <ArrowRight className="h-4 w-4" />
                  Passer à « {STATUTS.find((s) => s.key === NEXT_STATUT[scannedColis.statut])?.label} »
                </Button>
              )}
              {scannedColis.statut !== "livre" && (
                <Button
                  variant="outline"
                  className="gap-2 border-success text-success hover:bg-success/10"
                  onClick={() => quickUpdate(scannedColis.id, "livre")}
                >
                  <CheckCircle2 className="h-4 w-4" /> Marquer livré
                </Button>
              )}
              {scannedColis.statut !== "echec-livraison" && (
                <Button
                  variant="outline"
                  className="gap-2 border-destructive text-destructive hover:bg-destructive/10"
                  onClick={() => quickUpdate(scannedColis.id, "echec-livraison")}
                >
                  <XCircle className="h-4 w-4" /> Échec de livraison
                </Button>
              )}
              <Link to="/colis/$tracking" params={{ tracking: scannedColis.tracking }}>
                <Button variant="outline">Détails</Button>
              </Link>
            </div>
          </div>
        )}

        {/* List */}
        <div className="grid gap-3">
          {colis.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
              <Package className="mx-auto h-12 w-12 text-muted-foreground" />
              <h2 className="mt-3 font-bold">Aucune livraison assignée</h2>
              <p className="text-sm text-muted-foreground">L'admin vous assignera des colis à livrer.</p>
            </div>
          )}
          {colis.map((c) => (
            <div key={c.id} className="rounded-2xl border border-border bg-card p-4 shadow-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold">
                      {c.tracking}
                      <TrackingBadge typeColis={c.type_colis} />
                    </span>
                    <Badge statut={c.statut} />
                  </div>
                  <div className="mt-1 text-sm">
                    <strong>Vers :</strong> {c.destinataire_nom} — Tél : {c.destinataire_tel}
                  </div>
                  <div className="text-xs text-muted-foreground">{c.destinataire_adresse} ({c.destinataire_wilaya})</div>
                  <div className="mt-1 text-xs text-muted-foreground">Départ : {c.depart} • {c.prix} DA</div>
                </div>
                <select value={c.statut} onChange={(e) => updateStatut(c.id, e.target.value)}
                  className="rounded-md border border-input bg-transparent px-3 py-2 text-sm">
                  {STATUTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
              </div>
            </div>
          ))}
        </div>
      </section>

      <BarcodeScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onDetected={handleDetected}
      />

      <SiteFooter />
    </div>
  );
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