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
    let allTasks: any[] = []
    let from = 0
    const limit = 1000 // Limite di paginazione Supabase
    let hasMore = true
    
    // Paginazione per gestire grandi quantità di dati
    while (hasMore) {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .range(from, from + limit - 1)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Error fetching tasks:', error)
        return NextResponse.json(
          { error: `Error fetching tasks: ${error.message}` },
          { status: 500 }
        )
      }
      
      if (!data || data.length === 0) {
        hasMore = false
      } else {
        allTasks = allTasks.concat(data)
        
        // Se abbiamo ricevuto meno record del limite, non ci sono più dati
        if (data.length < limit) {
          hasMore = false
        } else {
          from += limit
        }
      }
    }
    
    // Genera CSV header
    const headers = [
      'ID',
      'KPI ID',
      'Todolist ID',
      'Stato',
      'Valore (JSON)',
      'Alert Controllato',
      'Creato Da (User ID)',
      'Completato Da (User ID)',
      'Data Creazione',
      'Data Completamento',
      'Ultimo Aggiornamento'
    ]
    
    let csvContent = headers.join(',') + '\n'
    
    // Traduzioni per gli stati
    const statusTranslations: Record<string, string> = {
      'pending': 'In Attesa',
      'completed': 'Completato',
      'discarded': 'Scartato'
    }
    
    // Aggiungi i dati
    for (const task of allTasks) {
      const row = [
        escapeCSV(task.id),
        escapeCSV(task.kpi_id),
        escapeCSV(task.todolist_id),
        escapeCSV(statusTranslations[task.status] || task.status),
        escapeCSV(task.value ? JSON.stringify(task.value) : ''),
        escapeCSV(task.alert_checked ? 'Sì' : 'No'),
        escapeCSV(task.created_by_user_id),
        escapeCSV(task.completed_by_user_id),
        escapeCSV(task.created_at ? format(new Date(task.created_at), 'dd/MM/yyyy HH:mm:ss') : ''),
        escapeCSV(task.completed_at ? format(new Date(task.completed_at), 'dd/MM/yyyy HH:mm:ss') : ''),
        escapeCSV(task.updated_at ? format(new Date(task.updated_at), 'dd/MM/yyyy HH:mm:ss') : '')
      ]
      csvContent += row.join(',') + '\n'
    }
    
    // Genera nome file con timestamp
    const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss')
    const filename = `tasks_${timestamp}.csv`
    
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
    console.error('Tasks export API error:', error)
    return NextResponse.json(
      { error: 'Internal server error during tasks export' },
      { status: 500 }
    )
  }
}
