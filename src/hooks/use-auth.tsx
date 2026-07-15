import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Role =
  | "admin"
  | "directeur_commercial"
  | "admin_commercial"
  | "admin_operations"
  | "admin_service_client"
  | "client"
  | "livreur"
  | "commercial"
  | "service_client"
  | null;

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  role: Role;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Etape 1 - Subscribe FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_evt, s) => {
      setSession(s);
      if (s?.user) {
        // Defer Supabase query to avoid deadlock inside the listener
        setTimeout(() => void fetchRole(s.user.id), 0);
      } else {
        setRole(null);
      }
    });

    // Etape 2 - Then read current session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s?.user) void fetchRole(s.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchRole(userId: string) {
    // Priorité DG > directeurs > agents (via ordre) — on prend le rôle le plus élevé
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (error) {
      console.error("fetchRole error", error);
      setRole("client");
      return;
    }
    const roles = (data ?? []).map((r) => r.role as string);
    // Ordre de priorité
    const priority = [
      "admin", "directeur_commercial", "admin_commercial",
      "admin_operations", "admin_service_client",
      "commercial", "service_client", "livreur", "client",
    ];
    const best = priority.find((p) => roles.includes(p));
    setRole((best as Role) ?? "client");
  }

  async function signOut() {
    await supabase.auth.signOut();
    setSession(null);
    setRole(null);
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        role,
        loading,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

// Where to send a user after login, based on role
export function homeForRole(role: Role): string {
  if (role === "admin") return "/admin";
  if (role === "directeur_commercial") return "/commercial";
  if (role === "admin_commercial") return "/commercial";
  if (role === "admin_operations") return "/operations";
  if (role === "admin_service_client") return "/service-client";
  if (role === "commercial") return "/commercial";
  if (role === "service_client") return "/service-client";
  if (role === "livreur") return "/livreur";
  return "/mes-colis";
}

// Libellés lisibles des rôles (pour l'affichage)
export const ROLE_LABELS: Record<string, string> = {
  admin: "Directeur Général",
  directeur_commercial: "Directeur Commercial",
  admin_commercial: "Admin Commercial",
  admin_operations: "Directeur des Opérations",
  admin_service_client: "Admin Service Client",
  commercial: "Commercial",
  service_client: "Service Client",
  livreur: "Livreur",
  client: "Client",
};
