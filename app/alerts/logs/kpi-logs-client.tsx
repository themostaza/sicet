"use client"

import { useState } from "react"
import type { ReactNode } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Mail, AlertTriangle, Eye } from "lucide-react"
import { formatDateForDisplay } from "@/lib/utils"
import { Database } from "@/supabase/database.types"

type KpiAlertLog = Database['public']['Tables']['kpi_alert_logs']['Row'] & {
  kpi_alerts: (Database['public']['Tables']['kpi_alerts']['Row'] & {
    kpis: Database['public']['Tables']['kpis']['Row'] | null
    todolist: (Database['public']['Tables']['todolist']['Row'] & {
      devices: Database['public']['Tables']['devices']['Row'] | null
    }) | null
  }) | null
}

interface KpiLogsClientProps {
  logs: KpiAlertLog[]
}

// Helper function to get field name from field_id
function getFieldName(fieldId: string, kpiValue: any): string {
  if (kpiValue && Array.isArray(kpiValue)) {
    const fieldById = kpiValue.find((f: { id?: string; name?: string }) => f?.id === fieldId)
    if (fieldById && fieldById.name) {
      return fieldById.name
    }
    const nameFromId = fieldId.substring(fieldId.lastIndexOf('-') + 1)
    const fieldByName = kpiValue.find((f: { name?: string }) => 
      String(f?.name).toLowerCase() === nameFromId.toLowerCase()
    )
    if (fieldByName && fieldByName.name) {
      return fieldByName.name
    }
  }
  return fieldId.substring(fieldId.lastIndexOf('-') + 1)
}

// Format the reason why the alert was triggered (returns array of JSX elements for badges)
function formatAlertReasons(triggeredValue: any, kpiValue: any): ReactNode[] {
  if (!triggeredValue || !Array.isArray(triggeredValue) || triggeredValue.length === 0) {
    return [<span key="none">Condizione non specificata</span>]
  }

  const reasons = triggeredValue.map((triggered: { condition?: any; fieldValue?: any }, index: number) => {
    const condition = triggered.condition
    const fieldValue = triggered.fieldValue
    
    if (!condition) return null

    const fieldName = getFieldName(condition.field_id || '', kpiValue)

    switch (condition.type) {
      case 'number':
      case 'decimal':
        if (condition.min !== undefined && condition.max !== undefined) {
          return (
            <span key={index}>
              {fieldName}: {fieldValue} è fuori dal range {condition.min} - {condition.max}
            </span>
          )
        } else if (condition.min !== undefined) {
          return (
            <span key={index}>
              {fieldName}: {fieldValue} è sotto il minimo di {condition.min}
            </span>
          )
        } else if (condition.max !== undefined) {
          return (
            <span key={index}>
              {fieldName}: {fieldValue} è sopra il massimo di {condition.max}
            </span>
          )
        }
        return (
          <span key={index}>
            {fieldName}: {fieldValue}
          </span>
        )
      
      case 'text':
        if (condition.match_text) {
          return (
            <span key={index}>
              {fieldName}: "{fieldValue}" contiene "{condition.match_text}"
            </span>
          )
        }
        return (
          <span key={index}>
            {fieldName}: "{fieldValue}"
          </span>
        )
      
      case 'boolean':
        const boolValue = fieldValue ? 'sì' : 'no'
        const expectedValue = condition.boolean_value ? 'sì' : 'no'
        return (
          <span key={index}>
            {fieldName}: valore è {boolValue}{' '}
            <span className="text-xs font-normal opacity-70">[Valore alert: {expectedValue}]</span>
          </span>
        )
      
      case 'select':
        const matchValues = condition.match_values || []
        return (
          <span key={index}>
            {fieldName}: "{fieldValue}" corrisponde ai valori alert{' '}
            <span className="text-xs font-normal opacity-70">
              [{matchValues.join(', ')}]
            </span>
          </span>
        )
      
      default:
        return (
          <span key={index}>
            {fieldName}: {String(fieldValue)}
          </span>
        )
    }
  }).filter(Boolean) as ReactNode[]

  return reasons
}

export function KpiLogsClient({ logs }: KpiLogsClientProps) {
  const [selectedLog, setSelectedLog] = useState<KpiAlertLog | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleViewDetails = (log: KpiAlertLog) => {
    setSelectedLog(log)
    setIsDialogOpen(true)
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Valore Rilevato</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Stato</TableHead>
              <TableHead>Attivato</TableHead>
              <TableHead>Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    {formatAlertReasons(
                      log.triggered_value,
                      log.kpi_alerts?.kpis?.value
                    ).map((reason, idx) => (
                      <Badge key={idx} variant="destructive" className="text-xs w-fit">
                        {reason}
                      </Badge>
                    ))}
                  </div>
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
                  {formatDateForDisplay(log.triggered_at)}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleViewDetails(log)}
                    className="flex items-center gap-1"
                  >
                    <Eye className="h-4 w-4" />
                    Dettagli
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Dettagli Alert Log</DialogTitle>
            {selectedLog && (
              <div className="flex flex-col gap-1 mt-2">
                {formatAlertReasons(
                  selectedLog.triggered_value,
                  selectedLog.kpi_alerts?.kpis?.value
                ).map((reason, idx) => (
                  <Badge key={idx} variant="destructive" className="w-fit">
                    {reason}
                  </Badge>
                ))}
              </div>
            )}
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              {/* Informazioni Generali */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-1">Email</h3>
                  <p>{selectedLog.kpi_alerts?.email || 'N/A'}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-1">Stato</h3>
                  {selectedLog.email_sent ? (
                    <Badge variant="default" className="flex items-center gap-1 w-fit">
                      <Mail className="h-3 w-3" />
                      Inviata
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                      <AlertTriangle className="h-3 w-3" />
                      Errore
                    </Badge>
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-1">Attivato il</h3>
                  <p>{formatDateForDisplay(selectedLog.triggered_at)}</p>
                </div>
                {selectedLog.email_sent_at && (
                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground mb-1">Email inviata il</h3>
                    <p>{formatDateForDisplay(selectedLog.email_sent_at)}</p>
                  </div>
                )}
              </div>

              {/* Informazioni Controllo */}
              {selectedLog.kpi_alerts && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-2">Informazioni Controllo</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold text-sm text-muted-foreground mb-1">Nome Controllo</h4>
                      <p>{selectedLog.kpi_alerts.kpis?.name || selectedLog.kpi_alerts.kpi_id || 'N/A'}</p>
                    </div>
                    {selectedLog.kpi_alerts.kpis?.description && (
                      <div>
                        <h4 className="font-semibold text-sm text-muted-foreground mb-1">Descrizione Controllo</h4>
                        <p>{selectedLog.kpi_alerts.kpis.description}</p>
                      </div>
                    )}
                    <div>
                      <h4 className="font-semibold text-sm text-muted-foreground mb-1">ID Controllo</h4>
                      <p className="font-mono text-xs">{selectedLog.kpi_alerts.kpi_id || 'N/A'}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm text-muted-foreground mb-1">Todolist ID</h4>
                      <p className="font-mono text-xs">{selectedLog.kpi_alerts.todolist_id || 'N/A'}</p>
                    </div>
                    {selectedLog.kpi_alerts.todolist?.devices && (
                      <>
                        <div>
                          <h4 className="font-semibold text-sm text-muted-foreground mb-1">Dispositivo</h4>
                          <p>{selectedLog.kpi_alerts.todolist.devices.name || 'N/A'}</p>
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm text-muted-foreground mb-1">Posizione</h4>
                          <p>{selectedLog.kpi_alerts.todolist.devices.location || 'N/A'}</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Condizioni Alert */}
              {selectedLog.kpi_alerts?.conditions && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-2">Condizioni Alert</h3>
                  <pre className="bg-muted p-4 rounded-md overflow-x-auto text-sm">
                    {JSON.stringify(selectedLog.kpi_alerts.conditions, null, 2)}
                  </pre>
                </div>
              )}

              {/* Valore Rilevato (JSON formattato) */}
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-2">Valore Rilevato</h3>
                <pre className="bg-muted p-4 rounded-md overflow-x-auto text-sm max-h-96 overflow-y-auto">
                  {JSON.stringify(selectedLog.triggered_value, null, 2)}
                </pre>
              </div>

              {/* Messaggio di Errore */}
              {selectedLog.error_message && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-2 text-destructive">Messaggio di Errore</h3>
                  <p className="bg-destructive/10 text-destructive p-4 rounded-md">
                    {selectedLog.error_message}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
