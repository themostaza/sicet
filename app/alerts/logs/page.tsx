import { createServerSupabaseClient } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { it } from "date-fns/locale"
import { Database } from "@/supabase/database.types"

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
    .limit(100)

  if (error) {
    console.error('Error fetching alert logs:', error)
    return []
  }

  return logs as AlertLog[]
}

export default async function AlertLogsPage() {
  const logs = await getAlertLogs()

  return (
    <div className="container py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Log degli Alert</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Storico Alert</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length > 0 ? (
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Controllo</TableHead>
                    <TableHead>Punto di Controllo</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Valore</TableHead>
                    <TableHead>Stato</TableHead>
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
                      <TableCell>{log.kpi_alerts?.email}</TableCell>
                      <TableCell>
                        <pre className="text-sm whitespace-pre-wrap">
                          {JSON.stringify(log.triggered_value, null, 2)}
                        </pre>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge variant={log.email_sent ? "default" : "secondary"}>
                            {log.email_sent ? "Email Inviata" : "Email Non Inviata"}
                          </Badge>
                          {log.error_message && (
                            <div className="text-sm text-red-500">
                              {log.error_message}
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              Nessun log di alert trovato
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 