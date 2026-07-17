import { Link } from "@tanstack/react-router";
import { Mail, Phone, MapPin } from "lucide-react";
import { useI18n } from "@/hooks/use-i18n";
import logoDark from "@/assets/logo-dark.png";

export function SiteFooter() {
  const { t } = useI18n();
  const muted = "text-white/65";
  const mutedFaint = "text-white/45";

  return (
    <footer className="bg-navy text-white">
      <div className="container mx-auto grid gap-8 px-4 py-12 md:grid-cols-4">
        <div>
          <Link to="/" className="inline-block" aria-label="REVO EXPRESS">
            <img src={logoDark} alt="REVO EXPRESS" className="h-12 w-auto" />
          </Link>
          <p className={`mt-3 text-sm ${muted}`}>{t("ft.tag")}</p>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-semibold text-white">{t("ft.nav")}</h4>
          <ul className={`space-y-2 text-sm ${muted}`}>
            <li><Link to="/" className="transition-colors hover:text-primary">{t("nav.home")}</Link></li>
            <li><Link to="/tarifs" className="transition-colors hover:text-primary">{t("nav.tarifs")}</Link></li>
            <li><Link to="/commander" className="transition-colors hover:text-primary">{t("nav.commander")}</Link></li>
            <li><Link to="/suivi" className="transition-colors hover:text-primary">{t("nav.suivi")}</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-semibold text-white">{t("ft.account")}</h4>
          <ul className={`space-y-2 text-sm ${muted}`}>
            <li><Link to="/login" className="transition-colors hover:text-primary">{t("nav.login")}</Link></li>
            <li><Link to="/signup" className="transition-colors hover:text-primary">{t("nav.signup")}</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-semibold text-white">{t("ft.contact")}</h4>
          <ul className={`space-y-2 text-sm ${muted}`}>
            <li>
              <a href="tel:+213793461877" className="flex items-center gap-2 transition-colors hover:text-primary">
                <Phone className="h-4 w-4 text-primary" /><span>07 93 46 18 77</span>
              </a>
            </li>
            <li>
              <a href="mailto:contact@revo-express.com" className="flex items-center gap-2 transition-colors hover:text-primary">
                <Mail className="h-4 w-4 text-primary" /><span>contact@revo-express.com</span>
              </a>
            </li>
            <li className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" /><span>Alger, Algérie</span>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className={`container mx-auto px-4 py-4 text-center text-xs ${mutedFaint}`}>
          © {new Date().getFullYear()} REVO EXPRESS — {t("ft.rights")}
        </div>
      </div>
    </footer>
  );
}