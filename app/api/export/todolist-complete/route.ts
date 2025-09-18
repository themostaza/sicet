import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { format } from "date-fns"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Funzione helper per escape CSV
    const escapeCSV = (value: any): string => {
      if (value === null || value === undefined) return ''
      const str = String(value)
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }
    
    // Array per contenere tutti i dati
    let allData: any[] = []
    let from = 0
    const limit = 1000 // Limite di paginazione Supabase
    let hasMore = true
    
    // Paginazione per gestire grandi quantità di dati
    // Query complessa per unire todolist + profiles + tasks + devices + kpis
    while (hasMore) {
      const { data, error } = await supabase
        .from('todolist')
        .select(`
          id,
          device_id,
          scheduled_execution,
          status,
          time_slot_start,
          time_slot_end,
          time_slot_type,
          todolist_category,
          end_day_time,
          completed_by,
          completion_date,
          created_at,
          updated_at,
          devices!todolist_device_id_fkey (
            id,
            name,
            description,
            type,
            location
          ),
          tasks (
            id,
            kpi_id,
            status,
            value,
            created_at,
            updated_at,
            completed_at,
            completed_by_user_id,
            created_by_user_id,
            alert_checked,
            kpis!tasks_kpi_id_fkey (
              id,
              name,
              description
            )
          )
        `)
        .range(from, from + limit - 1)
        .order('created_at', { ascending: true })
      
      if (error) {
        console.error('Error fetching todolist complete data:', error)
        return NextResponse.json(
          { error: `Error fetching todolist complete data: ${error.message}` },
          { status: 500 }
        )
      }
      
      if (!data || data.length === 0) {
        hasMore = false
      } else {
        allData = allData.concat(data)
        
        // Se abbiamo ricevuto meno record del limite, non ci sono più dati
        if (data.length < limit) {
          hasMore = false
        } else {
          from += limit
        }
      }
    }
    
    // Ora dobbiamo ottenere i profili degli utenti per completed_by, completed_by_user_id, created_by_user_id
    const userIds = new Set<string>()
    
    allData.forEach(todolist => {
      if (todolist.completed_by) userIds.add(todolist.completed_by)
      
      todolist.tasks?.forEach((task: any) => {
        if (task.completed_by_user_id) userIds.add(task.completed_by_user_id)
        if (task.created_by_user_id) userIds.add(task.created_by_user_id)
      })
    })
    
    // Fetch user profiles in batches
    const userProfiles: Record<string, any> = {}
    const userIdArray = Array.from(userIds)
    
    for (let i = 0; i < userIdArray.length; i += 1000) {
      const batch = userIdArray.slice(i, i + 1000)
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, role')
        .in('id', batch)
      
      if (profilesError) {
        console.error('Error fetching profiles:', profilesError)
      } else if (profiles) {
        profiles.forEach(profile => {
          userProfiles[profile.id] = profile
        })
      }
    }
    
    // Genera CSV header per todolist
    const todolistHeaders = [
      'Todolist ID',
      'Device ID',
      'Device Name',
      'Device Description',
      'Device Type',
      'Device Location',
      'Scheduled Execution',
      'Status',
      'Time Slot Start',
      'Time Slot End',
      'Time Slot Type',
      'Category',
      'End Day Time',
      'Completed By (Email)',
      'Completion Date',
      'Created At',
      'Updated At'
    ]
    
    // Genera CSV header per tasks (esplose)
    const tasksHeaders = [
      'Todolist ID',
      'Task ID',
      'KPI ID',
      'KPI Name',
      'KPI Description',
      'Task Status',
      'Task Value (JSON)',
      'Task Created At',
      'Task Updated At',
      'Task Completed At',
      'Task Completed By (Email)',
      'Task Created By (Email)',
      'Alert Checked'
    ]
    
    let csvContent = ''
    
    // Prima sezione: Todolist
    csvContent += '=== TODOLIST ===\n'
    csvContent += todolistHeaders.join(',') + '\n'
    
    for (const todolist of allData) {
      const completedByProfile = todolist.completed_by ? userProfiles[todolist.completed_by] : null
      
      const row = [
        escapeCSV(todolist.id),
        escapeCSV(todolist.device_id),
        escapeCSV(todolist.devices?.name || ''),
        escapeCSV(todolist.devices?.description || ''),
        escapeCSV(todolist.devices?.type || ''),
        escapeCSV(todolist.devices?.location || ''),
        escapeCSV(todolist.scheduled_execution ? format(new Date(todolist.scheduled_execution), 'dd/MM/yyyy HH:mm:ss') : ''),
        escapeCSV(todolist.status),
        escapeCSV(todolist.time_slot_start || ''),
        escapeCSV(todolist.time_slot_end || ''),
        escapeCSV(todolist.time_slot_type),
        escapeCSV(todolist.todolist_category || ''),
        escapeCSV(todolist.end_day_time || ''),
        escapeCSV(completedByProfile?.email || ''),
        escapeCSV(todolist.completion_date ? format(new Date(todolist.completion_date), 'dd/MM/yyyy HH:mm:ss') : ''),
        escapeCSV(todolist.created_at ? format(new Date(todolist.created_at), 'dd/MM/yyyy HH:mm:ss') : ''),
        escapeCSV(todolist.updated_at ? format(new Date(todolist.updated_at), 'dd/MM/yyyy HH:mm:ss') : '')
      ]
      csvContent += row.join(',') + '\n'
    }
    
    // Seconda sezione: Tasks (esplose)
    csvContent += '\n=== TASKS (ESPLOSE) ===\n'
    csvContent += tasksHeaders.join(',') + '\n'
    
    for (const todolist of allData) {
      if (todolist.tasks && Array.isArray(todolist.tasks)) {
        for (const task of todolist.tasks) {
          const completedByProfile = task.completed_by_user_id ? userProfiles[task.completed_by_user_id] : null
          const createdByProfile = task.created_by_user_id ? userProfiles[task.created_by_user_id] : null
          
          const row = [
            escapeCSV(todolist.id),
            escapeCSV(task.id),
            escapeCSV(task.kpi_id),
            escapeCSV(task.kpis?.name || ''),
            escapeCSV(task.kpis?.description || ''),
            escapeCSV(task.status),
            escapeCSV(task.value ? JSON.stringify(task.value) : ''),
            escapeCSV(task.created_at ? format(new Date(task.created_at), 'dd/MM/yyyy HH:mm:ss') : ''),
            escapeCSV(task.updated_at ? format(new Date(task.updated_at), 'dd/MM/yyyy HH:mm:ss') : ''),
            escapeCSV(task.completed_at ? format(new Date(task.completed_at), 'dd/MM/yyyy HH:mm:ss') : ''),
            escapeCSV(completedByProfile?.email || ''),
            escapeCSV(createdByProfile?.email || ''),
            escapeCSV(task.alert_checked ? 'Sì' : 'No')
          ]
          csvContent += row.join(',') + '\n'
        }
      }
    }
    
    // Genera nome file con timestamp
    const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss')
    const filename = `todolist_completa_${timestamp}.csv`
    
    // Converti in Blob e restituisci
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' })
    const arrayBuffer = await blob.arrayBuffer()
    
    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
    
  } catch (error) {
    console.error('Todolist complete export API error:', error)
    return NextResponse.json(
      { error: 'Internal server error during todolist complete export' },
      { status: 500 }
    )
  }
}
