import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  DndContext, useDraggable, useDroppable, PointerSensor, TouchSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  Loader2, Target, Plus, Phone, Mail, MapPin, Clock, AlertTriangle,
  Store, X, GripVertical, UserCheck, Ban,
} from "lucide-react";
import { ProPageHeader } from "@/components/pro-page-header";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { confirmAction } from "@/components/confirm-dialog";
import {
  creerProspect, listProspects, changerEtapeProspect, marquerRelance, convertirProspectEnClient,
} from "@/lib/prospection.functions";

export const Route = createFileRoute("/_authenticated/prospection")({
  head: () => ({ meta: [{ title: "Prospection — REVO EXPRESS" }] }),
  component: ProspectionPage,
});

// Pipeline aligné sur le brief produit : Prospect -> Premier contact -> Négociation ->
// Devis envoyé -> En attente -> Contrat signé -> Client actif, + Perdu hors flux principal.
const ETAPES: { key: string; label: string; color: string }[] = [
  { key: "prospect",       label: "Prospect",        color: "border-t-muted-foreground" },
  { key: "premier_contact",label: "Premier contact",  color: "border-t-info" },
  { key: "negociation",    label: "Négociation",      color: "border-t-info" },
  { key: "devis_envoye",   label: "Devis envoyé",     color: "border-t-warning" },
  { key: "en_attente",     label: "En attente",       color: "border-t-warning" },
  { key: "contrat_signe",  label: "Contrat signé",    color: "border-t-success" },
  { key: "client_actif",   label: "Client actif",     color: "border-t-success" },
  { key: "perdu",          label: "Perdu",            color: "border-t-destructive" },
];
const ETAPES_TERMINALES = new Set(["client_actif", "perdu"]);

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

function ProspectCard({ p, onRelancer, onConvertir }: { p: Prospect; onRelancer: (p: Prospect) => void; onConvertir: (p: Prospect) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: p.id });
  const jours = joursDepuis(p.derniere_relance);
  const enRetard = jours !== null && jours >= 5 && !ETAPES_TERMINALES.has(p.etape);
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-xl border bg-background p-3 shadow-sm transition-shadow ${isDragging ? "z-50 opacity-90 shadow-lg" : ""} ${enRetard ? "border-destructive/50" : "border-border/60"}`}
    >
      <div className="flex items-start gap-1.5">
        <button
          {...attributes} {...listeners}
          className="mt-0.5 cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
          title="Glisser pour changer d'étape"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Store className="h-3.5 w-3.5 shrink-0 text-primary" />
            <span className="truncate text-sm font-semibold">{p.nom_boutique}</span>
          </div>
          {p.contact_nom && <div className="mt-0.5 text-xs text-muted-foreground">{p.contact_nom}</div>}
          <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
            {p.telephone && (
              <a href={`tel:${p.telephone}`} onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 hover:text-primary">
                <Phone className="h-3 w-3" />{p.telephone}
              </a>
            )}
            {p.wilaya && <div className="flex items-center gap-1"><MapPin className="h-3 w-3" />{p.wilaya}</div>}
          </div>
          {p.note && <p className="mt-1.5 line-clamp-2 rounded-lg bg-muted/50 px-2 py-1 text-xs text-muted-foreground">{p.note}</p>}
          {enRetard && (
            <div className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-destructive">
              <AlertTriangle className="h-3 w-3" /> Pas de relance depuis {jours}j
            </div>
          )}
          <div className="mt-2 flex flex-wrap gap-1">
            {!ETAPES_TERMINALES.has(p.etape) && (
              <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => onRelancer(p)}>
                <Clock className="mr-1 h-3 w-3" /> Relancé
              </Button>
            )}
            {(p.etape === "contrat_signe" || p.etape === "client_actif") && !p.converti_client_id && (
              <Button size="sm" className="h-7 gap-1 bg-gradient-primary px-2 text-xs" onClick={() => onConvertir(p)}>
                <UserCheck className="h-3 w-3" /> Convertir en client
              </Button>
            )}
            {p.converti_client_id && (
              <span className="inline-flex h-7 items-center gap-1 rounded-md bg-success/10 px-2 text-xs font-bold text-success">
                <UserCheck className="h-3 w-3" /> Compte créé
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Colonne({ etape, prospects, onRelancer, onConvertir }: {
  etape: { key: string; label: string; color: string };
  prospects: Prospect[];
  onRelancer: (p: Prospect) => void;
  onConvertir: (p: Prospect) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: etape.key });
  return (
    <div
      ref={setNodeRef}
      className={`min-w-[260px] flex-1 rounded-2xl border border-t-4 ${etape.color} border-border bg-card p-3 transition-colors ${isOver ? "bg-primary/5 ring-2 ring-primary/30" : ""}`}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold">{etape.label}</h3>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{prospects.length}</span>
      </div>
      <div className="min-h-[60px] space-y-2">
        {prospects.map((p) => (
          <ProspectCard key={p.id} p={p} onRelancer={onRelancer} onConvertir={onConvertir} />
        ))}
        {prospects.length === 0 && <p className="py-3 text-center text-xs text-muted-foreground">—</p>}
      </div>
    </div>
  );
}

function ProspectionPage() {
  const { role, loading } = useAuth();
  const listFn = useServerFn(listProspects);
  const createFn = useServerFn(creerProspect);
  const etapeFn = useServerFn(changerEtapeProspect);
  const relanceFn = useServerFn(marquerRelance);
  const convertirFn = useServerFn(convertirProspectEnClient);

  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nom_boutique: "", contact_nom: "", telephone: "", email: "", wilaya: "", commune: "", note: "" });
  const [saving, setSaving] = useState(false);
  const [convertingProspect, setConvertingProspect] = useState<Prospect | null>(null);
  const [convertForm, setConvertForm] = useState({ email: "", password: "", nom: "", telephone: "", adresse: "", wilaya: "Alger" });
  const [converting, setConverting] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
  );

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
    // Optimiste : on déplace la carte tout de suite, on resynchronise si le serveur refuse.
    setProspects((prev) => prev.map((x) => (x.id === p.id ? { ...x, etape } : x)));
    try { await etapeFn({ data: { id: p.id, etape: etape as any } }); }
    catch (e: any) { toast.error(e.message); await load(); }
  }

  async function relancer(p: Prospect) {
    try { await relanceFn({ data: { id: p.id } }); toast.success("Relance enregistrée"); await load(); }
    catch (e: any) { toast.error(e.message); }
  }

  function openConvertir(p: Prospect) {
    setConvertingProspect(p);
    setConvertForm({ email: p.email || "", password: "", nom: p.contact_nom || p.nom_boutique, telephone: p.telephone || "", adresse: "", wilaya: p.wilaya || "Alger" });
  }

  async function handleConvertir(e: React.FormEvent) {
    e.preventDefault();
    if (!convertingProspect) return;
    const ok = await confirmAction({
      title: `Créer le compte client de ${convertingProspect.nom_boutique} ?`,
      description: "Un compte de connexion sera créé immédiatement avec ces identifiants.",
      confirmLabel: "Créer le compte",
    });
    if (!ok) return;
    setConverting(true);
    try {
      await convertirFn({ data: { prospect_id: convertingProspect.id, ...convertForm } });
      toast.success(`Compte client créé pour ${convertingProspect.nom_boutique}`);
      setConvertingProspect(null);
      await load();
    } catch (e: any) { toast.error(e.message); }
    finally { setConverting(false); }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const p = prospects.find((x) => x.id === active.id);
    if (!p || p.etape === over.id) return;
    void avancer(p, String(over.id));
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main className="mx-auto max-w-[1600px] px-4 pb-24 pt-8">
        <ProPageHeader
          icon={Target}
          title="Prospection"
          subtitle="Suivez vos prospects du premier contact jusqu'à la signature — glissez les cartes entre les colonnes."
          action={
            <Button onClick={() => setShowForm(true)} className="bg-gradient-primary text-white hover:opacity-95">
              <Plus className="mr-1 h-4 w-4" /> Nouveau prospect
            </Button>
          }
        />

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

        {convertingProspect && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setConvertingProspect(null)}>
            <div className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-lg font-bold"><UserCheck className="h-5 w-5 text-primary" /> Créer le compte client</h2>
                <button onClick={() => setConvertingProspect(null)}><X className="h-5 w-5 text-muted-foreground" /></button>
              </div>
              <p className="mb-3 text-sm text-muted-foreground">{convertingProspect.nom_boutique} — les identifiants créés serviront à sa connexion à Revo Express.</p>
              <form onSubmit={handleConvertir} className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2"><Label>Nom complet *</Label><Input value={convertForm.nom} onChange={(e) => setConvertForm({ ...convertForm, nom: e.target.value })} required className="mt-1" /></div>
                <div className="sm:col-span-2"><Label>Email de connexion *</Label><Input type="email" value={convertForm.email} onChange={(e) => setConvertForm({ ...convertForm, email: e.target.value })} required className="mt-1" /></div>
                <div className="sm:col-span-2"><Label>Mot de passe *</Label><Input type="text" value={convertForm.password} onChange={(e) => setConvertForm({ ...convertForm, password: e.target.value })} required minLength={6} className="mt-1" placeholder="Min. 6 caractères" /></div>
                <div><Label>Téléphone *</Label><Input value={convertForm.telephone} onChange={(e) => setConvertForm({ ...convertForm, telephone: e.target.value })} required className="mt-1" /></div>
                <div><Label>Wilaya *</Label><Input value={convertForm.wilaya} onChange={(e) => setConvertForm({ ...convertForm, wilaya: e.target.value })} required className="mt-1" /></div>
                <div className="sm:col-span-2"><Label>Adresse *</Label><Input value={convertForm.adresse} onChange={(e) => setConvertForm({ ...convertForm, adresse: e.target.value })} required className="mt-1" /></div>
                <div className="sm:col-span-2">
                  <Button type="submit" disabled={converting} className="w-full gap-2 bg-gradient-primary text-white">
                    {converting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />} Créer le compte
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="flex gap-3 overflow-x-auto pb-4">
            {ETAPES.map((etape) => (
              <Colonne key={etape.key} etape={etape} prospects={parEtape[etape.key] ?? []} onRelancer={relancer} onConvertir={openConvertir} />
            ))}
          </div>
        </DndContext>
      </main>
      <SiteFooter />
    </div>
  );
}
