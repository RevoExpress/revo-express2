import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowRight, Truck, Clock, Shield, MapPin, Package, RotateCcw, Banknote, Repeat, CalendarClock, HelpCircle, ListChecks, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { useTheme } from "@/hooks/use-theme";
import { useI18n } from "@/hooks/use-i18n";
import { useAuth, homeForRole } from "@/hooks/use-auth";
import logoLight from "@/assets/logo-light.png";
import logoDark from "@/assets/logo-dark.png";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "REVO EXPRESS — Livraison same-day à Alger" },
      { name: "description", content: "Commandez une livraison express à Alger. Prise en charge en 30 min, livraison le jour même, suivi temps réel." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { t } = useI18n();
  const { theme } = useTheme();
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();

  // La vitrine publique n'est PAS visible aux comptes connectés (client ou interne).
  // Dès qu'une session est détectée, on redirige vers l'espace correspondant au rôle.
  useEffect(() => {
    if (!loading && user && role) {
      navigate({ to: homeForRole(role) as "/admin", replace: true });
    }
  }, [loading, user, role, navigate]);

  // Light theme uses dark-colored logo; dark theme uses light-colored logo
  const heroLogo = theme === "dark" ? logoLight : logoDark;

  // Pendant la vérification de session, et pendant la redirection d'un compte connecté,
  // on n'affiche jamais la vitrine (évite le flash de la landing publique).
  if (loading || (user && role)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />

      {/* HERO — fond clair, l'orange en accents */}
      <section className="relative overflow-hidden bg-background">
        {/* halos orange discrets */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at 85% 20%, rgba(249,115,22,0.14) 0%, transparent 45%), radial-gradient(circle at 10% 90%, rgba(249,115,22,0.10) 0%, transparent 40%)",
          }}
        />
        <div className="container relative mx-auto grid gap-12 px-4 py-20 md:grid-cols-2 md:py-28">
          <div className="flex flex-col justify-center">
            <span className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
              <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
              {t("hero.badge")}
            </span>
            <h1 className="text-balance text-5xl font-black leading-tight text-foreground md:text-6xl lg:text-7xl">
              {t("hero.title.1")} <span className="text-primary">{t("hero.title.2")}</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg text-muted-foreground">{t("hero.sub")}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/commander">
                <Button size="lg" className="gap-2 bg-gradient-primary font-bold shadow-glow">
                  {t("hero.cta.order")}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/suivi">
                <Button size="lg" variant="outline" className="gap-2 border-primary/40 font-bold text-primary hover:bg-primary/10 hover:text-primary">
                  {t("hero.cta.track")}
                </Button>
              </Link>
            </div>
            <div className="mt-10 flex flex-wrap gap-8 text-sm">
              <Stat n="30min" label={t("hero.stat.pickup")} />
              <Stat n="100%" label={t("hero.stat.sameday")} />
              <Stat n="57" label={t("hero.stat.communes")} />
            </div>
          </div>

          <div className="flex items-center justify-center">
            <div className="relative">
              <div className="absolute -inset-10 rounded-full bg-primary/15 blur-3xl" />
              <img
                src={heroLogo}
                alt="REVO EXPRESS"
                className="relative h-56 w-auto drop-shadow-xl md:h-72 lg:h-80"
              />
            </div>
          </div>
        </div>
        {/* liseré orange sous le hero */}
        <div className="h-1 w-full bg-gradient-to-r from-transparent via-primary to-transparent" />
      </section>

      <section id="services" className="bg-secondary/30 py-20 scroll-mt-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-balance text-4xl font-black md:text-5xl">
              {t("sv.title.1")} <span className="text-primary">{t("sv.title.2")}</span>
            </h2>
            <p className="mt-4 text-muted-foreground">{t("sv.sub")}</p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            <Feature icon={Clock} title={t("sv.1.t")} text={t("sv.1.x")} />
            <Feature icon={MapPin} title={t("sv.2.t")} text={t("sv.2.x")} />
            <Feature icon={Shield} title={t("sv.3.t")} text={t("sv.3.x")} />
          </div>
        </div>
      </section>

      <section className="py-20">

        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-balance text-4xl font-black md:text-5xl">
              {t("of.title.1")} <span className="text-primary">{t("of.title.2")}</span>
            </h2>
            <p className="mt-4 text-muted-foreground">{t("of.sub")}</p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Feature icon={Truck} title={t("of.1.t")} text={t("of.1.x")} />
            <Feature icon={RotateCcw} title={t("of.2.t")} text={t("of.2.x")} />
            <Feature icon={Banknote} title={t("of.3.t")} text={t("of.3.x")} />
            <Feature icon={Repeat} title={t("of.4.t")} text={t("of.4.x")} />
            <Feature icon={CalendarClock} title={t("of.5.t")} text={t("of.5.x")} />
            <Feature icon={MapPin} title={t("of.6.t")} text={t("of.6.x")} />
          </div>
        </div>
      </section>

      {/* Processus — 4 étapes */}
      <section className="bg-secondary/30 py-20">
        <div className="container mx-auto px-4">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
            <ListChecks className="h-3.5 w-3.5" />
            {t("pr.tag")}
          </span>
          <h2 className="mt-2 text-balance text-4xl font-black md:text-5xl">{t("pr.title")}</h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">{t("pr.sub")}</p>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <ProcessCard n="01" title={t("pr.1.t")} text={t("pr.1.x")} />
            <ProcessCard n="02" title={t("pr.2.t")} text={t("pr.2.x")} />
            <ProcessCard n="03" title={t("pr.3.t")} text={t("pr.3.x")} />
            <ProcessCard n="04" title={t("pr.4.t")} text={t("pr.4.x")} />
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-4xl font-black md:text-5xl">{t("how.title")}</h2>
            <p className="mt-4 text-muted-foreground">{t("how.sub")}</p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            <Step3 n="1" title={t("how.1.t")} text={t("how.1.x")} />
            <Step3 n="2" title={t("how.2.t")} text={t("how.2.x")} />
            <Step3 n="3" title={t("how.3.t")} text={t("how.3.x")} />
          </div>
        </div>
      </section>

      {/* Zone */}
      <section id="zone" className="bg-gradient-navy py-20 text-white scroll-mt-24">
        <div className="container mx-auto grid gap-10 px-4 md:grid-cols-2 md:items-center">
          <div>
            <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
              <MapPin className="h-3.5 w-3.5" />
              {t("zn.tag")}
            </span>
            <h2 className="mt-2 text-balance text-4xl font-black md:text-5xl">{t("zn.title")}</h2>
            <p className="mt-4 text-white/75">{t("zn.sub")}</p>
            <Link to="/tarifs" className="mt-6 inline-block">
              <Button size="lg" className="gap-2 bg-gradient-primary shadow-glow">
                {t("nav.tarifs")} <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur">
            <div className="grid grid-cols-3 gap-3 text-center text-sm">
              {["Alger Centre","Bab Ezzouar","Hydra","Kouba","Bir Mourad Raïs","El Biar","Cheraga","Dely Brahim","Rouiba","Bordj El Kiffan","Birtouta","Zeralda"].map((c) => (
                <span key={c} className="rounded-lg bg-white/5 px-2 py-2 text-white/85">{c}</span>
              ))}
            </div>
            <p className="mt-4 text-center text-xs uppercase tracking-wider text-white/50">+ 45 autres communes</p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 scroll-mt-24">
        <div className="container mx-auto px-4">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
            <HelpCircle className="h-3.5 w-3.5" />
            {t("faq.tag")}
          </span>
          <h2 className="mt-2 text-balance text-4xl font-black md:text-5xl">{t("faq.title")}</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <FaqCard q={t("faq.1.q")} a={t("faq.1.a")} />
            <FaqCard q={t("faq.2.q")} a={t("faq.2.a")} />
            <FaqCard q={t("faq.3.q")} a={t("faq.3.a")} />
            <FaqCard q={t("faq.4.q")} a={t("faq.4.a")} />
          </div>
        </div>
      </section>

      <section className="bg-gradient-navy py-20 text-white">
        <div className="container mx-auto px-4 text-center">
          <Package className="mx-auto h-12 w-12 text-primary" />
          <h2 className="mt-4 text-balance text-4xl font-black md:text-5xl">{t("cta.title")}</h2>
          <p className="mt-3 text-white/70">{t("cta.sub")}</p>
          <Link to="/commander" className="mt-8 inline-block">
            <Button size="lg" className="gap-2 bg-gradient-primary shadow-glow">
              {t("cta.btn")} <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function ProcessCard({ n, title, text }: { n: string; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-card transition-all hover:-translate-y-1 hover:shadow-glow">
      <div className="inline-flex h-10 items-center justify-center rounded-full bg-gradient-primary px-3 text-sm font-black text-white shadow-glow">
        {n}
      </div>
      <h3 className="mt-4 text-xl font-bold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function FaqCard({ q, a }: { q: string; a: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
      <h3 className="text-lg font-bold">{q}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{a}</p>
    </div>
  );
}

function Stat({ n, label }: { n: string; label: string }) {
  return (
    <div>
      <div className="text-2xl font-black text-primary">{n}</div>
      <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

function Step({ label, done, active }: { label: string; done?: boolean; active?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`h-2.5 w-2.5 rounded-full ${done ? "bg-success" : active ? "bg-primary animate-pulse" : "bg-white/30"}`} />
      <span className={`text-sm ${done || active ? "text-white" : "text-white/50"}`}>{label}</span>
    </div>
  );
}

function Feature({ icon: Icon, title, text }: { icon: typeof Truck; title: string; text: string }) {
  return (
    <div className="group rounded-2xl border border-border bg-card p-6 shadow-card transition-all hover:-translate-y-1 hover:shadow-glow">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary text-white shadow-glow">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-xl font-bold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function Step3({ n, title, text }: { n: string; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-navy text-2xl font-black text-primary">
        {n}
      </div>
      <h3 className="mt-4 text-xl font-bold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}