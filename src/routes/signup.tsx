import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Mail, Lock, User, Phone, Loader2 } from "lucide-react";
import logoDark from "@/assets/logo-dark.png";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, homeForRole } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Créer un compte — REVO EXPRESS" }] }),
  component: SignupPage,
});

const schema = z.object({
  nom: z.string().trim().min(2, "Nom trop court").max(100),
  telephone: z.string().trim().min(8, "Téléphone invalide").max(20),
  email: z.string().trim().email("Email invalide").max(255),
  password: z.string().min(8, "Au moins 8 caractères").max(72),
});

function SignupPage() {
  const navigate = useNavigate();
  const { user, role, loading: authLoading } = useAuth();
  const [form, setForm] = useState({ nom: "", telephone: "", email: "", password: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && user && role) {
      navigate({ to: homeForRole(role) as "/admin" });
    }
  }, [authLoading, user, role, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email.toLowerCase(),
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { nom: parsed.data.nom, telephone: parsed.data.telephone },
      },
    });
    setSubmitting(false);
    if (error) {
      toast.error("Inscription impossible", { description: error.message });
      return;
    }
    toast.success("Compte créé ! Vérifiez votre boîte mail pour confirmer.");
    navigate({ to: "/login" });
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-hero">
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-8 flex items-center justify-center" aria-label="REVO EXPRESS">
            <img src={logoDark} alt="REVO EXPRESS" className="h-16 w-auto drop-shadow-2xl md:h-20" />
          </Link>

          <div className="rounded-2xl bg-card p-8 shadow-glow">
            <h1 className="text-2xl font-black">Créer un compte</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Compte client gratuit. Commandez en quelques secondes.
            </p>

            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <Field icon={User} label="Nom complet" id="nom" value={form.nom}
                onChange={(v) => setForm({ ...form, nom: v })} />
              <Field icon={Phone} label="Téléphone" id="telephone" type="tel" value={form.telephone}
                onChange={(v) => setForm({ ...form, telephone: v })} />
              <Field icon={Mail} label="Email" id="email" type="email" value={form.email}
                onChange={(v) => setForm({ ...form, email: v })} autoComplete="email" />
              <Field icon={Lock} label="Mot de passe" id="password" type="password" value={form.password}
                onChange={(v) => setForm({ ...form, password: v })} autoComplete="new-password" />

              <Button type="submit" disabled={submitting} className="w-full bg-gradient-primary shadow-glow">
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Créer mon compte
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              Déjà inscrit ?{" "}
              <Link to="/login" className="font-semibold text-primary hover:underline">
                Se connecter
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ icon: Icon, label, id, value, onChange, type = "text", autoComplete }: {
  icon: typeof User; label: string; id: string; value: string; onChange: (v: string) => void;
  type?: string; autoComplete?: string;
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="relative mt-1">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input id={id} type={type} required value={value} autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)} className="pl-9" />
      </div>
    </div>
  );
}
