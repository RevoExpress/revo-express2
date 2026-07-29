import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Headset, Mail, KeyRound, User as UserIcon, Phone, Users } from "lucide-react";
import { ProPageHeader } from "@/components/pro-page-header";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { supabase } from "@/integrations/supabase/client";
import { createServiceClientAccount, listServiceClients } from "@/lib/clients.functions";
import { useI18n, Ltr } from "@/hooks/use-i18n";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { ColisBoard } from "@/components/colis-board";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { NewBadge } from "@/components/new-badge";

export const Route = createFileRoute("/_authenticated/service-client")({
  head: () => ({ meta: [{ title: "Service client — REVO EXPRESS" }] }),
  component: ServiceClientPage,
});

const empty = { email: "", password: "", nom: "", telephone: "" };

function ServiceClientPage() {
  const { role, loading } = useAuth();
  const { t, tf } = useI18n();
  const createFn = useServerFn(createServiceClientAccount);
  const listFn = useServerFn(listServiceClients);
  const [form, setForm] = useState(empty);
  const [submitting, setSubmitting] = useState(false);
  const [agents, setAgents] = useState<any[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);

  const [colis, setColis] = useState<any[]>([]);
  const [colisLoading, setColisLoading] = useState(true);
  const [notesCount, setNotesCount] = useState<Record<string, number>>({});

  const canManage = role === "admin" || role === "admin_service_client";

  async function refreshAgents() {
    try { const r = await listFn(); setAgents(r.agents ?? []); }
    catch (e: any) { toast.error(e.message); }
  }

  useEffect(() => { if (canManage) void refreshAgents(); }, [canManage]);

  // Le service client — agent comme manager — a pour cœur de métier de voir tous les colis ;
  // la gestion d'équipe (créer/lister des agents) est une tâche annexe du manager, pas un
  // remplacement de cette vue. Avant ce correctif, un compte admin_service_client ne voyait
  // QUE la gestion d'agents et jamais un seul colis.
  useEffect(() => {
    const refresh = () =>
      supabase.from("colis").select("*").order("date_creation", { ascending: false }).limit(500)
        .then(({ data }) => { setColis(data || []); setColisLoading(false); });
    void refresh();
    supabase.from("colis_commentaires").select("colis_id").then(({ data, error }) => {
      if (error || !data) return;
      const m: Record<string, number> = {};
      data.forEach((r: any) => { m[r.colis_id] = (m[r.colis_id] ?? 0) + 1; });
      setNotesCount(m);
    });
    const ch = supabase.channel("sc-colis")
      .on("postgres_changes", { event: "*", schema: "public", table: "colis" }, refresh)
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, []);

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!canManage && role !== "service_client") return <Navigate to="/" />;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createFn({ data: form });
      toast.success(tf("sc.toast.created", { n: form.nom }));
      setForm(empty);
      void refreshAgents();
    } catch (err: any) { toast.error(err.message ?? t("sc.toast.createFail")); }
    finally { setSubmitting(false); }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <section className="container mx-auto flex-1 px-4 pb-24 pt-10">
        <ProPageHeader
          icon={Headset}
          title={t("sc.title")}
          subtitle={canManage ? t("sc.subtitle.admin") : t("sc.board.subtitle")}
          action={
            canManage ? (
              <Button variant="outline" onClick={() => setSheetOpen(true)} className="relative gap-2">
                <NewBadge id="sc-agents-board" />
                <Users className="h-4 w-4" /> {tf("sc.agentsCount", { n: agents.length })}
              </Button>
            ) : undefined
          }
        />

        {colisLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (
          <ColisBoard
            colis={colis}
            notesCount={notesCount}
            permissions={{ canAssignLivreur: false, canEdit: false, canDelete: false, canChangeStatus: false, canEditPrice: true, showBlocked: false, showStatChips: canManage }}
            searchPlaceholder={t("sc.board.search.ph")}
            emptyMessage={t("sc.board.noResult")}
          />
        )}
      </section>
      <SiteFooter />

      {canManage && (
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Headset className="h-5 w-5 text-primary" /> {t("sc.newAgent")}
              </SheetTitle>
              <SheetDescription>{t("sc.subtitle.admin")}</SheetDescription>
            </SheetHeader>

            <form onSubmit={onSubmit} className="mt-4 space-y-4">
              <Field icon={UserIcon} label={t("sc.field.fullname")} value={form.nom} onChange={(v) => setForm({ ...form, nom: v })} />
              <Field icon={Phone} label={t("sc.field.phone")} value={form.telephone} onChange={(v) => setForm({ ...form, telephone: v })} type="tel" />
              <Field icon={Mail} label={t("sc.field.email")} value={form.email} onChange={(v) => setForm({ ...form, email: v })} type="email" />
              <Field icon={KeyRound} label={t("sc.field.password")} value={form.password} onChange={(v) => setForm({ ...form, password: v })} placeholder={t("sc.field.password.ph")} />
              <Button type="submit" disabled={submitting} className="w-full bg-gradient-primary shadow-glow">
                {submitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                {t("sc.createAgent")}
              </Button>
            </form>

            <div className="mt-6 overflow-x-auto rounded-2xl border border-border">
              <div className="border-b border-border p-3"><h2 className="text-sm font-bold">{tf("sc.agentsCount", { n: agents.length })}</h2></div>
              <Table className="text-sm">
                <TableHeader className="bg-muted/50 text-xs uppercase">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="px-3 py-2">{t("sc.th.name")}</TableHead>
                    <TableHead className="px-3 py-2">{t("sc.th.phone")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="[&_tr]:divide-border">
                  {agents.map((a) => (
                    <TableRow key={a.id} className="hover:bg-accent/40">
                      <TableCell className="px-3 py-2 font-bold">
                        {a.nom ?? "—"}
                        <div className="text-xs font-normal text-muted-foreground"><Ltr>{a.email ?? "—"}</Ltr></div>
                      </TableCell>
                      <TableCell className="px-3 py-2 font-mono text-xs"><Ltr>{a.telephone ?? "—"}</Ltr></TableCell>
                    </TableRow>
                  ))}
                  {agents.length === 0 && <TableRow><TableCell colSpan={2} className="p-8 text-center text-muted-foreground">{t("sc.noAgent")}</TableCell></TableRow>}
                </TableBody>
              </Table>
            </div>
          </SheetContent>
        </Sheet>
      )}
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

