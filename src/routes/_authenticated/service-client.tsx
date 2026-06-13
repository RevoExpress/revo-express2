import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Headset, Mail, KeyRound, User as UserIcon, Phone } from "lucide-react";
import { ProPageHeader } from "@/components/pro-page-header";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { createServiceClientAccount, listServiceClients } from "@/lib/clients.functions";

export const Route = createFileRoute("/_authenticated/service-client")({
  head: () => ({ meta: [{ title: "Service client — REVO EXPRESS" }] }),
  component: ServiceClientPage,
});

const empty = { email: "", password: "", nom: "", telephone: "" };

function ServiceClientPage() {
  const { role, loading } = useAuth();
  const createFn = useServerFn(createServiceClientAccount);
  const listFn = useServerFn(listServiceClients);
  const [form, setForm] = useState(empty);
  const [submitting, setSubmitting] = useState(false);
  const [agents, setAgents] = useState<any[]>([]);

  const canManage = role === "admin" || role === "admin_service_client";

  async function refresh() {
    try { const r = await listFn(); setAgents(r.agents ?? []); }
    catch (e: any) { toast.error(e.message); }
  }

  useEffect(() => { if (canManage) void refresh(); }, [canManage]);

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!canManage && role !== "service_client") return <Navigate to="/" />;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createFn({ data: form });
      toast.success(`Agent créé : ${form.nom}`);
      setForm(empty);
      void refresh();
    } catch (err: any) { toast.error(err.message ?? "Création échouée"); }
    finally { setSubmitting(false); }
  }

  // Service client agents only see the dashboard heading, no creation rights
  if (!canManage) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteNav />
        <section className="container mx-auto flex-1 px-4 py-10">
          <ProPageHeader
            icon={Headset}
            title="Espace service client"
            subtitle="Accédez aux colis et aux clients pour les assister."
          />
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground shadow-card">
            Utilisez la barre de recherche du tableau colis pour assister les clients.
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
        <ProPageHeader
          icon={Headset}
          title="Espace service client"
          subtitle="Créez et gérez les agents du service client."
        />

        <div className="grid gap-6 lg:grid-cols-5">
          <form onSubmit={onSubmit} className="lg:col-span-2 space-y-4 rounded-2xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-center gap-2">
              <Headset className="h-5 w-5 text-primary" />
              <h2 className="font-bold">Nouvel agent</h2>
            </div>
            <Field icon={UserIcon} label="Nom complet" value={form.nom} onChange={(v) => setForm({ ...form, nom: v })} />
            <Field icon={Phone} label="Téléphone" value={form.telephone} onChange={(v) => setForm({ ...form, telephone: v })} type="tel" />
            <Field icon={Mail} label="Email (login)" value={form.email} onChange={(v) => setForm({ ...form, email: v })} type="email" />
            <Field icon={KeyRound} label="Mot de passe" value={form.password} onChange={(v) => setForm({ ...form, password: v })} placeholder="Min. 6 caractères" />
            <Button type="submit" disabled={submitting} className="w-full bg-gradient-primary shadow-glow">
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Créer l'agent
            </Button>
          </form>

          <div className="lg:col-span-3 overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
            <div className="border-b border-border p-4"><h2 className="font-bold">Agents service client ({agents.length})</h2></div>
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase">
                <tr>
                  <th className="px-3 py-2 text-left">Nom</th>
                  <th className="px-3 py-2 text-left">Email</th>
                  <th className="px-3 py-2 text-left">Tél</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {agents.map((a) => (
                  <tr key={a.id} className="hover:bg-accent/40">
                    <td className="px-3 py-2 font-bold">{a.nom ?? "—"}</td>
                    <td className="px-3 py-2 text-xs">{a.email ?? "—"}</td>
                    <td className="px-3 py-2 font-mono text-xs">{a.telephone ?? "—"}</td>
                  </tr>
                ))}
                {agents.length === 0 && <tr><td colSpan={3} className="p-8 text-center text-muted-foreground">Aucun agent</td></tr>}
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
