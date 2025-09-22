import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { searchParams } = new URL(request.url)

    const dateFrom = searchParams.get("dateFrom")
    const dateTo = searchParams.get("dateTo")
    const groupType = searchParams.get("groupType") as "single" | "composite"
    const groupKey = searchParams.get("groupKey")

    if (!dateFrom || !dateTo || !groupType || !groupKey) {
      return NextResponse.json(
        { error: "dateFrom, dateTo, groupType, and groupKey parameters are required" },
        { status: 400 }
      )
    }

    // AuthZ: allow only admin
    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("auth_id", userData.user.id)
      .single()
    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Find all todolists that match the group criteria
    const { data: todolists, error: todolistError } = await supabase
      .from("todolist")
      .select(`
        id,
        device_id,
        scheduled_execution,
        tasks(kpi_id)
      `)
      .gte("scheduled_execution", `${dateFrom}T00:00:00`)
      .lte("scheduled_execution", `${dateTo}T23:59:59`)

    if (todolistError) {
      console.error("Error fetching todolists:", todolistError)
      return NextResponse.json(
        { error: "Failed to fetch todolists" },
        { status: 500 }
      )
    }

    if (!todolists || todolists.length === 0) {
      return NextResponse.json({ deletedCount: 0, message: "No todolists found in the specified date range" })
    }

    // Filter todolists based on group criteria
    const todolistsToDelete: string[] = []
    
    for (const todolist of todolists) {
      const kpiIds = (todolist.tasks as any[])?.map(task => task.kpi_id) || []
      
      if (groupType === "single") {
        // For single KPI groups, todolist must have exactly one task with the specified KPI
        if (kpiIds.length === 1 && kpiIds[0] === groupKey) {
          todolistsToDelete.push(todolist.id)
        }
      } else if (groupType === "composite") {
        // For composite groups, todolist must have multiple KPIs that match the composite key
        if (kpiIds.length > 1) {
          const sortedKpis = kpiIds.slice().sort().join("+")
          if (sortedKpis === groupKey) {
            todolistsToDelete.push(todolist.id)
          }
        }
      }
    }

    if (todolistsToDelete.length === 0) {
      return NextResponse.json({ deletedCount: 0, message: "No todolists match the group criteria" })
    }

    // Get task info before deleting for logging
    const { data: tasksData } = await supabase
      .from("tasks")
      .select("id, kpi_id, todolist_id")
      .in("todolist_id", todolistsToDelete)

    // Delete all todolists (this will cascade delete all tasks)
    const { error: deleteError } = await supabase
      .from("todolist")
      .delete()
      .in("id", todolistsToDelete)

    if (deleteError) {
      console.error("Error deleting todolists:", deleteError)
      return NextResponse.json(
        { error: "Failed to delete todolists" },
        { status: 500 }
      )
    }

    // Log activities for each deleted task
    if (tasksData) {
      try {
        await Promise.all(
          tasksData.map(async (task: any) => {
            // Find the todolist info for this task
            const todolist = todolists.find(t => t.id === task.todolist_id)
            if (todolist) {
              await supabase.rpc('log_user_activity', {
                p_user_id: userData.user.id,
                p_action_type: 'delete_todolist',
                p_entity_type: 'task',
                p_entity_id: task.id,
                p_metadata: {
                  device_id: todolist.device_id,
                  kpi_id: task.kpi_id,
                  scheduled_execution: todolist.scheduled_execution,
                  batch_delete: true,
                  group_type: groupType,
                  group_key: groupKey
                }
              })
            }
          })
        )
      } catch (logError) {
        console.error("Error logging activities:", logError)
        // Don't fail the request if logging fails
      }
    }

    return NextResponse.json({ 
      deletedCount: todolistsToDelete.length,
      message: `Successfully deleted ${todolistsToDelete.length} todolists from the ${groupType} group` 
    })

  } catch (error) {
    console.error("Error in matrix madre delete-group API:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
