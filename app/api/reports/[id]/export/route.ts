import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import * as XLSX from 'xlsx'
import { isTodolistExpired } from '@/lib/validation/todolist-schemas'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createServerSupabaseClient()
    const { id } = await params

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
    const { dateFrom, dateTo } = body

    if (!dateFrom || !dateTo) {
      return NextResponse.json({ error: 'dateFrom and dateTo are required' }, { status: 400 })
    }

    // Ottieni il report
    const { data: report, error: reportError } = await supabase
      .from('report_to_excel')
      .select('*')
      .eq('id', id)
      .single()

    if (reportError) {
      console.error('Error fetching report:', reportError)
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    // Filtra le todolist in base ai parametri del report
    const filteredTodolists = await filterTodolistsByReportParams(
      supabase, 
      report.todolist_params_linked, 
      dateFrom, 
      dateTo
    )

    // Genera l'Excel basato sui parametri del report
    const excelBuffer = await generateReportExcel(report, filteredTodolists)

    // Restituisci il file Excel
    const response = new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${report.name}_${dateFrom}_${dateTo}.xlsx"`,
      },
    })

    return response
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function filterTodolistsByReportParams(
  supabase: any, 
  todolistParamsLinked: any, 
  dateFrom: string, 
  dateTo: string
): Promise<any[]> {
  if (!todolistParamsLinked?.controlPoints || todolistParamsLinked.controlPoints.length === 0) {
    return []
  }

  const allTodolists: any[] = []

  // Per ogni punto di controllo, filtra le todolist
  for (const controlPoint of todolistParamsLinked.controlPoints) {
    const { deviceId, kpiIds, categories, timeSlots } = controlPoint

    // Query base per le todolist nel range di date
    let query = supabase
      .from('todolist')
      .select(`
        id,
        device_id,
        scheduled_execution,
        status,
        time_slot_type,
        time_slot_start,
        time_slot_end,
        completion_date,
        todolist_category,
        devices!inner(name),
        tasks!inner(
          id,
          kpi_id,
          status,
          value,
          completed_at
        )
      `)
      .gte('scheduled_execution', `${dateFrom}T00:00:00`)
      .lte('scheduled_execution', `${dateTo}T23:59:59`)

    // Filtra per dispositivo specifico
    if (deviceId) {
      query = query.eq('device_id', deviceId)
    }

    // Filtra per categorie se specificate
    if (categories && categories.length > 0) {
      query = query.in('todolist_category', categories)
    }

    // Filtra per time slots se specificati
    if (timeSlots && timeSlots.length > 0) {
      query = query.in('time_slot_type', timeSlots)
    }

    const { data: todolists, error } = await query.order('scheduled_execution', { ascending: false })

    if (error) {
      console.error('Error fetching todolists for control point:', error)
      continue
    }

    // Filtra le todolist che contengono almeno uno dei KPI richiesti
    // e che sono completate o scadute
    const filteredTodolists = (todolists || []).filter((todolist: any) => {
      // Controlla se è completata o scaduta
      const isCompleted = todolist.status === 'completed'
      const isExpired = !isCompleted && isTodolistExpired(
        todolist.scheduled_execution,
        todolist.time_slot_type as "standard" | "custom",
        todolist.time_slot_end,
        todolist.time_slot_start
      )

      if (!isCompleted && !isExpired) {
        return false
      }

      // Controlla se contiene almeno uno dei KPI richiesti
      const todolistKpiIds = todolist.tasks.map((task: any) => task.kpi_id)
      const hasRequiredKpi = kpiIds.some((kpiId: string) => todolistKpiIds.includes(kpiId))

      return hasRequiredKpi
    })

    allTodolists.push(...filteredTodolists)
  }

  // Rimuovi duplicati basati sull'ID
  const uniqueTodolists = allTodolists.filter((todolist, index, self) => 
    index === self.findIndex(t => t.id === todolist.id)
  )

  return uniqueTodolists
}

async function generateReportExcel(report: any, todolists: any[]): Promise<Buffer> {
  const wb = XLSX.utils.book_new()
  
  // La mappingExcel contiene dove posizionare ogni controllo
  const mappingExcel = report.mapping_excel
  
  if (!mappingExcel?.mappings || mappingExcel.mappings.length === 0) {
    throw new Error('No mappings defined in report')
  }
  
  // Crea un worksheet
  const ws: any = {}
  
  // Applica le mappature dal report
  for (const mapping of mappingExcel.mappings) {
    const { controlId, cellPosition, label } = mapping
    
    // Trova l'ultimo valore per questo controllo dalle todolist (più recente)
    const latestValue = extractLatestControlValue(todolists, controlId)
    
    // Posiziona il valore nella cella specificata
    if (latestValue !== null) {
      ws[cellPosition] = { 
        t: typeof latestValue === 'number' ? 'n' : 's', 
        v: latestValue 
      }
    } else {
      // Se non c'è valore, metti un placeholder
      ws[cellPosition] = { t: 's', v: '-' }
    }
    
    // Se c'è un'etichetta personalizzata, mettila nella cella adiacente (a sinistra o sopra)
    if (label) {
      const labelCell = getLabelCell(cellPosition)
      if (labelCell) {
        ws[labelCell] = { t: 's', v: label }
      }
    }
  }
  
  // Aggiungi informazioni di metadata del report
  ws['A1'] = { t: 's', v: report.name || 'Report' }
  if (report.description) {
    ws['A2'] = { t: 's', v: report.description }
  }
  
  // Calcola il range necessario basato sulle celle utilizzate
  const usedCells = Object.keys(ws).filter(key => key !== '!ref' && key !== '!cols')
  if (usedCells.length > 0) {
    const range = XLSX.utils.decode_range(`A1:Z100`) // Range di default ampio
    ws['!ref'] = XLSX.utils.encode_range(range)
  }
  
  // Applica alcuni stili di base
  ws['!cols'] = Array(26).fill({ wch: 15 }) // 26 colonne con larghezza 15
  
  XLSX.utils.book_append_sheet(wb, ws, 'Report')
  
  // Genera il buffer
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  return buffer
}

function extractLatestControlValue(todolists: any[], controlId: string): string | number | null {
  let latestValue: any = null
  let latestDate: Date | null = null
  
  for (const todolist of todolists) {
    for (const task of todolist.tasks) {
      if (task.value && Array.isArray(task.value)) {
        const controlValue = task.value.find((v: any) => v.id === controlId)
        if (controlValue) {
          // Usa la data di completamento del task se disponibile, altrimenti quella della todolist
          const taskDate = new Date(task.completed_at || todolist.completion_date || todolist.scheduled_execution)
          
          if (!latestDate || taskDate > latestDate) {
            latestDate = taskDate
            
            // Formatta il valore
            if (typeof controlValue.value === 'boolean') {
              latestValue = controlValue.value ? 'Sì' : 'No'
            } else if (controlValue.value !== null && controlValue.value !== undefined) {
              latestValue = controlValue.value
            } else {
              latestValue = '-'
            }
          }
        }
      }
    }
  }
  
  return latestValue
}

function getLabelCell(cellPosition: string): string | null {
  // Prova a mettere l'etichetta nella colonna a sinistra
  const col = cellPosition.match(/[A-Z]+/)?.[0]
  const row = cellPosition.match(/\d+/)?.[0]
  
  if (!col || !row) return null
  
  // Converte la colonna in numero, sottrae 1, e riconverte in lettera
  const colNum = col.split('').reduce((acc, char) => acc * 26 + (char.charCodeAt(0) - 64), 0)
  if (colNum <= 1) return null // Non possiamo andare a sinistra di A
  
  const prevColNum = colNum - 1
  let prevCol = ''
  let temp = prevColNum
  while (temp > 0) {
    temp--
    prevCol = String.fromCharCode(65 + (temp % 26)) + prevCol
    temp = Math.floor(temp / 26)
  }
  
  return `${prevCol}${row}`
}
