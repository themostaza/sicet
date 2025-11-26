"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { format } from "date-fns"
import { it } from "date-fns/locale"
import { AlertCircle, CheckSquare, ArrowUp, ArrowDown } from "lucide-react"
import { AlertActions } from "./alert-actions"
import { AlertDelete } from "./alert-delete"
import { toast } from "@/components/ui/use-toast"
import { formatDateForDisplay } from "@/lib/utils"

function renderKpiConditions(alert: any) {
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
            {(cond.type === 'number' || cond.type === 'decimal') && (
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
      {fields.length === 0 && conditions.map((cond: any, idx: number) => (
        <li key={idx} className="text-xs bg-gray-50 rounded px-2 py-1 whitespace-nowrap truncate">
          {(cond.type === 'number' || cond.type === 'decimal') && (
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
  const hour = new Date(todolist.scheduled_execution).getHours()
  if (hour >= 7 && hour < 17) return 'Giornata (07:00-17:00)'
  if (hour >= 6 && hour < 14) return 'Mattina (06:00-14:00)'
  if (hour >= 14 && hour < 22) return 'Pomeriggio (14:00-22:00)'
  return 'Notte (22:00-06:00)'
}

export default function AlertsClient({
  kpiAlerts,
  todolistAlerts
}: {
  kpiAlerts: any[]
  todolistAlerts: any[]
}) {
  const [sortColumn, setSortColumn] = useState<string>("created_at")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")

  function sortData<T extends Record<string, any>>(data: T[], col: string, dir: "asc" | "desc") {
    return [...data].sort((a, b) => {
      let aValue: any = a[col]
      let bValue: any = b[col]
      if (col === "created_at" || col === "scheduled_execution") {
        aValue = a.created_at || a.scheduled_execution
        bValue = b.created_at || b.scheduled_execution
        if (aValue && bValue) {
          const aDate = new Date(aValue as string).getTime()
          const bDate = new Date(bValue as string).getTime()
          return dir === "asc" ? aDate - bDate : bDate - aDate
        }
        return 0
      }
      if (col === "status") {
        return dir === "asc"
          ? String(a.status ?? "").localeCompare(String(b.status ?? ""))
          : String(b.status ?? "").localeCompare(String(a.status ?? ""))
      }
      if (col === "email") {
        return dir === "asc"
          ? String(a.email ?? "").localeCompare(String(b.email ?? ""))
          : String(b.email ?? "").localeCompare(String(a.email ?? ""))
      }
      if (col === "device_name") {
        const aName = a.todolist?.devices?.name ?? ""
        const bName = b.todolist?.devices?.name ?? ""
        return dir === "asc"
          ? aName.localeCompare(bName)
          : bName.localeCompare(aName)
      }
      if (col === "kpi_name") {
        const aKpi = (a as any).kpis?.name ?? ""
        const bKpi = (b as any).kpis?.name ?? ""
        return dir === "asc"
          ? aKpi.localeCompare(bKpi)
          : bKpi.localeCompare(aKpi)
      }
      if (col === "time_slot") {
        const aSlot = a.todolist?.time_slot_type ?? ""
        const bSlot = b.todolist?.time_slot_type ?? ""
        return dir === "asc"
          ? aSlot.localeCompare(bSlot)
          : bSlot.localeCompare(aSlot)
      }
      return 0
    })
  }

  const sortedKpiAlerts = sortData(kpiAlerts, sortColumn, sortDirection)
  const sortedTodolistAlerts = sortData(todolistAlerts, sortColumn, sortDirection)

  const handleSort = (col: string) => {
    if (sortColumn === col) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortColumn(col)
      setSortDirection(col === "created_at" || col === "scheduled_execution" ? "desc" : "asc")
    }
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Gestione Alert</h1>
      </div>
      <Tabs defaultValue="kpi-alerts" className="w-full">
        <TabsList className="w-fit">
          <TabsTrigger value="kpi-alerts" className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Alert Controlli
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
                Alert Controlli Attivi
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sortedKpiAlerts && sortedKpiAlerts.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead onClick={() => handleSort("kpi_name")} className="cursor-pointer select-none">
                          Controllo
                          {sortColumn === "kpi_name" && (sortDirection === "asc" ? <ArrowUp className="inline ml-1 w-3 h-3" /> : <ArrowDown className="inline ml-1 w-3 h-3" />)}
                        </TableHead>
                        <TableHead onClick={() => handleSort("device_name")} className="cursor-pointer select-none">
                          Punto di controllo
                          {sortColumn === "device_name" && (sortDirection === "asc" ? <ArrowUp className="inline ml-1 w-3 h-3" /> : <ArrowDown className="inline ml-1 w-3 h-3" />)}
                        </TableHead>
                        <TableHead onClick={() => handleSort("email")} className="cursor-pointer select-none">
                          Email
                          {sortColumn === "email" && (sortDirection === "asc" ? <ArrowUp className="inline ml-1 w-3 h-3" /> : <ArrowDown className="inline ml-1 w-3 h-3" />)}
                        </TableHead>
                        <TableHead>Condizioni</TableHead>
                        <TableHead onClick={() => handleSort("created_at")}
                          className="cursor-pointer select-none">
                          Creato
                          {sortColumn === "created_at" && (sortDirection === "asc" ? <ArrowUp className="inline ml-1 w-3 h-3" /> : <ArrowDown className="inline ml-1 w-3 h-3" />)}
                        </TableHead>
                        <TableHead>Azioni</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedKpiAlerts.map((alert) => (
                        <TableRow key={alert.id}>
                          <TableCell>{alert.kpis?.name || 'Controllo sconosciuto'}</TableCell>
                          <TableCell>{alert.todolist?.devices?.name || 'Punto di controllo sconosciuto'}</TableCell>
                          <TableCell>{alert.email}</TableCell>
                          <TableCell>{renderKpiConditions(alert)}</TableCell>
                          <TableCell>{formatDateForDisplay(alert.created_at)}</TableCell>
                          <TableCell>
                            <AlertDelete 
                              alert={alert} 
                              onDelete={async () => { toast({ title: "Eliminato" }); return Promise.resolve(); }} 
                              confirmMessage="Sei sicuro di voler eliminare questo alert Controlli?" 
                              description={`L'alert per il Controllo "${alert.kpis?.name}" sarà eliminato definitivamente.`}
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
                  <p>Nessun alert Controlli attivo</p>
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
              {sortedTodolistAlerts && sortedTodolistAlerts.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead onClick={() => handleSort("device_name")} className="cursor-pointer select-none">
                          Punto di controllo
                          {sortColumn === "device_name" && (sortDirection === "asc" ? <ArrowUp className="inline ml-1 w-3 h-3" /> : <ArrowDown className="inline ml-1 w-3 h-3" />)}
                        </TableHead>
                        <TableHead onClick={() => handleSort("scheduled_execution")}
                          className="cursor-pointer select-none">
                          Data Programmata
                          {sortColumn === "scheduled_execution" && (sortDirection === "asc" ? <ArrowUp className="inline ml-1 w-3 h-3" /> : <ArrowDown className="inline ml-1 w-3 h-3" />)}
                        </TableHead>
                        <TableHead onClick={() => handleSort("time_slot")}
                          className="cursor-pointer select-none">
                          Fascia Oraria
                          {sortColumn === "time_slot" && (sortDirection === "asc" ? <ArrowUp className="inline ml-1 w-3 h-3" /> : <ArrowDown className="inline ml-1 w-3 h-3" />)}
                        </TableHead>
                        <TableHead onClick={() => handleSort("email")}
                          className="cursor-pointer select-none">
                          Email
                          {sortColumn === "email" && (sortDirection === "asc" ? <ArrowUp className="inline ml-1 w-3 h-3" /> : <ArrowDown className="inline ml-1 w-3 h-3" />)}
                        </TableHead>
                        <TableHead onClick={() => handleSort("status")}
                          className="cursor-pointer select-none">
                          Stato
                          {sortColumn === "status" && (sortDirection === "asc" ? <ArrowUp className="inline ml-1 w-3 h-3" /> : <ArrowDown className="inline ml-1 w-3 h-3" />)}
                        </TableHead>
                        <TableHead onClick={() => handleSort("created_at")}
                          className="cursor-pointer select-none">
                          Creato
                          {sortColumn === "created_at" && (sortDirection === "asc" ? <ArrowUp className="inline ml-1 w-3 h-3" /> : <ArrowDown className="inline ml-1 w-3 h-3" />)}
                        </TableHead>
                        <TableHead>Azioni</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedTodolistAlerts.map((alert) => (
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
                          <TableCell>{formatDateForDisplay(alert.created_at)}</TableCell>
                          <TableCell>
                            <AlertDelete 
                              alert={alert} 
                              onDelete={async () => { toast({ title: "Eliminato" }); return Promise.resolve(); }} 
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