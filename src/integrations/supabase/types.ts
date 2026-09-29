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
      admin_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string | null
          details: Json | null
          id: string
          target_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          target_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          target_id?: string | null
        }
        Relationships: []
      }
      appointments: {
        Row: {
          aviso_24h_em: string | null
          aviso_48h_em: string | null
          created_at: string
          data_hora: string
          especialidade: string | null
          family_id: string | null
          id: string
          local: string | null
          observacoes: string | null
          resident_id: string | null
          status: string
          tipo: string
          titulo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          aviso_24h_em?: string | null
          aviso_48h_em?: string | null
          created_at?: string
          data_hora: string
          especialidade?: string | null
          family_id?: string | null
          id?: string
          local?: string | null
          observacoes?: string | null
          resident_id?: string | null
          status?: string
          tipo?: string
          titulo: string
          updated_at?: string
          user_id: string
        }
        Update: {
          aviso_24h_em?: string | null
          aviso_48h_em?: string | null
          created_at?: string
          data_hora?: string
          especialidade?: string | null
          family_id?: string | null
          id?: string
          local?: string | null
          observacoes?: string | null
          resident_id?: string | null
          status?: string
          tipo?: string
          titulo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
      }
      families: {
        Row: {
          bairro: string | null
          cep: string | null
          cidade: string | null
          complemento: string | null
          created_at: string
          id: string
          latitude: number | null
          logradouro: string
          longitude: number | null
          micro_area: string | null
          nome: string
          numero: string | null
          observacoes: string | null
          risco: string
          situacao: string
          telefone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          created_at?: string
          id?: string
          latitude?: number | null
          logradouro?: string
          longitude?: number | null
          micro_area?: string | null
          nome: string
          numero?: string | null
          observacoes?: string | null
          risco?: string
          situacao?: string
          telefone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          created_at?: string
          id?: string
          latitude?: number | null
          logradouro?: string
          longitude?: number | null
          micro_area?: string | null
          nome?: string
          numero?: string | null
          observacoes?: string | null
          risco?: string
          situacao?: string
          telefone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          message: string
          read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          read?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          aprovado: boolean
          aprovado_em: string | null
          aprovado_por: string | null
          created_at: string
          email: string | null
          id: string
          micro_area: string | null
          nome: string
          unidade: string | null
          updated_at: string
        }
        Insert: {
          aprovado?: boolean
          aprovado_em?: string | null
          aprovado_por?: string | null
          created_at?: string
          email?: string | null
          id: string
          micro_area?: string | null
          nome?: string
          unidade?: string | null
          updated_at?: string
        }
        Update: {
          aprovado?: boolean
          aprovado_em?: string | null
          aprovado_por?: string | null
          created_at?: string
          email?: string | null
          id?: string
          micro_area?: string | null
          nome?: string
          unidade?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      residents: {
        Row: {
          acamado: boolean
          cns: string | null
          condicoes: string[]
          cpf: string | null
          created_at: string
          data_nascimento: string | null
          family_id: string
          gestante: boolean
          id: string
          nome: string
          observacoes: string | null
          parentesco: string | null
          sexo: string | null
          telefone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          acamado?: boolean
          cns?: string | null
          condicoes?: string[]
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          family_id: string
          gestante?: boolean
          id?: string
          nome: string
          observacoes?: string | null
          parentesco?: string | null
          sexo?: string | null
          telefone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          acamado?: boolean
          cns?: string | null
          condicoes?: string[]
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          family_id?: string
          gestante?: boolean
          id?: string
          nome?: string
          observacoes?: string | null
          parentesco?: string | null
          sexo?: string | null
          telefone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "residents_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      transferencias: {
        Row: {
          created_at: string
          de_user_id: string
          destino_externo: string | null
          family_id: string
          id: string
          motivo: string | null
          para_user_id: string | null
          respondida_em: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          de_user_id: string
          destino_externo?: string | null
          family_id: string
          id?: string
          motivo?: string | null
          para_user_id?: string | null
          respondida_em?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          de_user_id?: string
          destino_externo?: string | null
          family_id?: string
          id?: string
          motivo?: string | null
          para_user_id?: string | null
          respondida_em?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transferencias_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
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
      visits: {
        Row: {
          agendada_em: string
          anotacoes: string | null
          created_at: string
          family_id: string
          id: string
          motivo: string | null
          realizada_em: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agendada_em: string
          anotacoes?: string | null
          created_at?: string
          family_id: string
          id?: string
          motivo?: string | null
          realizada_em?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agendada_em?: string
          anotacoes?: string | null
          created_at?: string
          family_id?: string
          id?: string
          motivo?: string | null
          realizada_em?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visits_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      aceitar_transferencia: { Args: { _id: string }; Returns: undefined }
      definir_admin: {
        Args: { _admin: boolean; _uid: string }
        Returns: undefined
      }
      definir_aprovacao: {
        Args: { _aprovado: boolean; _uid: string }
        Returns: undefined
      }
      esta_aprovado:
        | { Args: never; Returns: boolean }
        | { Args: { _uid?: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _uid?: string }; Returns: boolean }
      listar_agentes: {
        Args: never
        Returns: {
          email: string
          id: string
          micro_area: string
          nome: string
        }[]
      }
      listar_usuarios: {
        Args: never
        Returns: {
          admin: boolean
          aprovado: boolean
          created_at: string
          email: string
          id: string
          micro_area: string
          nome: string
          role: Database["public"]["Enums"]["app_role"]
          unidade: string
        }[]
      }
      recusar_transferencia: { Args: { _id: string }; Returns: undefined }
      transferir_para_posto: {
        Args: { _destino: string; _family_id: string; _motivo: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "agente"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "agente"],
    },
  },
} as const
