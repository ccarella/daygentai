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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      api_rate_limits: {
        Row: {
          created_at: string | null
          id: string
          request_count: number
          updated_at: string | null
          window_start: string
          window_type: string
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          request_count?: number
          updated_at?: string | null
          window_start: string
          window_type: string
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          request_count?: number
          updated_at?: string | null
          window_start?: string
          window_type?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_rate_limits_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      api_usage: {
        Row: {
          cache_hit: boolean | null
          created_at: string | null
          endpoint: string
          estimated_cost: number
          id: string
          input_tokens: number
          model: string
          month_year: string | null
          output_tokens: number
          provider: string
          request_id: string | null
          response_time_ms: number | null
          total_tokens: number
          user_id: string
          workspace_id: string
        }
        Insert: {
          cache_hit?: boolean | null
          created_at?: string | null
          endpoint: string
          estimated_cost?: number
          id?: string
          input_tokens?: number
          model: string
          month_year?: string | null
          output_tokens?: number
          provider: string
          request_id?: string | null
          response_time_ms?: number | null
          total_tokens?: number
          user_id: string
          workspace_id: string
        }
        Update: {
          cache_hit?: boolean | null
          created_at?: string | null
          endpoint?: string
          estimated_cost?: number
          id?: string
          input_tokens?: number
          model?: string
          month_year?: string | null
          output_tokens?: number
          provider?: string
          request_id?: string | null
          response_time_ms?: number | null
          total_tokens?: number
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_usage_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          issue_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          issue_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          issue_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "issues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      issue_tags: {
        Row: {
          created_at: string
          id: string
          issue_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          issue_id: string
          tag_id: string
        }
        Update: {
          created_at?: string
          id?: string
          issue_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "issue_tags_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "issues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issue_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      issues: {
        Row: {
          assignee_id: string | null
          created_at: string | null
          created_by: string
          creator_id: string | null
          description: string | null
          generated_prompt: string | null
          id: string
          priority: Database["public"]["Enums"]["issue_priority"]
          prompt_generated_at: string | null
          prompt_status: Database["public"]["Enums"]["prompt_status"] | null
          status: Database["public"]["Enums"]["issue_status"]
          title: string
          type: Database["public"]["Enums"]["issue_type"]
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          assignee_id?: string | null
          created_at?: string | null
          created_by: string
          creator_id?: string | null
          description?: string | null
          generated_prompt?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["issue_priority"]
          prompt_generated_at?: string | null
          prompt_status?: Database["public"]["Enums"]["prompt_status"] | null
          status: Database["public"]["Enums"]["issue_status"]
          title: string
          type?: Database["public"]["Enums"]["issue_type"]
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          assignee_id?: string | null
          created_at?: string | null
          created_by?: string
          creator_id?: string | null
          description?: string | null
          generated_prompt?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["issue_priority"]
          prompt_generated_at?: string | null
          prompt_status?: Database["public"]["Enums"]["prompt_status"] | null
          status?: Database["public"]["Enums"]["issue_status"]
          title?: string
          type?: Database["public"]["Enums"]["issue_type"]
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "issues_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issues_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_tags: {
        Row: {
          created_at: string | null
          id: string
          recipe_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          recipe_id: string
          tag_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          recipe_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_tags_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          is_system: boolean | null
          phases: string[] | null
          prompt: string
          title: string
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          is_system?: boolean | null
          phases?: string[] | null
          prompt: string
          title: string
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          is_system?: boolean | null
          phases?: string[] | null
          prompt?: string
          title?: string
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tags_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          id: string
          name: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      workspace_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: string
          token: string
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          role: string
          token?: string
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: string
          token?: string
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_invitations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          created_at: string | null
          id: string
          role: string
          updated_at: string | null
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: string
          updated_at?: string | null
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: string
          updated_at?: string | null
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          agent_configuration: string | null
          agents_content: string | null
          api_key: string | null
          api_provider: string | null
          avatar_url: string | null
          created_at: string | null
          id: string
          name: string
          owner_id: string
          slug: string
          updated_at: string | null
          usage_limit_enabled: boolean | null
          usage_limit_monthly: number | null
        }
        Insert: {
          agent_configuration?: string | null
          agents_content?: string | null
          api_key?: string | null
          api_provider?: string | null
          avatar_url?: string | null
          created_at?: string | null
          id?: string
          name: string
          owner_id: string
          slug: string
          updated_at?: string | null
          usage_limit_enabled?: boolean | null
          usage_limit_monthly?: number | null
        }
        Update: {
          agent_configuration?: string | null
          agents_content?: string | null
          api_key?: string | null
          api_provider?: string | null
          avatar_url?: string | null
          created_at?: string | null
          id?: string
          name?: string
          owner_id?: string
          slug?: string
          updated_at?: string | null
          usage_limit_enabled?: boolean | null
          usage_limit_monthly?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_workspace: {
        Args: { p_name: string; p_slug: string; p_avatar_url?: string }
        Returns: Json
      }
      get_user_first_workspace: {
        Args: { p_user_id: string }
        Returns: {
          id: string
          name: string
          slug: string
          avatar_url: string
          created_at: string
        }[]
      }
      get_workspace_monthly_usage: {
        Args: { p_workspace_id: string; p_month_year?: string }
        Returns: number
      }
      increment_rate_limit: {
        Args: {
          p_workspace_id: string
          p_window_start: string
          p_window_type: string
        }
        Returns: undefined
      }
      search_issues: {
        Args: {
          search_query: string
          p_workspace_id: string
          limit_count?: number
        }
        Returns: {
          id: string
          title: string
          description: string
          type: Database["public"]["Enums"]["issue_type"]
          priority: Database["public"]["Enums"]["issue_priority"]
          status: Database["public"]["Enums"]["issue_status"]
          workspace_id: string
          created_by: string
          assignee_id: string
          created_at: string
          updated_at: string
          generated_prompt: string
        }[]
      }
    }
    Enums: {
      issue_priority: "critical" | "high" | "medium" | "low"
      issue_status: "todo" | "in_progress" | "in_review" | "done"
      issue_type:
        | "bug"
        | "feature"
        | "task"
        | "epic"
        | "spike"
        | "chore"
        | "design"
        | "non-technical"
        | "product"
      prompt_status: "pending" | "generating" | "completed" | "failed"
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
      issue_priority: ["critical", "high", "medium", "low"],
      issue_status: ["todo", "in_progress", "in_review", "done"],
      issue_type: [
        "bug",
        "feature",
        "task",
        "epic",
        "spike",
        "chore",
        "design",
        "non-technical",
        "product",
      ],
      prompt_status: ["pending", "generating", "completed", "failed"],
    },
  },
} as const