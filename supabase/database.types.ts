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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      devices: {
        Row: {
          created_at: string | null
          deleted: boolean
          description: string | null
          id: string
          location: string | null
          model: string | null
          name: string
          qrcode_url: string | null
          tags: string[] | null
          type: string | null
        }
        Insert: {
          created_at?: string | null
          deleted?: boolean
          description?: string | null
          id: string
          location?: string | null
          model?: string | null
          name: string
          qrcode_url?: string | null
          tags?: string[] | null
          type?: string | null
        }
        Update: {
          created_at?: string | null
          deleted?: boolean
          description?: string | null
          id?: string
          location?: string | null
          model?: string | null
          name?: string
          qrcode_url?: string | null
          tags?: string[] | null
          type?: string | null
        }
        Relationships: []
      }
      export_templates: {
        Row: {
          created_at: string
          email_autosend: string | null
          field_mapping: Json | null
          file_url: string | null
          id: string
          template_name: string | null
        }
        Insert: {
          created_at?: string
          email_autosend?: string | null
          field_mapping?: Json | null
          file_url?: string | null
          id?: string
          template_name?: string | null
        }
        Update: {
          created_at?: string
          email_autosend?: string | null
          field_mapping?: Json | null
          file_url?: string | null
          id?: string
          template_name?: string | null
        }
        Relationships: []
      }
      kpi_alert_logs: {
        Row: {
          alert_id: string
          email_sent: boolean
          email_sent_at: string | null
          error_message: string | null
          id: string
          triggered_at: string
          triggered_value: Json
        }
        Insert: {
          alert_id: string
          email_sent?: boolean
          email_sent_at?: string | null
          error_message?: string | null
          id?: string
          triggered_at?: string
          triggered_value: Json
        }
        Update: {
          alert_id?: string
          email_sent?: boolean
          email_sent_at?: string | null
          error_message?: string | null
          id?: string
          triggered_at?: string
          triggered_value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "kpi_alert_logs_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "kpi_alerts"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_alerts: {
        Row: {
          conditions: Json
          created_at: string
          email: string
          id: string
          is_active: boolean
          kpi_id: string
          todolist_id: string
          updated_at: string
        }
        Insert: {
          conditions: Json
          created_at?: string
          email: string
          id?: string
          is_active?: boolean
          kpi_id: string
          todolist_id: string
          updated_at?: string
        }
        Update: {
          conditions?: Json
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          kpi_id?: string
          todolist_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kpi_alerts_kpi_id_fkey"
            columns: ["kpi_id"]
            isOneToOne: false
            referencedRelation: "kpis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_alerts_todolist_id_fkey"
            columns: ["todolist_id"]
            isOneToOne: false
            referencedRelation: "todolist"
            referencedColumns: ["id"]
          },
        ]
      }
      kpis: {
        Row: {
          created_at: string | null
          deleted: boolean
          description: string | null
          id: string
          name: string
          value: Json
        }
        Insert: {
          created_at?: string | null
          deleted?: boolean
          description?: string | null
          id: string
          name: string
          value: Json
        }
        Update: {
          created_at?: string | null
          deleted?: boolean
          description?: string | null
          id?: string
          name?: string
          value?: Json
        }
        Relationships: []
      }
      profiles: {
        Row: {
          auth_id: string | null
          created_at: string
          email: string
          id: string
          role: string
          status: string
          updated_at: string
        }
        Insert: {
          auth_id?: string | null
          created_at?: string
          email: string
          id?: string
          role: string
          status?: string
          updated_at?: string
        }
        Update: {
          auth_id?: string | null
          created_at?: string
          email?: string
          id?: string
          role?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          alert_checked: boolean | null
          completed_at: string | null
          completed_by_user_id: string | null
          created_at: string | null
          created_by_user_id: string | null
          id: string
          kpi_id: string
          status: string
          todolist_id: string
          updated_at: string
          value: Json | null
        }
        Insert: {
          alert_checked?: boolean | null
          completed_at?: string | null
          completed_by_user_id?: string | null
          created_at?: string | null
          created_by_user_id?: string | null
          id: string
          kpi_id: string
          status: string
          todolist_id: string
          updated_at?: string
          value?: Json | null
        }
        Update: {
          alert_checked?: boolean | null
          completed_at?: string | null
          completed_by_user_id?: string | null
          created_at?: string | null
          created_by_user_id?: string | null
          id?: string
          kpi_id?: string
          status?: string
          todolist_id?: string
          updated_at?: string
          value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_kpi"
            columns: ["kpi_id"]
            isOneToOne: false
            referencedRelation: "kpis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_kpi_id_fkey"
            columns: ["kpi_id"]
            isOneToOne: false
            referencedRelation: "kpis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_todolist_id_fkey"
            columns: ["todolist_id"]
            isOneToOne: false
            referencedRelation: "todolist"
            referencedColumns: ["id"]
          },
        ]
      }
      todolist: {
        Row: {
          completed_by: string | null
          completion_date: string | null
          created_at: string | null
          device_id: string
          end_day_time: string | null
          id: string
          scheduled_execution: string
          status: string
          time_slot_end: number | null
          time_slot_start: number | null
          time_slot_type: string
          updated_at: string | null
        }
        Insert: {
          completed_by?: string | null
          completion_date?: string | null
          created_at?: string | null
          device_id: string
          end_day_time?: string | null
          id?: string
          scheduled_execution: string
          status?: string
          time_slot_end?: number | null
          time_slot_start?: number | null
          time_slot_type?: string
          updated_at?: string | null
        }
        Update: {
          completed_by?: string | null
          completion_date?: string | null
          created_at?: string | null
          device_id?: string
          end_day_time?: string | null
          id?: string
          scheduled_execution?: string
          status?: string
          time_slot_end?: number | null
          time_slot_start?: number | null
          time_slot_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "todolist_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
        ]
      }
      todolist_alert: {
        Row: {
          created_at: string
          email: string
          id: string
          is_active: boolean
          todolist_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_active?: boolean
          todolist_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          todolist_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "todolist_alert_todolist_id_fkey"
            columns: ["todolist_id"]
            isOneToOne: false
            referencedRelation: "todolist"
            referencedColumns: ["id"]
          },
        ]
      }
      todolist_alert_logs: {
        Row: {
          alert_id: string
          created_at: string
          email: string
          error_message: string | null
          id: string
          sent_at: string
          todolist_id: string
        }
        Insert: {
          alert_id: string
          created_at?: string
          email: string
          error_message?: string | null
          id?: string
          sent_at?: string
          todolist_id: string
        }
        Update: {
          alert_id?: string
          created_at?: string
          email?: string
          error_message?: string | null
          id?: string
          sent_at?: string
          todolist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "todolist_alert_logs_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "todolist_alert"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "todolist_alert_logs_todolist_id_fkey"
            columns: ["todolist_id"]
            isOneToOne: false
            referencedRelation: "todolist"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activities: {
        Row: {
          action_type: Database["public"]["Enums"]["user_action_type"]
          created_at: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["entity_type"]
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          action_type: Database["public"]["Enums"]["user_action_type"]
          created_at?: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["entity_type"]
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          action_type?: Database["public"]["Enums"]["user_action_type"]
          created_at?: string
          entity_id?: string
          entity_type?: Database["public"]["Enums"]["entity_type"]
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      log_user_activity: {
        Args: {
          p_user_id: string
          p_action_type: Database["public"]["Enums"]["user_action_type"]
          p_entity_type: Database["public"]["Enums"]["entity_type"]
          p_entity_id: string
          p_metadata?: Json
        }
        Returns: string
      }
    }
    Enums: {
      entity_type: "device" | "kpi" | "todolist" | "task"
      user_action_type:
        | "create_device"
        | "create_kpi"
        | "create_todolist"
        | "complete_task"
        | "complete_todolist"
        | "update_device"
        | "update_kpi"
        | "update_todolist"
        | "delete_device"
        | "delete_kpi"
        | "delete_todolist"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      entity_type: ["device", "kpi", "todolist", "task"],
      user_action_type: [
        "create_device",
        "create_kpi",
        "create_todolist",
        "complete_task",
        "complete_todolist",
        "update_device",
        "update_kpi",
        "update_todolist",
        "delete_device",
        "delete_kpi",
        "delete_todolist",
      ],
    },
  },
} as const
