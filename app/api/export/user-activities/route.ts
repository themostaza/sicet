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
    let allActivities: any[] = []
    let from = 0
    const limit = 1000 // Limite di paginazione Supabase
    let hasMore = true
    
    // Paginazione per gestire grandi quantità di dati
    while (hasMore) {
      const { data, error } = await supabase
        .from('user_activities')
        .select('*')
        .range(from, from + limit - 1)
        .order('created_at', { ascending: false }) // Più recenti prima
      
      if (error) {
        console.error('Error fetching user activities:', error)
        return NextResponse.json(
          { error: `Error fetching user activities: ${error.message}` },
          { status: 500 }
        )
      }
      
      if (!data || data.length === 0) {
        hasMore = false
      } else {
        allActivities = allActivities.concat(data)
        
        // Se abbiamo ricevuto meno record del limite, non ci sono più dati
        if (data.length < limit) {
          hasMore = false
        } else {
          from += limit
        }
      }
    }
    
    // Ottieni i profili utenti per convertire user_id in email
    const userIds = [...new Set(allActivities.map(activity => activity.user_id))]
    const userProfiles: Record<string, any> = {}
    
    // Fetch user profiles in batches
    for (let i = 0; i < userIds.length; i += 1000) {
      const batch = userIds.slice(i, i + 1000)
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
    
    // Genera CSV header
    const headers = [
      'ID',
      'User ID',
      'User Email',
      'User Role',
      'Action Type',
      'Entity Type',
      'Entity ID',
      'Metadata (JSON)',
      'Created At'
    ]
    
    let csvContent = headers.join(',') + '\n'
    
    // Aggiungi i dati
    for (const activity of allActivities) {
      const userProfile = userProfiles[activity.user_id]
      
      // Traduzioni per i tipi di azione
      const actionTypeTranslations: Record<string, string> = {
        'create_device': 'Creazione Punto di Controllo',
        'create_kpi': 'Creazione Controllo',
        'create_todolist': 'Creazione Todolist',
        'complete_task': 'Completamento Task',
        'complete_todolist': 'Completamento Todolist',
        'update_device': 'Aggiornamento Punto di Controllo',
        'update_kpi': 'Aggiornamento Controllo',
        'update_todolist': 'Aggiornamento Todolist',
        'delete_device': 'Eliminazione Punto di Controllo',
        'delete_kpi': 'Eliminazione Controllo',
        'delete_todolist': 'Eliminazione Todolist'
      }
      
      // Traduzioni per i tipi di entità
      const entityTypeTranslations: Record<string, string> = {
        'device': 'Punto di Controllo',
        'kpi': 'Controllo',
        'todolist': 'Todolist',
        'task': 'Task'
      }
      
      const row = [
        escapeCSV(activity.id),
        escapeCSV(activity.user_id),
        escapeCSV(userProfile?.email || 'Utente sconosciuto'),
        escapeCSV(userProfile?.role || ''),
        escapeCSV(actionTypeTranslations[activity.action_type] || activity.action_type),
        escapeCSV(entityTypeTranslations[activity.entity_type] || activity.entity_type),
        escapeCSV(activity.entity_id),
        escapeCSV(activity.metadata ? JSON.stringify(activity.metadata) : ''),
        escapeCSV(activity.created_at ? format(new Date(activity.created_at), 'dd/MM/yyyy HH:mm:ss') : '')
      ]
      csvContent += row.join(',') + '\n'
    }
    
    // Genera nome file con timestamp
    const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss')
    const filename = `attivita_utenti_${timestamp}.csv`
    
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
    console.error('User activities export API error:', error)
    return NextResponse.json(
      { error: 'Internal server error during user activities export' },
      { status: 500 }
    )
  }
}
