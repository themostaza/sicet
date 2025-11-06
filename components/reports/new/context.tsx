"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { toast } from "@/components/ui/use-toast"
import { getDeviceTags, getDevicesByTags } from "@/app/actions/actions-device"
import { 
  Device, 
  KPI, 
  ControlPoint, 
  Control,
  KpiField 
} from "@/types/reports"

interface ReportContextType {
  // Report basic info
  reportName: string
  setReportName: (name: string) => void
  
  // Devices
  devices: Device[]
  selectedDevices: Set<string>
  setSelectedDevices: (devices: Set<string>) => void
  selectedDevicesArray: Device[]
  isDeviceSheetOpen: boolean
  setIsDeviceSheetOpen: (open: boolean) => void
  
  // Device ordering
  devicesOrder: string[]
  setDevicesOrder: (order: string[]) => void
  moveDevice: (deviceId: string, direction: 'left' | 'right') => void
  
  // Device tags
  allTags: string[]
  selectedTags: string[]
  setSelectedTags: (tags: string[]) => void
  tagFilterMode: 'OR' | 'AND'
  setTagFilterMode: (mode: 'OR' | 'AND') => void
  filteredDevices: Device[]
  tagLoading: boolean
  
  // KPIs
  kpis: KPI[]
  selectedKpis: Set<string>
  setSelectedKpis: (kpis: Set<string>) => void
  selectedKpisArray: KPI[]
  isKpiSheetOpen: boolean
  setIsKpiSheetOpen: (open: boolean) => void
  
  // Field ordering (per singoli campi KPI) - DEPRECATO, usare controlPoints
  fieldsOrder: string[]
  setFieldsOrder: (order: string[]) => void
  moveField: (fieldId: string, direction: 'up' | 'down') => void
  
  // === NUOVA STRUTTURA GERARCHICA ===
  // Control Points con i loro controlli
  controlPoints: ControlPoint[]
  setControlPoints: (controlPoints: ControlPoint[]) => void
  
  // Funzioni per gestire control points
  addControlPoint: (deviceId: string) => void
  removeControlPoint: (controlPointId: string) => void
  updateControlPointName: (controlPointId: string, name: string) => void
  moveControlPoint: (controlPointId: string, direction: 'left' | 'right') => void
  
  // Funzioni per gestire controlli di un control point
  addControlToControlPoint: (controlPointId: string, control: Omit<Control, 'id' | 'order'>) => void
  removeControlFromControlPoint: (controlPointId: string, controlId: string) => void
  moveControlInControlPoint: (controlPointId: string, controlId: string, direction: 'up' | 'down') => void
  updateControlsInControlPoint: (controlPointId: string, controls: Control[]) => void
  
  // Helper per ottenere tutti i campi KPI disponibili
  getAllKpiFields: () => KpiField[]
  
  // Excel mappings - DEPRECATO per nuova struttura
  mappings: {[key: string]: string} // key: "deviceId-kpiId", value: "cellPosition"
  setMappings: (mappings: {[key: string]: string} | ((prev: {[key: string]: string}) => {[key: string]: string})) => void
  
  // Validation
  errors: {[key: string]: string}
  setErrors: (errors: {[key: string]: string}) => void
  
  // Computed values
  totalControlPointsCount: number
}

const ReportContext = createContext<ReportContextType | undefined>(undefined)

interface ReportProviderProps {
  children: ReactNode
}

export function ReportProvider({ children }: ReportProviderProps) {
  // Report basic info
  const [reportName, setReportName] = useState("")
  
  // Data
  const [devices, setDevices] = useState<Device[]>([])
  const [kpis, setKpis] = useState<KPI[]>([])
  
  // Selections
  const [selectedDevices, setSelectedDevices] = useState<Set<string>>(new Set())
  const [selectedKpis, setSelectedKpis] = useState<Set<string>>(new Set())
  
  // Ordering
  const [devicesOrder, setDevicesOrder] = useState<string[]>([])
  const [fieldsOrder, setFieldsOrder] = useState<string[]>([])
  
  // Device tags
  const [allTags, setAllTags] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [tagFilterMode, setTagFilterMode] = useState<'OR' | 'AND'>('OR')
  const [filteredDevices, setFilteredDevices] = useState<Device[]>([])
  const [tagLoading, setTagLoading] = useState(false)
  
  // UI state
  const [isDeviceSheetOpen, setIsDeviceSheetOpen] = useState(false)
  const [isKpiSheetOpen, setIsKpiSheetOpen] = useState(false)
  
  // Excel mappings (DEPRECATO)
  const [mappings, setMappings] = useState<{[key: string]: string}>({})
  
  // === NUOVA STRUTTURA ===
  const [controlPoints, setControlPoints] = useState<ControlPoint[]>([])
  
  // Validation
  const [errors, setErrors] = useState<{[key: string]: string}>({})
  
  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load devices
        const devicesResponse = await fetch('/api/reports/devices')
        if (devicesResponse.ok) {
          const devicesData = await devicesResponse.json()
          setDevices(devicesData.devices || [])
        }
        
        // Load KPIs
        const kpisResponse = await fetch('/api/templates/kpis')
        if (kpisResponse.ok) {
          const kpisData = await kpisResponse.json()
          setKpis(kpisData.kpis || [])
        }

        // Load device tags
        const tags = await getDeviceTags()
        setAllTags(tags)
      } catch (error) {
        console.error('Error loading data:', error)
        toast({
          title: "Errore",
          description: "Impossibile caricare i dati.",
          variant: "destructive"
        })
      }
    }
    
    loadData()
  }, [])

  // Effect to handle tag filtering
  useEffect(() => {
    const filterByTags = async () => {
      if (selectedTags.length === 0) {
        setFilteredDevices([])
        return
      }

      setTagLoading(true)
      try {
        const filtered = await getDevicesByTags(selectedTags, tagFilterMode)
        setFilteredDevices(filtered)
      } catch (error) {
        console.error('Error filtering devices by tags:', error)
        setFilteredDevices([])
      } finally {
        setTagLoading(false)
      }
    }

    filterByTags()
  }, [selectedTags, tagFilterMode])
  
  // Update order when selections change
  useEffect(() => {
    const newDevices = Array.from(selectedDevices)
    const newOrder = newDevices.filter(id => !devicesOrder.includes(id))
    const validOrder = devicesOrder.filter(id => selectedDevices.has(id))
    setDevicesOrder([...validOrder, ...newOrder])
  }, [selectedDevices])
  
  // Update fields order when KPIs selection changes
  useEffect(() => {
    // Genera tutti i fieldId dai KPI selezionati
    const allFieldIds: string[] = []
    
    selectedKpisArray.forEach(kpi => {
      if (kpi.value && Array.isArray(kpi.value) && kpi.value.length > 0) {
        kpi.value.forEach((field: any) => {
          const fieldId = field.id || `${kpi.id}-${String(field.name || '').toLowerCase().replace(/\s+/g, '_')}`
          allFieldIds.push(fieldId)
        })
      } else if (kpi.value && typeof kpi.value === 'object' && kpi.value !== null && !Array.isArray(kpi.value)) {
        const valueObj = kpi.value as any
        const fieldId = valueObj.id || `${kpi.id}-${String(valueObj.name || 'value').toLowerCase().replace(/\s+/g, '_')}`
        allFieldIds.push(fieldId)
      } else {
        allFieldIds.push(`${kpi.id}-value`)
      }
    })
    
    // Aggiungi nuovi field che non sono nell'ordine
    const newFields = allFieldIds.filter(id => !fieldsOrder.includes(id))
    // Mantieni solo field ancora validi
    const validOrder = fieldsOrder.filter(id => allFieldIds.includes(id))
    setFieldsOrder([...validOrder, ...newFields])
  }, [selectedKpis, kpis])
  
  // Move functions
  const moveDevice = (deviceId: string, direction: 'left' | 'right') => {
    const currentIndex = devicesOrder.indexOf(deviceId)
    if (currentIndex === -1) return
    
    const newOrder = [...devicesOrder]
    if (direction === 'left' && currentIndex > 0) {
      [newOrder[currentIndex - 1], newOrder[currentIndex]] = [newOrder[currentIndex], newOrder[currentIndex - 1]]
    } else if (direction === 'right' && currentIndex < devicesOrder.length - 1) {
      [newOrder[currentIndex], newOrder[currentIndex + 1]] = [newOrder[currentIndex + 1], newOrder[currentIndex]]
    }
    setDevicesOrder(newOrder)
  }
  
  const moveField = (fieldId: string, direction: 'up' | 'down') => {
    const currentIndex = fieldsOrder.indexOf(fieldId)
    if (currentIndex === -1) return
    
    const newOrder = [...fieldsOrder]
    if (direction === 'up' && currentIndex > 0) {
      [newOrder[currentIndex - 1], newOrder[currentIndex]] = [newOrder[currentIndex], newOrder[currentIndex - 1]]
    } else if (direction === 'down' && currentIndex < fieldsOrder.length - 1) {
      [newOrder[currentIndex], newOrder[currentIndex + 1]] = [newOrder[currentIndex + 1], newOrder[currentIndex]]
    }
    setFieldsOrder(newOrder)
  }
  
  // === FUNZIONI PER NUOVA STRUTTURA GERARCHICA ===
  
  // Helper per ottenere tutti i campi KPI disponibili
  const getAllKpiFields = (): KpiField[] => {
    const fields: KpiField[] = []
    
    selectedKpisArray.forEach(kpi => {
      if (kpi.value && Array.isArray(kpi.value) && kpi.value.length > 0) {
        kpi.value.forEach((field: { id?: string; name?: string; type?: string; description?: string; required?: boolean }, index: number) => {
          fields.push({
            kpiId: kpi.id,
            kpiName: kpi.name,
            fieldId: field.id || `${kpi.id}-${String(field.name || '').toLowerCase().replace(/\s+/g, '_')}`,
            fieldName: field.name || `Campo ${index + 1}`,
            fieldType: field.type || 'text',
            fieldDescription: field.description,
            fieldRequired: field.required || false
          })
        })
      } else if (kpi.value && typeof kpi.value === 'object' && kpi.value !== null && !Array.isArray(kpi.value)) {
        const valueObj = kpi.value as { id?: string; name?: string; type?: string; description?: string; required?: boolean }
        fields.push({
          kpiId: kpi.id,
          kpiName: kpi.name,
          fieldId: valueObj.id || `${kpi.id}-${String(valueObj.name || 'value').toLowerCase().replace(/\s+/g, '_')}`,
          fieldName: valueObj.name || kpi.name,
          fieldType: valueObj.type || 'text',
          fieldDescription: valueObj.description || kpi.description,
          fieldRequired: valueObj.required || false
        })
      } else {
        fields.push({
          kpiId: kpi.id,
          kpiName: kpi.name,
          fieldId: `${kpi.id}-value`,
          fieldName: kpi.name,
          fieldType: 'text',
          fieldDescription: kpi.description,
          fieldRequired: true
        })
      }
    })
    
    return fields
  }
  
  // Aggiungi un nuovo control point
  const addControlPoint = (deviceId: string) => {
    const device = devices.find(d => d.id === deviceId)
    if (!device) return
    
    const newControlPoint: ControlPoint = {
      id: `cp-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      name: device.name,
      deviceId: deviceId,
      controls: [],
      order: controlPoints.length
    }
    
    setControlPoints([...controlPoints, newControlPoint])
  }
  
  // Rimuovi un control point
  const removeControlPoint = (controlPointId: string) => {
    const newControlPoints = controlPoints
      .filter(cp => cp.id !== controlPointId)
      .map((cp, index) => ({ ...cp, order: index }))
    setControlPoints(newControlPoints)
  }
  
  // Aggiorna il nome di un control point
  const updateControlPointName = (controlPointId: string, name: string) => {
    setControlPoints(controlPoints.map(cp => 
      cp.id === controlPointId ? { ...cp, name } : cp
    ))
  }
  
  // Muovi un control point
  const moveControlPoint = (controlPointId: string, direction: 'left' | 'right') => {
    const currentIndex = controlPoints.findIndex(cp => cp.id === controlPointId)
    if (currentIndex === -1) return
    
    const newControlPoints = [...controlPoints]
    if (direction === 'left' && currentIndex > 0) {
      [newControlPoints[currentIndex - 1], newControlPoints[currentIndex]] = 
      [newControlPoints[currentIndex], newControlPoints[currentIndex - 1]]
    } else if (direction === 'right' && currentIndex < controlPoints.length - 1) {
      [newControlPoints[currentIndex], newControlPoints[currentIndex + 1]] = 
      [newControlPoints[currentIndex + 1], newControlPoints[currentIndex]]
    }
    
    // Riordina gli indici
    const reordered = newControlPoints.map((cp, index) => ({ ...cp, order: index }))
    setControlPoints(reordered)
  }
  
  // Aggiungi un controllo a un control point
  const addControlToControlPoint = (controlPointId: string, control: Omit<Control, 'id' | 'order'>) => {
    setControlPoints(controlPoints.map(cp => {
      if (cp.id === controlPointId) {
        const newControl: Control = {
          ...control,
          id: `ctrl-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          order: cp.controls.length
        }
        return {
          ...cp,
          controls: [...cp.controls, newControl]
        }
      }
      return cp
    }))
  }
  
  // Rimuovi un controllo da un control point
  const removeControlFromControlPoint = (controlPointId: string, controlId: string) => {
    setControlPoints(controlPoints.map(cp => {
      if (cp.id === controlPointId) {
        const newControls = cp.controls
          .filter(c => c.id !== controlId)
          .map((c, index) => ({ ...c, order: index }))
        return {
          ...cp,
          controls: newControls
        }
      }
      return cp
    }))
  }
  
  // Muovi un controllo all'interno di un control point
  const moveControlInControlPoint = (controlPointId: string, controlId: string, direction: 'up' | 'down') => {
    setControlPoints(controlPoints.map(cp => {
      if (cp.id === controlPointId) {
        const currentIndex = cp.controls.findIndex(c => c.id === controlId)
        if (currentIndex === -1) return cp
        
        const newControls = [...cp.controls]
        if (direction === 'up' && currentIndex > 0) {
          [newControls[currentIndex - 1], newControls[currentIndex]] = 
          [newControls[currentIndex], newControls[currentIndex - 1]]
        } else if (direction === 'down' && currentIndex < cp.controls.length - 1) {
          [newControls[currentIndex], newControls[currentIndex + 1]] = 
          [newControls[currentIndex + 1], newControls[currentIndex]]
        }
        
        // Riordina gli indici
        const reordered = newControls.map((c, index) => ({ ...c, order: index }))
        return {
          ...cp,
          controls: reordered
        }
      }
      return cp
    }))
  }
  
  // Aggiorna completamente i controlli di un control point
  const updateControlsInControlPoint = (controlPointId: string, controls: Control[]) => {
    setControlPoints(controlPoints.map(cp => {
      if (cp.id === controlPointId) {
        return {
          ...cp,
          controls: controls.map((c, index) => ({ ...c, order: index }))
        }
      }
      return cp
    }))
  }
  
  // Computed values with ordering
  const selectedDevicesArray = devicesOrder
    .map(id => devices.find(d => d.id === id))
    .filter((d): d is Device => d !== undefined && selectedDevices.has(d.id))
  
  // selectedKpisArray rimane nell'ordine originale (usato per generare i campi)
  const selectedKpisArray = kpis.filter(kpi => selectedKpis.has(kpi.id))
  
  const totalControlPointsCount = selectedDevices.size > 0 && selectedKpis.size > 0 ? selectedDevices.size : 0
  
  const value: ReportContextType = {
    // Report basic info
    reportName,
    setReportName,
    
    // Devices
    devices,
    selectedDevices,
    setSelectedDevices,
    selectedDevicesArray,
    isDeviceSheetOpen,
    setIsDeviceSheetOpen,
    
    // Device ordering
    devicesOrder,
    setDevicesOrder,
    moveDevice,
    
    // Device tags
    allTags,
    selectedTags,
    setSelectedTags,
    tagFilterMode,
    setTagFilterMode,
    filteredDevices,
    tagLoading,
    
    // KPIs
    kpis,
    selectedKpis,
    setSelectedKpis,
    selectedKpisArray,
    isKpiSheetOpen,
    setIsKpiSheetOpen,
    
    // Field ordering (DEPRECATO)
    fieldsOrder,
    setFieldsOrder,
    moveField,
    
    // === NUOVA STRUTTURA ===
    controlPoints,
    setControlPoints,
    addControlPoint,
    removeControlPoint,
    updateControlPointName,
    moveControlPoint,
    addControlToControlPoint,
    removeControlFromControlPoint,
    moveControlInControlPoint,
    updateControlsInControlPoint,
    getAllKpiFields,
    
    // Excel mappings (DEPRECATO)
    mappings,
    setMappings,
    
    // Validation
    errors,
    setErrors,
    
    // Computed values
    totalControlPointsCount
  }
  
  return (
    <ReportContext.Provider value={value}>
      {children}
    </ReportContext.Provider>
  )
}

export function useReport() {
  const context = useContext(ReportContext)
  if (context === undefined) {
    throw new Error('useReport must be used within a ReportProvider')
  }
  return context
}
