import { createFileRoute, Navigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Truck, Mail, KeyRound, User as UserIcon, Phone, FileText, RadioTower } from "lucide-react";
import { ProPageHeader } from "@/components/pro-page-header";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { createLivreurAccount, listLivreurs } from "@/lib/clients.functions";

export const Route = createFileRoute("/_authenticated/operations")({
  head: () => ({ meta: [{ title: "Opérations — REVO EXPRESS" }] }),
  component: OperationsPage,
});

const empty = { email: "", password: "", nom: "", telephone: "" };

function OperationsPage() {
  const { role, loading } = useAuth();
  const createFn = useServerFn(createLivreurAccount);
  const listFn = useServerFn(listLivreurs);
  const [form, setForm] = useState(empty);
  const [submitting, setSubmitting] = useState(false);
  const [livreurs, setLivreurs] = useState<any[]>([]);

  async function refresh() {
    try { const r = await listFn(); setLivreurs(r.livreurs ?? []); }
    catch (e: any) { toast.error(e.message); }
  }

  useEffect(() => { if (role === "admin" || role === "admin_operations") void refresh(); }, [role]);

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (role !== "admin" && role !== "admin_operations") return <Navigate to="/" />;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createFn({ data: form });
      toast.success(`Livreur créé : ${form.nom}`);
      setForm(empty);
      void refresh();
    } catch (err: any) { toast.error(err.message ?? "Création échouée"); }
    finally { setSubmitting(false); }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <section className="container mx-auto flex-1 px-4 py-10">
        <ProPageHeader
          icon={Truck}
          title="Espace opérations"
          subtitle="Créez et gérez les comptes des livreurs."
          action={
            <Link to="/suivi-livreurs">
              <Button size="lg" className="gap-2 bg-gradient-primary shadow-glow">
                <RadioTower className="h-5 w-5" /> Suivi en direct
              </Button>
            </Link>
          }
        />


        <div className="grid gap-6 lg:grid-cols-5">
          <form onSubmit={onSubmit} className="lg:col-span-2 space-y-4 rounded-2xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              <h2 className="font-bold">Nouveau livreur</h2>
            </div>
            <Field icon={UserIcon} label="Nom complet" value={form.nom} onChange={(v) => setForm({ ...form, nom: v })} />
            <Field icon={Phone} label="Téléphone" value={form.telephone} onChange={(v) => setForm({ ...form, telephone: v })} type="tel" />
            <Field icon={Mail} label="Email (login)" value={form.email} onChange={(v) => setForm({ ...form, email: v })} type="email" />
            <Field icon={KeyRound} label="Mot de passe" value={form.password} onChange={(v) => setForm({ ...form, password: v })} placeholder="Min. 6 caractères" />
            <Button type="submit" disabled={submitting} className="w-full bg-gradient-primary shadow-glow">
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Créer le livreur
            </Button>
          </form>

          <div className="lg:col-span-3 overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
            <div className="border-b border-border p-4"><h2 className="font-bold">Livreurs ({livreurs.length})</h2></div>
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase">
                <tr>
                  <th className="px-3 py-2 text-left">Nom</th>
                  <th className="px-3 py-2 text-left">Email</th>
                  <th className="px-3 py-2 text-left">Tél</th>
                  <th className="px-3 py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {livreurs.map((l) => (
                  <tr key={l.id} className="hover:bg-accent/40">
                    <td className="px-3 py-2 font-bold">{l.nom ?? "—"}</td>
                    <td className="px-3 py-2 text-xs">{l.email ?? "—"}</td>
                    <td className="px-3 py-2 font-mono text-xs">{l.telephone ?? "—"}</td>
                    <td className="px-3 py-2 text-right">
                      <Link to="/feuille-de-route" search={{ livreur: l.id }}>
                        <Button size="sm" variant="outline" className="gap-1.5">
                          <FileText className="h-3.5 w-3.5" /> Feuille
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
                {livreurs.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">Aucun livreur</td></tr>}
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
