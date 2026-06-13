import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X, LogOut, User as UserIcon, Download, ArrowRight, Plus, Package, Undo2 } from "lucide-react";
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

export function SiteNav() {
  const { user, role, signOut } = useAuth();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { canInstall, install } = useInstallPrompt();

  const handleSignOut = async () => {
    await signOut();
    setOpen(false);
    navigate({ to: "/" });
  };

  const navItems: Array<{ to: string; label: string; isAnchor?: boolean }> = [
    { to: "/", label: t("nav.home") },
    { to: "/#services", label: t("nav.services"), isAnchor: true },
    { to: "/tarifs", label: t("nav.tarifs") },
    { to: "/#zone", label: t("nav.zone"), isAnchor: true },
    { to: "/#faq", label: t("nav.faq"), isAnchor: true },
    { to: "/suivi", label: t("nav.suivi") },
  ];
  if (user) navItems.push({ to: "/mes-colis", label: t("nav.dashboard") });

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
      <header className="sticky top-0 z-40 w-full border-b border-orange-100/60 bg-white/70 text-foreground backdrop-blur-xl dark:border-white/10 dark:bg-[#1c120d]/85 dark:text-white">
        <div className="relative mx-auto flex h-16 items-center justify-between gap-2 px-3 md:px-6">
          {/* LEFT — hamburger collé au bord */}
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Menu"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-orange-200/60 bg-white/80 text-foreground shadow-sm transition-colors hover:bg-orange-50 dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* CENTER — logo: flux normal sur mobile, centré absolu sur desktop */}
          <Link
            to="/"
            className="pointer-events-auto flex shrink-0 items-center md:absolute md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2"
            aria-label="REVO EXPRESS"
          >
            <img src={logoLight} alt="REVO EXPRESS" className="h-12 w-auto dark:hidden md:h-24" />
            <img src={logoDark} alt="REVO EXPRESS" className="hidden h-12 w-auto dark:block md:h-24" />
          </Link>

          {/* RIGHT — actions */}
          <div className="flex shrink-0 items-center gap-2">


            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    className="gap-2 rounded-full bg-gradient-primary px-4 font-bold text-white shadow-glow hover:opacity-95"
                    aria-label={t("nav.quick.new")}
                  >
                    <Plus className="h-4 w-4" />
                    <span>{t("nav.quick.new")}</span>
                  </Button>
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
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link to="/commander">
                <Button
                  size="sm"
                  className="rounded-full bg-gradient-primary px-5 font-bold text-white shadow-glow hover:opacity-95"
                >
                  {t("nav.commander")}
                </Button>
              </Link>
            )}

            <button
              type="button"
              onClick={() => void install()}
              disabled={!canInstall}
              className="hidden items-center gap-2 rounded-full border border-primary/40 bg-white/80 px-4 py-2 text-sm font-bold text-primary transition-colors hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/20 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
            >
              <Download className="h-4 w-4" />
              {t("nav.install")}
            </button>

            <div className="hidden md:block"><LangSwitcher /></div>
            <div className="hidden md:block"><ThemeToggle /></div>
            {user && <NotificationsBell />}

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2 text-foreground hover:bg-orange-50 dark:text-white dark:hover:bg-white/10 dark:hover:text-white">
                    <UserIcon className="h-4 w-4" />
                    <span className="hidden sm:inline">{spaceLabel}</span>
                  </Button>
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
                <Button variant="ghost" size="sm" className="text-foreground hover:bg-orange-50 dark:text-white dark:hover:bg-white/10 dark:hover:text-white">
                  {t("nav.login")}
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Slide-in drawer with nav links */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-[88vw] max-w-sm flex-col overflow-y-auto border-r border-primary/30 bg-background shadow-2xl">
            <div className="flex items-center justify-between border-b border-primary/20 bg-[linear-gradient(90deg,oklch(0.92_0.11_55/0.95),oklch(0.95_0.08_60/0.9))] px-4 py-4 dark:border-border dark:bg-card dark:bg-none">
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
                  <a
                    key={item.to}
                    href={item.to}
                    onClick={() => setOpen(false)}
                    className="rounded-xl px-4 py-3 text-base font-semibold text-foreground/85 transition-colors hover:bg-primary/10 hover:text-primary"
                  >
                    {item.label}
                  </a>
                ) : (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setOpen(false)}
                    className="rounded-xl px-4 py-3 text-base font-semibold text-foreground/85 transition-colors hover:bg-primary/10 hover:text-primary"
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
