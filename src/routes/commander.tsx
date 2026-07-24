import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Printer, Package, ArrowRight, User as UserIcon, Phone, MapPin, Pencil, AlertTriangle, Trash2, Info } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { COMMUNES, haversineKm, priceForDelivery, generateTracking, type DeliveryType } from "@/lib/tarifs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { Bordereau } from "@/components/bordereau";

const searchSchema = z.object({
  colis: z.string().optional(),
});

export const Route = createFileRoute("/commander")({
  validateSearch: searchSchema.parse,
  head: () => ({ meta: [{ title: "Commander une livraison — REVO EXPRESS" }] }),
  component: CommanderPage,
});

const schema = z.object({
  expediteur_nom: z.string().trim().min(2).max(100),
  expediteur_tel: z.string().trim().min(8).max(20),
  expediteur_adresse: z.string().trim().min(3).max(255),
  destinataire_nom: z.string().trim().min(2).max(100),
  destinataire_tel: z.string().trim().min(8).max(20),
  destinataire_adresse: z.string().trim().min(3).max(255),
  destinataire_wilaya: z.string().trim().max(100).optional(),
  destinataire_cp: z.string().trim().max(20).optional(),
  description: z.string().trim().max(500).optional(),
  depart: z.string().min(1, "Commune de départ manquante — complétez votre profil"),
  arrivee: z.string().min(1, "Choisissez une commune d'arrivée"),
  prix_colis: z.coerce.number({ invalid_type_error: "Prix du colis requis" }).min(0, "Le prix du colis est obligatoire (0 accepté)").max(10000000),
});

function normalizeCommune(s: string): string {
  return String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function CommanderPage() {
  const { user, role, loading: authLoading } = useAuth();
  const { t } = useI18n();
  const { colis: editColisId } = Route.useSearch();
  const navigate = useNavigate();

  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [createdColis, setCreatedColis] = useState<any>(null);
  const [typeLivraison, setTypeLivraison] = useState<DeliveryType>("standard");
  const [typeColis, setTypeColis] = useState<"REV" | "SPL" | "ECH">("REV");
  const [produitRetour, setProduitRetour] = useState("");
  const [valeurDeclaree, setValeurDeclaree] = useState("");
  const [profilCharge, setProfilCharge] = useState(false);
  const [carnet, setCarnet] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [form, setForm] = useState({
    expediteur_nom: "", expediteur_tel: "", expediteur_adresse: "",
    destinataire_nom: "", destinataire_tel: "", destinataire_adresse: "",
    destinataire_wilaya: "Alger", destinataire_cp: "",
    description: "", depart: "", arrivee: "", prix_colis: "",
  });

  const [editLoading, setEditLoading] = useState(!!editColisId);
  const [editColis, setEditColis] = useState<any>(null);
  const [editNotFound, setEditNotFound] = useState(false);

  useEffect(() => {
    if (!editColisId || !user) return;
    setEditLoading(true);
    supabase.from("colis").select("*").eq("id", editColisId).maybeSingle()
      .then(({ data }) => {
        if (!data) { setEditNotFound(true); setEditLoading(false); return; }
        setEditColis(data);
        setEditLoading(false);
      });
  }, [editColisId, user]);

  const isOwner = !!editColis && editColis.client_id === user?.id;
  const isStaffDeleteAll = role === "admin" || role === "admin_operations";
  const canEditForm = editColis && ((isOwner && editColis.statut === "en-preparation") || isStaffDeleteAll);
  const canDelete = editColis && ((isOwner && editColis.statut === "en-preparation") || isStaffDeleteAll);

  useEffect(() => {
    if (!canEditForm || !editColis) return;
    // Priorité à destinataire_commune (précise) ; repli sur destinataire_wilaya pour les anciens colis
    const arriveeGuess =
      COMMUNES.find((c) => normalizeCommune(c.name) === normalizeCommune(editColis.destinataire_commune || editColis.destinataire_wilaya || ""))?.name || "";
    setForm((f) => ({
      ...f,
      destinataire_nom: editColis.destinataire_nom || "",
      destinataire_tel: editColis.destinataire_tel || "",
      destinataire_adresse: editColis.destinataire_adresse || "",
      destinataire_wilaya: editColis.destinataire_wilaya || "Alger",
      destinataire_cp: editColis.destinataire_cp || "",
      description: editColis.description || "",
      prix_colis: editColis.prix_colis != null ? String(editColis.prix_colis) : "",
      arrivee: arriveeGuess,
    }));
    setTypeLivraison(editColis.type_livraison === "urgent" ? "urgent" : "standard");
    setTypeColis(editColis.type_colis === "ECH" || editColis.type_colis === "SPL" ? editColis.type_colis : "REV");
    setProduitRetour(editColis.produit_retour || "");
    setValeurDeclaree(editColis.valeur_declaree != null ? String(editColis.valeur_declaree) : "");
  }, [canEditForm, editColis]);

  const prixEstZero = form.prix_colis.trim() !== "" && Number(form.prix_colis) === 0;

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle()
      .then(({ data }) => {
        setProfilCharge(true);
        if (!data) return;
        const d: any = data;
        const communeCompte =
          COMMUNES.find((c) => c.name === String(d.ramassage_commune || "").trim())?.name ||
          COMMUNES.find((c) => c.name === String(d.commune || "").trim())?.name ||
          COMMUNES.find((c) => c.name === String(d.wilaya || "").trim())?.name ||
          "";
        setForm((f) => ({
          ...f,
          expediteur_nom: d.nom_boutique || d.nom || "",
          expediteur_tel: d.telephone || "",
          expediteur_adresse: [d.adresse, communeCompte || d.wilaya].filter(Boolean).join(", "),
          depart: communeCompte,
        }));
      });
  }, [user]);

  // Carnet d'adresses : anciens destinataires du même commerçant, pour autocomplete
  useEffect(() => {
    if (!user) return;
    supabase
      .from("colis")
      .select("destinataire_nom, destinataire_tel, destinataire_adresse, destinataire_wilaya")
      .eq("client_id", user.id)
      .order("date_creation", { ascending: false })
      .limit(200)
      .then(({ data }) => {
        if (!data) return;
        const vus = new Set<string>();
        const uniques = data.filter((d) => {
          const key = d.destinataire_tel;
          if (!key || vus.has(key)) return false;
          vus.add(key);
          return true;
        });
        setCarnet(uniques);
      });
  }, [user]);

  const profilIncomplet =
    profilCharge &&
    (!form.expediteur_nom || !form.expediteur_tel || !form.expediteur_adresse || !form.depart);

  const estimation = useMemo(() => {
    const a = COMMUNES.find((c) => c.name === form.depart);
    const b = COMMUNES.find((c) => c.name === form.arrivee);
    if (!a || !b) return null;
    const km = haversineKm(a, b);
    return { km: Math.max(1, Math.round(km * 10) / 10), prix: priceForDelivery(km, typeLivraison) };
  }, [form.depart, form.arrivee, typeLivraison]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) { toast.error(t("cmd.err.login")); return; }
    if (profilIncomplet) {
      toast.error("Complétez votre profil (adresse et commune) avant de commander");
      return;
    }
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    if (parsed.data.prix_colis === 0 && !valeurDeclaree.trim()) {
      toast.error("Prix à 0 : déclarez la valeur du colis (pour information)");
      return;
    }
    if (!estimation) { toast.error(t("cmd.err.calc")); return; }

    setSubmitting(true);

    const payload = {
      expediteur_nom: parsed.data.expediteur_nom,
      expediteur_tel: parsed.data.expediteur_tel,
      expediteur_adresse: parsed.data.expediteur_adresse,
      destinataire_nom: parsed.data.destinataire_nom,
      destinataire_tel: parsed.data.destinataire_tel,
      destinataire_adresse: parsed.data.destinataire_adresse,
      destinataire_wilaya: parsed.data.destinataire_wilaya,
      destinataire_commune: form.arrivee || null,
      destinataire_cp: parsed.data.destinataire_cp || null,
      description: parsed.data.description,
      depart: parsed.data.depart,
      distance_km: estimation.km,
      prix: estimation.prix,
      prix_colis: parsed.data.prix_colis,
      valeur_declaree: parsed.data.prix_colis === 0 ? Number(valeurDeclaree) || null : null,
      type_livraison: typeLivraison,
      type_colis: typeColis,
      produit_retour: typeColis !== "REV" ? produitRetour.trim() || null : null,
    };

    if (canEditForm && editColis) {
      const { error } = await supabase.from("colis").update(payload).eq("id", editColis.id);
      setSubmitting(false);
      if (error) { toast.error("Échec de la mise à jour", { description: error.message }); return; }
      toast.success(`Colis ${editColis.tracking} mis à jour`);
      navigate({ to: "/mes-colis" });
      return;
    }

    const tracking = generateTracking();
    const { data, error } = await supabase.from("colis").insert({
      tracking,
      client_id: user.id,
      ...payload,
      statut: "en-preparation",
    }).select().single();
    setSubmitting(false);
    if (error) { toast.error(t("cmd.err.create"), { description: error.message }); return; }
    toast.success(`${t("cmd.ok.toast")} : ${tracking}`);
    setCreatedColis(data);
  }

  async function handleDelete() {
    if (!editColis) return;
    const ok = window.confirm(`Supprimer définitivement le colis ${editColis.tracking} ?\n\nCette action est irréversible.`);
    if (!ok) return;
    setDeleting(true);
    const { error } = await supabase.from("colis").delete().eq("id", editColis.id);
    setDeleting(false);
    if (error) { toast.error("Échec de la suppression", { description: error.message }); return; }
    toast.success(`Colis ${editColis.tracking} supprimé`);
    navigate({ to: "/mes-colis" });
  }

  if (authLoading || editLoading) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteNav />
        <div className="flex flex-1 items-center justify-center px-4 py-20">
          <div className="max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-card">
            <Package className="mx-auto h-12 w-12 text-primary" />
            <h1 className="mt-4 text-2xl font-black">{t("cmd.login.title")}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{t("cmd.login.sub")}</p>
            <div className="mt-6 flex gap-2 justify-center">
              <Link to="/login"><Button variant="outline">{t("nav.login")}</Button></Link>
              <Link to="/signup"><Button className="bg-gradient-primary">{t("cmd.signup")}</Button></Link>
            </div>
          </div>
        </div>
        <SiteFooter />
      </div>
    );
  }

  if (editColisId && editNotFound) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteNav />
        <div className="container mx-auto max-w-md px-4 py-20 text-center">
          <Package className="mx-auto h-12 w-12 text-muted-foreground" />
          <h1 className="mt-4 text-xl font-black">Colis introuvable</h1>
          <Link to="/mes-colis" className="mt-4 inline-block"><Button variant="outline">Retour à Mes colis</Button></Link>
        </div>
        <SiteFooter />
      </div>
    );
  }

  if (editColis && !canEditForm) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteNav />
        <div className="container mx-auto max-w-md px-4 py-20 text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-warning" />
          <h1 className="mt-4 text-xl font-black">Modification impossible</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Ce colis n'est plus « En préparation » — il ne peut plus être modifié.
          </p>
          <Link to="/mes-colis" className="mt-4 inline-block"><Button variant="outline">Retour à Mes colis</Button></Link>
        </div>
        <SiteFooter />
      </div>
    );
  }

  if (createdColis) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteNav />
        <div className="container mx-auto max-w-3xl px-4 py-12">
          <div className="no-print mb-6 rounded-xl border border-success/30 bg-success/5 p-4">
            <h2 className="text-lg font-bold text-success">✓ {t("cmd.ok")}</h2>
            <p className="text-sm text-muted-foreground">
              {t("cmd.tracking")} : <strong className="font-mono text-foreground">{createdColis.tracking}</strong>
            </p>
          </div>
          <Bordereau colis={createdColis} />
          <div className="no-print mt-6 flex flex-wrap justify-center gap-3">
            <Button onClick={() => window.print()} className="gap-2 bg-gradient-primary">
              <Printer className="h-4 w-4" /> {t("cmd.print")}
            </Button>
            <Link to="/suivi" search={{ t: createdColis.tracking } as any}>
              <Button variant="outline" className="gap-2">
                {t("cmd.follow")} <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Button variant="ghost" onClick={() => setCreatedColis(null)}>{t("cmd.new")}</Button>
          </div>
        </div>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <section className="border-b border-border bg-secondary/40 py-12">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl font-black md:text-5xl">
            {canEditForm && editColis ? `Modifier ${editColis.tracking}` : t("cmd.title")}
          </h1>
          <p className="mt-2 text-muted-foreground">{t("cmd.sub")}</p>
        </div>
      </section>

      <section className="py-12">
        <form onSubmit={onSubmit} className="container mx-auto grid max-w-5xl gap-6 px-4 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="font-bold">{t("cmd.sender")}</h3>
                <Link to="/profil" className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline">
                  <Pencil className="h-3.5 w-3.5" /> Modifier dans mon profil
                </Link>
              </div>

              {profilIncomplet ? (
                <div className="flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 p-4">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
                  <div className="text-sm">
                    <div className="font-bold">Profil incomplet</div>
                    <p className="mt-0.5 text-muted-foreground">
                      Ces informations figurent sur le bordereau. Renseignez votre adresse et votre
                      commune dans <Link to="/profil" className="font-bold text-primary hover:underline">votre profil</Link> pour
                      pouvoir commander.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid gap-3 rounded-xl border border-border bg-secondary/50 p-4 sm:grid-cols-2">
                  <div className="flex items-center gap-2.5">
                    <UserIcon className="h-4 w-4 shrink-0 text-primary" />
                    <span className="font-semibold">{form.expediteur_nom || "—"}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Phone className="h-4 w-4 shrink-0 text-primary" />
                    <span>{form.expediteur_tel || "—"}</span>
                  </div>
                  <div className="flex items-start gap-2.5 sm:col-span-2">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>
                      {form.expediteur_adresse || "—"}
                      {form.depart && (
                        <span className="ml-2 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                          Départ : {form.depart}
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <Card title={t("cmd.recipient")}>
              <div className="relative">
                <Grid>
                  <div>
                    <Label htmlFor="dn">{t("cmd.fullname")}</Label>
                    <Input
                      id="dn" required value={form.destinataire_nom}
                      onFocus={() => setShowSuggestions(true)}
                      onChange={(e) => { setForm({ ...form, destinataire_nom: e.target.value }); setShowSuggestions(true); }}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="dt">{t("cmd.phone")}</Label>
                    <Input
                      id="dt" type="tel" required value={form.destinataire_tel}
                      onFocus={() => setShowSuggestions(true)}
                      onChange={(e) => { setForm({ ...form, destinataire_tel: e.target.value }); setShowSuggestions(true); }}
                      className="mt-1"
                    />
                  </div>
                </Grid>

                {showSuggestions && form.destinataire_nom.trim().length > 0 && (() => {
                  const q = form.destinataire_nom.trim().toLowerCase();
                  const matches = carnet.filter((d) =>
                    d.destinataire_nom?.toLowerCase().includes(q) || d.destinataire_tel?.includes(q)
                  ).slice(0, 5);
                  if (matches.length === 0) return null;
                  return (
                    <div className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-card shadow-card">
                      <div className="border-b border-border px-3 py-1.5 text-xs font-bold text-muted-foreground">Carnet d'adresses</div>
                      {matches.map((d, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            setForm((f) => ({
                              ...f,
                              destinataire_nom: d.destinataire_nom || "",
                              destinataire_tel: d.destinataire_tel || "",
                              destinataire_adresse: d.destinataire_adresse || "",
                              destinataire_wilaya: d.destinataire_wilaya || f.destinataire_wilaya,
                            }));
                            setShowSuggestions(false);
                          }}
                          className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm hover:bg-muted"
                        >
                          <span className="font-semibold">{d.destinataire_nom}</span>
                          <span className="text-xs text-muted-foreground">{d.destinataire_tel} — {d.destinataire_adresse}</span>
                        </button>
                      ))}
                    </div>
                  );
                })()}
              </div>

              <Field label={t("cmd.address")} id="da" value={form.destinataire_adresse} onChange={(v) => setForm({ ...form, destinataire_adresse: v })} />
              <Grid>
                <Field label={t("cmd.wilaya")} id="dw" value={form.destinataire_wilaya} onChange={(v) => setForm({ ...form, destinataire_wilaya: v })} />
                <Field label={`${t("cmd.zip")} (facultatif)`} id="dc" required={false} value={form.destinataire_cp} onChange={(v) => setForm({ ...form, destinataire_cp: v })} />
              </Grid>
            </Card>

            <Card title={t("cmd.details")}>
              <div>
                <Label>Type d'envoi</Label>
                <div className="mt-1 grid grid-cols-3 gap-2">
                  {([
                    { v: "REV", label: "Normal" },
                    { v: "ECH", label: "Échange" },
                    { v: "SPL", label: "Split" },
                  ] as const).map((o) => (
                    <button
                      key={o.v}
                      type="button"
                      onClick={() => setTypeColis(o.v)}
                      className={`rounded-md border px-3 py-2 text-sm font-medium transition ${
                        typeColis === o.v
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-input bg-background text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
                {typeColis !== "REV" && (
                  <div className="mt-3">
                    <Label htmlFor="produit_retour">
                      {typeColis === "ECH"
                        ? "Produit à RÉCUPÉRER chez le client"
                        : "Produit à RENVOYER au vendeur"}
                    </Label>
                    <Input
                      id="produit_retour"
                      value={produitRetour}
                      onChange={(e) => setProduitRetour(e.target.value)}
                      placeholder={typeColis === "ECH"
                        ? "Ex : Robe rouge taille M (l'ancien article)"
                        : "Ex : 1 paire de chaussures (ce qui n'est pas gardé)"}
                      className="mt-1"
                    />
                  </div>
                )}
              </div>
              <div>
                <Label htmlFor="prix_colis">
                  {t("cmd.price")} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="prix_colis"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  required
                  className="mt-1"
                  placeholder="2500"
                  value={form.prix_colis}
                  onChange={(e) => setForm({ ...form, prix_colis: e.target.value })}
                />
                <div className="mt-1.5 flex items-start gap-1.5 rounded-lg bg-warning/10 px-2.5 py-2 text-xs text-warning">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    <b>N'incluez pas les frais de livraison</b> — uniquement le prix du produit.
                    Les frais sont calculés séparément par Revo. Mettez 0 si le colis est déjà payé.
                  </span>
                </div>
              </div>
              {prixEstZero && (
                <div className="rounded-lg border border-warning/40 bg-warning/5 p-3">
                  <Label htmlFor="valeur_declaree">
                    Valeur déclarée du colis (DA) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="valeur_declaree"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    className="mt-1"
                    placeholder="Ex : 4500"
                    value={valeurDeclaree}
                    onChange={(e) => setValeurDeclaree(e.target.value)}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Pour information uniquement — rien ne sera encaissé pour le colis.
                  </p>
                </div>
              )}
              <div>
                <Label htmlFor="desc">{t("cmd.desc")}</Label>
                <Textarea id="desc" className="mt-1" rows={3} value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder={t("cmd.desc.ph")} />
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card title={t("cmd.trip")}>
              <div>
                <Label>{t("cmd.type")}</Label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {(["standard", "urgent"] as const).map((tp) => {
                    const active = typeLivraison === tp;
                    return (
                      <button
                        key={tp}
                        type="button"
                        onClick={() => setTypeLivraison(tp)}
                        className={`rounded-lg border-2 p-3 text-left transition-colors ${
                          active
                            ? "border-primary bg-primary/10"
                            : "border-border bg-card hover:border-primary/40"
                        }`}
                      >
                        <div className={`text-sm font-bold ${active ? "text-primary" : "text-foreground"}`}>
                          {tp === "standard" ? t("cmd.type.std") : t("cmd.type.urg")}
                        </div>
                        <div className="mt-0.5 text-[11px] leading-tight text-muted-foreground">
                          {tp === "standard" ? t("cmd.type.std.x") : t("cmd.type.urg.x")}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <Label>{t("cmd.from")}</Label>
                <div className="mt-1 flex items-center gap-2 rounded-md border border-border bg-secondary/60 px-3 py-2 text-sm font-semibold">
                  <MapPin className="h-4 w-4 shrink-0 text-primary" />
                  {form.depart || <span className="font-normal text-muted-foreground">Non renseignée — voir votre profil</span>}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Commune de votre compte — modifiable dans votre profil.
                </p>
              </div>

              <div className="mt-3">
                <Label htmlFor="arr">{t("cmd.to")}</Label>
                <select id="arr" required className="mt-1 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                  value={form.arrivee} onChange={(e) => setForm({ ...form, arrivee: e.target.value })}>
                  <option value="">{t("cmd.choose")}</option>
                  {COMMUNES.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
              </div>

              <div className="mt-4 rounded-xl bg-gradient-navy p-4 text-white">
                <div className="text-xs uppercase tracking-wider text-white/60">{t("cmd.est")}</div>
                {estimation ? (
                  <>
                    <div className="mt-1 text-sm text-white/80">{t("cmd.distance")} : <strong>{estimation.km} km</strong></div>
                    <div className="mt-2 text-4xl font-black text-primary">{estimation.prix} <span className="text-base font-medium text-white/70">DA</span></div>
                  </>
                ) : (
                  <div className="mt-2 text-sm text-white/60">
                    {form.depart ? "Choisissez la commune d'arrivée" : "Complétez votre profil (commune de départ)"}
                  </div>
                )}
              </div>

              <Button type="submit" disabled={submitting || !estimation || profilIncomplet} className="mt-4 w-full bg-gradient-primary shadow-glow">
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {canEditForm && editColis ? "Enregistrer les modifications" : t("cmd.submit")}
              </Button>

              {canDelete && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={deleting}
                  onClick={() => void handleDelete()}
                  className="mt-2 w-full gap-2 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Supprimer ce colis
                </Button>
              )}
            </Card>
          </div>
        </form>
      </section>

      <SiteFooter />
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
      <h3 className="mb-4 font-bold">{title}</h3>
      <div className="space-y-4">{children}</div>
    </div>
  );
}
function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 md:grid-cols-2">{children}</div>;
}
function Field({ label, id, value, onChange, type = "text", required = true }: {
  label: string; id: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean;
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} required={required} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1" />
    </div>
  );
}