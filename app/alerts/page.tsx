import { createServerSupabaseClient } from "@/lib/supabase-server"
import { AlertCircle, BellRing, Trash2, Clock, CheckSquare } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { format } from "date-fns"
import { it } from "date-fns/locale"
import { Database } from "@/supabase/database.types"
import React from "react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { AlertActions } from "./alert-actions"
import { AlertDelete } from "./alert-delete"
import { SupabaseClient } from "@supabase/supabase-js"
import { deleteAlert } from "@/app/actions/actions-alerts"

type KpiAlert = Database['public']['Tables']['kpi_alerts']['Row'] & {
  kpis: Database['public']['Tables']['kpis']['Row'] | null
  devices: Database['public']['Tables']['devices']['Row'] | null
}

type TodolistAlert = Database['public']['Tables']['todolist_alert']['Row'] & {
  todolist: Database['public']['Tables']['todolist']['Row'] & {
    devices: Database['public']['Tables']['devices']['Row'] | null
  } | null
}

type AlertCondition = {
  type: 'numeric' | 'text' | 'boolean'
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
      devices (
        name,
        location
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
            {cond.type === 'numeric' && (
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
          {cond.type === 'numeric' && (
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
  if (hour >= 6 && hour < 12) return 'Mattina (06:00-11:00)'
  if (hour >= 12 && hour < 18) return 'Pomeriggio (12:00-17:00)'
  if (hour >= 18 && hour < 22) return 'Sera (18:00-21:00)'
  if (hour >= 6 && hour < 17) return 'Giornata (06:00-17:00)'
  return 'Notte (22:00-05:00)'
}

export default async function AlertsPage() {
  const client = await supabase();
  
  // Fetch KPI alerts
  const kpiAlerts = await getKpiAlerts()
  
  // Fetch todolist alerts
  const todolistAlerts = await getTodolistAlerts()

  // Funzione per cancellare un alert Todolist
  async function deleteTodolistAlert(alertId: string) {
    "use server"
    const supabase = await createServerSupabaseClient()
    const { error } = await supabase
      .from("todolist_alert")
      .delete()
      .eq("id", alertId)
    if (error) throw error
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Gestione Alert</h1>
      
      <Tabs defaultValue="kpi-alerts" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="kpi-alerts" className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Alert KPI
          </TabsTrigger>
          <TabsTrigger value="todolist-alerts" className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4" />
            Alert Todolist
          </TabsTrigger>
        </TabsList>

        <TabsContent value="kpi-alerts" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Alert KPI Attivi
              </CardTitle>
            </CardHeader>
            <CardContent>
              {kpiAlerts && kpiAlerts.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>KPI</TableHead>
                        <TableHead>Dispositivo</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Controlli</TableHead>
                        <TableHead>Creato</TableHead>
                        <TableHead>Azioni</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {kpiAlerts.map((alert) => (
                        <TableRow key={alert.id}>
                          <TableCell>{alert.kpis?.name || 'KPI sconosciuto'}</TableCell>
                          <TableCell>{alert.devices?.name || 'Dispositivo sconosciuto'}</TableCell>
                          <TableCell>{alert.email}</TableCell>
                          <TableCell>{renderKpiConditions(alert)}</TableCell>
                          <TableCell>{alert.created_at ? new Date(alert.created_at).toLocaleString('it-IT') : 'N/A'}</TableCell>
                          <TableCell>
                            <AlertDelete 
                              alert={alert} 
                              onDelete={deleteAlert} 
                              confirmMessage="Sei sicuro di voler eliminare questo alert KPI?" 
                              description={`L'alert per il KPI "${alert.kpis?.name}" sarà eliminato definitivamente.`}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Nessun alert KPI attivo</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="todolist-alerts" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckSquare className="h-5 w-5" />
                Alert Todolist Attivi
              </CardTitle>
            </CardHeader>
            <CardContent>
              {todolistAlerts && todolistAlerts.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Dispositivo</TableHead>
                        <TableHead>Data Programmata</TableHead>
                        <TableHead>Fascia Oraria</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Stato</TableHead>
                        <TableHead>Creato</TableHead>
                        <TableHead>Azioni</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {todolistAlerts.map((alert) => (
                        <TableRow key={alert.id}>
                          <TableCell>{alert.todolist?.devices?.name || 'Dispositivo sconosciuto'}</TableCell>
                          <TableCell>
                            {alert.todolist?.scheduled_execution 
                              ? format(new Date(alert.todolist.scheduled_execution), 'dd/MM/yyyy', { locale: it })
                              : 'N/A'
                            }
                          </TableCell>
                          <TableCell>
                            {alert.todolist ? formatTimeSlot(alert.todolist) : 'N/A'}
                          </TableCell>
                          <TableCell>{alert.email}</TableCell>
                          <TableCell>
                            <Badge variant={alert.todolist?.status === 'completed' ? 'default' : 'secondary'}>
                              {alert.todolist?.status === 'completed' ? 'Completata' : 'In corso'}
                            </Badge>
                          </TableCell>
                          <TableCell>{alert.created_at ? new Date(alert.created_at).toLocaleString('it-IT') : 'N/A'}</TableCell>
                          <TableCell>
                            <AlertDelete 
                              alert={alert} 
                              onDelete={deleteTodolistAlert} 
                              confirmMessage="Sei sicuro di voler eliminare questo alert Todolist?" 
                              description={`L'alert per la todolist del dispositivo "${alert.todolist?.devices?.name}" sarà eliminato definitivamente.`}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Nessun alert todolist attivo</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 