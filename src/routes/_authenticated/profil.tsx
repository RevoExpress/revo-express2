import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Save, KeyRound, User as UserIcon, Mail, Phone, Store, MapPin, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { COMMUNES } from "@/lib/tarifs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/profil")({
  component: ProfilPage,
});

const profileSchema = z.object({
  nom: z.string().trim().min(2, "Au moins 2 caractères").max(120),
  telephone: z
    .string()
    .trim()
    .min(8, "Numéro trop court")
    .max(20)
    .regex(/^[0-9+ ()-]+$/, "Format invalide"),
  nom_boutique: z.string().trim().max(120).optional().or(z.literal("")),
  adresse: z.string().trim().max(255).optional().or(z.literal("")),
  wilaya: z.string().trim().max(80).optional().or(z.literal("")),
});

const passwordSchema = z
  .object({
    current: z.string().min(6, "Mot de passe actuel requis"),
    next: z
      .string()
      .min(8, "Au moins 8 caractères")
      .max(72, "72 caractères maximum")
      .regex(/[A-Z]/, "Au moins une majuscule")
      .regex(/[a-z]/, "Au moins une minuscule")
      .regex(/[0-9]/, "Au moins un chiffre"),
    confirm: z.string(),
  })
  .refine((d) => d.next === d.confirm, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirm"],
  })
  .refine((d) => d.current !== d.next, {
    message: "Le nouveau doit être différent de l'ancien",
    path: ["next"],
  });

function ProfilPage() {
  const { user, role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changing, setChanging] = useState(false);

  const [form, setForm] = useState({
    nom: "",
    telephone: "",
    nom_boutique: "",
    adresse: "",
    wilaya: "",
  });

  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    supabase
      .from("profiles")
      .select("nom, telephone, nom_boutique, adresse, wilaya")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          toast.error("Impossible de charger le profil");
        } else if (data) {
          // Si l'ancienne valeur libre correspond (aux accents/majuscules près)
          // à une commune officielle, on la récupère proprement.
          const norm = (s: string) =>
            s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
          const matched =
            COMMUNES.find((c) => norm(c.name) === norm(data.wilaya ?? ""))?.name ?? "";
          setForm({
            nom: data.nom ?? "",
            telephone: data.telephone ?? "",
            nom_boutique: data.nom_boutique ?? "",
            adresse: data.adresse ?? "",
            wilaya: matched,
          });
        }
        setLoading(false);
      });
  }, [user]);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const parsed = profileSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Données invalides");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        nom: parsed.data.nom,
        telephone: parsed.data.telephone,
        nom_boutique: parsed.data.nom_boutique || null,
        adresse: parsed.data.adresse || null,
        wilaya: parsed.data.wilaya || null,
      })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error("Échec de la mise à jour");
    } else {
      toast.success("Profil mis à jour ✓");
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.email) return;
    const parsed = passwordSchema.safeParse(pw);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Données invalides");
      return;
    }
    setChanging(true);
    // Re-authentifier avec l'ancien mot de passe avant le changement
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: parsed.data.current,
    });
    if (signInError) {
      setChanging(false);
      toast.error("Mot de passe actuel incorrect");
      return;
    }
    const { error: updateError } = await supabase.auth.updateUser({
      password: parsed.data.next,
    });
    setChanging(false);
    if (updateError) {
      toast.error(updateError.message);
    } else {
      setPw({ current: "", next: "", confirm: "" });
      toast.success("Mot de passe modifié ✓");
    }
  }

  const roleLabel =
    role === "admin" ? "Administrateur"
    : role === "admin_commercial" ? "Admin commercial"
    : role === "admin_operations" ? "Admin opérations"
    : role === "commercial" ? "Commercial"
    : role === "livreur" ? "Livreur"
    : "Client";

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <UserIcon className="h-7 w-7" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Mon profil</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Mail className="h-3.5 w-3.5" />
            <span>{user?.email}</span>
            <Badge variant="secondary" className="gap-1">
              <Shield className="h-3 w-3" />
              {roleLabel}
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserIcon className="h-5 w-5 text-primary" />
              Informations personnelles
            </CardTitle>
            <CardDescription>
              Ces informations servent d'expéditeur sur vos bordereaux.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="nom">Nom complet</Label>
                  <Input
                    id="nom"
                    value={form.nom}
                    onChange={(e) => setForm({ ...form, nom: e.target.value })}
                    required
                    maxLength={120}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="telephone" className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" /> Téléphone
                  </Label>
                  <Input
                    id="telephone"
                    value={form.telephone}
                    onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                    required
                    maxLength={20}
                    placeholder="05 XX XX XX XX"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="nom_boutique" className="flex items-center gap-1">
                    <Store className="h-3.5 w-3.5" /> Nom de boutique
                  </Label>
                  <Input
                    id="nom_boutique"
                    value={form.nom_boutique}
                    onChange={(e) => setForm({ ...form, nom_boutique: e.target.value })}
                    maxLength={120}
                    placeholder="Optionnel"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="adresse" className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> Adresse
                  </Label>
                  <Input
                    id="adresse"
                    value={form.adresse}
                    onChange={(e) => setForm({ ...form, adresse: e.target.value })}
                    maxLength={255}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="wilaya">Commune (départ de vos colis)</Label>
                  <select
                    id="wilaya"
                    value={form.wilaya}
                    onChange={(e) => setForm({ ...form, wilaya: e.target.value })}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">— Choisir votre commune —</option>
                    {COMMUNES.map((c) => (
                      <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                  <p className="text-[11px] text-muted-foreground">
                    Utilisée comme commune de départ à chaque commande.
                  </p>
                </div>
                <Button type="submit" disabled={saving} className="w-full gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Enregistrer
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              Sécurité
            </CardTitle>
            <CardDescription>Changez votre mot de passe régulièrement.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="current">Mot de passe actuel</Label>
                <Input
                  id="current"
                  type="password"
                  value={pw.current}
                  onChange={(e) => setPw({ ...pw, current: e.target.value })}
                  required
                  autoComplete="current-password"
                />
              </div>
              <Separator />
              <div className="space-y-1.5">
                <Label htmlFor="next">Nouveau mot de passe</Label>
                <Input
                  id="next"
                  type="password"
                  value={pw.next}
                  onChange={(e) => setPw({ ...pw, next: e.target.value })}
                  required
                  autoComplete="new-password"
                />
                <p className="text-[11px] text-muted-foreground">
                  Min. 8 caractères, 1 majuscule, 1 minuscule, 1 chiffre.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm">Confirmer</Label>
                <Input
                  id="confirm"
                  type="password"
                  value={pw.confirm}
                  onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
                  required
                  autoComplete="new-password"
                />
              </div>
              <Button type="submit" disabled={changing} variant="default" className="w-full gap-2">
                {changing ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                Changer le mot de passe
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}