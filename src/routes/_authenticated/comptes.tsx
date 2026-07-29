import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Loader2, ShieldPlus, Mail, KeyRound, User as UserIcon, Phone, Search,
  Crown, Briefcase, Truck, Headset, UserCog, Ban, CheckCircle2, Users, Plus,
} from "lucide-react";
import { ProPageHeader } from "@/components/pro-page-header";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
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
import { useI18n, Ltr } from "@/hooks/use-i18n";

export const Route = createFileRoute("/_authenticated/comptes")({
  head: () => ({ meta: [{ title: "Comptes — REVO EXPRESS" }] }),
  component: ComptesPage,
});

// Types de comptes créables par le DG
type AccountType =
  | "directeur_commercial" | "admin_operations" | "admin_service_client"
  | "commercial" | "service_client" | "livreur";

const TYPE_TILES: { value: AccountType; labelKey: string; descKey: string; Icon: any }[] = [
  { value: "directeur_commercial", labelKey: "cpt.type.dirCom",     descKey: "cpt.type.dirCom.desc",     Icon: Crown },
  { value: "admin_operations",     labelKey: "cpt.type.dirOps",     descKey: "cpt.type.dirOps.desc",     Icon: Truck },
  { value: "admin_service_client", labelKey: "cpt.type.adminSC",    descKey: "cpt.type.adminSC.desc",    Icon: Headset },
  { value: "commercial",           labelKey: "cpt.type.commercial", descKey: "cpt.type.commercial.desc", Icon: Briefcase },
  { value: "service_client",       labelKey: "cpt.type.agentSC",    descKey: "cpt.type.agentSC.desc",    Icon: UserCog },
  { value: "livreur",              labelKey: "cpt.type.livreur",    descKey: "cpt.type.livreur.desc",    Icon: Truck },
];

const empty = { email: "", password: "", nom: "", telephone: "" };

function ComptesPage() {
  const { role, loading } = useAuth();
  const { t, tf } = useI18n();

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
  const [sheetOpen, setSheetOpen] = useState(false);

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

      toast.success(t("cpt.toast.created"));
      setForm(empty);
      setSheetOpen(false);
      void refresh();
    } catch (e: any) {
      toast.error(t("cpt.toast.createFail"), { description: e.message });
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleSuspend(person: any) {
    try {
      await suspendFn({ data: { user_id: person.id, actif: !(person.actif ?? true) } });
      toast.success((person.actif ?? true) ? t("cpt.toast.suspended") : t("cpt.toast.reactivated"));
      void refresh();
    } catch (e: any) { toast.error(e.message); }
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-8">
        <ProPageHeader
          icon={ShieldPlus}
          title={t("cpt.title")}
          subtitle={t("cpt.subtitle")}
          action={
            <Button onClick={() => setSheetOpen(true)} className="gap-2 bg-gradient-primary font-bold text-white shadow-glow hover:opacity-95">
              <Plus className="h-4 w-4" /> {t("cpt.newAccount")}
            </Button>
          }
        />

        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <UserCog className="h-5 w-5 text-primary" /> {t("cpt.newAccount")}
              </SheetTitle>
              <SheetDescription>{t("cpt.subtitle")}</SheetDescription>
            </SheetHeader>

            {/* Choix du type */}
            <div className="mb-6 mt-4 grid gap-3 sm:grid-cols-2">
              {TYPE_TILES.map((tile) => (
                <button
                  key={tile.value}
                  type="button"
                  onClick={() => setType(tile.value)}
                  className={`flex items-start gap-3 rounded-2xl border p-4 text-start transition ${
                    type === tile.value
                      ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                      : "border-border bg-background hover:bg-muted"
                  }`}
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${type === tile.value ? "bg-gradient-primary text-white" : "bg-muted text-foreground"}`}>
                    <tile.Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{t(tile.labelKey as any)}</p>
                    <p className="text-xs text-muted-foreground">{t(tile.descKey as any)}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* Formulaire */}
            <form onSubmit={onCreate} className="grid gap-4">
              <div>
                <Label htmlFor="nom">{t("cpt.field.fullname")}</Label>
                <div className="mt-1 flex items-center gap-2 rounded-md border border-input px-3">
                  <UserIcon className="h-4 w-4 text-muted-foreground" />
                  <Input id="nom" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })}
                    required className="border-0 shadow-none focus-visible:ring-0" />
                </div>
              </div>
              <div>
                <Label htmlFor="tel">{t("cpt.field.phone")}</Label>
                <div className="mt-1 flex items-center gap-2 rounded-md border border-input px-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <Input id="tel" value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                    required className="border-0 shadow-none focus-visible:ring-0" />
                </div>
              </div>
              <div>
                <Label htmlFor="email">{t("cpt.field.email")}</Label>
                <div className="mt-1 flex items-center gap-2 rounded-md border border-input px-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required className="border-0 shadow-none focus-visible:ring-0" />
                </div>
              </div>
              <div>
                <Label htmlFor="pwd">{t("cpt.field.password")}</Label>
                <div className="mt-1 flex items-center gap-2 rounded-md border border-input px-3">
                  <KeyRound className="h-4 w-4 text-muted-foreground" />
                  <Input id="pwd" type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required minLength={6} placeholder={t("cpt.field.password.ph")} className="border-0 shadow-none focus-visible:ring-0" />
                </div>
              </div>
              <Button type="submit" disabled={submitting}
                className="bg-gradient-primary font-bold text-white shadow-glow hover:opacity-95">
                {submitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                {t("cpt.createAccount")}
              </Button>
            </form>
          </SheetContent>
        </Sheet>

        {/* Liste des comptes */}
        <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <Users className="h-5 w-5 text-primary" /> {tf("cpt.existingAccounts", { n: filtered.length })}
            </h2>
            <div className="flex items-center gap-2 rounded-md border border-input px-3">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder={t("cpt.search.ph")} className="border-0 shadow-none focus-visible:ring-0" />
            </div>
          </div>

          <Table className="text-sm">
            <TableHeader>
              <TableRow className="text-xs uppercase text-muted-foreground hover:bg-transparent">
                <TableHead className="pb-2">{t("cpt.th.name")}</TableHead>
                <TableHead className="pb-2">{t("cpt.th.email")}</TableHead>
                <TableHead className="pb-2">{t("cpt.th.phone")}</TableHead>
                <TableHead className="pb-2">{t("cpt.th.role")}</TableHead>
                <TableHead className="pb-2">{t("cpt.th.status")}</TableHead>
                <TableHead className="pb-2 text-end">{t("cpt.th.action")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id} className="border-border/50">
                  <TableCell className="py-3 font-medium">{p.nom ?? "—"}</TableCell>
                  <TableCell className="py-3 text-muted-foreground"><Ltr>{p.email ?? "—"}</Ltr></TableCell>
                  <TableCell className="py-3 text-muted-foreground"><Ltr>{p.telephone ?? "—"}</Ltr></TableCell>
                  <TableCell className="py-3">
                    <span className="rounded-full bg-muted px-2 py-1 text-xs">{t((ROLE_SHORT_KEY[p._role] ?? p._role) as any)}</span>
                  </TableCell>
                  <TableCell className="py-3">
                    {(p.actif ?? true) ? (
                      <span className="inline-flex items-center gap-1 text-xs text-success">
                        <CheckCircle2 className="h-3 w-3" /> {t("cpt.status.active")}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-destructive">
                        <Ban className="h-3 w-3" /> {t("cpt.status.suspended")}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="py-3 text-end">
                    <Button size="sm" variant="outline" onClick={() => toggleSuspend(p)}
                      className={(p.actif ?? true) ? "text-destructive" : "text-success"}>
                      {(p.actif ?? true) ? t("cpt.suspend") : t("cpt.reactivate")}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!filtered.length && (
                <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">{t("cpt.noAccount")}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

const ROLE_SHORT_KEY: Record<string, string> = {
  directeur_commercial: "cpt.role.dirCom",
  admin_operations: "cpt.role.dirOps",
  admin_service_client: "cpt.role.adminSC",
  commercial: "cpt.role.commercial",
  service_client: "cpt.role.serviceClient",
  livreur: "cpt.role.livreur",
};
