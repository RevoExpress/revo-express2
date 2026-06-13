import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Loader2, ShieldPlus, Mail, KeyRound, User as UserIcon, Phone,
  Search, Trash2, RotateCcw, Briefcase, Truck, Headset,
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
  createStaffAccount, listStaff, deleteUserAccount, resetUserPassword,
} from "@/lib/clients.functions";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/equipe")({
  head: () => ({ meta: [{ title: "Équipe — REVO EXPRESS" }] }),
  component: EquipePage,
});

type StaffRole = "admin_commercial" | "admin_operations" | "admin_service_client";
const empty = { email: "", password: "", nom: "", telephone: "", role: "admin_commercial" as StaffRole };

const ROLE_LABEL: Record<string, string> = {
  admin_commercial: "Admin commercial",
  admin_operations: "Admin opérations",
  admin_service_client: "Admin service client",
  commercial: "Commercial",
  service_client: "Service client",
};

const ROLE_TILES: { value: StaffRole; label: string; desc: string; Icon: any }[] = [
  { value: "admin_commercial",     label: "Admin commercial",     desc: "Crée les comptes clients & commerciaux", Icon: Briefcase },
  { value: "admin_operations",     label: "Admin opérations",     desc: "Crée les comptes livreurs",              Icon: Truck },
  { value: "admin_service_client", label: "Admin service client", desc: "Crée les agents service client",         Icon: Headset },
];

function EquipePage() {
  const { role, user, loading } = useAuth();
  const createFn = useServerFn(createStaffAccount);
  const listFn = useServerFn(listStaff);
  const deleteFn = useServerFn(deleteUserAccount);
  const resetFn = useServerFn(resetUserPassword);

  const [form, setForm] = useState(empty);
  const [submitting, setSubmitting] = useState(false);
  const [staff, setStaff] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [toDelete, setToDelete] = useState<any | null>(null);
  const [toReset, setToReset] = useState<any | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  async function refresh() {
    try { const r = await listFn(); setStaff(r.staff ?? []); }
    catch (e: any) { toast.error(e.message); }
  }

  useEffect(() => { if (role === "admin") void refresh(); }, [role]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return staff;
    return staff.filter((s) =>
      (s.nom ?? "").toLowerCase().includes(q) ||
      (s.email ?? "").toLowerCase().includes(q) ||
      (s.telephone ?? "").toLowerCase().includes(q) ||
      (ROLE_LABEL[s.role] ?? s.role ?? "").toLowerCase().includes(q)
    );
  }, [staff, search]);

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (role !== "admin") return <Navigate to="/" />;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createFn({ data: form });
      toast.success(`Compte créé : ${form.nom}`);
      setForm(empty);
      void refresh();
    } catch (err: any) { toast.error(err.message ?? "Création échouée"); }
    finally { setSubmitting(false); }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setActionLoading(true);
    try {
      await deleteFn({ data: { user_id: toDelete.id } });
      toast.success(`Compte supprimé : ${toDelete.nom ?? toDelete.email}`);
      setToDelete(null);
      void refresh();
    } catch (e: any) { toast.error(e.message); }
    finally { setActionLoading(false); }
  }

  async function confirmReset() {
    if (!toReset || newPassword.length < 6) {
      toast.error("Mot de passe : 6 caractères minimum");
      return;
    }
    setActionLoading(true);
    try {
      await resetFn({ data: { user_id: toReset.id, password: newPassword } });
      toast.success(`Mot de passe modifié pour ${toReset.nom ?? toReset.email}`);
      setToReset(null); setNewPassword("");
    } catch (e: any) { toast.error(e.message); }
    finally { setActionLoading(false); }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <section className="container mx-auto flex-1 px-4 py-10">
        <ProPageHeader
          icon={ShieldPlus}
          title="Équipe interne"
          subtitle="Créez des sous-administrateurs. Ils pourront à leur tour ajouter clients, livreurs ou agents."
        />

        <div className="grid gap-6 lg:grid-cols-5">
          <form onSubmit={onSubmit} className="lg:col-span-2 space-y-4 rounded-2xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-center gap-2">
              <ShieldPlus className="h-5 w-5 text-primary" />
              <h2 className="font-bold">Nouveau sous-admin</h2>
            </div>

            <div>
              <Label className="text-xs font-semibold">Type de rôle</Label>
              <div className="mt-2 grid grid-cols-1 gap-2">
                {ROLE_TILES.map(({ value, label, desc, Icon }) => {
                  const active = form.role === value;
                  return (
                    <button key={value} type="button" onClick={() => setForm({ ...form, role: value })}
                      className={`flex items-start gap-3 rounded-lg border-2 p-3 text-left transition-colors ${active ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/40"}`}>
                      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${active ? "text-primary" : "text-muted-foreground"}`} />
                      <div>
                        <div className={`text-sm font-bold ${active ? "text-primary" : "text-foreground"}`}>{label}</div>
                        <div className="mt-0.5 text-[11px] leading-tight text-muted-foreground">{desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <Field icon={UserIcon} label="Nom complet" value={form.nom} onChange={(v) => setForm({ ...form, nom: v })} />
            <Field icon={Phone} label="Téléphone" value={form.telephone} onChange={(v) => setForm({ ...form, telephone: v })} type="tel" />
            <Field icon={Mail} label="Email (login)" value={form.email} onChange={(v) => setForm({ ...form, email: v })} type="email" />
            <Field icon={KeyRound} label="Mot de passe" value={form.password} onChange={(v) => setForm({ ...form, password: v })} placeholder="Min. 6 caractères" />

            <Button type="submit" disabled={submitting} className="w-full bg-gradient-primary shadow-glow">
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Créer le sous-admin
            </Button>
          </form>

          <div className="lg:col-span-3 overflow-hidden rounded-2xl border border-border bg-card shadow-card">
            <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="font-bold">Équipe ({filtered.length}{filtered.length !== staff.length ? `/${staff.length}` : ""})</h2>
              <div className="relative w-full sm:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher nom, email, rôle…" className="pl-9" />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase">
                  <tr>
                    <th className="px-3 py-2 text-left">Nom</th>
                    <th className="px-3 py-2 text-left">Rôle</th>
                    <th className="px-3 py-2 text-left">Email</th>
                    <th className="px-3 py-2 text-left">Tél</th>
                    <th className="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((s) => (
                    <tr key={`${s.id}-${s.role}`} className="hover:bg-accent/40">
                      <td className="px-3 py-2 font-bold">{s.nom ?? "—"}</td>
                      <td className="px-3 py-2"><span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">{ROLE_LABEL[s.role] ?? s.role}</span></td>
                      <td className="px-3 py-2 text-xs">{s.email ?? "—"}</td>
                      <td className="px-3 py-2 font-mono text-xs">{s.telephone ?? "—"}</td>
                      <td className="px-3 py-2">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" title="Changer le mot de passe"
                            onClick={() => { setToReset(s); setNewPassword(""); }}>
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" title="Supprimer"
                            disabled={s.id === user?.id}
                            onClick={() => setToDelete(s)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">
                      {staff.length === 0 ? "Aucun sous-admin" : "Aucun résultat pour cette recherche"}
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
      <SiteFooter />

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce compte ?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{toDelete?.nom ?? toDelete?.email}</strong> sera définitivement supprimé. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Annuler</AlertDialogCancel>
            <AlertDialogAction disabled={actionLoading} onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!toReset} onOpenChange={(o) => { if (!o) { setToReset(null); setNewPassword(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau mot de passe</DialogTitle>
            <DialogDescription>
              Définir un nouveau mot de passe pour <strong>{toReset?.nom ?? toReset?.email}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Mot de passe</Label>
            <Input type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min. 6 caractères" autoFocus />
          </div>
          <DialogFooter>
            <Button variant="ghost" disabled={actionLoading} onClick={() => { setToReset(null); setNewPassword(""); }}>Annuler</Button>
            <Button disabled={actionLoading || newPassword.length < 6} onClick={confirmReset}
              className="bg-gradient-primary shadow-glow">
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
