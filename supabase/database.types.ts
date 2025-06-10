export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
        }
        Relationships: []
      }
      kpis: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          value: Json
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id: string
          name: string
          value: Json
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          value?: Json
        }
        Relationships: []
      }
      tasks: {
        Row: {
          id: string
          scheduled_execution: string
          kpi_id: string
          device_id: string
          status: string
          value: any
          completion_date: string | null
          alert_checked: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          scheduled_execution: string
          kpi_id: string
          device_id: string
          status?: string
          value?: any
          completion_date?: string | null
          alert_checked?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          scheduled_execution?: string
          kpi_id?: string
          device_id?: string
          status?: string
          value?: any
          completion_date?: string | null
          alert_checked?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_device"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_kpi"
            columns: ["kpi_id"]
            isOneToOne: false
            referencedRelation: "kpis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_kpi_id_fkey"
            columns: ["kpi_id"]
            isOneToOne: false
            referencedRelation: "kpis"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_alerts: {
        Row: {
          id: string
          kpi_id: string
          device_id: string
          is_active: boolean
          email: string
          conditions: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          kpi_id: string
          device_id: string
          is_active?: boolean
          email: string
          conditions: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          kpi_id?: string
          device_id?: string
          is_active?: boolean
          email?: string
          conditions?: Json
          created_at?: string
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
            foreignKeyName: "kpi_alerts_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          }
        ]
      }
      kpi_alert_logs: {
        Row: {
          id: string
          alert_id: string
          kpi_id: string
          device_id: string
          triggered_value: Json
          triggered_at: string
          email_sent: boolean
          email_sent_at: string | null
          error_message: string | null
        }
        Insert: {
          id?: string
          alert_id: string
          kpi_id: string
          device_id: string
          triggered_value: Json
          triggered_at?: string
          email_sent?: boolean
          email_sent_at?: string | null
          error_message?: string | null
        }
        Update: {
          id?: string
          alert_id?: string
          kpi_id?: string
          device_id?: string
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
            isOneToOne: false
            referencedRelation: "kpi_alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_alert_logs_kpi_id_fkey"
            columns: ["kpi_id"]
            isOneToOne: false
            referencedRelation: "kpis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_alert_logs_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          }
        ]
      }
      profiles: {
        Row: {
          id: string
          email: string
          role: 'operator' | 'admin' | 'referrer'
          status: 'registered' | 'activated'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          role: 'operator' | 'admin' | 'referrer'
          status?: 'registered' | 'activated'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          role?: 'operator' | 'admin' | 'referrer'
          status?: 'registered' | 'activated'
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
