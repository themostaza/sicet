import { createServerSupabaseClient } from "@/lib/supabase-server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckSquare, Mail, AlertTriangle } from "lucide-react"
import React from "react"

// Tipi
import { Database } from "@/supabase/database.types"

type KpiAlertLog = Database['public']['Tables']['kpi_alert_logs']['Row'] & {
  kpi_alerts: (Database['public']['Tables']['kpi_alerts']['Row'] & {
    todolist: (Database['public']['Tables']['todolist']['Row'] & {
      devices: Database['public']['Tables']['devices']['Row'] | null
    }) | null
  }) | null
}

type TodolistAlertLog = Database['public']['Tables']['todolist_alert_logs']['Row'] & {
  todolist_alert: Database['public']['Tables']['todolist_alert']['Row'] | null
  todolist: Database['public']['Tables']['todolist']['Row'] & {
    devices: Database['public']['Tables']['devices']['Row'] | null
  } | null
}

async function getKpiAlertLogs(): Promise<KpiAlertLog[]> {
  const supabase = await createServerSupabaseClient()
  const { data: alertLogs, error: logsError } = await supabase
    .from('kpi_alert_logs')
    .select(`
      *,
      kpi_alerts (
        *,
        todolist (
          *,
          devices (
            *
          )
        )
      )
    `)
    .order('triggered_at', { ascending: false })

  if (logsError) {
    console.error('Error fetching KPI alert logs:', logsError)
    return []
  }

  return alertLogs as KpiAlertLog[]
}

async function getTodolistAlertLogs(): Promise<TodolistAlertLog[]> {
  const supabase = await createServerSupabaseClient()
  const { data: alertLogs, error: logsError } = await supabase
    .from('todolist_alert_logs')
    .select(`
      *,
      todolist_alert (
        email
      ),
      todolist (
        id,
        device_id,
        scheduled_execution,
        status,
        devices (
          name,
          location
        )
      )
    `)
    .order('sent_at', { ascending: false })

  if (logsError) {
    console.error('Error fetching todolist alert logs:', logsError)
    return []
  }

  return alertLogs as TodolistAlertLog[]
}

export default async function AlertLogsPage() {
  const kpiAlertLogs = await getKpiAlertLogs()
  const todolistAlertLogs = await getTodolistAlertLogs()

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Storico Alert</h1>
      
      <Tabs defaultValue="kpi-logs" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="kpi-logs" className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Log Alert KPI
          </TabsTrigger>
          <TabsTrigger value="todolist-logs" className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4" />
            Log Alert Todolist
          </TabsTrigger>
        </TabsList>

        <TabsContent value="kpi-logs" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Storico Alert KPI
              </CardTitle>
            </CardHeader>
            <CardContent>
              {kpiAlertLogs && kpiAlertLogs.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Valore Rilevato</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Stato</TableHead>
                        <TableHead>Attivato</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {kpiAlertLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="max-w-xs truncate">
                            {JSON.stringify(log.triggered_value)}
                          </TableCell>
                          <TableCell>{log.kpi_alerts?.email || 'Email sconosciuta'}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {log.email_sent ? (
                                <Badge variant="default" className="flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  Inviata
                                </Badge>
                              ) : (
                                <Badge variant="destructive" className="flex items-center gap-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  Errore
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {log.triggered_at ? new Date(log.triggered_at).toLocaleString('it-IT') : 'N/A'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Nessun log alert KPI</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="todolist-logs" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckSquare className="h-5 w-5" />
                Storico Alert Todolist
              </CardTitle>
            </CardHeader>
            <CardContent>
              {todolistAlertLogs && todolistAlertLogs.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Dispositivo</TableHead>
                        <TableHead>Data Programmata</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Stato</TableHead>
                        <TableHead>Inviato</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {todolistAlertLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            {log.todolist?.devices?.name || 'Dispositivo sconosciuto'}
                          </TableCell>
                          <TableCell>
                            {log.todolist?.scheduled_execution 
                              ? new Date(log.todolist.scheduled_execution).toLocaleDateString('it-IT')
                              : 'N/A'
                            }
                          </TableCell>
                          <TableCell>{log.email}</TableCell>
                          <TableCell>
                            {log.error_message ? (
                              <Badge variant="destructive" className="flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                Errore
                              </Badge>
                            ) : (
                              <Badge variant="default" className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                Inviata
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {log.sent_at ? new Date(log.sent_at).toLocaleString('it-IT') : 'N/A'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Nessun log alert todolist</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 