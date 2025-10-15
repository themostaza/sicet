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
  const excelBuffer = await generateMappedExcel(report, excelData, selectedDate)

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
  const { data: completedTodolists, error: todolistError } = await supabase
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

  // Se non ci sono todolist completate per NESSUN device, blocca il download
  if (!completedTodolists || completedTodolists.length === 0) {
    return { mappings: mappingExcel.mappings, taskData: [] }
  }

  // 3. Ottieni tutti i task per le todolist completate
  const todolistIds = completedTodolists.map((t: any) => t.id)
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
    const todolist = completedTodolists.find((tl: any) => tl.id === task.todolist_id)
    return {
      ...task,
      device_id: todolist?.device_id || '',
      completion_date: todolist?.completion_date || ''
    } as TaskData
  })

  // 5. Crea task "placeholder" per i device che non hanno completato la todolist
  const completedDeviceIds = new Set(completedTodolists.map((tl: any) => tl.device_id))
  const missingDeviceIds = deviceIds.filter(deviceId => !completedDeviceIds.has(deviceId))
  
  // Per ogni device mancante, crea task placeholder per ogni KPI nel mapping
  const uniqueKpiIds = [...new Set(mappingExcel.mappings.map((mapping: MappingItem) => mapping.kpiId))]
  
  for (const deviceId of missingDeviceIds) {
    for (const kpiId of uniqueKpiIds) {
      // Crea un task placeholder che indica che la todolist non è stata completata
      enrichedTasks.push({
        id: `placeholder-${deviceId}-${kpiId}`,
        kpi_id: kpiId,
        value: [], // Valore vuoto
        todolist_id: `missing-${deviceId}`,
        completed_at: '',
        device_id: deviceId,
        completion_date: '' // Nessuna data di completamento
      } as TaskData)
    }
  }

  return {
    mappings: mappingExcel.mappings,
    taskData: enrichedTasks
  }
}

async function generateMappedExcel(report: any, excelData: ExcelData, selectedDate: string): Promise<Buffer> {
  const wb = XLSX.utils.book_new()
  
  const { mappings, taskData } = excelData
  
  // PRIMO FOGLIO: Dati del Report
  const dataWs = generateDataSheet(report, mappings, taskData, selectedDate)
  XLSX.utils.book_append_sheet(wb, dataWs, 'Dati Report')
  
  // SECONDO FOGLIO: Documentazione e Tracciabilità
  const docWs = generateDocumentationSheet(report, excelData, taskData)
  XLSX.utils.book_append_sheet(wb, docWs, 'Documentazione')
  
  // Genera il buffer
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  return buffer
}

function generateDataSheet(report: any, mappings: MappingItem[], taskData: TaskData[], selectedDate: string): any {
  const ws: any = {}
  
  // Raggruppa i mappings per riga originale
  const rowMappings: Map<number, MappingItem[]> = new Map()
  const columnHeaders: Map<string, { deviceName: string, deviceId: string }> = new Map()
  
  for (const mapping of mappings) {
    const cellMatch = mapping.cellPosition.match(/^([A-Z]+)(\d+)$/)
    if (cellMatch) {
      const column = cellMatch[1]
      const row = parseInt(cellMatch[2])
      
      // Raggruppa per riga
      if (!rowMappings.has(row)) {
        rowMappings.set(row, [])
      }
      rowMappings.get(row)!.push(mapping)
      
      // Header colonne
      if (!columnHeaders.has(column)) {
        columnHeaders.set(column, {
          deviceName: mapping.deviceName || mapping.deviceId,
          deviceId: mapping.deviceId
        })
      }
    }
  }
  
  // GENERA HEADER COLONNA (RIGA 1) - Nomi dei device con ID
  for (const [column, headerInfo] of columnHeaders.entries()) {
    const headerCell = `${column}1`
    ws[headerCell] = { 
      t: 's', 
      v: `${headerInfo.deviceName} (${headerInfo.deviceId})`,
      s: { 
        font: { bold: true },
        fill: { fgColor: { rgb: "E2EFDA" } },
        alignment: { horizontal: 'center', vertical: 'center' }
      }
    }
  }
  
  // Elabora le righe ordinandole
  const sortedRows = Array.from(rowMappings.keys()).sort((a, b) => a - b)
  let currentExcelRow = 2 // Inizia dalla riga 2 (dopo l'header)
  
  for (const originalRow of sortedRows) {
    const rowMaps = rowMappings.get(originalRow)!
    
    // Trova tutte le todolist uniche per questa riga
    const todolistsForRow: Map<string, { completion_date: string, tasks: TaskData[], isMissing: boolean }> = new Map()
    
    for (const mapping of rowMaps) {
      const relevantTasks = taskData.filter((task: TaskData) => 
        task.device_id === mapping.deviceId && task.kpi_id === mapping.kpiId
      )
      
      for (const task of relevantTasks) {
        const isMissingTodolist = task.todolist_id.startsWith('missing-')
        if (!todolistsForRow.has(task.todolist_id)) {
          todolistsForRow.set(task.todolist_id, {
            completion_date: task.completion_date,
            tasks: [],
            isMissing: isMissingTodolist
          })
        }
        todolistsForRow.get(task.todolist_id)!.tasks.push(task)
      }
    }
    
    // Ordina le todolist: prima quelle completate (cronologicamente), poi quelle mancanti
    const sortedTodolists = Array.from(todolistsForRow.entries())
      .sort((a, b) => {
        // Se una è mancante e l'altra no, quella mancante viene dopo
        if (a[1].isMissing && !b[1].isMissing) return 1
        if (!a[1].isMissing && b[1].isMissing) return -1
        
        // Se entrambe sono completate, ordina per data
        if (!a[1].isMissing && !b[1].isMissing) {
          const dateA = new Date(a[1].completion_date).getTime()
          const dateB = new Date(b[1].completion_date).getTime()
          return dateA - dateB
        }
        
        // Se entrambe sono mancanti, ordina per todolist_id per coerenza
        return a[0].localeCompare(b[0])
      })
    
    // Se non ci sono todolist, crea comunque una riga vuota
    if (sortedTodolists.length === 0) {
      const headerCell = `A${currentExcelRow}`
      const firstMapping = rowMaps[0]
      
      ws[headerCell] = { 
        t: 's',
        r: [
          { 
            t: firstMapping.kpiName, 
            s: { font: { bold: true, sz: 11 } } 
          },
          { 
            t: ` - ${firstMapping.fieldName}\n(nessun dato)`, 
            s: { font: { bold: false, sz: 10 } } 
          }
        ],
        s: { 
          fill: { fgColor: { rgb: "E2EFDA" } },
          alignment: { horizontal: 'left', vertical: 'top', wrapText: true }
        }
      }
      
      // Celle vuote per questa riga
      for (const mapping of rowMaps) {
        const cellMatch = mapping.cellPosition.match(/^([A-Z]+)(\d+)$/)
        if (cellMatch) {
          const column = cellMatch[1]
          ws[`${column}${currentExcelRow}`] = { t: 's', v: '-' }
        }
      }
      
      currentExcelRow++
    } else {
      // Crea una riga per ogni todolist
      for (const [todolistId, todolistInfo] of sortedTodolists) {
        const headerCell = `A${currentExcelRow}`
        const firstMapping = rowMaps[0]
        
        let statusText: string
        let fillColor: string
        
        if (todolistInfo.isMissing) {
          // Todolist non completata
          statusText = `\n(todolist NON completata il ${selectedDate})`
          fillColor = "FFEEEE" // Rosso chiaro per indicare mancanza
        } else {
          // Todolist completata
          const date = new Date(todolistInfo.completion_date)
          const dateStr = `${date.toLocaleDateString('it-IT')} ${date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`
          statusText = `\n(completata il ${dateStr} [ID: ${todolistId}])`
          fillColor = "E2EFDA" // Verde chiaro per todolist completate
        }
        
        // Usa rich text per formattare solo il KPI in grassetto
        ws[headerCell] = { 
          t: 's',
          r: [
            { 
              t: firstMapping.kpiName, 
              s: { font: { bold: true, sz: 11 } } 
            },
            { 
              t: ` - ${firstMapping.fieldName}${statusText}`, 
              s: { font: { bold: false, sz: 10 } } 
            }
          ],
          s: { 
            fill: { fgColor: { rgb: fillColor } },
            alignment: { horizontal: 'left', vertical: 'top', wrapText: true }
          }
        }
        
        // Popola i dati per questa todolist
        for (const mapping of rowMaps) {
          const cellMatch = mapping.cellPosition.match(/^([A-Z]+)(\d+)$/)
          if (cellMatch) {
            const column = cellMatch[1]
            
            // Trova il valore specifico per questa todolist
            const value = findValueForMappingFromTodolist(
              todolistInfo.tasks,
              mapping.fieldId,
              mapping.deviceId,
              mapping.kpiId
            )
            
            let formattedValue = value
            if (value !== null && value !== undefined) {
              if (typeof value === 'boolean') {
                formattedValue = value ? 'Sì' : 'No'
              } else if (value === '') {
                formattedValue = '-'
              }
              
              ws[`${column}${currentExcelRow}`] = { 
                t: typeof formattedValue === 'number' ? 'n' : 's', 
                v: formattedValue,
                s: todolistInfo.isMissing ? { fill: { fgColor: { rgb: "FFEEEE" } } } : undefined
              }
            } else {
              // Se è una todolist mancante, mostra chiaramente che non è completata
              const displayValue = todolistInfo.isMissing ? 'Non completata' : '-'
              ws[`${column}${currentExcelRow}`] = { 
                t: 's', 
                v: displayValue,
                s: todolistInfo.isMissing ? { 
                  fill: { fgColor: { rgb: "FFEEEE" } },
                  font: { italic: true, color: { rgb: "CC0000" } }
                } : undefined
              }
            }
          }
        }
        
        currentExcelRow++
      }
    }
  }
  
  // Calcola il range
  const usedCells = Object.keys(ws).filter(key => key !== '!ref' && key !== '!cols')
  if (usedCells.length > 0) {
    let maxCol = 'A', maxRow = 1
    for (const cell of usedCells) {
      const col = cell.match(/[A-Z]+/)?.[0]
      const row = parseInt(cell.match(/\d+/)?.[0] || '1')
      if (col && col > maxCol) maxCol = col
      if (row > maxRow) maxRow = row
    }
    ws['!ref'] = `A1:${maxCol}${maxRow}`
  }
  
  ws['!cols'] = Array(26).fill({ wch: 25 })
  
  return ws
}

// Nuova funzione helper per trovare valori da una todolist specifica
function findValueForMappingFromTodolist(tasks: TaskData[], fieldId: string, deviceId: string, kpiId: string): any {
  const relevantTasks = tasks.filter((task: TaskData) => 
    task.device_id === deviceId && task.kpi_id === kpiId
  )
  
  if (relevantTasks.length === 0) {
    return null
  }
  
  // Ordina per data di completamento (più recente prima) nel caso ci siano più task
  relevantTasks.sort((a: TaskData, b: TaskData) => {
    const dateA = new Date(a.completed_at || a.completion_date)
    const dateB = new Date(b.completed_at || b.completion_date)
    return dateB.getTime() - dateA.getTime()
  })
  
  for (const task of relevantTasks) {
    if (task.value && Array.isArray(task.value)) {
      const fieldValue = task.value.find((v: { id: string; value: any }) => v.id === fieldId)
      if (fieldValue && fieldValue.value !== undefined) {
        return fieldValue.value
      }
    }
  }
  
  return null
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
