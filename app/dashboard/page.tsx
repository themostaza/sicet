"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  BarChart2, 
  PieChart as PieChartIcon, 
  TrendingUp, 
  Activity,
  Layers, 
  FileText, 
  Calendar,
  AlertTriangle,
  CheckCircle,
  BarChart as BarChartIcon,
  ArrowUp,
  ArrowDown,
  Filter,
  Loader2
} from "lucide-react"
import { getTodolistsGroupedWithFilters } from "@/app/actions/actions-todolist"
import { getDevices } from "@/app/actions/actions-device"
import { getKpis } from "@/app/actions/actions-kpi"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, RadarChart, 
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ComposedChart, Scatter } from 'recharts'
import { formatDateForDisplay } from "@/lib/utils"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import MetricheTodolist from "./components/MetricheTodolist"
import MetrichePuntiControllo from "./components/MetrichePuntiControllo"

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

export default function DashboardPage() {
  // Calcola date di default: ultimi 3 mesi
  const getDefaultDates = () => {
    const today = new Date()
    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(today.getMonth() - 3)
    
    return {
      dateFrom: threeMonthsAgo.toISOString().split('T')[0],
      dateTo: today.toISOString().split('T')[0]
    }
  }

  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdateTime, setLastUpdateTime] = useState<string>('')
  const [dateFrom, setDateFrom] = useState<string>(getDefaultDates().dateFrom)
  const [dateTo, setDateTo] = useState<string>(getDefaultDates().dateTo)
  const [todolistMetrics, setTodolistMetrics] = useState<TodolistMetrics | null>(null)
  const [stats, setStats] = useState({
    devices: 0,
    kpis: 0,
    todolist: {
      all: 0,
      today: 0,
      overdue: 0,
      completed: 0,
      pending: 0
    }
  })

  // Stato per metriche device
  const [deviceMetrics, setDeviceMetrics] = useState<{ totalDevices: number, activeDevices: number, disabledDevices: number, devices: any[], hasMore: boolean } | null>(null)
  const [deviceMetricsLoading, setDeviceMetricsLoading] = useState(true)
  const [deviceMetricsOffset, setDeviceMetricsOffset] = useState(0)
  const DEVICE_METRICS_LIMIT = 50

  // Funzione per fetchare le metriche todolist
  async function fetchTodolistMetrics(dateFromParam?: string, dateToParam?: string) {
    try {
      const params = new URLSearchParams()
      if (dateFromParam) params.append('dateFrom', dateFromParam)
      if (dateToParam) params.append('dateTo', dateToParam)
      
      const response = await fetch(`/api/dashboard/todolist-metrics?${params.toString()}`)
      if (!response.ok) {
        throw new Error('Failed to fetch todolist metrics')
      }
      
      const data: TodolistMetrics = await response.json()
      setTodolistMetrics(data)
      return data
    } catch (error) {
      console.error('Error fetching todolist metrics:', error)
      return null
    }
  }

  // Fetch device metrics
  async function fetchDeviceMetrics(offset = 0) {
    setDeviceMetricsLoading(true)
    try {
      const response = await fetch(`/api/dashboard/device-metrics?offset=${offset}&limit=${DEVICE_METRICS_LIMIT}`)
      if (!response.ok) throw new Error("Failed to fetch device metrics")
      const data = await response.json()
      // Se offset > 0, aggiungi i nuovi device a quelli già caricati
      setDeviceMetrics(prev => offset > 0 && prev ? {
        ...data,
        devices: [...prev.devices, ...data.devices]
      } : data)
    } catch (error) {
      console.error("Error fetching device metrics:", error)
    } finally {
      setDeviceMetricsLoading(false)
    }
  }

  useEffect(() => {
    async function loadDashboardData() {
      try {
        // Load data in parallel
        const [devicesData, kpisData, todolistMetricsData] = await Promise.all([
          getDevices({ limit: 1, countOnly: true }),
          getKpis({ limit: 1, countOnly: true }),
          fetchTodolistMetrics(dateFrom, dateTo)
        ])

        setStats({
          devices: devicesData.devices.length,
          kpis: kpisData.kpis.length,
          todolist: {
            all: todolistMetricsData?.total || 0,
            today: 0, // Questo sarà calcolato separatamente se necessario
            overdue: todolistMetricsData?.overdue || 0,
            completed: todolistMetricsData?.completed || 0,
            pending: todolistMetricsData?.pending || 0
          }
        })

        // Imposta il timestamp dell'ultimo aggiornamento
        const now = new Date()
        const day = now.getDate().toString().padStart(2, '0')
        const month = (now.getMonth() + 1).toString().padStart(2, '0')
        const year = now.getFullYear()
        const hours = now.getHours().toString().padStart(2, '0')
        const minutes = now.getMinutes().toString().padStart(2, '0')
        const seconds = now.getSeconds().toString().padStart(2, '0')
        setLastUpdateTime(`${day}/${month}/${year}, ${hours}:${minutes}:${seconds}`)

        // Carica device metrics al mount e quando cambia offset
        fetchDeviceMetrics(deviceMetricsOffset)

      } catch (error) {
        console.error("Error loading dashboard data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadDashboardData()
  }, [dateFrom, dateTo, deviceMetricsOffset])

  // Funzione per applicare i filtri
  const applyFilters = () => {
    setIsLoading(true)
    fetchTodolistMetrics(dateFrom, dateTo).finally(() => setIsLoading(false))
  }

  // Funzione per resettare i filtri
  const resetFilters = () => {
    setDateFrom('')
    setDateTo('')
  }

  // Colori per i grafici
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];
  const chartColors = {
    completed: '#10b981', // verde
    pending: '#f59e0b',   // giallo
    overdue: '#ef4444',   // rosso
    primary: '#2563eb',   // blu
    secondary: '#8b5cf6', // viola
    neutral: '#6b7280'    // grigio
  };

  // Calcola il tasso di completamento totale (fallback se non ci sono dati API)
  const completionRate = stats.todolist.all > 0 
    ? Math.round((stats.todolist.completed / stats.todolist.all) * 100) 
    : 0;

  // Handler per mostrare altri device
  const handleShowMoreDevices = () => {
    setDeviceMetricsOffset(prev => prev + DEVICE_METRICS_LIMIT)
  }

  return (
    <div className="flex-1 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold">Dashboard Analitica</h1>
        <div className="text-sm text-muted-foreground">
          Ultimo aggiornamento: {lastUpdateTime || "Caricamento..."}
        </div>
      </div>

      <MetricheTodolist
        dateFrom={dateFrom}
        dateTo={dateTo}
        setDateFrom={setDateFrom}
        setDateTo={setDateTo}
        applyFilters={applyFilters}
        resetFilters={resetFilters}
        isLoading={isLoading}
        todolistMetrics={todolistMetrics}
      />

      <MetrichePuntiControllo
        deviceMetrics={deviceMetrics}
        deviceMetricsLoading={deviceMetricsLoading}
        handleShowMoreDevices={handleShowMoreDevices}
      />
    </div>
  )
}
