import { createServerSupabaseClient } from "@/lib/supabase-server"
import { AlertCircle, BellRing, Trash2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { it } from "date-fns/locale"
import { Database } from "@/supabase/database.types"
import React from "react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { AlertActions } from "./alert-actions"
import { AlertDelete } from "./alert-delete"
import { SupabaseClient } from "@supabase/supabase-js"

type Alert = Database['public']['Tables']['kpi_alerts']['Row'] & {
  kpis: Database['public']['Tables']['kpis']['Row'] | null
}

type AlertLog = Database['public']['Tables']['kpi_alert_logs']['Row'] & {
  kpi_alerts: Database['public']['Tables']['kpi_alerts']['Row'] | null
  kpis: Database['public']['Tables']['kpis']['Row'] | null
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

async function getAlerts(): Promise<Alert[]> {
  const supabase = createServerSupabaseClient()
  
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
    console.error('Error fetching alerts:', error)
    return []
  }

  return alerts as Alert[]
}

async function getAlertLogs(): Promise<AlertLog[]> {
  const supabase = createServerSupabaseClient()
  
  const { data: logs, error } = await supabase
    .from('kpi_alert_logs')
    .select(`
      *,
      kpi_alerts (
        email,
        conditions
      ),
      kpis (
        name,
        description
      ),
      devices (
        name,
        location
      )
    `)
    .order('triggered_at', { ascending: false })

  if (error) {
    console.error('Error fetching alert logs:', error)
    return []
  }

  return logs as AlertLog[]
}

function renderKpiConditions(alert: Alert) {
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
          {/* <span className="font-semibold">{cond.field_id}</span> */}
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

export default async function AlertsPage() {
  const client = await supabase();
  
  // Fetch alerts with their related KPIs
  const { data: alerts, error: alertsError } = await client
    .from('kpi_alerts')
    .select(`
      *,
      kpis (
        id,
        name,
        description
      )
    `)
    .order('created_at', { ascending: false })

  if (alertsError) {
    console.error('Error fetching alerts:', alertsError)
    return <div>Error loading alerts</div>
  }

  // Fetch alert logs with their related alerts and KPIs
  const { data: alertLogs, error: logsError } = await client
    .from('kpi_alert_logs')
    .select(`
      *,
      kpi_alerts (
        id,
        email,
        conditions
      ),
      kpis (
        id,
        name,
        description
      )
    `)
    .order('triggered_at', { ascending: false })

  if (logsError) {
    console.error('Error fetching alert logs:', {
      error: logsError,
      message: logsError.message,
      details: logsError.details,
      hint: logsError.hint
    })
    return <div>Error loading alert logs: {logsError.message}</div>
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Alerts</h1>
      
      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1">
          <Card>
            <CardHeader>
              <CardTitle>Active Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              {alerts && alerts.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>KPI</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Controlli</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(alerts as Alert[]).map((alert) => (
                        <TableRow key={alert.id}>
                          <TableCell>{alert.kpis?.name || 'Unknown KPI'}</TableCell>
                          <TableCell>{alert.email}</TableCell>
                          <TableCell>{renderKpiConditions(alert)}</TableCell>
                          <TableCell>{alert.created_at ? new Date(alert.created_at).toLocaleString() : 'N/A'}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  No active alerts
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 