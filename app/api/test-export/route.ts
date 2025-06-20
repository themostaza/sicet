import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { getKpi } from "@/app/actions/actions-kpi"

export async function POST(request: NextRequest) {
  try {
    console.log("[TEST-EXPORT] Starting export test...")
    
    const body = await request.json()
    const { kpiId } = body
    
    if (!kpiId) {
      return NextResponse.json(
        { error: 'Missing required parameter: kpiId' },
        { status: 400 }
      )
    }
    
    console.log("[TEST-EXPORT] Testing with KPI ID:", kpiId)
    
    // Get the KPI details
    const kpi = await getKpi(kpiId)
    if (!kpi) {
      return NextResponse.json(
        { error: 'KPI not found' },
        { status: 404 }
      )
    }
    
    console.log("[TEST-EXPORT] KPI found:", {
      id: kpi.id,
      name: kpi.name,
      value: kpi.value
    })
    
    // Get some tasks for this KPI
    const supabase = await createServerSupabaseClient()
    const { data: tasks, error } = await supabase
      .from("tasks")
      .select(`
        id,
        kpi_id,
        status,
        value,
        todolist:todolist_id (
          device_id,
          scheduled_execution
        )
      `)
      .eq('kpi_id', kpiId)
      .limit(5)
    
    if (error) {
      console.error("[TEST-EXPORT] Error fetching tasks:", error)
      return NextResponse.json(
        { error: 'Error fetching tasks' },
        { status: 500 }
      )
    }
    
    console.log("[TEST-EXPORT] Tasks found:", tasks?.length || 0)
    
    // Analyze each task
    const taskAnalysis = tasks?.map(task => {
      console.log(`[TEST-EXPORT] Task ${task.id}:`, {
        valueType: typeof task.value,
        isArray: Array.isArray(task.value),
        value: task.value
      })
      
      return {
        taskId: task.id,
        valueType: typeof task.value,
        isArray: Array.isArray(task.value),
        value: task.value,
        hasValue: task.value !== null && task.value !== undefined
      }
    }) || []
    
    return NextResponse.json({
      success: true,
      kpi: {
        id: kpi.id,
        name: kpi.name,
        value: kpi.value
      },
      tasks: taskAnalysis,
      totalTasks: tasks?.length || 0
    })
    
  } catch (error) {
    console.error("[TEST-EXPORT] Error during test:", error)
    return NextResponse.json(
      { 
        error: 'Error during export test',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 