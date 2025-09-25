import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
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

    // Ottieni la data dal query parameter
    const { searchParams } = new URL(request.url)
    const selectedDate = searchParams.get('date')

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
      const reportsWithAvailability = await Promise.all(
        reports.map(async (report) => {
          let hasDataAvailable = false

          try {
            // Estrai i device IDs dal mapping_excel
            const mappingExcel = report.mapping_excel as unknown as { mappings: { deviceId: string }[] }
            if (mappingExcel && mappingExcel.mappings) {
              const deviceIds = [...new Set(mappingExcel.mappings.map((mapping: any) => mapping.deviceId))]
              
              if (deviceIds.length > 0) {
                // Verifica se esistono todolist completate per questi device nella data selezionata
                const { data: todolists, error: todolistError } = await supabase
                  .from('todolist')
                  .select('id')
                  .in('device_id', deviceIds)
                  .not('completion_date', 'is', null)
                  .gte('completion_date', `${selectedDate}T00:00:00.000Z`)
                  .lt('completion_date', `${selectedDate}T23:59:59.999Z`)
                  .limit(1)

                if (!todolistError && todolists && todolists.length > 0) {
                  hasDataAvailable = true
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
