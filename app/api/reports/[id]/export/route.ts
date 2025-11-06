import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import * as XLSX from 'xlsx'
import { isTodolistExpired } from '@/lib/validation/todolist-schemas'
import { ControlPoint, Control, TodolistParamsLinked } from '@/types/reports'

interface TaskData {
  id: string
  kpi_id: string
  value: { id: string; value: unknown }[]
  todolist_id: string
  completed_at: string
  device_id: string
  completion_date: string
  scheduled_execution?: string
  time_slot_type?: string
  time_slot_start?: number
  time_slot_end?: number
  end_day_time?: string
}

interface ExcelData {
  controlPoints: ControlPoint[]
  taskData: TaskData[]
}

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
    const { selectedDate } = body

    if (!selectedDate) {
      return NextResponse.json({ error: 'selectedDate is required' }, { status: 400 })
    }

    // Ottieni il report
    const { data: report, error: reportError } = await supabase
      .from('report_to_excel')
      .select('*')
      .eq('id', id)
      .single()

    if (reportError || !report) {
      console.error('Error fetching report:', reportError)
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    // Type assertion per report
    const typedReport = report as unknown as { 
      id: string;
      name: string;
      todolist_params_linked: TodolistParamsLinked 
    }

    // Ottieni i dati per l'export basati sui control points del report
    const excelData = await getReportDataForExport(supabase, typedReport, selectedDate)

  // Genera l'Excel basato sulla nuova struttura
  const excelBuffer = await generateMappedExcel(typedReport, excelData, selectedDate)

    // Restituisci il file Excel
    const response = new NextResponse(new Uint8Array(excelBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${report.name}_${selectedDate}.xlsx"`,
      },
    })

    return response
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getReportDataForExport(supabase: any, report: { todolist_params_linked: TodolistParamsLinked }, selectedDate: string): Promise<ExcelData> {
  // 1. Estrai i device IDs dalla nuova struttura
  const todolistParams = report.todolist_params_linked
  if (!todolistParams?.controlPoints || todolistParams.controlPoints.length === 0) {
    throw new Error('No control points defined in report')
  }

  const deviceIds = todolistParams.controlPoints.map(cp => cp.deviceId)
  
  // 2. Trova le todolist completate O scadute per questi device nella data selezionata
  
  // 2a. Todolist completate nella data selezionata
  const { data: completedTodolists, error: completedError } = await supabase
    .from('todolist')
    .select('id, device_id, completion_date, scheduled_execution, time_slot_type, time_slot_start, time_slot_end, end_day_time')
    .in('device_id', deviceIds)
    .not('completion_date', 'is', null)
    .gte('completion_date', `${selectedDate}T00:00:00.000Z`)
    .lt('completion_date', `${selectedDate}T23:59:59.999Z`)

  if (completedError) {
    console.error('Error fetching completed todolists:', completedError)
    throw new Error('Failed to fetch completed todolists')
  }

  // 2b. Todolist scadute: scheduled nella data selezionata ma NON completate
  const { data: expiredTodolists, error: expiredError } = await supabase
    .from('todolist')
    .select('id, device_id, completion_date, scheduled_execution, time_slot_type, time_slot_start, time_slot_end, end_day_time')
    .in('device_id', deviceIds)
    .is('completion_date', null)
    .gte('scheduled_execution', `${selectedDate}T00:00:00.000Z`)
    .lt('scheduled_execution', `${selectedDate}T23:59:59.999Z`)

  if (expiredError) {
    console.error('Error fetching expired todolists:', expiredError)
    throw new Error('Failed to fetch expired todolists')
  }

  // Filtra solo le todolist effettivamente scadute (deadline passata)
  const now = new Date()
  const filteredExpiredTodolists = (expiredTodolists || []).filter((todolist: any) => {
    if (todolist.end_day_time) {
      const deadline = new Date(todolist.end_day_time)
      // La deadline già include la tolleranza nel campo end_day_time
      return now > deadline
    }
    return false
  })

  // Combina todolist completate e scadute
  const allTodolists = [...(completedTodolists || []), ...filteredExpiredTodolists]

  // Se non ci sono todolist (completate o scadute) per NESSUN device, ritorna vuoto
  if (allTodolists.length === 0) {
    return { controlPoints: todolistParams.controlPoints, taskData: [] }
  }

  // 3. Ottieni tutti i task per le todolist (completate e scadute)
  // Per le todolist scadute, prendiamo anche i task parzialmente completati
  const todolistIds = allTodolists.map((t: any) => t.id)
  
  // Separa todolist completate da quelle scadute
  const completedTodolistIds = (completedTodolists || []).map((t: any) => t.id)
  const expiredTodolistIds = filteredExpiredTodolists.map((t: any) => t.id)
  
  // Per le completate: solo task con completed_at
  const { data: completedTasks, error: completedTasksError } = await supabase
    .from('tasks')
    .select('id, kpi_id, value, todolist_id, completed_at')
    .in('todolist_id', completedTodolistIds)
    .not('completed_at', 'is', null)
  
  if (completedTasksError) {
    console.error('Error fetching completed tasks:', completedTasksError)
    throw new Error('Failed to fetch completed tasks')
  }
  
  // Per le scadute: TUTTI i task (completati e non), così mostriamo anche dati parziali
  const { data: expiredTasks, error: expiredTasksError } = expiredTodolistIds.length > 0
    ? await supabase
        .from('tasks')
        .select('id, kpi_id, value, todolist_id, completed_at')
        .in('todolist_id', expiredTodolistIds)
    : { data: [], error: null }
  
  if (expiredTasksError) {
    console.error('Error fetching expired tasks:', expiredTasksError)
    throw new Error('Failed to fetch expired tasks')
  }
  
  // Combina tutti i task
  const tasks = [...(completedTasks || []), ...(expiredTasks || [])]
  
  // Vecchio blocco error handling
  const tasksError = null

  if (tasksError) {
    console.error('Error fetching tasks:', tasksError)
    throw new Error('Failed to fetch tasks')
  }

  // 4. Combina i dati per facilitare il mapping
  const enrichedTasks: TaskData[] = (tasks || []).map((task: any) => {
    const todolist = allTodolists.find((tl: any) => tl.id === task.todolist_id)
    return {
      ...task,
      device_id: todolist?.device_id || '',
      completion_date: todolist?.completion_date || '',
      scheduled_execution: todolist?.scheduled_execution || '',
      time_slot_type: todolist?.time_slot_type || 'standard',
      time_slot_start: todolist?.time_slot_start,
      time_slot_end: todolist?.time_slot_end,
      end_day_time: todolist?.end_day_time || ''
    } as TaskData
  })

  // 5. Crea task "placeholder" per i device che non hanno completato/scaduto la todolist
  const processedDeviceIds = new Set(allTodolists.map((tl: { device_id: string }) => tl.device_id))
  const missingDeviceIds = deviceIds.filter(deviceId => !processedDeviceIds.has(deviceId))
  
  // Per ogni device mancante, crea task placeholder per ogni KPI unico nei controlli
  const uniqueKpiIds = new Set<string>()
  todolistParams.controlPoints.forEach(cp => {
    cp.controls.forEach(ctrl => uniqueKpiIds.add(ctrl.kpiId))
  })
  
  for (const deviceId of missingDeviceIds) {
    for (const kpiId of uniqueKpiIds) {
      // Crea un task placeholder per device senza todolist completate/scadute
      enrichedTasks.push({
        id: `placeholder-${deviceId}-${kpiId}`,
        kpi_id: kpiId,
        value: [], // Valore vuoto
        todolist_id: `missing-${deviceId}`,
        completed_at: '',
        device_id: deviceId,
        completion_date: '', // Nessuna data di completamento
        scheduled_execution: `${selectedDate}T00:00:00.000Z`,
        time_slot_type: 'standard',
        time_slot_start: undefined,
        time_slot_end: undefined,
        end_day_time: ''
      } as TaskData)
    }
  }

  return {
    controlPoints: todolistParams.controlPoints,
    taskData: enrichedTasks
  }
}

async function generateMappedExcel(report: { name: string; todolist_params_linked: TodolistParamsLinked }, excelData: ExcelData, selectedDate: string): Promise<Buffer> {
  const wb = XLSX.utils.book_new()
  
  const { controlPoints, taskData } = excelData
  
  // PRIMO FOGLIO: Dati del Report
  const dataWs = generateDataSheet(report, controlPoints, taskData, selectedDate)
  XLSX.utils.book_append_sheet(wb, dataWs, 'Dati Report')
  
  // SECONDO FOGLIO: Documentazione e Tracciabilità
  const docWs = generateDocumentationSheet(report, excelData, taskData)
  XLSX.utils.book_append_sheet(wb, docWs, 'Documentazione')
  
  // Genera il buffer
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  return buffer
}

function generateDataSheet(
  report: { name: string }, 
  controlPoints: ControlPoint[], 
  taskData: TaskData[], 
  selectedDate: string
): Record<string, unknown> {
  const ws: Record<string, unknown> = {}
  
  // Helper per convertire numero colonna in lettera (0=A, 1=B, 2=C, etc)
  const getColumnLetter = (index: number): string => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    if (index < 26) return letters[index]
    return letters[Math.floor(index / 26) - 1] + letters[index % 26]
  }
  
  // Calcola il mapping: ogni controllo ha la sua colonna
  // Struttura: colonna = 1 per ogni controllo (non per control point)
  let currentColumn = 1 // Inizia da B (colonna 1), A è riservata
  
  const controlColumnMapping: Map<string, { col: number, cp: ControlPoint, control: Control }> = new Map()
  
  controlPoints.forEach(cp => {
    const startCol = currentColumn
    
    cp.controls.forEach(control => {
      controlColumnMapping.set(`${cp.id}-${control.id}`, {
        col: currentColumn,
        cp: cp,
        control: control
      })
      currentColumn++
    })
    
    // RIGA 1: Intestazione Control Point (merged su tutte le colonne dei suoi controlli)
    if (cp.controls.length > 0) {
      const endCol = currentColumn - 1
      const startColLetter = getColumnLetter(startCol)
      const endColLetter = getColumnLetter(endCol)
      
      // Imposta il valore nella prima cella
      ws[`${startColLetter}1`] = {
        t: 's',
        v: `${cp.name}`,
        s: {
          font: { bold: true, sz: 12 },
          fill: { fgColor: { rgb: "4472C4" } },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: {
            top: { style: 'thin', color: { rgb: '000000' } },
            bottom: { style: 'thin', color: { rgb: '000000' } },
            left: { style: 'thin', color: { rgb: '000000' } },
            right: { style: 'thin', color: { rgb: '000000' } }
          }
        }
      }
      
      // Imposta il merge per l'header del control point
      if (!ws['!merges']) {
        ws['!merges'] = []
      }
      if (startCol !== endCol) {
        const merges = ws['!merges'] as Array<{ s: { r: number; c: number }; e: { r: number; c: number } }>
        merges.push({
          s: { r: 0, c: startCol }, // start row, start col
          e: { r: 0, c: endCol }     // end row, end col
        })
      }
    }
  })
  
  // RIGA 2: Nomi dei Controlli (una colonna per ogni controllo)
  controlColumnMapping.forEach((info) => {
    const colLetter = getColumnLetter(info.col)
    ws[`${colLetter}2`] = {
      t: 's',
      v: `${info.control.fieldName}`,
      s: {
        font: { bold: true, sz: 10 },
        fill: { fgColor: { rgb: "D9E1F2" } },
        alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
        border: {
          top: { style: 'thin', color: { rgb: '000000' } },
          bottom: { style: 'thin', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: '000000' } },
          right: { style: 'thin', color: { rgb: '000000' } }
        }
      }
    }
  })
  
  // RIGHE 3 in poi: Valori effettivi dei controlli
  // Raggruppa i task per SLOT TEMPORALE (indipendentemente dal device!)
  // Uno slot è identificato da: data + time_slot (NON device!)
  const shiftGroups = new Map<string, { 
    tasks: TaskData[], 
    scheduled_execution: string,
    time_slot_type: string,
    time_slot_start?: number,
    time_slot_end?: number,
    isMissing: boolean,
    latestCompletionDate: string
  }>()
  
  taskData.forEach(task => {
    // Normalizza la scheduled_execution alla data (senza orario)
    let scheduledDate = ''
    if (task.scheduled_execution) {
      const d = new Date(task.scheduled_execution)
      scheduledDate = d.toISOString().split('T')[0] // Solo YYYY-MM-DD
    }
    
    // Crea una chiave unica per il SLOT TEMPORALE basata su:
    // - data scheduled (senza orario)
    // - time_slot_type
    // - time_slot_start/end (se custom)
    // NON include device_id perché vogliamo raggruppare più devices nello stesso slot!
    const shiftKey = `${scheduledDate}|${task.time_slot_type}|${task.time_slot_start || 'none'}|${task.time_slot_end || 'none'}`
    
    if (!shiftGroups.has(shiftKey)) {
      // Determina se è mancante: è mancante se ALMENO UNO dei device è mancante
      const isMissing = task.todolist_id.startsWith('missing-')
      
      shiftGroups.set(shiftKey, {
        tasks: [],
        scheduled_execution: task.scheduled_execution || '',
        time_slot_type: task.time_slot_type || 'standard',
        time_slot_start: task.time_slot_start,
        time_slot_end: task.time_slot_end,
        isMissing: isMissing,
        latestCompletionDate: task.completion_date
      })
    }
    
    const group = shiftGroups.get(shiftKey)!
    group.tasks.push(task)
    
    // Uno slot è considerato "complete" se ALMENO UN device ha completato
    // Se troviamo un task che NON è missing, lo slot non è missing
    if (!task.todolist_id.startsWith('missing-')) {
      group.isMissing = false
    }
    
    // Aggiorna la data di completamento più recente (tra tutti i device)
    if (task.completion_date && (!group.latestCompletionDate || task.completion_date > group.latestCompletionDate)) {
      group.latestCompletionDate = task.completion_date
    }
  })
  
  // Ordina i turni (completati prima, poi mancanti; poi per scheduled_execution)
  const sortedShifts = Array.from(shiftGroups.entries()).sort((a, b) => {
    if (a[1].isMissing && !b[1].isMissing) return 1
    if (!a[1].isMissing && b[1].isMissing) return -1
    
    // Ordina per scheduled_execution
    if (a[1].scheduled_execution && b[1].scheduled_execution) {
      const dateA = new Date(a[1].scheduled_execution).getTime()
      const dateB = new Date(b[1].scheduled_execution).getTime()
      if (dateA !== dateB) return dateA - dateB
    }
    
    // Se hanno lo stesso scheduled, ordina per time_slot_start
    if (a[1].time_slot_start !== undefined && b[1].time_slot_start !== undefined) {
      return a[1].time_slot_start - b[1].time_slot_start
    }
    
    return a[0].localeCompare(b[0])
  })
  
  // Crea una riga per ogni turno
  let currentRow = 3 // Inizia dalla riga 3 (dopo header CP e header controlli)
  for (const [shiftKey, shiftInfo] of sortedShifts) {
    // Colonna A: Info turno
    let infoText: string
    if (shiftInfo.isMissing) {
      infoText = `Turno NON completato (${selectedDate})`
    } else {
      // Mostra info del turno
      const scheduledDate = new Date(shiftInfo.scheduled_execution)
      const dateStr = scheduledDate.toLocaleDateString('it-IT')
      
      let timeSlotStr = ''
      if (shiftInfo.time_slot_type === 'custom' && shiftInfo.time_slot_start !== undefined && shiftInfo.time_slot_end !== undefined) {
        const startHour = Math.floor(shiftInfo.time_slot_start / 60)
        const startMin = shiftInfo.time_slot_start % 60
        const endHour = Math.floor(shiftInfo.time_slot_end / 60)
        const endMin = shiftInfo.time_slot_end % 60
        timeSlotStr = `${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}-${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`
      } else {
        timeSlotStr = 'Turno standard'
      }
      
      const completedDate = new Date(shiftInfo.latestCompletionDate)
      const completedTimeStr = completedDate.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
      
      infoText = `${dateStr} ${timeSlotStr}\n(ult. completamento: ${completedTimeStr})`
    }
    
    ws[`A${currentRow}`] = {
      t: 's',
      v: infoText,
      s: {
        font: { sz: 9 },
        fill: { fgColor: { rgb: shiftInfo.isMissing ? "FFEEEE" : "E2EFDA" } },
        alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
        border: {
          top: { style: 'thin', color: { rgb: '000000' } },
          bottom: { style: 'thin', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: '000000' } },
          right: { style: 'thin', color: { rgb: '000000' } }
        }
      }
    }
    
    // Per ogni controllo, scrivi il suo valore nella sua colonna
    controlColumnMapping.forEach((info) => {
      const colLetter = getColumnLetter(info.col)
      
      // Cerca il valore per questo specifico controllo tra tutti i task del turno
      // Filtra per device_id del control point + kpiId del controllo
      const relevantTasks = shiftInfo.tasks.filter(t => 
        t.kpi_id === info.control.kpiId && 
        t.device_id === info.cp.deviceId
      )
      
      // Ordina per completion_date (più recente prima)
      relevantTasks.sort((a, b) => {
        const dateA = new Date(a.completed_at || a.completion_date).getTime()
        const dateB = new Date(b.completed_at || b.completion_date).getTime()
        return dateB - dateA
      })
      
      let cellValue = '-'
      for (const task of relevantTasks) {
        if (task.value && Array.isArray(task.value)) {
          const fieldValue = task.value.find(v => v.id === info.control.fieldId)
          if (fieldValue && fieldValue.value !== undefined) {
            let formatted = fieldValue.value
            if (typeof formatted === 'boolean') {
              formatted = formatted ? 'Sì' : 'No'
            } else if (formatted === '') {
              formatted = '-'
            }
            cellValue = String(formatted)
            break // Prendi il primo valore valido (il più recente)
          }
        }
      }
      
      ws[`${colLetter}${currentRow}`] = {
        t: typeof cellValue === 'number' || (!isNaN(Number(cellValue)) && cellValue !== '-') ? 'n' : 's',
        v: typeof cellValue === 'number' || (!isNaN(Number(cellValue)) && cellValue !== '-') ? Number(cellValue) : cellValue,
        s: {
          fill: { fgColor: { rgb: shiftInfo.isMissing ? "FFEEEE" : "FFFFFF" } },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: {
            top: { style: 'thin', color: { rgb: '000000' } },
            bottom: { style: 'thin', color: { rgb: '000000' } },
            left: { style: 'thin', color: { rgb: '000000' } },
            right: { style: 'thin', color: { rgb: '000000' } }
          }
        }
      }
    })
    
    currentRow++
  }
  
  // Calcola il range finale
  const totalColumns = currentColumn - 1 // Numero totale di colonne di controlli
  const lastCol = getColumnLetter(totalColumns)
  const lastRow = currentRow - 1
  ws['!ref'] = `A1:${lastCol}${lastRow}`
  
  // Imposta larghezza colonne
  const cols: { wch: number }[] = Array(totalColumns + 1).fill({ wch: 20 })
  cols[0] = { wch: 30 } // Colonna A più larga per info todolist
  ws['!cols'] = cols
  
  return ws
}

// Helper per raggruppare task per todolist
function groupTasksByTodolist(taskData: TaskData[]): Record<string, TaskData[]> {
  const groups: Record<string, TaskData[]> = {}
  
  for (const task of taskData) {
    const todolistId = task.todolist_id
    if (!groups[todolistId]) {
      groups[todolistId] = []
    }
    groups[todolistId].push(task)
  }
  
  return groups
}

function generateDocumentationSheet(
  report: { name?: string; id?: string; todolist_params_linked: TodolistParamsLinked }, 
  excelData: ExcelData, 
  taskData: TaskData[]
): Record<string, unknown> {
  const ws: Record<string, unknown> = {}
  let currentRow = 1
  
  // SEZIONE 1: Metadati del Report
  ws[`A${currentRow}`] = { t: 's', v: 'INFORMAZIONI REPORT', s: { font: { bold: true, sz: 14 } } }
  currentRow += 2
  
  ws[`A${currentRow}`] = { t: 's', v: 'Nome Report:' }
  ws[`B${currentRow}`] = { t: 's', v: report.name || 'N/A' }
  currentRow++
  
  ws[`A${currentRow}`] = { t: 's', v: 'Data Generazione:' }
  ws[`B${currentRow}`] = { t: 's', v: new Date().toLocaleString('it-IT') }
  currentRow++
  
  ws[`A${currentRow}`] = { t: 's', v: 'ID Report:' }
  ws[`B${currentRow}`] = { t: 's', v: report.id || 'N/A' }
  currentRow += 3
  
  // SEZIONE 2: Control Points e Controlli del Report
  ws[`A${currentRow}`] = { t: 's', v: 'PUNTI DI CONTROLLO E CONTROLLI', s: { font: { bold: true, sz: 14 } } }
  currentRow += 2
  
  if (excelData.controlPoints && excelData.controlPoints.length > 0) {
    ws[`A${currentRow}`] = { t: 's', v: 'Punto di Controllo' }
    ws[`B${currentRow}`] = { t: 's', v: 'ID Dispositivo' }
    ws[`C${currentRow}`] = { t: 's', v: 'Controlli Configurati' }
    currentRow++
    
    for (const controlPoint of excelData.controlPoints) {
      const controlsText = controlPoint.controls
        .map((c, idx) => `${idx + 1}. ${c.fieldName} (KPI: ${c.kpiName})`)
        .join('\n')
      
      ws[`A${currentRow}`] = { t: 's', v: controlPoint.name || 'N/A' }
      ws[`B${currentRow}`] = { t: 's', v: controlPoint.deviceId || 'N/A' }
      ws[`C${currentRow}`] = { 
        t: 's', 
        v: controlsText || 'Nessun controllo',
        s: { alignment: { wrapText: true, vertical: 'top' } }
      }
      currentRow++
    }
  }
  currentRow += 2
  
  // SEZIONE 3: Todolist Processate
  ws[`A${currentRow}`] = { t: 's', v: 'TODOLIST PROCESSATE', s: { font: { bold: true, sz: 14 } } }
  currentRow += 2
  
  // Raggruppa i task per todolist
  const todolistGroups = groupTasksByTodolist(taskData)
  
  ws[`A${currentRow}`] = { t: 's', v: 'ID Todolist' }
  ws[`B${currentRow}`] = { t: 's', v: 'Device ID' }
  ws[`C${currentRow}`] = { t: 's', v: 'Data Completamento' }
  ws[`D${currentRow}`] = { t: 's', v: 'Ora Completamento' }
  ws[`E${currentRow}`] = { t: 's', v: 'Task Completati' }
  currentRow++
  
  for (const [todolistId, tasks] of Object.entries(todolistGroups)) {
    const firstTask: TaskData = tasks[0]
    if (!firstTask) continue
    
    const completionDate = new Date(firstTask.completion_date)
    
    ws[`A${currentRow}`] = { t: 's', v: todolistId }
    ws[`B${currentRow}`] = { t: 's', v: firstTask.device_id }
    ws[`C${currentRow}`] = { t: 's', v: completionDate.toLocaleDateString('it-IT') }
    ws[`D${currentRow}`] = { t: 's', v: completionDate.toLocaleTimeString('it-IT') }
    ws[`E${currentRow}`] = { t: 's', v: tasks.length.toString() }
    currentRow++
  }
  currentRow += 2
  
  // Imposta il range del worksheet
  ws['!ref'] = `A1:C${currentRow - 1}`
  
  // Applica larghezze colonne ottimizzate
  ws['!cols'] = [
    { wch: 30 }, // A: Punto di Controllo
    { wch: 20 }, // B: ID Dispositivo
    { wch: 50 }  // C: Controlli
  ]
  
  return ws
}
