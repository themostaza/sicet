import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { isTodolistExpired } from "@/lib/validation/todolist-schemas"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const deviceId = searchParams.get("deviceId")
    const dateFrom = searchParams.get("dateFrom")
    const dateTo = searchParams.get("dateTo")

    if (!deviceId || !dateFrom || !dateTo) {
      return NextResponse.json({ error: "deviceId, dateFrom, and dateTo are required" }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()
    const { data: todolists, error } = await supabase
      .from("todolist")
      .select("id, status, scheduled_execution, completion_date, time_slot_type, time_slot_end")
      .eq("device_id", deviceId)
      .gte("scheduled_execution", `${dateFrom}T00:00:00`)
      .lte("scheduled_execution", `${dateTo}T23:59:59`)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const total = todolists.length
    const completed = todolists.filter(t => t.completion_date !== null).length
    const pending = todolists.filter(t =>
      t.completion_date === null &&
      !isTodolistExpired(
        t.scheduled_execution,
        (t.time_slot_type === "standard" || t.time_slot_type === "custom") ? t.time_slot_type as "standard" | "custom" : undefined,
        t.time_slot_end
      )
    ).length
    const overdue = todolists.filter(t =>
      (t.status === "pending" || t.status === "in_progress") &&
      isTodolistExpired(
        t.scheduled_execution,
        (t.time_slot_type === "standard" || t.time_slot_type === "custom") ? t.time_slot_type as "standard" | "custom" : undefined,
        t.time_slot_end
      )
    ).length
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0
    const overdueRate = total > 0 ? Math.round((overdue / total) * 100) : 0

    // Pie chart data
    const pieChartData = [
      {
        name: "Completate",
        value: completed,
        percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
        color: "#10b981"
      },
      {
        name: "Pendenti",
        value: pending,
        percentage: total > 0 ? Math.round((pending / total) * 100) : 0,
        color: "#f59e0b"
      },
      {
        name: "Scadute",
        value: overdue,
        percentage: total > 0 ? Math.round((overdue / total) * 100) : 0,
        color: "#ef4444"
      }
    ]

    return NextResponse.json({
      total,
      completed,
      pending,
      overdue,
      completionRate,
      overdueRate,
      pieChartData,
      filters: { dateFrom, dateTo }
    })
  } catch (error) {
    console.error("Error in device-todolist-metrics API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 