import { NextRequest, NextResponse } from "next/server"
import { getKpi } from "@/app/actions/actions-kpi"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { parseISO } from "date-fns"

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
    // Query tasks to find unique KPI IDs that have tasks for the specific device and date range
    const { data, error } = await supabase
      .from("tasks")
      .select(`kpi_id, todolist:todolist_id (device_id, scheduled_execution)`)
      .gte("todolist.scheduled_execution", `${dateFrom}T00:00:00`)
      .lte("todolist.scheduled_execution", `${dateTo}T23:59:59`)
      .eq("todolist.device_id", deviceId)
      .order("kpi_id")
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    const validData = (data ?? []).filter(item => item.todolist !== null)
    const kpiIds = [...new Set(validData.map(item => item.kpi_id))]
    if (kpiIds.length === 0) {
      return NextResponse.json({ data: [] })
    }
    // Fetch full KPI details
    const kpis = await Promise.all(kpiIds.map(id => getKpi(id)))
    return NextResponse.json({ data: kpis.filter(Boolean) })
  } catch (error) {
    console.error("Error in device-kpis API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 