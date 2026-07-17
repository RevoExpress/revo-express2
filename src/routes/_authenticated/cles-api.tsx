import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  KeyRound, Plus, Loader2, Copy, Ban, ShieldAlert, CheckCircle2,
  Search, Code2, ChevronDown, ChevronUp,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { genererApiKey, listApiKeys, revoquerApiKey } from "@/lib/api.functions";
import { listClients } from "@/lib/clients.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/cles-api")({
  head: () => ({ meta: [{ title: "Clés API — REVO EXPRESS" }] }),
  component: ClesApiPage,
});

function ClesApiPage() {
  const { role } = useAuth();
  const [clients, setClients] = useState<any[]>([]);
  const [keys, setKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [showDoc, setShowDoc] = useState(false);

  // Formulaire de génération
  const [genClientId, setGenClientId] = useState("");
  const [genNom, setGenNom] = useState("");
  const [genBusy, setGenBusy] = useState(false);

  // Clé fraîchement générée (affichée UNE seule fois)
  const [newKey, setNewKey] = useState<string | null>(null);
  const [newKeyClient, setNewKeyClient] = useState("");

  const isDG = role === "admin";

  async function loadAll() {
    try {
      const [c, k] = await Promise.all([listClients(), listApiKeys({ data: {} })]);
      setClients(c.clients ?? []);
      setKeys(k.keys ?? []);
    } catch {
      toast.error("Impossible de charger les données");
    }
    setLoading(false);
  }

  useEffect(() => {
    if (isDG) void loadAll();
    else setLoading(false);
  }, [isDG]);

  const clientById = useMemo(() => {
    const m = new Map<string, any>();
    clients.forEach((c) => m.set(c.id, c));
    return m;
  }, [clients]);

  const filteredKeys = useMemo(() => {
    if (!query.trim()) return keys;
    const q = query.toLowerCase();
    return keys.filter((k) => {
      const c = clientById.get(k.client_id);
      return (
        k.key_prefix?.toLowerCase().includes(q) ||
        k.nom?.toLowerCase().includes(q) ||
        c?.nom_boutique?.toLowerCase().includes(q) ||
        c?.nom?.toLowerCase().includes(q) ||
        c?.email?.toLowerCase().includes(q)
      );
    });
  }, [keys, query, clientById]);

  async function handleGenerate() {
    if (!genClientId) {
      toast.error("Choisissez un commerçant");
      return;
    }
    setGenBusy(true);
    try {
      const res = await genererApiKey({
        data: { client_id: genClientId, nom: genNom.trim() || undefined },
      });
      const c = clientById.get(genClientId);
      setNewKey(res.api_key);
      setNewKeyClient(c?.nom_boutique || c?.nom || "");
      setGenNom("");
      await loadAll();
      toast.success("Clé générée");
    } catch (err: any) {
      toast.error(err?.message ?? "Génération échouée");
    }
    setGenBusy(false);
  }

  async function copyKey(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Clé copiée");
    } catch {
      toast.error("Impossible de copier — sélectionnez-la à la main");
    }
  }

  async function handleRevoke(key: any) {
    const c = clientById.get(key.client_id);
    const ok = window.confirm(
      `Révoquer la clé ${key.key_prefix}… de « ${c?.nom_boutique ?? "?"} » ?\n\nLa boutique ne pourra plus envoyer de commandes avec cette clé. C'est définitif.`
    );
    if (!ok) return;
    try {
      await revoquerApiKey({ data: { key_id: key.id } });
      toast.success("Clé révoquée");
      await loadAll();
    } catch (err: any) {
      toast.error(err?.message ?? "Révocation échouée");
    }
  }

  if (!isDG) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteNav />
        <section className="container mx-auto flex flex-1 items-center justify-center px-4 py-10">
          <div className="rounded-2xl border border-border bg-card p-10 text-center">
            <ShieldAlert className="mx-auto h-12 w-12 text-destructive" />
            <h1 className="mt-3 text-xl font-black">Accès réservé au DG</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              La gestion des clés API est réservée à la direction générale.
            </p>
          </div>
        </section>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <section className="container mx-auto flex-1 px-4 py-10">
        <div className="mb-8">
          <div className="text-xs font-bold uppercase tracking-[0.25em] text-primary">Boutiques connectées</div>
          <h1 className="mt-1 text-3xl font-black md:text-4xl">Clés API</h1>
          <p className="text-sm text-muted-foreground">
            Une clé permet à la boutique d'un commerçant d'envoyer ses commandes automatiquement.
            Le commerçant valide ensuite chaque commande avant qu'elle devienne un colis.
          </p>
        </div>

        {/* Clé fraîchement générée — affichée UNE SEULE FOIS */}
        {newKey && (
          <div className="mb-6 rounded-xl border-2 border-warning bg-warning/10 p-5">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-6 w-6 shrink-0 text-warning" />
              <div className="min-w-0 flex-1">
                <h2 className="font-black">
                  Clé pour {newKeyClient} — copiez-la MAINTENANT
                </h2>
                <p className="mt-1 text-sm">
                  Pour des raisons de sécurité, cette clé ne sera <b>plus jamais affichée</b>.
                  Copiez-la et transmettez-la au commerçant de façon sûre (jamais dans un groupe).
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <code className="min-w-0 flex-1 overflow-x-auto rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm font-bold">
                    {newKey}
                  </code>
                  <Button className="gap-2 bg-gradient-primary font-bold" onClick={() => void copyKey(newKey)}>
                    <Copy className="h-4 w-4" /> Copier
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 gap-2"
                  onClick={() => { setNewKey(null); setNewKeyClient(""); }}
                >
                  <CheckCircle2 className="h-4 w-4" /> J'ai copié la clé, masquer
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Génération */}
        <div className="mb-6 rounded-xl border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 font-bold">
            <KeyRound className="h-5 w-5 text-primary" /> Générer une nouvelle clé
          </h2>
          <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
            <select
              value={genClientId}
              onChange={(e) => setGenClientId(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">— Choisir le commerçant —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom_boutique || c.nom} ({c.email})
                </option>
              ))}
            </select>
            <Input
              placeholder="Nom de la clé (facultatif — ex. Boutique Shopify)"
              value={genNom}
              onChange={(e) => setGenNom(e.target.value)}
              maxLength={100}
            />
            <Button
              className="gap-2 bg-gradient-primary font-bold"
              disabled={genBusy || !genClientId}
              onClick={() => void handleGenerate()}
            >
              {genBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Générer
            </Button>
          </div>
        </div>

        {/* Documentation à transmettre */}
        <div className="mb-6 overflow-hidden rounded-xl border border-border bg-card">
          <button
            className="flex w-full items-center justify-between px-5 py-4 text-left font-bold hover:bg-muted/30"
            onClick={() => setShowDoc((v) => !v)}
          >
            <span className="flex items-center gap-2">
              <Code2 className="h-5 w-5 text-primary" /> Documentation à transmettre à la boutique
            </span>
            {showDoc ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {showDoc && (
            <div className="border-t border-border px-5 py-4 text-sm">
              <p className="text-muted-foreground">
                La boutique envoie ses commandes en <b>POST</b> avec sa clé API. Champs à envoyer :
              </p>
              <div className="mt-3 overflow-x-auto rounded-lg border border-border bg-background p-3 font-mono text-xs leading-relaxed">
                api_key&nbsp;: la clé (obligatoire)<br />
                destinataire_nom&nbsp;: nom du client final (obligatoire)<br />
                destinataire_tel&nbsp;: téléphone (obligatoire)<br />
                destinataire_adresse&nbsp;: adresse complète (obligatoire)<br />
                destinataire_wilaya&nbsp;: wilaya (facultatif)<br />
                destinataire_commune&nbsp;: commune (facultatif)<br />
                prix_colis&nbsp;: montant à encaisser en DA (obligatoire, 0 accepté)<br />
                description&nbsp;: contenu du colis (facultatif)<br />
                ref_externe&nbsp;: n° de commande de la boutique (facultatif)
              </div>
              <p className="mt-3 text-muted-foreground">
                Chaque commande arrive « en attente » : le commerçant la valide dans son espace
                avant qu'elle devienne un colis. Une clé révoquée est refusée immédiatement.
              </p>
            </div>
          )}
        </div>

        {/* Liste des clés */}
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher par boutique, nom de clé, préfixe..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="text-xs text-muted-foreground">{filteredKeys.length} clé(s)</div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredKeys.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
            <KeyRound className="mx-auto h-12 w-12 text-muted-foreground" />
            <h2 className="mt-3 font-bold">{keys.length === 0 ? "Aucune clé API" : "Aucun résultat"}</h2>
            <p className="text-sm text-muted-foreground">
              {keys.length === 0
                ? "Générez la première clé pour connecter une boutique."
                : "Modifiez votre recherche."}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/30">
                  <tr className="text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    <th className="px-3 py-3">Commerçant</th>
                    <th className="px-3 py-3">Nom de la clé</th>
                    <th className="px-3 py-3">Préfixe</th>
                    <th className="px-3 py-3">État</th>
                    <th className="px-3 py-3">Créée le</th>
                    <th className="px-3 py-3">Dernière utilisation</th>
                    <th className="px-3 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredKeys.map((k) => {
                    const c = clientById.get(k.client_id);
                    return (
                      <tr key={k.id} className="border-t border-border transition-colors hover:bg-muted/30">
                        <td className="px-3 py-3">
                          <div className="font-medium">{c?.nom_boutique || c?.nom || "—"}</div>
                          <div className="text-xs text-muted-foreground">{c?.email}</div>
                        </td>
                        <td className="px-3 py-3 text-muted-foreground">{k.nom || "—"}</td>
                        <td className="px-3 py-3">
                          <code className="rounded bg-muted px-2 py-0.5 font-mono text-xs font-bold">
                            {k.key_prefix}…
                          </code>
                        </td>
                        <td className="px-3 py-3">
                          {k.actif ? (
                            <span className="inline-block rounded-full bg-success/20 px-2 py-0.5 text-xs font-bold text-success">
                              Active
                            </span>
                          ) : (
                            <span className="inline-block rounded-full bg-destructive/20 px-2 py-0.5 text-xs font-bold text-destructive">
                              Révoquée
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-xs text-muted-foreground">
                          {new Date(k.created_at).toLocaleDateString("fr-FR")}
                        </td>
                        <td className="px-3 py-3 text-xs text-muted-foreground">
                          {k.last_used_at
                            ? new Date(k.last_used_at).toLocaleString("fr-FR")
                            : "Jamais"}
                        </td>
                        <td className="px-3 py-3 text-right">
                          {k.actif && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1 text-destructive hover:text-destructive"
                              onClick={() => void handleRevoke(k)}
                            >
                              <Ban className="h-3.5 w-3.5" /> Révoquer
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
      <SiteFooter />
    </div>
  );
}