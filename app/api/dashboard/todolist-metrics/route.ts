import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { handlePostgrestError as handleError } from "@/lib/supabase/error"
import { isTodolistExpired } from "@/lib/validation/todolist-schemas"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Parametri per il filtro data
    const dateFrom = searchParams.get("dateFrom")
    const dateTo = searchParams.get("dateTo")
    
    const supabase = await createServerSupabaseClient()

    // Query base per le metriche
    let query = supabase
      .from("todolist")
      .select("id, status, scheduled_execution, time_slot_type, time_slot_end, completion_date")

    // Applica filtri per data se specificati
    if (dateFrom) {
      query = query.gte("scheduled_execution", `${dateFrom}T00:00:00`)
    }
    if (dateTo) {
      query = query.lte("scheduled_execution", `${dateTo}T23:59:59`)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching todolist metrics:", error)
      handleError(error)
    }

    const todolists = data || []

    // Calcola le metriche
    const total = todolists.length
    const completed = todolists.filter(t => t.completion_date !== null).length
    const pending = todolists.filter(t => t.completion_date === null && !isTodolistExpired(t.scheduled_execution, t.time_slot_type, t.time_slot_end)).length
    const inProgress = todolists.filter(t => t.status === 'in_progress').length // opzionale, legacy
    // Calcola scadute: pending o in_progress e isTodolistExpired
    const overdue = todolists.filter(t => 
      (t.status === 'pending' || t.status === 'in_progress') && 
      isTodolistExpired(t.scheduled_execution, t.time_slot_type, t.time_slot_end)
    ).length

    // Calcola percentuali per il grafico a torta
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

    const metrics = {
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

    return NextResponse.json(metrics)
    
  } catch (error) {
    console.error("Error in todolist metrics API:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 