import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import * as XLSX from 'xlsx'
import { isTodolistExpired } from '@/lib/validation/todolist-schemas'

interface MappingItem {
  fieldId: string
  cellPosition: string
  deviceId: string
  kpiId: string
  label?: string
  deviceName?: string
  fieldName?: string
  kpiName?: string
}

interface MappingExcel {
  mappings: MappingItem[]
}

interface TaskData {
  id: string
  kpi_id: string
  value: { id: string; value: any }[]
  todolist_id: string
  completed_at: string
  device_id: string
  completion_date: string
}

interface ExcelData {
  mappings: MappingItem[]
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

    if (reportError) {
      console.error('Error fetching report:', reportError)
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    // Ottieni i dati per l'export basati sul mapping del report
    const excelData = await getReportDataForExport(supabase, report, selectedDate)

    // Genera l'Excel basato sul mapping del report
    const excelBuffer = await generateMappedExcel(report, excelData)

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

async function getReportDataForExport(supabase: any, report: any, selectedDate: string): Promise<ExcelData> {
  // 1. Estrai i device IDs dal mapping_excel
  const mappingExcel = report.mapping_excel as MappingExcel
  if (!mappingExcel?.mappings || mappingExcel.mappings.length === 0) {
    throw new Error('No mappings defined in report')
  }

  const deviceIds = [...new Set(mappingExcel.mappings.map((mapping: MappingItem) => mapping.deviceId))]
  
  // 2. Trova le todolist completate per questi device nella data selezionata
  const { data: todolists, error: todolistError } = await supabase
      .from('todolist')
    .select('id, device_id, completion_date')
    .in('device_id', deviceIds)
    .not('completion_date', 'is', null)
    .gte('completion_date', `${selectedDate}T00:00:00.000Z`)
    .lt('completion_date', `${selectedDate}T23:59:59.999Z`)

  if (todolistError) {
    console.error('Error fetching todolists:', todolistError)
    throw new Error('Failed to fetch todolists')
  }

  if (!todolists || todolists.length === 0) {
    return { mappings: mappingExcel.mappings, taskData: [] }
  }

  // 3. Ottieni tutti i task per queste todolist
  const todolistIds = todolists.map((t: any) => t.id)
  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select('id, kpi_id, value, todolist_id, completed_at')
    .in('todolist_id', todolistIds)
    .not('completed_at', 'is', null)

  if (tasksError) {
    console.error('Error fetching tasks:', tasksError)
    throw new Error('Failed to fetch tasks')
  }

  // 4. Combina i dati per facilitare il mapping
  const enrichedTasks: TaskData[] = (tasks || []).map((task: any) => {
    const todolist = todolists.find((tl: any) => tl.id === task.todolist_id)
    return {
      ...task,
      device_id: todolist?.device_id || '',
      completion_date: todolist?.completion_date || ''
    } as TaskData
  })

  return {
    mappings: mappingExcel.mappings,
    taskData: enrichedTasks
  }
}

async function generateMappedExcel(report: any, excelData: ExcelData): Promise<Buffer> {
  const wb = XLSX.utils.book_new()
  
  const { mappings, taskData } = excelData
  
  // PRIMO FOGLIO: Dati del Report
  const dataWs = generateDataSheet(report, mappings, taskData)
  XLSX.utils.book_append_sheet(wb, dataWs, 'Dati Report')
  
  // SECONDO FOGLIO: Documentazione e Tracciabilità
  const docWs = generateDocumentationSheet(report, excelData, taskData)
  XLSX.utils.book_append_sheet(wb, docWs, 'Documentazione')
  
  // Genera il buffer
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  return buffer
}

function generateDataSheet(report: any, mappings: MappingItem[], taskData: TaskData[]): any {
  const ws: any = {}
  
  // Per ogni mapping, trova il valore corrispondente nei task data
  for (const mapping of mappings) {
    const { fieldId, cellPosition, deviceId, kpiId, label } = mapping
    
    // Trova il valore per questo fieldId nel device specifico
    const value = findValueForMapping(taskData, fieldId, deviceId, kpiId)
    
    // Posiziona il valore nella cella specificata
    if (value !== null && value !== undefined) {
      // Formatta il valore appropriatamente
      let formattedValue = value
      if (typeof value === 'boolean') {
        formattedValue = value ? 'Sì' : 'No'
      } else if (value === '') {
        formattedValue = '-'
      }
      
      ws[cellPosition] = { 
        t: typeof formattedValue === 'number' ? 'n' : 's', 
        v: formattedValue 
      }
    } else {
      // Se non c'è valore, metti un placeholder
      ws[cellPosition] = { t: 's', v: '-' }
    }
  }
  
  // Calcola il range necessario basato sulle celle utilizzate
  const usedCells = Object.keys(ws).filter(key => key !== '!ref' && key !== '!cols')
  if (usedCells.length > 0) {
    // Trova il range effettivo delle celle utilizzate
    let maxCol = 'A', maxRow = 1
    for (const cell of usedCells) {
      const col = cell.match(/[A-Z]+/)?.[0]
      const row = parseInt(cell.match(/\d+/)?.[0] || '1')
      if (col && col > maxCol) maxCol = col
      if (row > maxRow) maxRow = row
    }
    ws['!ref'] = `A1:${maxCol}${maxRow}`
  }
  
  // Applica alcuni stili di base
  ws['!cols'] = Array(26).fill({ wch: 15 }) // 26 colonne con larghezza 15
  
  return ws
}

function generateDocumentationSheet(report: any, excelData: ExcelData, taskData: TaskData[]): any {
  const ws: any = {}
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
  ws[`B${currentRow}`] = { t: 's', v: report.id }
  currentRow += 3
  
  // SEZIONE 2: Control Points del Report
  ws[`A${currentRow}`] = { t: 's', v: 'DISPOSITIVI MONITORATI', s: { font: { bold: true, sz: 14 } } }
  currentRow += 2
  
  if (report.todolist_params_linked?.controlPoints) {
    ws[`A${currentRow}`] = { t: 's', v: 'Dispositivo' }
    ws[`B${currentRow}`] = { t: 's', v: 'ID Dispositivo' }
    ws[`C${currentRow}`] = { t: 's', v: 'KPI Monitorati' }
    ws[`D${currentRow}`] = { t: 's', v: 'Time Slots' }
    ws[`E${currentRow}`] = { t: 's', v: 'Categorie' }
    currentRow++
    
    for (const controlPoint of report.todolist_params_linked.controlPoints) {
      ws[`A${currentRow}`] = { t: 's', v: controlPoint.name || 'N/A' }
      ws[`B${currentRow}`] = { t: 's', v: controlPoint.deviceId || 'N/A' }
      ws[`C${currentRow}`] = { t: 's', v: (controlPoint.kpiIds || []).join(', ') }
      ws[`D${currentRow}`] = { t: 's', v: (controlPoint.timeSlots || []).join(', ') }
      ws[`E${currentRow}`] = { t: 's', v: (controlPoint.categories || []).join(', ') || 'Tutte' }
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
    const completionDate = new Date(firstTask.completion_date)
    
    ws[`A${currentRow}`] = { t: 's', v: todolistId }
    ws[`B${currentRow}`] = { t: 's', v: firstTask.device_id }
    ws[`C${currentRow}`] = { t: 's', v: completionDate.toLocaleDateString('it-IT') }
    ws[`D${currentRow}`] = { t: 's', v: completionDate.toLocaleTimeString('it-IT') }
    ws[`E${currentRow}`] = { t: 's', v: tasks.length.toString() }
    currentRow++
  }
  currentRow += 2
  
  // SEZIONE 4: Mappatura Completa
  ws[`A${currentRow}`] = { t: 's', v: 'MAPPATURA CELLE EXCEL', s: { font: { bold: true, sz: 14 } } }
  currentRow += 2
  
  ws[`A${currentRow}`] = { t: 's', v: 'Cella' }
  ws[`B${currentRow}`] = { t: 's', v: 'Dispositivo' }
  ws[`C${currentRow}`] = { t: 's', v: 'KPI ID' }
  ws[`D${currentRow}`] = { t: 's', v: 'Campo' }
  ws[`E${currentRow}`] = { t: 's', v: 'Field ID' }
  ws[`F${currentRow}`] = { t: 's', v: 'Valore Inserito' }
  currentRow++
  
  for (const mapping of excelData.mappings) {
    const value = findValueForMapping(taskData, mapping.fieldId, mapping.deviceId, mapping.kpiId)
    let formattedValue = value
    if (typeof value === 'boolean') {
      formattedValue = value ? 'Sì' : 'No'
    } else if (value === null || value === undefined || value === '') {
      formattedValue = '-'
    }
    
    ws[`A${currentRow}`] = { t: 's', v: mapping.cellPosition }
    ws[`B${currentRow}`] = { t: 's', v: mapping.deviceName || mapping.deviceId }
    ws[`C${currentRow}`] = { t: 's', v: mapping.kpiId }
    ws[`D${currentRow}`] = { t: 's', v: mapping.fieldName || mapping.fieldId }
    ws[`E${currentRow}`] = { t: 's', v: mapping.fieldId }
    ws[`F${currentRow}`] = { t: 's', v: formattedValue?.toString() || '-' }
    currentRow++
  }
  
  // Imposta il range del worksheet
  ws['!ref'] = `A1:F${currentRow - 1}`
  
  // Applica larghezze colonne ottimizzate
  ws['!cols'] = [
    { wch: 20 }, // A: Etichette/Celle
    { wch: 25 }, // B: Valori/Dispositivi
    { wch: 15 }, // C: KPI ID
    { wch: 30 }, // D: Campo
    { wch: 25 }, // E: Field ID
    { wch: 15 }  // F: Valore
  ]
  
  return ws
}

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

function findValueForMapping(taskData: TaskData[], fieldId: string, deviceId: string, kpiId: string): any {
  // Trova tutti i task che corrispondono al device e al KPI
  const relevantTasks = taskData.filter((task: TaskData) => 
    task.device_id === deviceId && task.kpi_id === kpiId
  )
  
  if (relevantTasks.length === 0) {
    return null
  }
  
  // Ordina per data di completamento (più recente prima)
  relevantTasks.sort((a: TaskData, b: TaskData) => {
    const dateA = new Date(a.completed_at || a.completion_date)
    const dateB = new Date(b.completed_at || b.completion_date)
    return dateB.getTime() - dateA.getTime()
  })
  
  // Cerca il valore nel task più recente
  for (const task of relevantTasks) {
    if (task.value && Array.isArray(task.value)) {
      // Cerca il fieldId nell'array di valori
      const fieldValue = task.value.find((v: { id: string; value: any }) => v.id === fieldId)
      if (fieldValue && fieldValue.value !== undefined) {
        return fieldValue.value
      }
    }
  }
  
  return null
}
