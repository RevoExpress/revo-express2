import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Printer, Package, ArrowRight } from "lucide-react";
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

export const Route = createFileRoute("/commander")({
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
  depart: z.string().min(1, "Choisissez une commune de départ"),
  arrivee: z.string().min(1, "Choisissez une commune d'arrivée"),
  prix_colis: z.coerce.number({ invalid_type_error: "Prix du colis requis" }).min(1, "Le prix du colis est obligatoire").max(10000000),
});

function CommanderPage() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useI18n();
  const [submitting, setSubmitting] = useState(false);
  const [createdColis, setCreatedColis] = useState<any>(null);
  const [typeLivraison, setTypeLivraison] = useState<DeliveryType>("standard");
  const [form, setForm] = useState({
    expediteur_nom: "", expediteur_tel: "", expediteur_adresse: "",
    destinataire_nom: "", destinataire_tel: "", destinataire_adresse: "",
    destinataire_wilaya: "Alger", destinataire_cp: "",
    description: "", depart: "", arrivee: "", prix_colis: "",
  });

  // pre-fill expéditeur from profile (nom boutique, tel, adresse créés par le commercial)
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("nom, nom_boutique, telephone, adresse, wilaya").eq("id", user.id).maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setForm((f) => ({
          ...f,
          expediteur_nom: f.expediteur_nom || data.nom_boutique || data.nom || "",
          expediteur_tel: f.expediteur_tel || data.telephone || "",
          expediteur_adresse: f.expediteur_adresse || [data.adresse, data.wilaya].filter(Boolean).join(", "),
        }));
      });
  }, [user]);

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
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    if (!estimation) { toast.error(t("cmd.err.calc")); return; }

    setSubmitting(true);
    const tracking = generateTracking();
    const { data, error } = await supabase.from("colis").insert({
      tracking,
      client_id: user.id,
      expediteur_nom: parsed.data.expediteur_nom,
      expediteur_tel: parsed.data.expediteur_tel,
      expediteur_adresse: parsed.data.expediteur_adresse,
      destinataire_nom: parsed.data.destinataire_nom,
      destinataire_tel: parsed.data.destinataire_tel,
      destinataire_adresse: parsed.data.destinataire_adresse,
      destinataire_wilaya: parsed.data.destinataire_wilaya,
      destinataire_cp: parsed.data.destinataire_cp,
      description: parsed.data.description,
      depart: parsed.data.depart,
      distance_km: estimation.km,
      prix: estimation.prix,
      prix_colis: parsed.data.prix_colis,
      type_livraison: typeLivraison,
      statut: "en-attente",
    }).select().single();
    setSubmitting(false);
    if (error) { toast.error(t("cmd.err.create"), { description: error.message }); return; }
    toast.success(`${t("cmd.ok.toast")} : ${tracking}`);
    setCreatedColis(data);
  }

  if (authLoading) {
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
            <p className="mt-2 text-sm text-muted-foreground">
              {t("cmd.login.sub")}
            </p>
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
      <section className="bg-gradient-hero py-12 text-white">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl font-black md:text-5xl">{t("cmd.title")}</h1>
          <p className="mt-2 text-white/80">{t("cmd.sub")}</p>
        </div>
      </section>

      <section className="py-12">
        <form onSubmit={onSubmit} className="container mx-auto grid max-w-5xl gap-6 px-4 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card title={t("cmd.sender")}>
              <Grid>
                <Field label={t("cmd.fullname")} id="en" value={form.expediteur_nom} onChange={(v) => setForm({ ...form, expediteur_nom: v })} />
                <Field label={t("cmd.phone")} id="et" type="tel" value={form.expediteur_tel} onChange={(v) => setForm({ ...form, expediteur_tel: v })} />
              </Grid>
              <Field label={t("cmd.address")} id="ea" value={form.expediteur_adresse} onChange={(v) => setForm({ ...form, expediteur_adresse: v })} />
            </Card>

            <Card title={t("cmd.recipient")}>
              <Grid>
                <Field label={t("cmd.fullname")} id="dn" value={form.destinataire_nom} onChange={(v) => setForm({ ...form, destinataire_nom: v })} />
                <Field label={t("cmd.phone")} id="dt" type="tel" value={form.destinataire_tel} onChange={(v) => setForm({ ...form, destinataire_tel: v })} />
              </Grid>
              <Field label={t("cmd.address")} id="da" value={form.destinataire_adresse} onChange={(v) => setForm({ ...form, destinataire_adresse: v })} />
              <Grid>
                <Field label={t("cmd.wilaya")} id="dw" value={form.destinataire_wilaya} onChange={(v) => setForm({ ...form, destinataire_wilaya: v })} />
                <Field label={t("cmd.zip")} id="dc" value={form.destinataire_cp} onChange={(v) => setForm({ ...form, destinataire_cp: v })} />
              </Grid>
            </Card>

            <Card title={t("cmd.details")}>
              <div>
                <Label htmlFor="prix_colis">
                  {t("cmd.price")} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="prix_colis"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  required
                  className="mt-1"
                  placeholder="2500"
                  value={form.prix_colis}
                  onChange={(e) => setForm({ ...form, prix_colis: e.target.value })}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("cmd.price.hint")}
                </p>
              </div>
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
                <Label htmlFor="dep">{t("cmd.from")}</Label>
                <select id="dep" required className="mt-1 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                  value={form.depart} onChange={(e) => setForm({ ...form, depart: e.target.value })}>
                  <option value="">{t("cmd.choose")}</option>
                  {COMMUNES.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
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
                  <div className="mt-2 text-sm text-white/60">{t("cmd.choose.both")}</div>
                )}
              </div>

              <Button type="submit" disabled={submitting || !estimation} className="mt-4 w-full bg-gradient-primary shadow-glow">
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("cmd.submit")}
              </Button>
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
function Field({ label, id, value, onChange, type = "text" }: {
  label: string; id: string; value: string; onChange: (v: string) => void; type?: string;
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} required value={value} onChange={(e) => onChange(e.target.value)} className="mt-1" />
    </div>
  );
}
