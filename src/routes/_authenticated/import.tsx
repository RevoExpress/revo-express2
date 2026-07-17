import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import {
  FileSpreadsheet,
  Download,
  Upload,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { telechargerModeleImport, parserFichierImport } from "@/lib/import-excel";
import { validerImport, executerImport } from "@/lib/prospection.functions";

export const Route = createFileRoute("/_authenticated/import")({
  head: () => ({ meta: [{ title: "Import Excel — REVO EXPRESS" }] }),
  component: ImportPage,
});

type Etape = "choix" | "verification" | "execution" | "termine";

function ImportPage() {
  const [etape, setEtape] = useState<Etape>("choix");
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const [check, setCheck] = useState<{ total: number; valides: number; erreurs: Array<{ ligne: number; message: string }> } | null>(null);
  const [result, setResult] = useState<{ created: number; erreurs: Array<{ ligne: number; message: string }> } | null>(null);
  const [busy, setBusy] = useState(false);
  const [fatalError, setFatalError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setEtape("choix");
    setFileName("");
    setRows([]);
    setCheck(null);
    setResult(null);
    setFatalError("");
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleFile(file: File | undefined | null) {
    if (!file) return;
    setFatalError("");
    setBusy(true);
    setFileName(file.name);
    try {
      const parsed = await parserFichierImport(file);
      if (!parsed || parsed.length === 0) {
        setFatalError("Le fichier est vide ou ne correspond pas au modèle. Téléchargez le modèle et remplissez-le.");
        setBusy(false);
        return;
      }
      setRows(parsed);
      const res = await validerImport({ data: { rows: parsed } });
      setCheck(res);
      setEtape("verification");
    } catch (err: any) {
      setFatalError("Impossible de lire ce fichier. Vérifiez qu'il s'agit bien d'un fichier Excel (.xlsx) basé sur le modèle.");
    }
    setBusy(false);
  }

  async function lancerImport() {
    setBusy(true);
    setFatalError("");
    try {
      const res = await executerImport({ data: { rows } });
      setResult(res);
      setEtape("termine");
    } catch (err: any) {
      setFatalError("L'import a échoué. Réessayez — si le problème persiste, contactez le support.");
    }
    setBusy(false);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <section className="container mx-auto flex-1 px-4 py-10">
        <div className="mb-8">
          <div className="text-xs font-bold uppercase tracking-[0.25em] text-primary">Outils</div>
          <h1 className="mt-1 text-3xl font-black md:text-4xl">Import Excel</h1>
          <p className="text-sm text-muted-foreground">
            Créez plusieurs colis d'un coup à partir d'un fichier Excel.
          </p>
        </div>

        <div className="mx-auto max-w-2xl space-y-4">
          {/* ÉTAPE 1 — modèle + upload */}
          {etape === "choix" && (
            <>
              <div className="rounded-xl border border-border bg-card p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <span className="text-lg font-black">1</span>
                  </div>
                  <div className="flex-1">
                    <h2 className="font-bold">Téléchargez le modèle</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Colonnes : Nom du destinataire, Téléphone, Adresse complète, Wilaya, Montant à
                      encaisser (DA), Description. Une ligne = un colis.
                    </p>
                    <Button
                      variant="outline"
                      className="mt-3 gap-2"
                      onClick={() => telechargerModeleImport()}
                    >
                      <Download className="h-4 w-4" /> Télécharger le modèle
                    </Button>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <span className="text-lg font-black">2</span>
                  </div>
                  <div className="flex-1">
                    <h2 className="font-bold">Envoyez votre fichier rempli</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Rien ne sera créé avant votre confirmation : vous verrez d'abord une
                      vérification complète du fichier.
                    </p>
                    <input
                      ref={inputRef}
                      type="file"
                      accept=".xlsx,.xls"
                      className="hidden"
                      onChange={(e) => void handleFile(e.target.files?.[0])}
                    />
                    <Button
                      className="mt-3 gap-2 bg-gradient-primary font-bold"
                      disabled={busy}
                      onClick={() => inputRef.current?.click()}
                    >
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      {busy ? "Lecture du fichier..." : "Choisir le fichier Excel"}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ÉTAPE 2 — vérification */}
          {etape === "verification" && check && (
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-6 w-6 text-primary" />
                <div>
                  <h2 className="font-bold">Vérification du fichier</h2>
                  <p className="text-xs text-muted-foreground">{fileName}</p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <MiniStat label="Lignes lues" value={check.total} />
                <MiniStat label="Valides" value={check.valides} accent="ok" />
                <MiniStat label="Erreurs" value={check.erreurs.length} accent={check.erreurs.length > 0 ? "bad" : undefined} />
              </div>

              {check.erreurs.length > 0 && (
                <div className="mt-4 max-h-64 overflow-y-auto rounded-lg border border-destructive/30 bg-destructive/5">
                  {check.erreurs.map((e, i) => (
                    <div key={i} className="flex items-start gap-2 border-b border-destructive/10 px-3 py-2 text-sm last:border-b-0">
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                      <span>
                        <span className="font-bold">Ligne {e.ligne} :</span> {e.message}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {check.valides === 0 ? (
                <div className="mt-4 flex items-start gap-2 rounded-lg bg-warning/10 p-3 text-sm">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                  <span>Aucune ligne valide : corrigez le fichier puis renvoyez-le.</span>
                </div>
              ) : check.erreurs.length > 0 ? (
                <div className="mt-4 flex items-start gap-2 rounded-lg bg-warning/10 p-3 text-sm">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                  <span>
                    Seules les <b>{check.valides} lignes valides</b> seront importées. Les lignes en
                    erreur seront ignorées.
                  </span>
                </div>
              ) : null}

              <div className="mt-5 flex flex-wrap gap-2">
                <Button
                  className="gap-2 bg-gradient-primary font-bold"
                  disabled={busy || check.valides === 0}
                  onClick={() => void lancerImport()}
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  {busy ? "Import en cours..." : `Importer ${check.valides} colis`}
                </Button>
                <Button variant="outline" className="gap-2" disabled={busy} onClick={reset}>
                  <RotateCcw className="h-4 w-4" /> Choisir un autre fichier
                </Button>
              </div>
            </div>
          )}

          {/* ÉTAPE 3 — résultat */}
          {etape === "termine" && result && (
            <div className="rounded-xl border border-border bg-card p-6 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
              <h2 className="mt-3 text-xl font-black">{result.created} colis créés</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Ils sont en statut « En préparation » — retrouvez-les dans Mes colis pour imprimer
                les bordereaux.
              </p>

              {result.erreurs?.length > 0 && (
                <div className="mt-4 max-h-48 overflow-y-auto rounded-lg border border-destructive/30 bg-destructive/5 text-left">
                  {result.erreurs.map((e, i) => (
                    <div key={i} className="flex items-start gap-2 border-b border-destructive/10 px-3 py-2 text-sm last:border-b-0">
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                      <span>
                        <span className="font-bold">Ligne {e.ligne} :</span> {e.message}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-5 flex justify-center gap-2">
                <Button variant="outline" className="gap-2" onClick={reset}>
                  <RotateCcw className="h-4 w-4" /> Nouvel import
                </Button>
              </div>
            </div>
          )}

          {fatalError && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <span>{fatalError}</span>
            </div>
          )}
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}

function MiniStat({ label, value, accent }: { label: string; value: number; accent?: "ok" | "bad" }) {
  const cls =
    accent === "ok" ? "text-success" : accent === "bad" ? "text-destructive" : "text-foreground";
  return (
    <div className="rounded-lg border border-border bg-background p-3 text-center">
      <div className={`text-2xl font-black ${cls}`}>{value}</div>
      <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}