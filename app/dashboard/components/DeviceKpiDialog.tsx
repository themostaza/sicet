import React, { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog"
import { Loader2, X, FileText, CheckCircle, Calendar, AlertTriangle, TrendingUp, Activity } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface TodolistMetrics {
  total: number
  completed: number
  pending: number
  overdue: number
  completionRate: number
  overdueRate: number
  pieChartData: Array<{
    name: string
    value: number
    percentage: number
    color: string
  }>
  filters: {
    dateFrom: string | null
    dateTo: string | null
  }
}

type Props = {
  open: boolean
  onClose: () => void
  deviceId: string
  deviceName: string
  isDisabled?: boolean
}

export default function DeviceKpiDialog({ open, onClose, deviceId, deviceName, isDisabled }: Props) {
  // Date logic
  const getDefaultDates = () => {
    const today = new Date()
    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(today.getMonth() - 3)
    return {
      dateFrom: threeMonthsAgo.toISOString().split('T')[0],
      dateTo: today.toISOString().split('T')[0]
    }
  }
  const [dateFrom, setDateFrom] = useState<string>(getDefaultDates().dateFrom)
  const [dateTo, setDateTo] = useState<string>(getDefaultDates().dateTo)

  const [isLoading, setIsLoading] = useState(false)
  const [metrics, setMetrics] = useState<TodolistMetrics | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setIsLoading(true)
    setError(null)
    setMetrics(null)
    fetch(`/api/dashboard/device-todolist-metrics?deviceId=${deviceId}&dateFrom=${dateFrom}&dateTo=${dateTo}`)
      .then(async res => {
        if (!res.ok) throw new Error("Errore nel recupero delle metriche")
        const data = await res.json()
        setMetrics(data)
      })
      .catch(e => setError(e.message))
      .finally(() => setIsLoading(false))
  }, [open, deviceId, dateFrom, dateTo])

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="w-full max-w-4xl h-[90vh] flex flex-col" style={{ maxWidth: '100vw', width: '100vw', height: '100vh', borderRadius: 0, padding: 0 }}>
        <DialogHeader className="flex flex-row items-center justify-between p-6 border-b">
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            Metriche Todolist per {deviceName}
            {isDisabled && (
              <span className="ml-2"><span className="inline-block bg-red-100 text-red-700 border border-red-200 rounded px-2 py-0.5 text-xs font-semibold">Disabilitato</span></span>
            )}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-auto p-8">
          {/* Filtri Data */}
          <div className="flex flex-wrap items-end gap-4 mb-6">
            <div className="min-w-[140px]">
              <Label htmlFor="dialog-dateFrom">Data Inizio</Label>
              <Input
                id="dialog-dateFrom"
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="min-w-[140px]">
              <Label htmlFor="dialog-dateTo">Data Fine</Label>
              <Input
                id="dialog-dateTo"
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="animate-spin w-8 h-8 mr-2" />
              <span>Caricamento metriche...</span>
            </div>
          ) : error ? (
            <div className="text-red-600 text-center mt-8">{error}</div>
          ) : metrics ? (
            <div className="grid gap-6 lg:grid-cols-2">
              {/* KPI Cards */}
              <div className="space-y-4">
                <div className="grid gap-4 grid-cols-2">
                  <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-blue-700 flex items-center">
                        <FileText className="h-4 w-4 mr-2" />
                        Tutte
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-blue-700">
                        {metrics.total}
                      </div>
                      <div className="text-xs text-blue-600 mt-1">Todolist totali</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-100">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-green-700 flex items-center">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Completate
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-green-700">
                        {metrics.completed}
                      </div>
                      <div className="text-xs text-green-600 mt-1">
                        {metrics.completionRate || 0}% del totale
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-100">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-yellow-700 flex items-center">
                        <Calendar className="h-4 w-4 mr-2" />
                        Pendenti
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-yellow-700">
                        {metrics.pending}
                      </div>
                      <div className="text-xs text-yellow-600 mt-1">In attesa di esecuzione</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-red-50 to-rose-50 border-red-100">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-red-700 flex items-center">
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        Scadute
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-red-700">
                        {metrics.overdue}
                      </div>
                      <div className="text-xs text-red-600 mt-1">Oltre la scadenza</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-teal-50 to-cyan-50 border-teal-100">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-teal-700 flex items-center">
                        <TrendingUp className="h-4 w-4 mr-2" />
                        Efficienza
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-teal-700">
                        {metrics.total && metrics.total > 0 ? `${Math.round((metrics.completed / metrics.total) * 100)}%` : "0%"}
                      </div>
                      <div className="text-xs text-teal-600 mt-1">Completate / Totali</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-orange-100">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-orange-700 flex items-center">
                        <Activity className="h-4 w-4 mr-2" />
                        Tasso Scadute
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-orange-700">
                        {metrics.total && metrics.total > 0 ? `${Math.round((metrics.overdue / metrics.total) * 100)}%` : "0%"}
                      </div>
                      <div className="text-xs text-orange-600 mt-1">Scadute / Totali</div>
                    </CardContent>
                  </Card>
                </div>
              </div>
              {/* Grafico a Torta */}
              <div className="flex items-center justify-center">
                <Card className="w-full">
                  <CardHeader>
                    <CardTitle className="text-center text-slate-700">Distribuzione Stati</CardTitle>
                    <CardDescription className="text-center">
                      Panoramica visuale delle percentuali
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[280px]">
                      {metrics.pieChartData && metrics.pieChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={metrics.pieChartData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percentage }) => `${name}: ${percentage}%`}
                              outerRadius={100}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {metrics.pieChartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(value: number, name: string) => [
                                `${value} todolist`,
                                name
                              ]}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center text-muted-foreground">
                            Nessun dato disponibile per il periodo selezionato
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <div className="text-center text-muted-foreground mt-8">Nessun dato disponibile.</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
} 