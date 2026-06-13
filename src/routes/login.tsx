import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, Mail, Phone } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, homeForRole } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import logoLight from "@/assets/logo-light.png";
import logoDark from "@/assets/logo-dark.png";
import banner from "@/assets/login-banner.jpg";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Connexion — REVO EXPRESS" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { user, role, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!authLoading && user && role) {
      navigate({ to: homeForRole(role) as "/admin" });
    }
  }, [authLoading, user, role, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    setSubmitting(false);
    if (error) {
      toast.error("Connexion impossible", { description: error.message });
      return;
    }
    setSuccess(true);
    toast.success("Bienvenue");
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-muted via-background to-muted dark:from-background dark:via-[oklch(0.16_0.025_50)] dark:to-background">

      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="overflow-hidden rounded-2xl bg-card shadow-[0_30px_80px_-20px_rgba(0,0,0,0.55)] ring-1 ring-black/5">
            {/* Logo banner */}
            <div className="flex h-40 w-full items-center justify-center bg-card px-6">
              <img
                src={logoLight}
                alt="REVO EXPRESS"
                className="h-28 w-auto dark:hidden"
              />
              <img
                src={logoDark}
                alt="REVO EXPRESS"
                className="hidden h-28 w-auto dark:block"
              />
            </div>

            {/* Sub-header bar */}
            <div className="border-b border-border bg-muted/60 px-6 py-3">
              <p className="text-sm font-medium text-foreground">Veuillez vous connecter</p>
            </div>

            {/* Form */}
            <form onSubmit={onSubmit} className="space-y-4 px-6 py-6">
              <div className="flex items-stretch overflow-hidden rounded-md border border-input bg-background focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30">
                <label
                  htmlFor="email"
                  className="flex w-28 shrink-0 items-center justify-start border-r border-input bg-muted/70 px-3 text-sm font-medium text-foreground"
                >
                  e-mail
                </label>
                <Input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border-0 bg-transparent shadow-none focus-visible:ring-0"
                />
              </div>

              <div className="flex items-stretch overflow-hidden rounded-md border border-input bg-background focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30">
                <label
                  htmlFor="password"
                  className="flex w-28 shrink-0 items-center justify-start border-r border-input bg-muted/70 px-3 text-sm font-medium text-foreground"
                >
                  Mot de passe
                </label>
                <Input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="border-0 bg-transparent shadow-none focus-visible:ring-0"
                />
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="remember"
                  checked={remember}
                  onCheckedChange={(v) => setRemember(Boolean(v))}
                />
                <label htmlFor="remember" className="cursor-pointer text-sm text-muted-foreground">
                  Rester connecté ?
                </label>
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                <Link
                  to="/signup"
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Créer un compte
                </Link>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-gradient-primary px-6 font-bold text-white shadow-glow hover:opacity-95"
                >
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Se connecter
                </Button>
              </div>
            </form>

            {/* Status / brand footer */}
            <div className="mx-6 mb-6 flex items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-2">
              <div className="flex items-center gap-2 text-sm">
                {success ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-success" />
                    <span className="font-medium text-foreground">Succès !</span>
                  </>
                ) : (
                  <>
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15">
                      <span className="h-2 w-2 rounded-full bg-primary" />
                    </div>
                    <span className="text-muted-foreground">Sécurisé par REVO</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs font-black tracking-wider text-primary">REVO</span>
                <span className="text-[10px] font-bold text-muted-foreground">EXPRESS</span>
              </div>
            </div>
          </div>

          {/* Contact info */}
          <div className="mt-6 rounded-xl border border-border bg-card p-4 shadow-sm">
            <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Besoin d'aide ? Contactez-nous
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-center sm:gap-6">
              <a
                href="mailto:revoexpress16@gmail.com"
                className="flex items-center justify-center gap-2 text-sm text-foreground hover:text-primary"
              >
                <Mail className="h-4 w-4 text-primary" />
                <span className="font-medium">revoexpress16@gmail.com</span>
              </a>
              <a
                href="tel:+213793461877"
                className="flex items-center justify-center gap-2 text-sm text-foreground hover:text-primary"
              >
                <Phone className="h-4 w-4 text-primary" />
                <span className="font-medium">07 93 46 18 77</span>
              </a>
            </div>
          </div>

          <div className="mt-4 text-center text-xs text-muted-foreground">
            <Link to="/suivi" className="hover:text-primary hover:underline">
              Suivre un colis sans compte →
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
