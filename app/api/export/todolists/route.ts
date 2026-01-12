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
    let allTodolists: any[] = []
    let from = 0
    const limit = 1000 // Limite di paginazione Supabase
    let hasMore = true
    
    // Paginazione per gestire grandi quantità di dati
    while (hasMore) {
      const { data, error } = await supabase
        .from('todolist')
        .select('*')
        .range(from, from + limit - 1)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Error fetching todolist:', error)
        return NextResponse.json(
          { error: `Error fetching todolist: ${error.message}` },
          { status: 500 }
        )
      }
      
      if (!data || data.length === 0) {
        hasMore = false
      } else {
        allTodolists = allTodolists.concat(data)
        
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
      'Device ID',
      'Stato',
      'Categoria',
      'Esecuzione Pianificata',
      'Tipo Slot Temporale',
      'Ora Inizio Slot',
      'Ora Fine Slot',
      'Fine Giornata',
      'Completato Da (User ID)',
      'Data Creazione',
      'Data Completamento',
      'Ultimo Aggiornamento'
    ]
    
    let csvContent = headers.join(',') + '\n'
    
    // Traduzioni per gli stati
    const statusTranslations: Record<string, string> = {
      'pending': 'In Attesa',
      'in_progress': 'In Corso',
      'completed': 'Completato'
    }
    
    // Traduzioni per time slot type
    const timeSlotTranslations: Record<string, string> = {
      'standard': 'Standard',
      'custom': 'Personalizzato'
    }
    
    // Aggiungi i dati
    for (const todolist of allTodolists) {
      const row = [
        escapeCSV(todolist.id),
        escapeCSV(todolist.device_id),
        escapeCSV(statusTranslations[todolist.status] || todolist.status),
        escapeCSV(todolist.todolist_category),
        escapeCSV(todolist.scheduled_execution ? format(new Date(todolist.scheduled_execution), 'dd/MM/yyyy HH:mm:ss') : ''),
        escapeCSV(timeSlotTranslations[todolist.time_slot_type] || todolist.time_slot_type),
        escapeCSV(todolist.time_slot_start),
        escapeCSV(todolist.time_slot_end),
        escapeCSV(todolist.end_day_time ? format(new Date(todolist.end_day_time), 'dd/MM/yyyy HH:mm:ss') : ''),
        escapeCSV(todolist.completed_by),
        escapeCSV(todolist.created_at ? format(new Date(todolist.created_at), 'dd/MM/yyyy HH:mm:ss') : ''),
        escapeCSV(todolist.completion_date ? format(new Date(todolist.completion_date), 'dd/MM/yyyy HH:mm:ss') : ''),
        escapeCSV(todolist.updated_at ? format(new Date(todolist.updated_at), 'dd/MM/yyyy HH:mm:ss') : '')
      ]
      csvContent += row.join(',') + '\n'
    }
    
    // Genera nome file con timestamp
    const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss')
    const filename = `todolists_${timestamp}.csv`
    
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
    console.error('Todolist export API error:', error)
    return NextResponse.json(
      { error: 'Internal server error during todolist export' },
      { status: 500 }
    )
  }
}
