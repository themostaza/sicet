import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"

interface DeviceCounts {
  total: number
  active: number
  disabled: number
}

interface DeviceTodolistMetrics {
  total: number
  completed: number
  pending: number
  overdue: number
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const offset = parseInt(searchParams.get("offset") || "0", 10)
    const limit = parseInt(searchParams.get("limit") || "10", 10)

    const supabase = await createServerSupabaseClient()

    // Usa RPC per ottenere tutti i count in una singola query
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: countsData, error: countsError } = await (supabase.rpc as any)('get_device_counts')
    if (countsError) throw countsError
    
    const counts = countsData as DeviceCounts

    // Prendi lista paginata dispositivi
    const { data: devices, error: devicesError } = await supabase
      .from("devices")
      .select("id, name, created_at, deleted")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)
    if (devicesError) throw devicesError

    // Usa RPC per calcolare metriche todolist per device (GROUP BY, molto più efficiente)
    const deviceIds = devices.map(d => d.id)
    let todolistMetricsByDevice: Record<string, DeviceTodolistMetrics> = {}
    
    if (deviceIds.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: metricsData, error: metricsError } = await (supabase.rpc as any)(
        'get_device_todolist_metrics',
        { p_device_ids: deviceIds, p_now: new Date().toISOString() }
      )
      
      if (metricsError) {
        console.error("Error fetching device todolist metrics:", metricsError)
      } else if (metricsData) {
        todolistMetricsByDevice = metricsData as unknown as Record<string, DeviceTodolistMetrics>
      }
    }

    const resultDevices = devices.map(d => ({
      id: d.id,
      name: d.name,
      created_at: d.created_at,
      deleted: d.deleted,
      todolistMetrics: todolistMetricsByDevice[d.id] || { total: 0, completed: 0, pending: 0, overdue: 0 }
    }))

    const hasMore = counts.total !== null ? offset + limit < counts.total : false

    return NextResponse.json({
      totalDevices: counts.total,
      activeDevices: counts.active,
      disabledDevices: counts.disabled,
      devices: resultDevices,
      hasMore
    })
  } catch (error) {
    console.error("Error in device metrics API:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 