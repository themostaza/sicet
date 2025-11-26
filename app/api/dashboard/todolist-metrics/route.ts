import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"

interface DashboardMetrics {
  total: number
  completed: number
  pending: number
  inProgress: number
  overdue: number
  completionRate: number
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Parametri per il filtro data
    const dateFrom = searchParams.get("dateFrom")
    const dateTo = searchParams.get("dateTo")
    
    const supabase = await createServerSupabaseClient()

    // Usa la funzione RPC ottimizzata
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.rpc as any)('get_dashboard_todolist_metrics', {
      p_date_from: dateFrom ? `${dateFrom}T00:00:00+00:00` : null,
      p_date_to: dateTo ? `${dateTo}T23:59:59+00:00` : null
    })

    if (error) {
      console.error("Error calling RPC:", error)
      throw error
    }

    const metrics = data as DashboardMetrics

    // Calcola percentuali per il grafico a torta
    const total = metrics.total || 0
    const completed = metrics.completed || 0
    const pending = metrics.pending || 0
    const inProgress = metrics.inProgress || 0
    const overdue = metrics.overdue || 0

    const completedPercentage = total > 0 ? Math.round((completed / total) * 100) : 0
    const pendingPercentage = total > 0 ? Math.round((pending / total) * 100) : 0
    const inProgressPercentage = total > 0 ? Math.round((inProgress / total) * 100) : 0
    const overduePercentage = total > 0 ? Math.round((overdue / total) * 100) : 0

    // Dati per il grafico a torta
    const pieChartData = [
      {
        name: 'Completate',
        value: completed,
        percentage: completedPercentage,
        color: '#10b981'
      },
      {
        name: 'In Corso',
        value: inProgress,
        percentage: inProgressPercentage,
        color: '#3b82f6'
      },
      {
        name: 'Pendenti',
        value: pending,
        percentage: pendingPercentage,
        color: '#f59e0b'
      },
      {
        name: 'Scadute',
        value: overdue,
        percentage: overduePercentage,
        color: '#ef4444'
      }
    ].filter(item => item.value > 0) // Rimuovi categorie con valore 0

    const result = {
      total,
      pending,
      completed,
      inProgress,
      overdue,
      completionRate: completedPercentage,
      pieChartData,
      filters: {
        dateFrom,
        dateTo
      }
    }

    return NextResponse.json(result)
    
  } catch (error) {
    console.error("Error in todolist metrics API:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 