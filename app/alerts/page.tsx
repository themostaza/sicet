import { createServerSupabaseClient } from "@/lib/supabase"
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
  kpis: {
    name: string
    description: string | null
  } | null
  devices: {
    name: string
    location: string | null
  } | null
}

type AlertLog = Database['public']['Tables']['kpi_alert_logs']['Row'] & {
  kpi_alerts: {
    email: string
    conditions: any
  } | null
  kpis: {
    name: string
    description: string | null
  } | null
  devices: {
    name: string
    location: string | null
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
  const [alerts, logs] = await Promise.all([getAlerts(), getAlertLogs()])

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Alert</h1>
      </div>

      {/* Tabella alert attivi */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellRing className="h-5 w-5" />
            Alert Attivi
          </CardTitle>
        </CardHeader>
        <CardContent>
          {alerts.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Controllo</TableHead>
                    <TableHead>Punto di Controllo</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Condizioni</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead>Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alerts.map((alert) => {
                    const conditions = alert.conditions as AlertCondition[]
                    return (
                      <TableRow key={alert.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{alert.kpis?.name}</div>
                            {alert.kpis?.description && (
                              <div className="text-sm text-muted-foreground">
                                {alert.kpis.description}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{alert.devices?.name}</div>
                            {alert.devices?.location && (
                              <div className="text-sm text-muted-foreground">
                                {alert.devices.location}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{alert.email}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {conditions.map((condition, idx) => (
                              <div key={`${alert.id}-${idx}`} className="text-sm">
                                {condition.type === 'numeric' && (
                                  <>
                                    {condition.min !== undefined && (
                                      <div>Min: {condition.min}</div>
                                    )}
                                    {condition.max !== undefined && (
                                      <div>Max: {condition.max}</div>
                                    )}
                                  </>
                                )}
                                {condition.type === 'text' && condition.match_text && (
                                  <div>Match: "{condition.match_text}"</div>
                                )}
                                {condition.type === 'boolean' && condition.boolean_value !== undefined && (
                                  <div>Valore: {condition.boolean_value ? 'Sì' : 'No'}</div>
                                )}
                              </div>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <AlertActions alert={alert} />
                        </TableCell>
                        <TableCell>
                          <AlertDelete alert={alert} />
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              Nessun alert attivo
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabella log */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Log Alert
          </CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Controllo</TableHead>
                    <TableHead>Punto di Controllo</TableHead>
                    <TableHead>Valore</TableHead>
                    <TableHead>Stato Email</TableHead>
                    <TableHead>Errore</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        {format(new Date(log.triggered_at), "dd MMM yyyy HH:mm", { locale: it })}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{log.kpis?.name}</div>
                          {log.kpis?.description && (
                            <div className="text-sm text-muted-foreground">
                              {log.kpis.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{log.devices?.name}</div>
                          {log.devices?.location && (
                            <div className="text-sm text-muted-foreground">
                              {log.devices.location}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <pre className="text-sm whitespace-pre-wrap bg-muted/50 p-2 rounded">
                          {JSON.stringify(log.triggered_value, null, 2)}
                        </pre>
                      </TableCell>
                      <TableCell>
                        <Badge variant={log.email_sent ? "default" : "secondary"}>
                          {log.email_sent ? "Email Inviata" : "Email Non Inviata"}
                        </Badge>
                        {log.email_sent_at && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {format(new Date(log.email_sent_at), "dd MMM yyyy HH:mm", { locale: it })}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {log.error_message ? (
                          <span className="text-sm text-red-500">{log.error_message}</span>
                        ) : (
                          <span className="text-sm text-muted-foreground">Nessun errore</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              Nessun log disponibile
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 