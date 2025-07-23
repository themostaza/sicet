import React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FileText, CheckCircle, Calendar, AlertTriangle, TrendingUp, Activity } from "lucide-react"
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts"

interface TodolistMetrics {
  total: number
  pending: number
  completed: number
  inProgress: number
  overdue: number
  completionRate: number
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
  dateFrom: string
  dateTo: string
  setDateFrom: (v: string) => void
  setDateTo: (v: string) => void
  applyFilters: () => void
  resetFilters: () => void
  isLoading: boolean
  todolistMetrics: TodolistMetrics | null
}

export default function MetricheTodolist({
  dateFrom,
  dateTo,
  setDateFrom,
  setDateTo,
  applyFilters,
  resetFilters,
  isLoading,
  todolistMetrics
}: Props) {
  return (
    <Card className="bg-gradient-to-r from-slate-50 to-gray-50 border-slate-200">
      <CardHeader>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between w-full gap-4">
          <div>
            <CardTitle className="flex items-center text-slate-700">
              <FileText className="h-6 w-6 mr-2" />
              Metriche Todolist
            </CardTitle>
            <CardDescription>
              Panoramica dello stato delle todolist
              {(dateFrom || dateTo) && (
                <div className="text-sm mt-1 text-blue-600 font-medium">
                  {dateFrom && dateTo
                    ? `Periodo: ${dateFrom} - ${dateTo}`
                    : dateFrom
                    ? `Da: ${dateFrom}`
                    : `Fino al: ${dateTo}`}
                </div>
              )}
            </CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="min-w-[140px]">
                <Label htmlFor="dateFrom">Data Inizio</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="min-w-[140px]">
                <Label htmlFor="dateTo">Data Fine</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={applyFilters} disabled={isLoading} className="h-10 flex-1 sm:flex-none">
                {isLoading ? "Caricamento..." : "Applica Filtri"}
              </Button>
              <Button variant="outline" onClick={resetFilters} className="h-10 flex-1 sm:flex-none">
                Reset
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* KPI Cards */}
          <div className="space-y-4">
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
              <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-blue-700 flex items-center">
                    <FileText className="h-4 w-4 mr-2" />
                    Tutte
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl sm:text-3xl font-bold text-blue-700">
                    {isLoading ? "..." : (todolistMetrics?.total || 0)}
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
                  <div className="text-2xl sm:text-3xl font-bold text-green-700">
                    {isLoading ? "..." : (todolistMetrics?.completed || 0)}
                  </div>
                  <div className="text-xs text-green-600 mt-1">
                    {todolistMetrics?.completionRate || 0}% del totale
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
                  <div className="text-2xl sm:text-3xl font-bold text-yellow-700">
                    {isLoading ? "..." : (todolistMetrics?.pending || 0)}
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
                  <div className="text-2xl sm:text-3xl font-bold text-red-700">
                    {isLoading ? "..." : (todolistMetrics?.overdue || 0)}
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
                  <div className="text-2xl sm:text-3xl font-bold text-teal-700">
                    {isLoading ? "..." : (
                      todolistMetrics?.total && todolistMetrics.total > 0
                        ? `${Math.round((todolistMetrics.completed / todolistMetrics.total) * 100)}%`
                        : "0%"
                    )}
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
                  <div className="text-2xl sm:text-3xl font-bold text-orange-700">
                    {isLoading ? "..." : (
                      todolistMetrics?.total && todolistMetrics.total > 0
                        ? `${Math.round((todolistMetrics.overdue / todolistMetrics.total) * 100)}%`
                        : "0%"
                    )}
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
                <div className="h-[250px] sm:h-[280px]">
                  {todolistMetrics && todolistMetrics.pieChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={todolistMetrics.pieChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percentage }) => `${name}: ${percentage}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {todolistMetrics.pieChartData.map((entry, index) => (
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
                        {isLoading ? (
                          <div className="space-y-2">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                            <div>Caricamento dati...</div>
                          </div>
                        ) : (
                          "Nessun dato disponibile per il periodo selezionato"
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 