import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Menu, X, LogOut, User as UserIcon, Download, ArrowRight, Plus, Package, Undo2, Search, Inbox } from "lucide-react";
import { useAuth, homeForRole } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { Button } from "@/components/ui/button";
import { LangSwitcher } from "@/components/lang-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { useInstallPrompt } from "@/hooks/use-install-prompt";
import { NotificationsBell } from "@/components/notifications-bell";
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

// Extrait un tracking valide de n'importe quelle saisie (minuscules, lien collé, etc.)
function normalizeTracking(input: string): string | null {
  const raw = input.trim().toUpperCase().replace(/\s+/g, "");
  if (!raw) return null;
  const m = raw.match(/(REV|ECH|SPL)-?([A-Z0-9]{4,10})/);
  if (m) return `${m[1]}-${m[2]}`;
  const code = raw.match(/^([A-Z0-9]{4,10})$/);
  if (code) return `REV-${code[1]}`;
  return null;
}

// Icônes rondes de la barre orange
const iconBtn =
  "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white transition-all hover:bg-white/20 active:scale-95";

export function SiteNav() {
  const { user, role, signOut } = useAuth();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [searchError, setSearchError] = useState(false);
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

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const code = normalizeTracking(searchValue);
    if (!code) {
      setSearchError(true);
      return;
    }
    setSearchError(false);
    setSearchOpen(false);
    setSearchValue("");
    navigate({ to: "/track/$code", params: { code } });
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

  // Liens réservés aux espaces internes
  if (role === "admin") {
    navItems.push({ to: "/comptes", label: "Gestion des comptes" });
    navItems.push({ to: "/cles-api", label: "Clés API" });
  }
  if (role === "admin" || role === "admin_commercial" || role === "commercial") {
    navItems.push({ to: "/prospection", label: "Prospection" });
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
      <header
        className="sticky top-0 z-40 w-full border-b border-black/10 text-white shadow-md"
        style={{ background: "linear-gradient(90deg, #e85d04 0%, #f97316 50%, #fb923c 100%)" }}
      >
        <div className="relative mx-auto flex h-16 items-center justify-between gap-2 px-2 md:px-4">
          {/* GAUCHE — hamburger */}
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Menu"
            className={iconBtn}
          >
            <Menu className="h-6 w-6" />
          </button>

          {/* CENTRE — logo blanc en grand, directement sur l'orange */}
          <Link
            to="/"
            className="pointer-events-auto flex shrink-0 items-center md:absolute md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2"
            aria-label="REVO EXPRESS"
          >
            <img
              src={logoDark}
              alt="REVO EXPRESS"
              className="h-16 w-auto md:h-24"
                style={{ filter: "brightness(0) invert(1) drop-shadow(0 1px 3px rgba(0,0,0,0.35))" }}
            />
          </Link>

          {/* DROITE — langue / thème / installer / + / cloche / loupe | compte */}
          <div className="flex shrink-0 items-center gap-0.5">
            <div className="hidden md:block"><LangSwitcher variant="brand" /></div>
            <div className="hidden md:block"><ThemeToggle variant="brand" /></div>

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

            {user ? (
              <DropdownMenu>
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
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link to="/commander" aria-label={t("nav.commander")} title={t("nav.commander")} className={iconBtn}>
                <Plus className="h-5 w-5" />
              </Link>
            )}

            {user && <NotificationsBell />}

            {/* LA LOUPE */}
            <button
              type="button"
              onClick={() => { setSearchError(false); setSearchOpen(true); }}
              aria-label="Rechercher un colis"
              title="Rechercher un colis"
              className={iconBtn}
            >
              <Search className="h-5 w-5" />
            </button>

            {/* séparateur discret avant le compte */}
            <span className="mx-1 hidden h-6 w-px bg-white/25 md:block" />

            {user ? (
              <DropdownMenu>
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
              <Link to="/login">
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/20 hover:text-white">
                  {t("nav.login")}
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Fenêtre de recherche (loupe) */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-24"
          onClick={() => setSearchOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-border bg-card p-4 shadow-soft"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-bold">Rechercher un colis</h2>
              <button
                onClick={() => setSearchOpen(false)}
                aria-label="Fermer"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={submitSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  ref={searchInputRef}
                  value={searchValue}
                  onChange={(e) => { setSearchValue(e.target.value); if (searchError) setSearchError(false); }}
                  placeholder="REV-ABC123"
                  autoComplete="off"
                  spellCheck={false}
                  className="h-11 w-full rounded-lg border border-input bg-background pl-9 pr-3 font-mono text-sm font-bold uppercase outline-none focus:border-primary"
                />
              </div>
              <Button type="submit" className="h-11 gap-2 bg-gradient-primary px-5 font-bold shadow-glow">
                Suivre
              </Button>
            </form>
            {searchError && (
              <p className="mt-2 text-sm text-destructive">
                Numéro non reconnu — il ressemble à REV-ABC123.
              </p>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              Recherche par numéro de tracking. Pour chercher par nom ou téléphone, utilisez la barre de recherche de votre espace.
            </p>
          </div>
        </div>
      )}

      {/* Slide-in drawer with nav links */}
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

            <div className="mt-auto flex flex-col gap-2 border-t border-border p-4 md:hidden">
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