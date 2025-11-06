/**
 * Interfacce TypeScript per il sistema di Report
 * Nuova struttura: Punti di Controllo con Controlli gerarchici
 */

// ============================================
// STRUTTURA BASE
// ============================================

export interface Device {
  id: string
  name: string
  tags?: string[]
}

export interface KPI {
  id: string
  name: string
  description?: string
  value?: KPIValue | KPIValue[]
}

export interface KPIValue {
  id: string
  name: string
  type: string
  description?: string
  required?: boolean
}

// ============================================
// NUOVA STRUTTURA: CONTROLLI GERARCHICI
// ============================================

/**
 * Rappresenta un singolo controllo (sotto-controllo)
 * che è un campo specifico di un KPI da monitorare
 */
export interface Control {
  id: string // ID univoco del controllo (generato al momento della creazione)
  kpiId: string // ID del KPI di riferimento
  fieldId: string // ID del campo specifico del KPI (es: "kpi-123-temperatura")
  name: string // Nome visualizzato del controllo
  kpiName: string // Nome del KPI per riferimento
  fieldName: string // Nome del campo per riferimento
  order: number // Ordine di visualizzazione (0, 1, 2, ...)
}

/**
 * Rappresenta un Punto di Controllo (Device)
 * con la lista ordinata dei suoi controlli
 */
export interface ControlPoint {
  id: string // ID univoco del control point
  name: string // Nome del punto di controllo (nome del device)
  deviceId: string // ID del device associato
  controls: Control[] // Array ordinato di controlli da monitorare
  order: number // Ordine di visualizzazione del punto di controllo
}

/**
 * Struttura per todolist_params_linked nel database
 */
export interface TodolistParamsLinked {
  controlPoints: ControlPoint[]
}

// ============================================
// MAPPING EXCEL (rimane simile ma semplificato)
// ============================================

/**
 * Rappresenta la mappatura di un controllo a una cella Excel
 */
export interface ExcelMapping {
  controlPointId: string // ID del punto di controllo
  controlId: string // ID del controllo
  cellPosition: string // Posizione cella (es: "B2")
  
  // Dati denormalizzati per facilità di accesso
  deviceId: string
  deviceName: string
  kpiId: string
  kpiName: string
  fieldId: string
  fieldName: string
}

/**
 * Struttura completa per mapping_excel nel database
 */
export interface MappingExcel {
  mappings: ExcelMapping[]
}

// ============================================
// REPORT COMPLETO
// ============================================

export interface Report {
  id: string
  name: string
  description?: string
  todolist_params_linked: TodolistParamsLinked
  mapping_excel: MappingExcel | null
  created_at: string
  hasDataAvailable?: boolean // Campo calcolato runtime
}

// ============================================
// EXPORT EXCEL
// ============================================

export interface TaskData {
  id: string
  kpi_id: string
  value: { id: string; value: unknown }[]
  todolist_id: string
  completed_at: string
  device_id: string
  completion_date: string
}

export interface ExcelData {
  mappings: ExcelMapping[]
  taskData: TaskData[]
}

// ============================================
// HELPER TYPES
// ============================================

/**
 * Rappresenta un campo KPI estratto e formattato
 */
export interface KpiField {
  kpiId: string
  kpiName: string
  fieldId: string
  fieldName: string
  fieldType: string
  fieldDescription?: string
  fieldRequired: boolean
}

