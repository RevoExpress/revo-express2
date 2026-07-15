import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Loader2, ShieldPlus, Mail, KeyRound, User as UserIcon, Phone, Search,
  Crown, Briefcase, Truck, Headset, UserCog, Ban, CheckCircle2, Users,
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
  createDirCommercialAccount, createCommercialAccount, listCommerciaux,
  setAccountActive,
} from "@/lib/comptes.functions";
import {
  createStaffAccount, createLivreurAccount, createServiceClientAccount,
  listStaff, listLivreurs, listServiceClients,
} from "@/lib/clients.functions";

export const Route = createFileRoute("/_authenticated/comptes")({
  head: () => ({ meta: [{ title: "Comptes — REVO EXPRESS" }] }),
  component: ComptesPage,
});

// Types de comptes créables par le DG
type AccountType =
  | "directeur_commercial" | "admin_operations" | "admin_service_client"
  | "commercial" | "service_client" | "livreur";

const TYPE_TILES: { value: AccountType; label: string; desc: string; Icon: any }[] = [
  { value: "directeur_commercial", label: "Directeur Commercial", desc: "Chef des commerciaux, voit tous les clients", Icon: Crown },
  { value: "admin_operations",     label: "Directeur des Opérations", desc: "Gère colis, livreurs, valide les retours", Icon: Truck },
  { value: "admin_service_client", label: "Admin Service Client", desc: "Chef du service client", Icon: Headset },
  { value: "commercial",           label: "Commercial", desc: "Gère son portefeuille de clients", Icon: Briefcase },
  { value: "service_client",       label: "Agent Service Client", desc: "Gère tous les colis, corrections", Icon: UserCog },
  { value: "livreur",              label: "Livreur", desc: "Voit ses colis affectés", Icon: Truck },
];

const empty = { email: "", password: "", nom: "", telephone: "" };

function ComptesPage() {
  const { role, loading } = useAuth();

  const createDirCom = useServerFn(createDirCommercialAccount);
  const createCom = useServerFn(createCommercialAccount);
  const createStaff = useServerFn(createStaffAccount);
  const createLivreur = useServerFn(createLivreurAccount);
  const createSC = useServerFn(createServiceClientAccount);
  const suspendFn = useServerFn(setAccountActive);
  const listComFn = useServerFn(listCommerciaux);
  const listStaffFn = useServerFn(listStaff);
  const listLivreursFn = useServerFn(listLivreurs);
  const listSCFn = useServerFn(listServiceClients);

  const [type, setType] = useState<AccountType>("directeur_commercial");
  const [form, setForm] = useState(empty);
  const [submitting, setSubmitting] = useState(false);
  const [people, setPeople] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  async function refresh() {
    try {
      const [com, staff, liv, sc] = await Promise.all([
        listComFn(), listStaffFn(), listLivreursFn(), listSCFn(),
      ]);
      const merged = [
        ...(com.commerciaux ?? []).map((p: any) => ({ ...p, _role: "commercial" })),
        ...(staff.staff ?? []).map((p: any) => ({ ...p, _role: p.role })),
        ...(liv.livreurs ?? []).map((p: any) => ({ ...p, _role: "livreur" })),
        ...(sc.agents ?? []).map((p: any) => ({ ...p, _role: "service_client" })),
      ];
      // Dédoublonnage par id
      const byId = new Map(merged.map((p) => [p.id, p]));
      setPeople([...byId.values()]);
    } catch (e: any) { toast.error(e.message); }
  }

  useEffect(() => { if (role === "admin") void refresh(); }, [role]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return people;
    return people.filter((s) =>
      (s.nom ?? "").toLowerCase().includes(q) ||
      (s.email ?? "").toLowerCase().includes(q) ||
      (s.telephone ?? "").toLowerCase().includes(q)
    );
  }, [people, search]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }
  // Seul le DG accède à cette page
  if (role !== "admin") return <Navigate to="/" />;

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        email: form.email.trim().toLowerCase(),
        password: form.password,
        nom: form.nom.trim(),
        telephone: form.telephone.trim(),
      };
      if (type === "directeur_commercial") await createDirCom({ data: payload });
      else if (type === "commercial") await createCom({ data: payload });
      else if (type === "livreur") await createLivreur({ data: payload });
      else if (type === "service_client") await createSC({ data: payload });
      else await createStaff({ data: { ...payload, role: type as any } });

      toast.success("Compte créé avec succès");
      setForm(empty);
      void refresh();
    } catch (e: any) {
      toast.error("Création impossible", { description: e.message });
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleSuspend(person: any) {
    try {
      await suspendFn({ data: { user_id: person.id, actif: !(person.actif ?? true) } });
      toast.success((person.actif ?? true) ? "Compte suspendu" : "Compte réactivé");
      void refresh();
    } catch (e: any) { toast.error(e.message); }
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <ProPageHeader
          icon={ShieldPlus}
          title="Gestion des comptes"
          subtitle="Créez et gérez tous les comptes internes (directeurs, commerciaux, opérations, livreurs)."
        />

        {/* Création */}
        <div className="mb-8 rounded-3xl border border-border bg-card p-6 shadow-card">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
            <UserCog className="h-5 w-5 text-primary" /> Nouveau compte
          </h2>

          {/* Choix du type */}
          <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {TYPE_TILES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setType(t.value)}
                className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition ${
                  type === t.value
                    ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                    : "border-border bg-background hover:bg-muted"
                }`}
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${type === t.value ? "bg-gradient-primary text-white" : "bg-muted text-foreground"}`}>
                  <t.Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{t.label}</p>
                  <p className="text-xs text-muted-foreground">{t.desc}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Formulaire */}
          <form onSubmit={onCreate} className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="nom">Nom complet</Label>
              <div className="mt-1 flex items-center gap-2 rounded-md border border-input px-3">
                <UserIcon className="h-4 w-4 text-muted-foreground" />
                <Input id="nom" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })}
                  required className="border-0 shadow-none focus-visible:ring-0" />
              </div>
            </div>
            <div>
              <Label htmlFor="tel">Téléphone</Label>
              <div className="mt-1 flex items-center gap-2 rounded-md border border-input px-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <Input id="tel" value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                  required className="border-0 shadow-none focus-visible:ring-0" />
              </div>
            </div>
            <div>
              <Label htmlFor="email">E-mail</Label>
              <div className="mt-1 flex items-center gap-2 rounded-md border border-input px-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required className="border-0 shadow-none focus-visible:ring-0" />
              </div>
            </div>
            <div>
              <Label htmlFor="pwd">Mot de passe</Label>
              <div className="mt-1 flex items-center gap-2 rounded-md border border-input px-3">
                <KeyRound className="h-4 w-4 text-muted-foreground" />
                <Input id="pwd" type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required minLength={6} placeholder="min. 6 caractères" className="border-0 shadow-none focus-visible:ring-0" />
              </div>
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={submitting}
                className="bg-gradient-primary font-bold text-white shadow-glow hover:opacity-95">
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Créer le compte
              </Button>
            </div>
          </form>
        </div>

        {/* Liste des comptes */}
        <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <Users className="h-5 w-5 text-primary" /> Comptes existants ({filtered.length})
            </h2>
            <div className="flex items-center gap-2 rounded-md border border-input px-3">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher..." className="border-0 shadow-none focus-visible:ring-0" />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                  <th className="pb-2">Nom</th>
                  <th className="pb-2">Email</th>
                  <th className="pb-2">Téléphone</th>
                  <th className="pb-2">Rôle</th>
                  <th className="pb-2">Statut</th>
                  <th className="pb-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b border-border/50">
                    <td className="py-3 font-medium">{p.nom ?? "—"}</td>
                    <td className="py-3 text-muted-foreground">{p.email ?? "—"}</td>
                    <td className="py-3 text-muted-foreground">{p.telephone ?? "—"}</td>
                    <td className="py-3">
                      <span className="rounded-full bg-muted px-2 py-1 text-xs">{ROLE_SHORT[p._role] ?? p._role}</span>
                    </td>
                    <td className="py-3">
                      {(p.actif ?? true) ? (
                        <span className="inline-flex items-center gap-1 text-xs text-success">
                          <CheckCircle2 className="h-3 w-3" /> Actif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-destructive">
                          <Ban className="h-3 w-3" /> Suspendu
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      <Button size="sm" variant="outline" onClick={() => toggleSuspend(p)}
                        className={(p.actif ?? true) ? "text-destructive" : "text-success"}>
                        {(p.actif ?? true) ? "Suspendre" : "Réactiver"}
                      </Button>
                    </td>
                  </tr>
                ))}
                {!filtered.length && (
                  <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">Aucun compte pour le moment</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

const ROLE_SHORT: Record<string, string> = {
  directeur_commercial: "Dir. Commercial",
  admin_operations: "Dir. Opérations",
  admin_service_client: "Admin SC",
  commercial: "Commercial",
  service_client: "Service Client",
  livreur: "Livreur",
};
