import { createServerSupabaseClient } from "@/lib/supabase-server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import React from "react"

// Tipi
import { Database } from "@/supabase/database.types"

type AlertLog = Database['public']['Tables']['kpi_alert_logs']['Row'] & {
  kpi_alerts: Database['public']['Tables']['kpi_alerts']['Row'] | null
  kpis: Database['public']['Tables']['kpis']['Row'] | null
}

export default async function AlertLogsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: alertLogs, error: logsError } = await supabase
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
      )
    `)
    .order('triggered_at', { ascending: false })

  if (logsError) {
    return <div className="p-6 text-red-600">Errore nel caricamento dei log: {logsError.message}</div>
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Alert Logs</h1>
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
                    <TableHead>Triggered</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(alertLogs as AlertLog[]).map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{log.kpis?.name || 'Unknown KPI'}</TableCell>
                      <TableCell>{JSON.stringify(log.triggered_value)}</TableCell>
                      <TableCell>{log.kpi_alerts?.email || 'Unknown'}</TableCell>
                      <TableCell>{log.triggered_at ? new Date(log.triggered_at).toLocaleString() : 'N/A'}</TableCell>
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
  )
} 