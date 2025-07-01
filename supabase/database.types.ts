export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      devices: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          location: string | null
          model: string | null
          name: string
          qrcode_url: string | null
          tags: string[] | null
          type: string | null
          deleted: boolean
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id: string
          location?: string | null
          model?: string | null
          name: string
          qrcode_url?: string | null
          tags?: string[] | null
          type?: string | null
          deleted?: boolean
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          location?: string | null
          model?: string | null
          name?: string
          qrcode_url?: string | null
          tags?: string[] | null
          type?: string | null
          deleted?: boolean
        }
        Relationships: []
      }
      kpis: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          value: Json | null
          deleted: boolean
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id: string
          name: string
          value?: Json | null
          deleted?: boolean
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          value?: Json | null
          deleted?: boolean
        }
        Relationships: []
      }
      tasks: {
        Row: {
          id: string
          todolist_id: string
          kpi_id: string
          status: string
          value: Json | null
          created_at: string | null
          alert_checked: boolean
          updated_at: string | null
        }
        Insert: {
          id?: string
          todolist_id: string
          kpi_id: string
          status?: string
          value?: Json | null
          created_at?: string | null
          alert_checked?: boolean
          updated_at?: string | null
        }
        Update: {
          id?: string
          todolist_id?: string
          kpi_id?: string
          status?: string
          value?: Json | null
          created_at?: string | null
          alert_checked?: boolean
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_todolist_id_fkey"
            columns: ["todolist_id"]
            isOneToOne: false
            referencedRelation: "todolist"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_kpi_id_fkey"
            columns: ["kpi_id"]
            isOneToOne: false
            referencedRelation: "kpis"
            referencedColumns: ["id"]
          }
        ]
      }
      kpi_alerts: {
        Row: {
          id: string
          kpi_id: string
          todolist_id: string
          is_active: boolean
          email: string
          conditions: Json
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          kpi_id: string
          todolist_id: string
          is_active?: boolean
          email: string
          conditions: Json
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          kpi_id?: string
          todolist_id?: string
          is_active?: boolean
          email?: string
          conditions?: Json
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kpi_alerts_kpi_id_fkey"
            columns: ["kpi_id"]
            referencedRelation: "kpis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_alerts_todolist_id_fkey"
            columns: ["todolist_id"]
            referencedRelation: "todolist"
            referencedColumns: ["id"]
          }
        ]
      }
      kpi_alert_logs: {
        Row: {
          id: string
          alert_id: string
          triggered_value: Json
          triggered_at: string
          email_sent: boolean
          email_sent_at: string | null
          error_message: string | null
        }
        Insert: {
          id?: string
          alert_id: string
          triggered_value: Json
          triggered_at?: string
          email_sent?: boolean
          email_sent_at?: string | null
          error_message?: string | null
        }
        Update: {
          id?: string
          alert_id?: string
          triggered_value?: Json
          triggered_at?: string
          email_sent?: boolean
          email_sent_at?: string | null
          error_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kpi_alert_logs_alert_id_fkey"
            columns: ["alert_id"]
            referencedRelation: "kpi_alerts"
            referencedColumns: ["id"]
          }
        ]
      }
      user_activities: {
        Row: {
          id: string
          user_id: string
          action_type: Database['public']['Enums']['user_action_type']
          entity_type: Database['public']['Enums']['entity_type']
          entity_id: string
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          action_type: Database['public']['Enums']['user_action_type']
          entity_type: Database['public']['Enums']['entity_type']
          entity_id: string
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          action_type?: Database['public']['Enums']['user_action_type']
          entity_type?: Database['public']['Enums']['entity_type']
          entity_id?: string
          metadata?: Json
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_activities_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      profiles: {
        Row: {
          id: string
          email: string
          role: 'operator' | 'admin' | 'referrer'
          status: 'registered' | 'activated' | 'reset-password'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          role: 'operator' | 'admin' | 'referrer'
          status?: 'registered' | 'activated' | 'reset-password'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          role?: 'operator' | 'admin' | 'referrer'
          status?: 'registered' | 'activated' | 'reset-password'
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      todolist: {
        Row: {
          id: string
          device_id: string
          scheduled_execution: string
          status: "pending" | "in_progress" | "completed"
          completion_date: string | null
          created_at: string
          updated_at: string
          time_slot_type: "standard" | "custom"
          time_slot_start: number | null
          time_slot_end: number | null
        }
        Insert: {
          id?: string
          device_id: string
          scheduled_execution: string
          status?: "pending" | "in_progress" | "completed"
          completion_date?: string | null
          created_at?: string
          updated_at?: string
          time_slot_type?: "standard" | "custom"
          time_slot_start?: number | null
          time_slot_end?: number | null
        }
        Update: {
          id?: string
          device_id?: string
          scheduled_execution?: string
          status?: "pending" | "in_progress" | "completed"
          completion_date?: string | null
          created_at?: string
          updated_at?: string
          time_slot_type?: "standard" | "custom"
          time_slot_start?: number | null
          time_slot_end?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "todolist_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          }
        ]
      }
      todolist_alert: {
        Row: {
          id: string
          todolist_id: string
          email: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          todolist_id: string
          email: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          todolist_id?: string
          email?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "todolist_alert_todolist_id_fkey"
            columns: ["todolist_id"]
            referencedRelation: "todolist"
            referencedColumns: ["id"]
          }
        ]
      }
      todolist_alert_logs: {
        Row: {
          id: string
          todolist_id: string
          alert_id: string
          email: string
          sent_at: string
          error_message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          todolist_id: string
          alert_id: string
          email: string
          sent_at?: string
          error_message?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          todolist_id?: string
          alert_id?: string
          email?: string
          sent_at?: string
          error_message?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "todolist_alert_logs_todolist_id_fkey"
            columns: ["todolist_id"]
            referencedRelation: "todolist"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "todolist_alert_logs_alert_id_fkey"
            columns: ["alert_id"]
            referencedRelation: "todolist_alert"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      log_user_activity: {
        Args: {
          p_user_id: string
          p_action_type: Database['public']['Enums']['user_action_type']
          p_entity_type: Database['public']['Enums']['entity_type']
          p_entity_id: string
          p_metadata?: Json
        }
        Returns: string
      }
    }
    Enums: {
      user_action_type: 'create_device' | 'create_kpi' | 'create_todolist' | 'complete_task' | 'complete_todolist' | 
                       'update_device' | 'update_kpi' | 'update_todolist' | 
                       'delete_device' | 'delete_kpi' | 'delete_todolist'
      entity_type: 'device' | 'kpi' | 'todolist' | 'task'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
