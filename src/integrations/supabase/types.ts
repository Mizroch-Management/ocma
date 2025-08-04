export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      generated_content: {
        Row: {
          ai_tool: string | null
          content: string
          content_type: string
          created_at: string
          hashtags: string[] | null
          id: string
          is_scheduled: boolean | null
          metadata: Json | null
          organization_id: string | null
          platform_optimizations: Json | null
          platforms: string[] | null
          publication_status: string | null
          scheduled_date: string | null
          scheduled_platforms: string[] | null
          scheduling_suggestions: Json | null
          strategy: string | null
          suggestions: Json | null
          title: string
          updated_at: string
          user_id: string
          variations: Json | null
        }
        Insert: {
          ai_tool?: string | null
          content: string
          content_type: string
          created_at?: string
          hashtags?: string[] | null
          id?: string
          is_scheduled?: boolean | null
          metadata?: Json | null
          organization_id?: string | null
          platform_optimizations?: Json | null
          platforms?: string[] | null
          publication_status?: string | null
          scheduled_date?: string | null
          scheduled_platforms?: string[] | null
          scheduling_suggestions?: Json | null
          strategy?: string | null
          suggestions?: Json | null
          title: string
          updated_at?: string
          user_id: string
          variations?: Json | null
        }
        Update: {
          ai_tool?: string | null
          content?: string
          content_type?: string
          created_at?: string
          hashtags?: string[] | null
          id?: string
          is_scheduled?: boolean | null
          metadata?: Json | null
          organization_id?: string | null
          platform_optimizations?: Json | null
          platforms?: string[] | null
          publication_status?: string | null
          scheduled_date?: string | null
          scheduled_platforms?: string[] | null
          scheduling_suggestions?: Json | null
          strategy?: string | null
          suggestions?: Json | null
          title?: string
          updated_at?: string
          user_id?: string
          variations?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_content_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          joined_at: string
          organization_id: string
          role: Database["public"]["Enums"]["organization_role"]
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          joined_at?: string
          organization_id: string
          role?: Database["public"]["Enums"]["organization_role"]
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          joined_at?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["organization_role"]
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_organization_members_profiles"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          description: string | null
          id: string
          metadata: Json | null
          name: string
          settings: Json | null
          slug: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          name: string
          settings?: Json | null
          slug?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          settings?: Json | null
          slug?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      publication_logs: {
        Row: {
          content_id: string
          created_at: string
          error_message: string | null
          id: string
          metrics: Json | null
          platform: string
          platform_post_id: string | null
          published_at: string | null
          status: string
        }
        Insert: {
          content_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          metrics?: Json | null
          platform: string
          platform_post_id?: string | null
          published_at?: string | null
          status: string
        }
        Update: {
          content_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          metrics?: Json | null
          platform?: string
          platform_post_id?: string | null
          published_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "publication_logs_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "generated_content"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          organization_id: string | null
          setting_key: string
          setting_value: Json
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          organization_id?: string | null
          setting_key: string
          setting_value: Json
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          organization_id?: string | null
          setting_key?: string
          setting_value?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invitations: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          invitation_token: string
          invitee_email: string
          invitee_name: string | null
          organization_id: string | null
          role: string
          status: string
          team_owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          invitation_token: string
          invitee_email: string
          invitee_name?: string | null
          organization_id?: string | null
          role?: string
          status?: string
          team_owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          invitation_token?: string
          invitee_email?: string
          invitee_name?: string | null
          organization_id?: string | null
          role?: string
          status?: string
          team_owner_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          created_at: string
          id: string
          invited_at: string
          joined_at: string | null
          member_email: string
          member_name: string | null
          organization_id: string | null
          permissions: Json
          role: string
          status: string
          team_owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_at?: string
          joined_at?: string | null
          member_email: string
          member_name?: string | null
          organization_id?: string | null
          permissions?: Json
          role?: string
          status?: string
          team_owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_at?: string
          joined_at?: string | null
          member_email?: string
          member_name?: string | null
          organization_id?: string | null
          permissions?: Json
          role?: string
          status?: string
          team_owner_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          role?: Database["public"]["Enums"]["app_role"]
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
      workflows: {
        Row: {
          business_info_data: Json | null
          content_data: Json | null
          created_at: string
          current_step: number
          draft_data: Json | null
          id: string
          last_saved_at: string
          metadata: Json | null
          organization_id: string | null
          plans_data: Json | null
          progress_data: Json
          status: string
          strategy_data: Json | null
          title: string | null
          updated_at: string
          user_id: string
          workflow_type: string
        }
        Insert: {
          business_info_data?: Json | null
          content_data?: Json | null
          created_at?: string
          current_step?: number
          draft_data?: Json | null
          id?: string
          last_saved_at?: string
          metadata?: Json | null
          organization_id?: string | null
          plans_data?: Json | null
          progress_data?: Json
          status?: string
          strategy_data?: Json | null
          title?: string | null
          updated_at?: string
          user_id: string
          workflow_type?: string
        }
        Update: {
          business_info_data?: Json | null
          content_data?: Json | null
          created_at?: string
          current_step?: number
          draft_data?: Json | null
          id?: string
          last_saved_at?: string
          metadata?: Json | null
          organization_id?: string | null
          plans_data?: Json | null
          progress_data?: Json
          status?: string
          strategy_data?: Json | null
          title?: string | null
          updated_at?: string
          user_id?: string
          workflow_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflows_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_organization: {
        Args: { _user_id: string }
        Returns: string
      }
      has_organization_role: {
        Args: {
          _user_id: string
          _organization_id: string
          _role: Database["public"]["Enums"]["organization_role"]
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
      is_app_owner: {
        Args: { _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "owner" | "admin" | "member"
      organization_role: "owner" | "admin" | "member"
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
      app_role: ["owner", "admin", "member"],
      organization_role: ["owner", "admin", "member"],
    },
  },
} as const
