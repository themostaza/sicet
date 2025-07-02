import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { isTodolistExpired } from "@/lib/validation/todolist-schemas"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const offset = parseInt(searchParams.get("offset") || "0", 10)
    const limit = parseInt(searchParams.get("limit") || "10", 10)

    const supabase = await createServerSupabaseClient()

    // Conta totale dispositivi
    const { count: totalDevices, error: countError } = await supabase
      .from("devices")
      .select("id", { count: "exact", head: true })
    if (countError) throw countError

    // Conta attivi
    const { count: activeDevices, error: activeError } = await supabase
      .from("devices")
      .select("id", { count: "exact", head: true })
      .eq("deleted", false)
    if (activeError) throw activeError

    // Conta disabilitati
    const { count: disabledDevices, error: disabledError } = await supabase
      .from("devices")
      .select("id", { count: "exact", head: true })
      .eq("deleted", true)
    if (disabledError) throw disabledError

    // Prendi lista paginata dispositivi (tutti, ordinati per created_at discendente, senza filtro deleted)
    const { data: devices, error: devicesError } = await supabase
      .from("devices")
      .select("id, name, created_at, deleted")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)
    if (devicesError) throw devicesError

    // Per ogni device, calcola metriche todolist
    const deviceIds = devices.map(d => d.id)
    let todolistMetricsByDevice: Record<string, { total: number, completed: number, pending: number, overdue: number }> = {}
    if (deviceIds.length > 0) {
      // Prendi tutte le todolist per questi device (includi time_slot_type, time_slot_end, completion_date)
      const { data: todolists, error: todolistError } = await supabase
        .from("todolist")
        .select("id, device_id, status, scheduled_execution, time_slot_type, time_slot_end, completion_date")
        .in("device_id", deviceIds)
      if (todolistError) throw todolistError

      for (const deviceId of deviceIds) {
        const todolistsForDevice = todolists.filter(t => t.device_id === deviceId)
        const total = todolistsForDevice.length
        const completed = todolistsForDevice.filter(t => t.completion_date !== null).length
        const pending = todolistsForDevice.filter(t => t.completion_date === null && !isTodolistExpired(t.scheduled_execution, t.time_slot_type, t.time_slot_end)).length
        const overdue = todolistsForDevice.filter(t =>
          (t.status === "pending" || t.status === "in_progress") &&
          isTodolistExpired(t.scheduled_execution, t.time_slot_type, t.time_slot_end)
        ).length
        todolistMetricsByDevice[deviceId] = { total, completed, pending, overdue }
      }
    }

    const resultDevices = devices.map(d => ({
      id: d.id,
      name: d.name,
      created_at: d.created_at,
      deleted: d.deleted,
      todolistMetrics: todolistMetricsByDevice[d.id] || { total: 0, completed: 0, pending: 0, overdue: 0 }
    }))

    const hasMore = totalDevices !== null ? offset + limit < totalDevices : false

    return NextResponse.json({
      totalDevices,
      activeDevices,
      disabledDevices,
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