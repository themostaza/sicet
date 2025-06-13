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
      todolist: {
        Row: {
          id: string
          device_id: string
          scheduled_execution: string
          status: "pending" | "in_progress" | "completed"
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          device_id: string
          scheduled_execution: string
          status?: "pending" | "in_progress" | "completed"
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          device_id?: string
          scheduled_execution?: string
          status?: "pending" | "in_progress" | "completed"
          created_at?: string | null
          updated_at?: string | null
        }
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
            referencedRelation: "todolist"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_kpi_id_fkey"
            columns: ["kpi_id"]
            referencedRelation: "kpis"
            referencedColumns: ["id"]
          }
        ]
      }
      devices: {
        Row: {
          id: string
          name: string
          location: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          location?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          location?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      kpis: {
        Row: {
          id: string
          name: string
          description: string | null
          value: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          value?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          value?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
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
  }
}

export type TablesInsert<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Insert"]
export type TablesRow<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"]
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Update"] 