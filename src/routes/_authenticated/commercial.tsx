import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, UserPlus, Store, Phone, MapPin, Mail, KeyRound, Briefcase } from "lucide-react";
import { ProPageHeader } from "@/components/pro-page-header";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { createClientAccount, listClients } from "@/lib/clients.functions";

export const Route = createFileRoute("/_authenticated/commercial")({
  head: () => ({ meta: [{ title: "Espace commercial — REVO EXPRESS" }] }),
  component: CommercialPage,
});

const empty = {
  email: "", password: "", nom: "", nom_boutique: "",
  telephone: "", adresse: "", wilaya: "Alger",
};

function CommercialPage() {
  const { role, loading } = useAuth();
  const createFn = useServerFn(createClientAccount);
  const listFn = useServerFn(listClients);
  const [form, setForm] = useState(empty);
  const [submitting, setSubmitting] = useState(false);
  const [clients, setClients] = useState<any[]>([]);

  async function refresh() {
    try {
      const r = await listFn();
      setClients(r.clients ?? []);
    } catch (e: any) { toast.error(e.message); }
  }

  useEffect(() => {
    if (role === "admin" || role === "admin_commercial" || role === "commercial") void refresh();
  }, [role]);

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (role !== "admin" && role !== "admin_commercial" && role !== "commercial") return <Navigate to="/" />;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createFn({ data: form });
      toast.success(`Compte créé : ${form.nom_boutique}`);
      setForm(empty);
      void refresh();
    } catch (err: any) {
      toast.error(err.message ?? "Création échouée");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <section className="container mx-auto flex-1 px-4 py-10">
        <ProPageHeader
          icon={Briefcase}
          title="Espace commercial"
          subtitle="Créez les comptes clients. Ces infos s'afficheront automatiquement comme « Expéditeur » sur leurs bordereaux."
        />


        <div className="grid gap-6 lg:grid-cols-5">
          <form onSubmit={onSubmit} className="lg:col-span-2 rounded-2xl border border-border bg-card p-6 shadow-card space-y-4">
            <div className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              <h2 className="font-bold">Nouveau client</h2>
            </div>

            <Field icon={Store} label="Nom de la boutique" value={form.nom_boutique} onChange={(v) => setForm({ ...form, nom_boutique: v })} placeholder="Ex: Revo Express Alger" />
            <Field icon={UserPlus} label="Nom du gérant" value={form.nom} onChange={(v) => setForm({ ...form, nom: v })} placeholder="Nom complet" />
            <Field icon={Phone} label="Téléphone" value={form.telephone} onChange={(v) => setForm({ ...form, telephone: v })} type="tel" placeholder="0661234567" />
            <Field icon={MapPin} label="Adresse" value={form.adresse} onChange={(v) => setForm({ ...form, adresse: v })} placeholder="Bab Ezzouar, Alger" />
            <Field icon={MapPin} label="Wilaya" value={form.wilaya} onChange={(v) => setForm({ ...form, wilaya: v })} />
            <div className="my-2 h-px bg-border" />
            <Field icon={Mail} label="Email (login)" value={form.email} onChange={(v) => setForm({ ...form, email: v })} type="email" />
            <Field icon={KeyRound} label="Mot de passe" value={form.password} onChange={(v) => setForm({ ...form, password: v })} type="text" placeholder="Min. 6 caractères" />

            <Button type="submit" disabled={submitting} className="w-full bg-gradient-primary shadow-glow">
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Créer le compte
            </Button>
          </form>

          <div className="lg:col-span-3 overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
            <div className="border-b border-border p-4">
              <h2 className="font-bold">Clients ({clients.length})</h2>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase">
                <tr>
                  <th className="px-3 py-2 text-left">Boutique</th>
                  <th className="px-3 py-2 text-left">Gérant</th>
                  <th className="px-3 py-2 text-left">Tél</th>
                  <th className="px-3 py-2 text-left">Adresse</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {clients.map((c) => (
                  <tr key={c.id} className="hover:bg-accent/40">
                    <td className="px-3 py-2 font-bold">{c.nom_boutique ?? "—"}</td>
                    <td className="px-3 py-2">{c.nom ?? "—"}<br /><span className="text-xs text-muted-foreground">{c.email}</span></td>
                    <td className="px-3 py-2 font-mono text-xs">{c.telephone ?? "—"}</td>
                    <td className="px-3 py-2 text-xs">{c.adresse ?? "—"}<br /><span className="text-muted-foreground">{c.wilaya ?? ""}</span></td>
                  </tr>
                ))}
                {clients.length === 0 && (
                  <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">Aucun client créé</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder, icon: Icon }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; icon?: any;
}) {
  return (
    <div>
      <Label className="flex items-center gap-1.5 text-xs font-semibold">
        {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}{label}
      </Label>
      <Input required type={type} value={value} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)} className="mt-1" />
    </div>
  );
}
