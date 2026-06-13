import { Link } from "@tanstack/react-router";
import { Mail, Phone, MapPin } from "lucide-react";
import { useI18n } from "@/hooks/use-i18n";
import logoDark from "@/assets/logo-dark.png";
import logoLight from "@/assets/logo-light.png";

export function SiteFooter() {
  const { t } = useI18n();
  // Muted text: dark-warm on the light orange footer, soft white on the dark navy footer
  const muted = "text-foreground/70 dark:text-navy-foreground/70";
  const mutedFaint = "text-foreground/55 dark:text-navy-foreground/60";
  const borderFaint = "border-primary/15 dark:border-navy-foreground/10";

  return (
    <footer className="border-t border-primary/25 bg-[linear-gradient(135deg,oklch(0.95_0.07_55),oklch(0.93_0.09_50),oklch(0.91_0.1_45))] text-foreground dark:border-border dark:bg-navy dark:bg-none dark:text-navy-foreground">
      <div className="container mx-auto grid gap-8 px-4 py-12 md:grid-cols-4">
        <div>
          <Link to="/" className="inline-block" aria-label="REVO EXPRESS">
            <img src={logoLight} alt="REVO EXPRESS" className="h-12 w-auto dark:hidden" />
            <img src={logoDark} alt="REVO EXPRESS" className="hidden h-12 w-auto dark:block" />
          </Link>
          <p className={`mt-3 text-sm ${muted}`}>{t("ft.tag")}</p>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-semibold">{t("ft.nav")}</h4>
          <ul className={`space-y-2 text-sm ${muted}`}>
            <li><Link to="/" className="hover:text-primary">{t("nav.home")}</Link></li>
            <li><Link to="/tarifs" className="hover:text-primary">{t("nav.tarifs")}</Link></li>
            <li><Link to="/commander" className="hover:text-primary">{t("nav.commander")}</Link></li>
            <li><Link to="/suivi" className="hover:text-primary">{t("nav.suivi")}</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-semibold">{t("ft.account")}</h4>
          <ul className={`space-y-2 text-sm ${muted}`}>
            <li><Link to="/login" className="hover:text-primary">{t("nav.login")}</Link></li>
            <li><Link to="/signup" className="hover:text-primary">{t("nav.signup")}</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-semibold">{t("ft.contact")}</h4>
          <ul className={`space-y-2 text-sm ${muted}`}>
            <li className="flex items-center gap-2"><Phone className="h-4 w-4" /><span>+213 5 50 00 00 00</span></li>
            <li className="flex items-center gap-2"><Mail className="h-4 w-4" /><span>contact@revoexpress.dz</span></li>
            <li className="flex items-center gap-2"><MapPin className="h-4 w-4" /><span>Alger, Algérie</span></li>
          </ul>
        </div>
      </div>
      <div className={`border-t ${borderFaint}`}>
        <div className={`container mx-auto px-4 py-4 text-center text-xs ${mutedFaint}`}>
          © {new Date().getFullYear()} REVO EXPRESS — {t("ft.rights")}
        </div>
      </div>
    </footer>
  );
}
