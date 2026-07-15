import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Loader2, Target, Plus, Phone, Mail, MapPin, Clock, AlertTriangle,
  ChevronRight, Store, X,
} from "lucide-react";
import { ProPageHeader } from "@/components/pro-page-header";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import {
  creerProspect, listProspects, changerEtapeProspect, marquerRelance,
} from "@/lib/prospection.functions";

export const Route = createFileRoute("/_authenticated/prospection")({
  head: () => ({ meta: [{ title: "Prospection — REVO EXPRESS" }] }),
  component: ProspectionPage,
});

// Les colonnes du pipeline
const ETAPES: { key: string; label: string; color: string }[] = [
  { key: "a_contacter",   label: "À contacter",   color: "border-t-muted-foreground" },
  { key: "en_discussion", label: "En discussion", color: "border-t-info" },
  { key: "en_test",       label: "En test",       color: "border-t-warning" },
  { key: "gagne",         label: "Gagné",         color: "border-t-success" },
  { key: "perdu",         label: "Perdu",         color: "border-t-destructive" },
];

type Prospect = {
  id: string; commercial_id: string | null; nom_boutique: string;
  contact_nom: string | null; telephone: string | null; email: string | null;
  wilaya: string | null; commune: string | null; etape: string;
  note: string | null; derniere_relance: string | null; converti_client_id: string | null;
};

function joursDepuis(iso: string | null): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

function ProspectionPage() {
  const { role, loading } = useAuth();
  const listFn = useServerFn(listProspects);
  const createFn = useServerFn(creerProspect);
  const etapeFn = useServerFn(changerEtapeProspect);
  const relanceFn = useServerFn(marquerRelance);

  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nom_boutique: "", contact_nom: "", telephone: "", email: "", wilaya: "", commune: "", note: "" });
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const r = await listFn();
      setProspects(r.prospects as Prospect[]);
    } catch (e: any) { /* pas autorisé */ }
  }
  useEffect(() => { if (role) void load(); }, [role]);

  const allowed = role === "admin" || role === "directeur_commercial" || role === "admin_commercial" || role === "commercial";

  const parEtape = useMemo(() => {
    const m: Record<string, Prospect[]> = {};
    for (const e of ETAPES) m[e.key] = [];
    for (const p of prospects) (m[p.etape] ?? (m[p.etape] = [])).push(p);
    return m;
  }, [prospects]);

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!allowed) return <Navigate to="/" />;

  async function addProspect(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await createFn({ data: {
        nom_boutique: form.nom_boutique.trim(),
        contact_nom: form.contact_nom || undefined,
        telephone: form.telephone || undefined,
        email: form.email || undefined,
        wilaya: form.wilaya || undefined,
        commune: form.commune || undefined,
        note: form.note || undefined,
      }});
      toast.success("Prospect ajouté");
      setForm({ nom_boutique: "", contact_nom: "", telephone: "", email: "", wilaya: "", commune: "", note: "" });
      setShowForm(false);
      await load();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  async function avancer(p: Prospect, etape: string) {
    try { await etapeFn({ data: { id: p.id, etape: etape as any } }); await load(); }
    catch (e: any) { toast.error(e.message); }
  }

  async function relancer(p: Prospect) {
    try { await relanceFn({ data: { id: p.id } }); toast.success("Relance enregistrée"); await load(); }
    catch (e: any) { toast.error(e.message); }
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <ProPageHeader
          icon={Target}
          title="Prospection"
          subtitle="Suivez vos prospects du premier contact jusqu'à la signature."
          action={
            <Button onClick={() => setShowForm(true)} className="bg-gradient-primary text-white hover:opacity-95">
              <Plus className="mr-1 h-4 w-4" /> Nouveau prospect
            </Button>
          }
        />

        {/* Formulaire d'ajout (modale simple) */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowForm(false)}>
            <div className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold">Nouveau prospect</h2>
                <button onClick={() => setShowForm(false)}><X className="h-5 w-5 text-muted-foreground" /></button>
              </div>
              <form onSubmit={addProspect} className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label>Nom de la boutique *</Label>
                  <Input value={form.nom_boutique} onChange={(e) => setForm({ ...form, nom_boutique: e.target.value })} required className="mt-1" />
                </div>
                <div><Label>Contact</Label><Input value={form.contact_nom} onChange={(e) => setForm({ ...form, contact_nom: e.target.value })} className="mt-1" /></div>
                <div><Label>Téléphone</Label><Input value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} className="mt-1" /></div>
                <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1" /></div>
                <div><Label>Wilaya</Label><Input value={form.wilaya} onChange={(e) => setForm({ ...form, wilaya: e.target.value })} className="mt-1" /></div>
                <div className="sm:col-span-2"><Label>Note</Label><Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="mt-1" /></div>
                <div className="sm:col-span-2">
                  <Button type="submit" disabled={saving} className="w-full bg-gradient-primary text-white">
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Ajouter
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Pipeline en colonnes */}
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
          {ETAPES.map((etape) => (
            <div key={etape.key} className={`rounded-2xl border border-t-4 ${etape.color} border-border bg-card p-3`}>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold">{etape.label}</h3>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{parEtape[etape.key]?.length ?? 0}</span>
              </div>
              <div className="space-y-2">
                {(parEtape[etape.key] ?? []).map((p) => {
                  const jours = joursDepuis(p.derniere_relance);
                  const enRetard = jours !== null && jours >= 5 && etape.key !== "gagne" && etape.key !== "perdu";
                  const etapeIdx = ETAPES.findIndex((e) => e.key === etape.key);
                  const next = ETAPES[etapeIdx + 1];
                  return (
                    <div key={p.id} className={`rounded-xl border bg-background p-3 ${enRetard ? "border-destructive/50" : "border-border/60"}`}>
                      <div className="flex items-center gap-1.5">
                        <Store className="h-3.5 w-3.5 text-primary" />
                        <span className="text-sm font-semibold">{p.nom_boutique}</span>
                      </div>
                      {p.contact_nom && <div className="mt-1 text-xs text-muted-foreground">{p.contact_nom}</div>}
                      <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                        {p.telephone && <div className="flex items-center gap-1"><Phone className="h-3 w-3" />{p.telephone}</div>}
                        {p.wilaya && <div className="flex items-center gap-1"><MapPin className="h-3 w-3" />{p.wilaya}</div>}
                      </div>
                      {enRetard && (
                        <div className="mt-1 flex items-center gap-1 text-xs text-destructive">
                          <AlertTriangle className="h-3 w-3" /> Pas de relance depuis {jours}j
                        </div>
                      )}
                      <div className="mt-2 flex flex-wrap gap-1">
                        <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => relancer(p)}>
                          <Clock className="mr-1 h-3 w-3" /> Relancé
                        </Button>
                        {next && (
                          <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => avancer(p, next.key)}>
                            {next.label} <ChevronRight className="ml-0.5 h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {!(parEtape[etape.key] ?? []).length && (
                  <p className="py-3 text-center text-xs text-muted-foreground">—</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
