import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// Funzione di validazione per verificare che le celle non siano nella riga 1 o colonna A
function validateMappingExcel(mapping_excel: any): { valid: boolean, error?: string } {
  if (!mapping_excel || !mapping_excel.mappings || !Array.isArray(mapping_excel.mappings)) {
    return { valid: true } // Se non c'è mapping, è valido (opzionale)
  }

  for (const mapping of mapping_excel.mappings) {
    const cellPosition = mapping.cellPosition
    if (!cellPosition || typeof cellPosition !== 'string') {
      continue
    }

    const cellMatch = cellPosition.match(/^([A-Z]+)(\d+)$/)
    if (!cellMatch) {
      return { 
        valid: false, 
        error: `Formato cella non valido: ${cellPosition}. Usa il formato Excel (es. B2, C3, ecc.).` 
      }
    }

    const column = cellMatch[1]
    const row = parseInt(cellMatch[2])

    if (column === 'A') {
      return { 
        valid: false, 
        error: `La cella ${cellPosition} non è valida. La colonna A è riservata per gli header.` 
      }
    }

    if (row === 1) {
      return { 
        valid: false, 
        error: `La cella ${cellPosition} non è valida. La riga 1 è riservata per gli header.` 
      }
    }
  }

  return { valid: true }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    // Verifica autenticazione
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verifica ruolo admin o referrer (referrer può solo visualizzare)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('auth_id', user.id)
      .single()

    if (profile?.role !== 'admin' && profile?.role !== 'referrer') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Ottieni le date dal query parameter
    const { searchParams } = new URL(request.url)
    const selectedDate = searchParams.get('date')
    const endDate = searchParams.get('endDate')

    // Ottieni tutti i report
    const { data: reports, error } = await supabase
      .from('report_to_excel')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching reports:', error)
      return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 })
    }

    // Se è stata fornita una data, verifica la disponibilità dei dati per ogni report
    if (selectedDate && reports) {
      const effectiveEndDate = endDate || selectedDate
      const reportsWithAvailability = await Promise.all(
        reports.map(async (report) => {
          let hasDataAvailable = false

          try {
            // Estrai i device IDs dalla NUOVA struttura controlPoints
            let deviceIds: string[] = []
            
            // Prova prima la nuova struttura
            const todolistParams = report.todolist_params_linked as unknown as { controlPoints?: { deviceId: string }[] }
            if (todolistParams?.controlPoints && Array.isArray(todolistParams.controlPoints)) {
              deviceIds = todolistParams.controlPoints.map((cp: { deviceId: string }) => cp.deviceId)
            } 
            // Fallback alla vecchia struttura (per retrocompatibilità)
            else {
              const mappingExcel = report.mapping_excel as unknown as { mappings: { deviceId: string }[] }
              if (mappingExcel && mappingExcel.mappings) {
                deviceIds = [...new Set(mappingExcel.mappings.map((mapping: { deviceId: string }) => mapping.deviceId))]
              }
            }
            
            if (deviceIds.length > 0) {
              // Verifica se esistono todolist completate O scadute per questi device nel range di date
              
              // 1. Todolist completate nel range di date
              const { data: completedTodolists, error: completedError } = await supabase
                .from('todolist')
                .select('id')
                .in('device_id', deviceIds)
                .not('completion_date', 'is', null)
                .gte('completion_date', `${selectedDate}T00:00:00.000Z`)
                .lte('completion_date', `${effectiveEndDate}T23:59:59.999Z`)
                .limit(1)

              if (!completedError && completedTodolists && completedTodolists.length > 0) {
                hasDataAvailable = true
              } else {
                // 2. Todolist scadute: scheduled nel range di date ma NON completate
                // e la cui deadline (considerando time slot + tolleranza) è passata
                const { data: expiredTodolists, error: expiredError } = await supabase
                  .from('todolist')
                  .select('id, scheduled_execution, end_day_time')
                  .in('device_id', deviceIds)
                  .is('completion_date', null)
                  .gte('scheduled_execution', `${selectedDate}T00:00:00.000Z`)
                  .lte('scheduled_execution', `${effectiveEndDate}T23:59:59.999Z`)

                if (!expiredError && expiredTodolists && expiredTodolists.length > 0) {
                  // Verifica se almeno una è scaduta (la deadline è passata rispetto a ora)
                  const now = new Date()
                  for (const todolist of expiredTodolists) {
                    if (todolist.end_day_time) {
                      const deadline = new Date(todolist.end_day_time)
                      // La deadline già include la tolleranza nel campo end_day_time
                      if (now > deadline) {
                        hasDataAvailable = true
                        break
                      }
                    }
                  }
                }
              }
            }
          } catch (err) {
            console.error('Error checking data availability for report:', report.id, err)
          }

          return {
            ...report,
            hasDataAvailable
          }
        })
      )

      return NextResponse.json({ reports: reportsWithAvailability })
    }

    return NextResponse.json({ reports })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    // Verifica autenticazione
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verifica ruolo admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('auth_id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { name, description, todolist_params_linked, mapping_excel } = body

    if (!name || !todolist_params_linked) {
      return NextResponse.json({ error: 'Name and todolist_params_linked are required' }, { status: 400 })
    }

    // Valida il mapping_excel
    if (mapping_excel) {
      const validation = validateMappingExcel(mapping_excel)
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 })
      }
    }

    // Crea nuovo report
    const { data: report, error } = await supabase
      .from('report_to_excel')
      .insert({
        name,
        description: description || null,
        todolist_params_linked,
        mapping_excel,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating report:', error)
      return NextResponse.json({ error: 'Failed to create report' }, { status: 500 })
    }

    return NextResponse.json({ report })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
