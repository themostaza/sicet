import { createServerSupabaseClient } from "@/lib/supabase"
import { AlertCircle, BellRing } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { it } from "date-fns/locale"
import { Database } from "@/supabase/database.types"

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

export default async function AlertsPage() {
  const alerts = await getAlerts()

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Alert</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellRing className="h-5 w-5" />
            Alert Configurati
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
                    <TableHead>Ultimo Aggiornamento</TableHead>
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
                              <div key={idx} className="text-sm">
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
                          <Badge variant={alert.is_active ? "default" : "secondary"}>
                            {alert.is_active ? "Attivo" : "Disattivato"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {format(new Date(alert.updated_at), "dd MMM yyyy HH:mm", { locale: it })}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nessun Alert Configurato</h3>
              <p className="text-sm text-muted-foreground">
                Configura gli alert per ricevere notifiche quando i valori dei controlli superano le soglie impostate
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 