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
    let allLogs: any[] = []
    let from = 0
    const limit = 1000 // Limite di paginazione Supabase
    let hasMore = true
    
    // Paginazione per gestire grandi quantità di dati
    while (hasMore) {
      const { data, error } = await supabase
        .from('todolist_alert_logs')
        .select('*')
        .range(from, from + limit - 1)
        .order('sent_at', { ascending: false })
      
      if (error) {
        console.error('Error fetching todolist_alert_logs:', error)
        return NextResponse.json(
          { error: `Error fetching todolist_alert_logs: ${error.message}` },
          { status: 500 }
        )
      }
      
      if (!data || data.length === 0) {
        hasMore = false
      } else {
        allLogs = allLogs.concat(data)
        
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
      'Todolist ID',
      'Alert ID',
      'Email',
      'Data Invio',
      'Messaggio Errore',
      'Data Creazione'
    ]
    
    let csvContent = headers.join(',') + '\n'
    
    // Aggiungi i dati
    for (const log of allLogs) {
      const row = [
        escapeCSV(log.id),
        escapeCSV(log.todolist_id),
        escapeCSV(log.alert_id),
        escapeCSV(log.email),
        escapeCSV(log.sent_at ? format(new Date(log.sent_at), 'dd/MM/yyyy HH:mm:ss') : ''),
        escapeCSV(log.error_message),
        escapeCSV(log.created_at ? format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss') : '')
      ]
      csvContent += row.join(',') + '\n'
    }
    
    // Genera nome file con timestamp
    const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss')
    const filename = `todolist_alert_logs_${timestamp}.csv`
    
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
    console.error('Todolist alert logs export API error:', error)
    return NextResponse.json(
      { error: 'Internal server error during todolist alert logs export' },
      { status: 500 }
    )
  }
}
