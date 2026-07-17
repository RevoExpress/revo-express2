import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowRight, Truck, Clock, Shield, ShieldCheck, MapPin, Package, RotateCcw, Banknote, Repeat, CalendarClock, HelpCircle, ListChecks, Loader2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
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
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();

  // La vitrine publique n'est PAS visible aux comptes connectés (client ou interne).
  // Dès qu'une session est détectée, on redirige vers l'espace correspondant au rôle.
  useEffect(() => {
    if (!loading && user && role) {
      navigate({ to: homeForRole(role) as "/admin", replace: true });
    }
  }, [loading, user, role, navigate]);

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

      {/* HERO — fond clair, logo en filigrane + lignes de vitesse */}
      <section className="relative overflow-hidden bg-secondary/40">
        {/* Logo filigrane + lignes de vitesse (desktop) */}
        <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 select-none md:block">
          <img
            src={logoLight}
            alt=""
            className="absolute -right-20 top-1/2 w-[42rem] max-w-none -translate-y-1/2 opacity-[0.07] grayscale dark:hidden lg:w-[50rem]"
          />
          <img
            src={logoDark}
            alt=""
            className="absolute -right-20 top-1/2 hidden w-[42rem] max-w-none -translate-y-1/2 opacity-[0.07] grayscale dark:block lg:w-[50rem]"
          />
          <div className="absolute right-[55%] top-[24%] h-1.5 w-48 rounded-full bg-gradient-to-l from-foreground/10 to-transparent" />
          <div className="absolute right-[60%] top-[38%] h-1 w-36 rounded-full bg-gradient-to-l from-primary/45 to-transparent" />
          <div className="absolute right-[58%] top-[62%] h-1 w-44 rounded-full bg-gradient-to-l from-primary/40 to-transparent" />
          <div className="absolute right-[52%] top-[76%] h-1.5 w-52 rounded-full bg-gradient-to-l from-foreground/8 to-transparent" />
        </div>

        <div className="container relative mx-auto px-4 pb-10 pt-16 md:pb-14 md:pt-24">
          <div className="max-w-2xl">
            <span className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-primary">
              <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
              {t("hero.badge")}
            </span>
            <h1 className="text-balance text-5xl font-black leading-[1.05] text-foreground md:text-6xl lg:text-7xl">
              {t("hero.title.1")}
              <br />
              <span className="text-primary">{t("hero.title.2")}</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg text-muted-foreground">{t("hero.sub")}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/commander">
                <Button size="lg" className="gap-2 rounded-xl bg-gradient-primary px-6 font-bold shadow-glow">
                  {t("hero.cta.order")}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/suivi">
                <Button size="lg" variant="outline" className="gap-2 rounded-xl border-border bg-card px-6 font-bold text-foreground shadow-soft hover:border-primary/40 hover:text-primary">
                  <Package className="h-4 w-4" />
                  {t("hero.cta.track")}
                </Button>
              </Link>
            </div>
          </div>

          {/* Bandeau stats en carte */}
          <div className="relative mt-14 grid gap-6 rounded-2xl border border-border bg-card p-6 shadow-card sm:grid-cols-2 md:p-7 lg:grid-cols-4">
            <HeroStat icon={Clock} n="30 min" label={t("hero.stat.pickup")} />
            <HeroStat icon={Zap} n="100%" label={t("hero.stat.sameday")} />
            <HeroStat icon={MapPin} n="57" label={t("hero.stat.communes")} />
            <HeroStat icon={ShieldCheck} n="0" label="Frais cachés" />
          </div>
        </div>
      </section>

      <section id="services" className="py-20 scroll-mt-24">
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

      <section className="bg-secondary/40 py-20">

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

      {/* Processus — étapes numérotées façon maquette */}
      <section className="py-20">
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

      <section className="bg-secondary/40 py-20">
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
      <section id="zone" className="py-20 scroll-mt-24">
        <div className="container mx-auto grid gap-10 px-4 md:grid-cols-2 md:items-center">
          <div>
            <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
              <MapPin className="h-3.5 w-3.5" />
              {t("zn.tag")}
            </span>
            <h2 className="mt-2 text-balance text-4xl font-black md:text-5xl">{t("zn.title")}</h2>
            <p className="mt-4 text-muted-foreground">{t("zn.sub")}</p>
            <Link to="/tarifs" className="mt-6 inline-block">
              <Button size="lg" className="gap-2 rounded-xl bg-gradient-primary px-6 font-bold shadow-glow">
                {t("nav.tarifs")} <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="rounded-3xl border border-border bg-card p-8 shadow-card">
            <div className="grid grid-cols-3 gap-3 text-center text-sm">
              {["Alger Centre","Bab Ezzouar","Hydra","Kouba","Bir Mourad Raïs","El Biar","Cheraga","Dely Brahim","Rouiba","Bordj El Kiffan","Birtouta","Zeralda"].map((c) => (
                <span key={c} className="rounded-lg border border-border bg-secondary/60 px-2 py-2 font-medium text-foreground/80">{c}</span>
              ))}
            </div>
            <p className="mt-4 text-center text-xs font-bold uppercase tracking-wider text-primary">+ 45 autres communes</p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="bg-secondary/40 py-20 scroll-mt-24">
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

      {/* CTA final — bandeau sombre arrondi façon maquette */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-navy px-6 py-14 text-center text-white shadow-card md:px-12">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 15% 50%, rgba(249,115,22,0.18) 0%, transparent 40%)",
              }}
            />
            <Package className="relative mx-auto h-12 w-12 text-primary" />
            <h2 className="relative mt-4 text-balance text-4xl font-black md:text-5xl">{t("cta.title")}</h2>
            <p className="relative mt-3 text-white/70">{t("cta.sub")}</p>
            <Link to="/commander" className="relative mt-8 inline-block">
              <Button size="lg" className="gap-2 rounded-xl bg-gradient-primary px-6 font-bold shadow-glow">
                {t("cta.btn")} <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function HeroStat({ icon: Icon, n, label }: { icon: typeof Clock; n: string; label: string }) {
  return (
    <div className="flex items-center gap-4">
      <div className="icon-tile">
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <div className="text-2xl font-black leading-tight">{n}</div>
        <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
      </div>
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

function Feature({ icon: Icon, title, text }: { icon: typeof Truck; title: string; text: string }) {
  return (
    <div className="group rounded-2xl border border-border bg-card p-6 shadow-card transition-all hover:-translate-y-1 hover:shadow-glow">
      <div className="icon-tile">
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
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-2xl font-black text-primary">
        {n}
      </div>
      <h3 className="mt-4 text-xl font-bold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}