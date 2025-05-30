import { createServerSupabaseClient } from "@/lib/supabase"
import { AlertCircle, BellRing } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { it } from "date-fns/locale"
import { Database } from "@/supabase/database.types"
import React from "react"

type Alert = Database['public']['Tables']['kpi_alerts']['Row'] & {
  kpis: {
    name: string
    description: string | null
  } | null
  devices: {
    name: string
    location: string | null
  } | null
  logs: Database['public']['Tables']['kpi_alert_logs']['Row'][]
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
      ),
      logs:kpi_alert_logs (
        id,
        triggered_value,
        triggered_at,
        email_sent,
        email_sent_at,
        error_message
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching alerts:', error)
    return []
  }

  return alerts as Alert[]
}

export default async function AlertsPage() {
  const alerts = await getAlerts()

  // Separazione alert attivi e passati
  const activeAlerts = alerts.filter(a => !a.logs || a.logs.length === 0)
  const pastAlerts = alerts.filter(a => a.logs && a.logs.length > 0)

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Alert</h1>
      </div>

      {/* Tabella alert attivi (senza log) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellRing className="h-5 w-5" />
            Alert Attivi
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeAlerts.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Controllo</TableHead>
                    <TableHead>Punto di Controllo</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Condizioni</TableHead>
                    <TableHead>Ultimo Aggiornamento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeAlerts.map((alert) => {
                    const conditions = alert.conditions as AlertCondition[]
                    return (
                      <React.Fragment key={alert.id}>
                        {/* Riga alert attivo */}
                        <TableRow>
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
                            {format(new Date(alert.updated_at), "dd MMM yyyy HH:mm", { locale: it })}
                          </TableCell>
                        </TableRow>
                      </React.Fragment>
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

      {/* Tabella alert passati (con log) */}
      {pastAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Alert Passati
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Controllo</TableHead>
                    <TableHead>Punto di Controllo</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Condizioni</TableHead>
                    <TableHead>Ultimo Aggiornamento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pastAlerts.map((alert) => {
                    const conditions = alert.conditions as AlertCondition[]
                    return (
                      <React.Fragment key={alert.id}>
                        <TableRow>
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
                            {format(new Date(alert.updated_at), "dd MMM yyyy HH:mm", { locale: it })}
                          </TableCell>
                        </TableRow>
                        {/* Log degli alert passati */}
                        {alert.logs && alert.logs.length > 0 && (
                          <TableRow>
                            <TableCell colSpan={6} className="bg-muted/50 p-4">
                              <div className="font-medium mb-2">Log</div>
                              <div className="grid grid-cols-4 gap-4 text-sm font-medium mb-1">
                                <div>Data</div>
                                <div>Valore</div>
                                <div>Stato Email</div>
                                <div>Errore</div>
                              </div>
                              {alert.logs.map((log) => (
                                <div key={log.id} className="grid grid-cols-4 gap-4 items-start mb-2">
                                  <div>
                                    {format(new Date(log.triggered_at), "dd MMM yyyy HH:mm", { locale: it })}
                                  </div>
                                  <div>
                                    <pre className="text-sm whitespace-pre-wrap bg-muted/50 p-2 rounded m-0">
                                      {JSON.stringify(log.triggered_value, null, 2)}
                                    </pre>
                                  </div>
                                  <div>
                                    <Badge variant={log.email_sent ? "default" : "secondary"}>
                                      {log.email_sent ? "Email Inviata" : "Email Non Inviata"}
                                    </Badge>
                                    {log.email_sent_at && (
                                      <div className="text-xs text-muted-foreground">
                                        {format(new Date(log.email_sent_at), "dd MMM yyyy HH:mm", { locale: it })}
                                      </div>
                                    )}
                                  </div>
                                  <div>
                                    {log.error_message ? (
                                      <span className="text-sm text-red-500">{log.error_message}</span>
                                    ) : (
                                      <span className="text-sm text-muted-foreground">Nessun errore</span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 