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

export default async function AlertsPage() {
  const supabase = await createServerSupabaseClient()
  
  // Fetch alerts with their related KPIs
  const { data: alerts, error: alertsError } = await supabase
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
  const { data: alertLogs, error: logsError } = await supabase
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
    .order('created_at', { ascending: false })

  if (logsError) {
    console.error('Error fetching alert logs:', logsError)
    return <div>Error loading alert logs</div>
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Alerts</h1>
      
      <div className="grid gap-6">
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
                      <TableHead>Threshold</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(alerts as Alert[]).map((alert) => (
                      <TableRow key={alert.id}>
                        <TableCell>{alert.kpis?.name || 'Unknown KPI'}</TableCell>
                        <TableCell>{JSON.stringify(alert.threshold)}</TableCell>
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

        <Card>
          <CardHeader>
            <CardTitle>Alert History</CardTitle>
          </CardHeader>
          <CardContent>
            {alertLogs && alertLogs.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>KPI</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(alertLogs as AlertLog[]).map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>{log.kpis?.name || 'Unknown KPI'}</TableCell>
                        <TableCell>{JSON.stringify(log.value)}</TableCell>
                        <TableCell>{log.kpi_alerts?.email || 'Unknown'}</TableCell>
                        <TableCell>{log.created_at ? new Date(log.created_at).toLocaleString() : 'N/A'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                No alert history
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 