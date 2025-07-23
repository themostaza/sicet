import { createServerSupabaseClient } from "@/lib/supabase-server"
import { AlertCircle, BellRing, Trash2, Clock, CheckSquare, ArrowUp, ArrowDown } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { format } from "date-fns"
import { it } from "date-fns/locale"
import { Database } from "@/supabase/database.types"
import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { AlertActions } from "./alert-actions"
import { AlertDelete } from "./alert-delete"
import { SupabaseClient } from "@supabase/supabase-js"
import { deleteAlert } from "@/app/actions/actions-alerts"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import AlertsClient from "./alerts-client"

type KpiAlert = Database['public']['Tables']['kpi_alerts']['Row'] & {
  kpis: Database['public']['Tables']['kpis']['Row'] | null
  todolist: (Database['public']['Tables']['todolist']['Row'] & {
    devices: Database['public']['Tables']['devices']['Row'] | null
  }) | null
}

type TodolistAlert = Database['public']['Tables']['todolist_alert']['Row'] & {
  todolist: Database['public']['Tables']['todolist']['Row'] & {
    devices: Database['public']['Tables']['devices']['Row'] | null
  } | null
}

type AlertCondition = {
  type: 'number' | 'decimal' | 'text' | 'boolean'
  field_id: string
  min?: number
  max?: number
  match_text?: string
  boolean_value?: boolean
}

// Helper function to get supabase client
const supabase = async (): Promise<SupabaseClient<Database>> =>
  await createServerSupabaseClient();

async function getKpiAlerts(): Promise<KpiAlert[]> {
  const supabase = await createServerSupabaseClient()
  
  const { data: alerts, error } = await supabase
    .from('kpi_alerts')
    .select(`
      *,
      kpis (
        name,
        description
      ),
      todolist (
        id,
        status,
        device_id,
        devices (
          name,
          location
        )
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching KPI alerts:', error)
    return []
  }

  return alerts as KpiAlert[]
}

async function getTodolistAlerts(): Promise<TodolistAlert[]> {
  const supabase = await createServerSupabaseClient()
  
  const { data: alerts, error } = await supabase
    .from('todolist_alert')
    .select(`
      *,
      todolist (
        id,
        device_id,
        scheduled_execution,
        status,
        time_slot_type,
        time_slot_start,
        time_slot_end,
        devices (
          name,
          location
        )
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching todolist alerts:', error)
    return []
  }

  return alerts as TodolistAlert[]
}

function renderKpiConditions(alert: KpiAlert) {
  // Cast sicuro dei campi del KPI
  const fields = Array.isArray(alert.kpis?.value)
    ? (alert.kpis.value as any[]).filter(f => f && typeof f === 'object' && 'id' in f && 'name' in f)
    : [];
  const conditions = Array.isArray(alert.conditions)
    ? (alert.conditions as any[]).filter(c => c && typeof c === 'object' && 'field_id' in c)
    : [];
  if (conditions.length === 0) return <span>Nessuna condizione</span>;
  return (
    <ul className="space-y-1">
      {fields.map((field: any) => {
        const cond = conditions.find((c: any) => c.field_id === field.id);
        if (!cond) return null;
        return (
          <li key={field.id} className="text-xs bg-gray-50 rounded px-2 py-1">
            <span className="font-semibold">{field.name}</span>
            {(cond.type === 'number' || cond.type === 'decimal') && (
              <>
                {cond.min !== undefined && <> | Min: <span className="font-mono">{cond.min}</span></>}
                {cond.max !== undefined && <> | Max: <span className="font-mono">{cond.max}</span></>}
              </>
            )}
            {cond.type === 'text' && cond.match_text && (
              <> | Match: <span className="font-mono">{cond.match_text}</span></>
            )}
            {cond.type === 'boolean' && cond.boolean_value !== undefined && (
              <> | Valore: <span className="font-mono">{cond.boolean_value ? 'Sì' : 'No'}</span></>
            )}
            <span className="ml-2 text-gray-400">({field.type})</span>
          </li>
        );
      })}
      {/* Se nessun campo del KPI ha una condizione, mostra tutte le condizioni raw */}
      {fields.length === 0 && conditions.map((cond: any, idx: number) => (
        <li key={idx} className="text-xs bg-gray-50 rounded px-2 py-1 whitespace-nowrap truncate">
          {(cond.type === 'number' || cond.type === 'decimal') && (
            <>
              {cond.min !== undefined && <> Min: <span className="font-mono">{cond.min}</span></>}
              {cond.max !== undefined && <> | Max: <span className="font-mono">{cond.max}</span></>}
            </>
          )}
          {cond.type === 'text' && cond.match_text && (
            <> Match: <span className="font-mono">{cond.match_text}</span></>
          )}
          {cond.type === 'boolean' && cond.boolean_value !== undefined && (
            <> Valore: <span className="font-mono">{cond.boolean_value ? 'Sì' : 'No'}</span></>
          )}
          <span className="ml-2 text-gray-400">({cond.type})</span>
        </li>
      ))}
    </ul>
  );
}

function formatTimeSlot(todolist: any) {
  if (todolist.time_slot_type === 'custom') {
    // Convert minutes to HH:MM format
    const startMinutes = todolist.time_slot_start || 0
    const endMinutes = todolist.time_slot_end || 0
    
    const startHours = Math.floor(startMinutes / 60)
    const startMins = startMinutes % 60
    const endHours = Math.floor(endMinutes / 60)
    const endMins = endMinutes % 60
    
    const startTime = `${startHours.toString().padStart(2, '0')}:${startMins.toString().padStart(2, '0')}`
    const endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`
    
    return `Personalizzato (${startTime}-${endTime})`
  }
  
  // For standard time slots, we need to determine which one based on the scheduled time
  const hour = new Date(todolist.scheduled_execution).getHours()
  if (hour >= 7 && hour < 17) return 'Giornata (07:00-17:00)'
  if (hour >= 6 && hour < 14) return 'Mattina (06:00-14:00)'
  if (hour >= 14 && hour < 22) return 'Pomeriggio (14:00-22:00)'
  return 'Notte (22:00-06:00)'
}

export default async function AlertsPage() {
  const client = await supabase();
  // Fetch KPI alerts
  const kpiAlertsRaw = await getKpiAlerts()
  const kpiAlerts = kpiAlertsRaw.filter(alert => alert.todolist?.status !== 'completed')
  const kpiAlertsConsumed = kpiAlertsRaw.filter(alert => alert.todolist?.status === 'completed')
  // Fetch todolist alerts
  const todolistAlertsRaw = await getTodolistAlerts()
  const todolistAlerts = todolistAlertsRaw.filter(alert => alert.todolist?.status !== 'completed')
  const todolistAlertsConsumed = todolistAlertsRaw.filter(alert => alert.todolist?.status === 'completed')

  return (
    <AlertsClient
      kpiAlerts={kpiAlerts}
      kpiAlertsConsumed={kpiAlertsConsumed}
      todolistAlerts={todolistAlerts}
      todolistAlertsConsumed={todolistAlertsConsumed}
    />
  )
} 