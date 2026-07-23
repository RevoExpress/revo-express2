import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Menu, X, LogOut, User as UserIcon, Download, ArrowRight, Plus, Package, Undo2, Search, Inbox, Loader2, Wallet } from "lucide-react";
import { useAuth, homeForRole } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LangSwitcher } from "@/components/lang-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { useInstallPrompt } from "@/hooks/use-install-prompt";
import { NotificationsBell } from "@/components/notifications-bell";
import { STATUTS } from "@/lib/tarifs";
import { TrackingBadge } from "@/components/tracking-badge";
import { ColisHistoriqueModal } from "@/components/colis-historique-modal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import logoLight from "@/assets/logo-light.png";
import logoDark from "@/assets/logo-dark.png";

function normalizeTracking(input: string): string | null {
  const raw = input.trim().toUpperCase().replace(/\s+/g, "");
  if (!raw) return null;
  const m = raw.match(/(REV|ECH|SPL)-?([A-Z0-9]{4,10})/);
  if (m) return `${m[1]}-${m[2]}`;
  const code = raw.match(/^([A-Z0-9]{4,10})$/);
  if (code) return `REV-${code[1]}`;
  return null;
}

const iconBtn =
  "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-foreground/65 transition-all hover:bg-muted hover:text-foreground active:scale-95";

export function SiteNav() {
  const { user, role, signOut } = useAuth();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [searchError, setSearchError] = useState(false);
  const [searchBusy, setSearchBusy] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);
  const [histo, setHisto] = useState<{ tracking: string; type_colis?: string | null } | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { canInstall, install } = useInstallPrompt();

  const handleSignOut = async () => {
    await signOut();
    setOpen(false);
    navigate({ to: "/" });
  };

  useEffect(() => {
    if (!searchOpen) return;
    searchInputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [searchOpen]);

  function closeSearch() {
    setSearchOpen(false);
    setSearchValue("");
    setResults(null);
    setSearchError(false);
  }

  async function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = searchValue.trim();
    if (!q) return;

    if (!user) {
      const code = normalizeTracking(q);
      if (!code) {
        setSearchError(true);
        return;
      }
      closeSearch();
      navigate({ to: "/track/$code", params: { code } });
      return;
    }

    setSearchBusy(true);
    setSearchError(false);
    const safe = q.replace(/[,()]/g, " ").trim();
    const pattern = `%${safe}%`;
    const { data, error } = await supabase
      .from("colis")
      .select("id, tracking, type_colis, statut, destinataire_nom, destinataire_tel, destinataire_wilaya, date_creation")
      .or(
        [
          `tracking.ilike.${pattern}`,
          `destinataire_nom.ilike.${pattern}`,
          `destinataire_tel.ilike.${pattern}`,
          `destinataire_adresse.ilike.${pattern}`,
          `destinataire_wilaya.ilike.${pattern}`,
          `description.ilike.${pattern}`,
          `expediteur_nom.ilike.${pattern}`,
        ].join(","),
      )
      .order("date_creation", { ascending: false })
      .limit(10);
    setSearchBusy(false);

    if (error) {
      setSearchError(true);
      return;
    }
    setResults(data ?? []);
  }

  function statutLabel(key: string) {
    return STATUTS.find((s) => s.key === key)?.label ?? key;
  }

  const navItems: Array<{ to: string; label: string; isAnchor?: boolean }> = [
    { to: "/", label: t("nav.home") },
    { to: "/#services", label: t("nav.services"), isAnchor: true },
    { to: "/tarifs", label: t("nav.tarifs") },
    { to: "/#zone", label: t("nav.zone"), isAnchor: true },
    { to: "/#faq", label: t("nav.faq"), isAnchor: true },
    { to: "/suivi", label: t("nav.suivi") },
  ];
  if (user) navItems.push({ to: "/mes-colis", label: t("nav.dashboard") });

  if (role === "admin") {
    navItems.push({ to: "/comptes", label: "Gestion des comptes" });
    navItems.push({ to: "/cles-api", label: "Clés API" });
  }
  if (role === "admin" || role === "admin_operations") {
    navItems.push({ to: "/finance", label: "Finance" });
  }
  if (role === "admin" || role === "admin_commercial" || role === "commercial") {
    navItems.push({ to: "/prospection", label: "Prospection" });
  }
  if (!role || role === "client") {
    navItems.push({ to: "/mon-paiement", label: "Mon paiement" });
  }

  const spaceLabel =
    role === "admin" ? t("nav.space.admin")
    : role === "admin_commercial" ? "Admin commercial"
    : role === "admin_operations" ? "Admin opérations"
    : role === "admin_service_client" ? "Admin service client"
    : role === "commercial" ? "Espace commercial"
    : role === "service_client" ? "Service client"
    : role === "livreur" ? t("nav.space.livreur")
    : t("nav.space.client");

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/90 shadow-soft backdrop-blur-md">
        <div className="relative mx-auto flex h-16 items-center justify-between gap-2 px-2 md:h-20 md:px-4">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Menu"
            className={iconBtn}
          >
            <Menu className="h-6 w-6" />
          </button>

          <Link
            to="/"
            className="pointer-events-auto flex shrink-0 items-center md:absolute md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2"
            aria-label="REVO EXPRESS"
          >
            <img src={logoLight} alt="REVO EXPRESS" className="h-14 w-auto dark:hidden md:h-[4.5rem]" />
            <img src={logoDark} alt="REVO EXPRESS" className="hidden h-14 w-auto dark:block md:h-[4.5rem]" />
          </Link>

          <div className="flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              onClick={() => { setSearchError(false); setResults(null); setSearchOpen(true); }}
              aria-label="Rechercher un colis"
              title="Rechercher un colis"
              className={iconBtn}
            >
              <Search className="h-5 w-5" />
            </button>

            <div className="hidden md:block"><ThemeToggle /></div>
            <div className="hidden md:block"><LangSwitcher /></div>

            {canInstall && (
              <button
                type="button"
                onClick={() => void install()}
                aria-label={t("nav.install")}
                title={t("nav.install")}
                className={`hidden md:inline-flex ${iconBtn}`}
              >
                <Download className="h-5 w-5" />
              </button>
            )}

            {user && (
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <button type="button" aria-label={t("nav.quick.new")} title={t("nav.quick.new")} className={iconBtn}>
                    <Plus className="h-5 w-5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60">
                  <DropdownMenuLabel>{t("nav.quick.myspace")}</DropdownMenuLabel>
                  <DropdownMenuItem asChild>
                    <Link to="/commander" className="flex w-full cursor-pointer items-center gap-2">
                      <Plus className="h-4 w-4 text-primary" />
                      <span className="font-semibold">{t("nav.quick.neworder")}</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/mes-colis" className="flex w-full cursor-pointer items-center gap-2">
                      <Package className="h-4 w-4 text-primary" />
                      <span className="font-semibold">{t("nav.quick.mycolis")}</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/mes-retours" className="flex w-full cursor-pointer items-center gap-2">
                      <Undo2 className="h-4 w-4 text-destructive" />
                      <span className="font-semibold">{t("nav.quick.myreturns")}</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/commandes-api" className="flex w-full cursor-pointer items-center gap-2">
                      <Inbox className="h-4 w-4 text-primary" />
                      <span className="font-semibold">Commandes web</span>
                    </Link>
                  </DropdownMenuItem>
                  {(!role || role === "client") && (
                    <DropdownMenuItem asChild>
                      <Link to="/mon-paiement" className="flex w-full cursor-pointer items-center gap-2">
                        <Wallet className="h-4 w-4 text-primary" />
                        <span className="font-semibold">Mon paiement</span>
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {(role === "admin" || role === "admin_operations") && (
                    <DropdownMenuItem asChild>
                      <Link to="/finance" className="flex w-full cursor-pointer items-center gap-2">
                        <Wallet className="h-4 w-4 text-primary" />
                        <span className="font-semibold">Finance</span>
                      </Link>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {user && <NotificationsBell />}

            <span className="mx-1.5 hidden h-6 w-px bg-border md:block" />

            {user ? (
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <button type="button" aria-label={spaceLabel} title={spaceLabel} className={iconBtn}>
                    <UserIcon className="h-5 w-5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to={homeForRole(role) as "/admin"} className="cursor-pointer">
                      <UserIcon className="mr-2 h-4 w-4" />
                      {spaceLabel}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/profil" className="cursor-pointer">
                      <UserIcon className="mr-2 h-4 w-4" />
                      Mon profil
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Se déconnecter
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Link to="/commander" className="hidden sm:block">
                  <Button className="gap-2 rounded-full bg-gradient-primary px-5 font-bold shadow-glow">
                    {t("nav.commander")}
                  </Button>
                </Link>
                <Link to="/login">
                  <Button variant="ghost" size="sm" className="font-semibold text-foreground/70 hover:text-foreground">
                    {t("nav.login")}
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {searchOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-16"
          onClick={closeSearch}
        >
          <div
            className="w-full max-w-xl rounded-xl border border-border bg-card p-4 shadow-soft"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-bold">Rechercher un colis</h2>
              <button
                onClick={closeSearch}
                aria-label="Fermer"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={(e) => void submitSearch(e)} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  ref={searchInputRef}
                  value={searchValue}
                  onChange={(e) => { setSearchValue(e.target.value); if (searchError) setSearchError(false); }}
                  placeholder={user ? "Tracking, nom, téléphone, adresse, produit…" : "REV-ABC123"}
                  autoComplete="off"
                  spellCheck={false}
                  className={`h-11 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm font-bold outline-none focus:border-primary ${user ? "" : "font-mono uppercase"}`}
                />
              </div>
              <Button type="submit" disabled={searchBusy} className="h-11 gap-2 bg-gradient-primary px-5 font-bold shadow-glow">
                {searchBusy && <Loader2 className="h-4 w-4 animate-spin" />}
                Rechercher
              </Button>
            </form>
            {searchError && (
              <p className="mt-2 text-sm text-destructive">
                {user ? "Recherche impossible — réessayez." : "Numéro non reconnu — il ressemble à REV-ABC123."}
              </p>
            )}
            {!user && (
              <p className="mt-2 text-xs text-muted-foreground">
                Recherche par numéro de tracking. Connectez-vous pour chercher par nom, téléphone ou adresse.
              </p>
            )}

            {user && results !== null && (
              <div className="mt-3 max-h-[50vh] overflow-y-auto rounded-lg border border-border">
                {results.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    Aucun colis trouvé pour « {searchValue} ».
                  </div>
                ) : (
                  results.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setHisto({ tracking: r.tracking, type_colis: r.type_colis })}
                      className="flex w-full items-center gap-3 border-b border-border px-3 py-2.5 text-left transition-colors last:border-b-0 hover:bg-muted/40"
                    >
                      <span className="shrink-0 rounded-md bg-info/15 px-2 py-0.5 font-mono text-xs font-bold text-info">
                        {r.tracking}
                      </span>
                      <TrackingBadge typeColis={r.type_colis} />
                      <span className="min-w-0 flex-1 truncate text-sm">
                        <span className="font-medium">{r.destinataire_nom}</span>
                        <span className="text-muted-foreground"> — {r.destinataire_tel}</span>
                      </span>
                      <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
                        {statutLabel(r.statut)}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {histo && (
        <ColisHistoriqueModal
          tracking={histo.tracking}
          typeColis={histo.type_colis}
          onClose={() => setHisto(null)}
        />
      )}

      {open && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-[88vw] max-w-sm flex-col overflow-y-auto border-r border-border bg-background shadow-2xl">
            <div className="flex items-center justify-between border-b border-border bg-card px-4 py-4">
              <Link to="/" onClick={() => setOpen(false)} aria-label="REVO EXPRESS">
                <img src={logoLight} alt="" className="h-12 w-auto dark:hidden" />
                <img src={logoDark} alt="" className="hidden h-12 w-auto dark:block" />
              </Link>
              <button
                onClick={() => setOpen(false)}
                aria-label="Fermer"
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-background text-foreground hover:bg-accent"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex flex-col gap-1 p-4">
              {navItems.map((item) =>
                item.isAnchor ? (
                  <a key={item.to} href={item.to} onClick={() => setOpen(false)} className="rounded-lg px-4 py-3 text-base font-semibold text-foreground/85 transition-colors hover:bg-primary/10 hover:text-primary">
                    {item.label}
                  </a>
                ) : (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-4 py-3 text-base font-semibold text-foreground/85 transition-colors hover:bg-primary/10 hover:text-primary"
                    activeProps={{ className: "bg-primary/15 text-primary" }}
                  >
                    {item.label}
                  </Link>
                ),
              )}
            </nav>

            <div className="mt-auto flex flex-col gap-2 border-t border-border p-4">
              <Link to="/commander" onClick={() => setOpen(false)}>
                <Button className="w-full gap-2 rounded-full bg-gradient-primary">
                  <Plus className="h-4 w-4" /> {t("nav.commander")} <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              {canInstall && (
                <Button
                  variant="outline"
                  className="w-full gap-2 rounded-full border-primary/50 text-primary"
                  onClick={() => void install()}
                >
                  <Download className="h-4 w-4" />
                  {t("nav.install")}
                </Button>
              )}
              <div className="flex items-center justify-between gap-2 pt-2">
                <LangSwitcher />
                <ThemeToggle />
              </div>
              {user && (
                <Button
                  variant="ghost"
                  onClick={handleSignOut}
                  className="w-full justify-start gap-2 text-destructive hover:text-destructive"
                >
                  <LogOut className="h-4 w-4" /> {t("nav.signout")}
                </Button>
              )}
            </div>
          </aside>
        </>
      )}
    </>
  );
}