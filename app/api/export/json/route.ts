import { NextRequest, NextResponse } from 'next/server'
import { exportTodolistData } from '@/lib/export-utils'
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { format, parseISO } from "date-fns"
import { getKpi } from "@/app/actions/actions-kpi"
import { getDevice } from "@/app/actions/actions-device"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Extract query parameters
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const filterDeviceIds = searchParams.get('deviceIds')?.split(',').filter(Boolean) || undefined
    const filterKpiIds = searchParams.get('kpiIds')?.split(',').filter(Boolean) || undefined
    const filename = searchParams.get('filename') || 'todolist-export'
    
    // Validate required parameters
    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate are required parameters' },
        { status: 400 }
      )
    }
    
    // Validate date format (basic validation)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return NextResponse.json(
        { error: 'Date format must be YYYY-MM-DD' },
        { status: 400 }
      )
    }
    
    // Validate date range
    if (new Date(startDate) > new Date(endDate)) {
      return NextResponse.json(
        { error: 'startDate must be before or equal to endDate' },
        { status: 400 }
      )
    }
    
    // Get the raw data for JSON export
    const supabase = await createServerSupabaseClient()
    
    // Build query for tasks with todolist info
    let query = supabase
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
      .gte('todolist.scheduled_execution', `${startDate}T00:00:00`)
      .lte('todolist.scheduled_execution', `${endDate}T23:59:59`)
    
    // Filter by device if specified
    if (filterDeviceIds && filterDeviceIds.length > 0) {
      query = query.in('todolist.device_id', filterDeviceIds)
    }
    
    // Filter by KPI if specified  
    if (filterKpiIds && filterKpiIds.length > 0) {
      query = query.in('kpi_id', filterKpiIds)
    }
    
    // Execute query
    const { data: tasks, error } = await query
    
    if (error) {
      console.error("Error fetching tasks:", error)
      throw new Error(`Error fetching tasks: ${error.message}`)
    }
    
    // If no tasks found
    if (!tasks || tasks.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        count: 0,
        message: 'Nessun dato trovato'
      })
    }
    
    // Filter out tasks with null todolist
    const validTasks = tasks.filter(task => task.todolist !== null)
    
    if (validTasks.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        count: 0,
        message: 'Nessun dato valido trovato'
      })
    }
    
    // Get unique device and KPI IDs
    const uniqueDeviceIds = [...new Set(validTasks.map(task => task.todolist!.device_id))]
    const uniqueKpiIds = [...new Set(validTasks.map(task => task.kpi_id))]
    
    // Fetch device and KPI details in parallel
    const [devices, kpis] = await Promise.all([
      Promise.all(uniqueDeviceIds.map(id => getDevice(id))),
      Promise.all(uniqueKpiIds.map(id => getKpi(id)))
    ])
    
    // Create lookup maps
    const deviceMap: Record<string, string> = Object.fromEntries(
      devices.filter(Boolean).map(device => [device?.id, device?.name])
    )
    
    const kpiMap: Record<string, string> = Object.fromEntries(
      kpis.filter(Boolean).map(kpi => [kpi?.id, kpi?.name])
    )
    
    // Transform data for JSON export
    const exportData = validTasks.map(task => ({
      id: task.id,
      date: task.todolist?.scheduled_execution ? format(parseISO(task.todolist.scheduled_execution), 'dd/MM/yyyy') : null,
      deviceId: task.todolist?.device_id,
      deviceName: deviceMap[task.todolist?.device_id || ''] || 'Punto di controllo sconosciuto',
      kpiId: task.kpi_id,
      kpiName: kpiMap[task.kpi_id] || 'Controllo sconosciuto',
      status: task.status,
      value: task.value
    }))
    
    // Generate filename
    const safeFilename = filename.replace(/[^a-zA-Z0-9-_]/g, '_')
    const finalFilename = `${safeFilename}-${startDate}-to-${endDate}.json`
    
    // Return JSON file
    return new NextResponse(JSON.stringify({
      success: true,
      data: exportData,
      count: exportData.length,
      exportInfo: {
        startDate,
        endDate,
        deviceIds: uniqueDeviceIds.length > 0 ? uniqueDeviceIds : undefined,
        kpiIds: uniqueKpiIds.length > 0 ? uniqueKpiIds : undefined,
        exportedAt: new Date().toISOString()
      }
    }, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${finalFilename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
    
  } catch (error) {
    console.error('JSON Export API error:', error)
    
    if (error instanceof Error) {
      return NextResponse.json(
        { 
          success: false,
          error: error.message 
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error' 
      },
      { status: 500 }
    )
  }
} 