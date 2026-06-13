export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      colis: {
        Row: {
          client_id: string | null
          date_creation: string
          depart: string | null
          description: string | null
          destinataire_adresse: string
          destinataire_cp: string | null
          destinataire_nom: string
          destinataire_tel: string
          destinataire_wilaya: string | null
          distance_km: number | null
          expediteur_adresse: string
          expediteur_nom: string
          expediteur_tel: string
          id: string
          livreur_id: string | null
          prix: number
          prix_colis: number
          statut: string
          tracking: string
          type_livraison: string
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          date_creation?: string
          depart?: string | null
          description?: string | null
          destinataire_adresse: string
          destinataire_cp?: string | null
          destinataire_nom: string
          destinataire_tel: string
          destinataire_wilaya?: string | null
          distance_km?: number | null
          expediteur_adresse: string
          expediteur_nom: string
          expediteur_tel: string
          id?: string
          livreur_id?: string | null
          prix?: number
          prix_colis?: number
          statut?: string
          tracking: string
          type_livraison?: string
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          date_creation?: string
          depart?: string | null
          description?: string | null
          destinataire_adresse?: string
          destinataire_cp?: string | null
          destinataire_nom?: string
          destinataire_tel?: string
          destinataire_wilaya?: string | null
          distance_km?: number | null
          expediteur_adresse?: string
          expediteur_nom?: string
          expediteur_tel?: string
          id?: string
          livreur_id?: string | null
          prix?: number
          prix_colis?: number
          statut?: string
          tracking?: string
          type_livraison?: string
          updated_at?: string
        }
        Relationships: []
      }
      colis_historique: {
        Row: {
          colis_id: string
          created_at: string
          description: string | null
          id: string
          lieu: string | null
          statut: string
        }
        Insert: {
          colis_id: string
          created_at?: string
          description?: string | null
          id?: string
          lieu?: string | null
          statut: string
        }
        Update: {
          colis_id?: string
          created_at?: string
          description?: string | null
          id?: string
          lieu?: string | null
          statut?: string
        }
        Relationships: [
          {
            foreignKeyName: "colis_historique_colis_id_fkey"
            columns: ["colis_id"]
            isOneToOne: false
            referencedRelation: "colis"
            referencedColumns: ["id"]
          },
        ]
      }
      livreur_positions: {
        Row: {
          accuracy: number | null
          heading: number | null
          latitude: number
          livreur_id: string
          longitude: number
          speed: number | null
          updated_at: string
        }
        Insert: {
          accuracy?: number | null
          heading?: number | null
          latitude: number
          livreur_id: string
          longitude: number
          speed?: number | null
          updated_at?: string
        }
        Update: {
          accuracy?: number | null
          heading?: number | null
          latitude?: number
          livreur_id?: string
          longitude?: number
          speed?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          colis_id: string | null
          created_at: string
          id: string
          message: string | null
          read: boolean
          title: string
          tracking: string | null
          type: string
          user_id: string
        }
        Insert: {
          colis_id?: string | null
          created_at?: string
          id?: string
          message?: string | null
          read?: boolean
          title: string
          tracking?: string | null
          type?: string
          user_id: string
        }
        Update: {
          colis_id?: string | null
          created_at?: string
          id?: string
          message?: string | null
          read?: boolean
          title?: string
          tracking?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          adresse: string | null
          created_at: string
          email: string | null
          id: string
          nom: string | null
          nom_boutique: string | null
          telephone: string | null
          updated_at: string
          wilaya: string | null
        }
        Insert: {
          adresse?: string | null
          created_at?: string
          email?: string | null
          id: string
          nom?: string | null
          nom_boutique?: string | null
          telephone?: string | null
          updated_at?: string
          wilaya?: string | null
        }
        Update: {
          adresse?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nom?: string | null
          nom_boutique?: string | null
          telephone?: string | null
          updated_at?: string
          wilaya?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "client"
        | "livreur"
        | "commercial"
        | "admin_commercial"
        | "admin_operations"
        | "admin_service_client"
        | "service_client"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "client",
        "livreur",
        "commercial",
        "admin_commercial",
        "admin_operations",
        "admin_service_client",
        "service_client",
      ],
    },
  },
} as const
