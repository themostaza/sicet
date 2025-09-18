import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from "@/lib/supabase-server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    
    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate parameters are required' },
        { status: 400 }
      )
    }
    
    const supabase = await createServerSupabaseClient()
    
    // Fetch todolists with device info for the given period
    const { data: todolists, error } = await supabase
      .from('todolist')
      .select(`
        id,
        scheduled_execution,
        status,
        completion_date,
        devices!todolist_device_id_fkey (
          name
        )
      `)
      .gte('scheduled_execution', `${startDate}T00:00:00`)
      .lte('scheduled_execution', `${endDate}T23:59:59`)
      .order('scheduled_execution', { ascending: false })
    
    if (error) {
      console.error('Error fetching todolists preview:', error)
      return NextResponse.json(
        { error: `Error fetching todolists: ${error.message}` },
        { status: 500 }
      )
    }
    
    // Format the response
    const formattedTodolists = todolists?.map(todolist => ({
      id: todolist.id,
      device_name: todolist.devices?.name || 'Dispositivo sconosciuto',
      scheduled_execution: todolist.scheduled_execution,
      status: todolist.status,
      completion_date: todolist.completion_date
    })) || []
    
    return NextResponse.json({
      success: true,
      todolists: formattedTodolists,
      count: formattedTodolists.length
    })
    
  } catch (error) {
    console.error('Todolists preview API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
