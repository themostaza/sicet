"use client"

import { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from "react"
import { useToast } from "@/components/ui/use-toast"
import { getDevices } from "@/app/actions/actions-device"
import { getKpis } from "@/app/actions/actions-kpi"
import { 
  Device, KPI, DateTimeEntry, ValidationErrors, TimeSlot, TimeSlotValue, CustomTimeSlot, isCustomTimeSlot
} from "./types"
import { toggle, areEqual } from "./helpers"
import { format } from "date-fns"

// Define types for alert conditions
interface AlertCondition {
  field_id: string;
  type: 'numeric' | 'text' | 'boolean';
  min?: number;
  max?: number;
  match_text?: string;
  boolean_value?: boolean;
}

// Definizione dell'interfaccia del context
interface TodolistContextType {
  // Stati base
  devices: Device[]
  kpis: KPI[]
  isLoading: boolean
  isSubmitting: boolean
  deviceId: string | null
  
  // Email e Alert
  email: string
  setEmail: (email: string) => void
  alertEnabled: boolean
  setAlertEnabled: (enabled: boolean) => void

  // Selezioni utente
  selectedTags: Set<string>
  manualSelectedDevices: Set<string>
  selectedKpis: Set<string>
  dateEntries: DateTimeEntry[]
  defaultTimeSlot: TimeSlotValue
  intervalDays: number
  startDate: Date | null
  monthsToRepeat: number
  
  // Stati modali
  isDeviceSheetOpen: boolean
  isKpiSheetOpen: boolean
  isDateSheetOpen: boolean
  
  // Stati UI
  deviceSearchTerm: string
  kpiSearchTerm: string
  errors: ValidationErrors
  selectedDates: Date[]
  
  // Dati derivati
  devicesByTag: Record<string, Set<string>>
  availableTags: string[]
  tagCounts: Record<string, number>
  autoSelectedFromTags: Set<string>
  selectedDevices: Set<string>
  filteredDevices: Device[]
  filteredKpis: KPI[]
  deviceKpis: KPI[]
  selectedDevicesArray: Device[]
  selectedKpisArray: KPI[]
  totalTodolistCount: number
  allRowsSelected: boolean
  someRowsSelected: boolean
  allKpiSelected: boolean
  someKpiSelected: boolean
  
  // Setters
  setIsDeviceSheetOpen: (open: boolean) => void
  setIsKpiSheetOpen: (open: boolean) => void
  setIsDateSheetOpen: (open: boolean) => void
  setDeviceSearchTerm: (term: string) => void
  setKpiSearchTerm: (term: string) => void
  setSelectedTags: (tags: Set<string>) => void
  setManualSelectedDevices: (devices: Set<string> | ((prev: Set<string>) => Set<string>)) => void
  setSelectedKpis: (kpis: Set<string> | ((prev: Set<string>) => Set<string>)) => void
  setDateEntries: (entries: DateTimeEntry[]) => void
  setDefaultTimeSlot: (timeSlot: TimeSlotValue) => void
  setIntervalDays: (days: number) => void
  setStartDate: (date: Date | null) => void
  setMonthsToRepeat: (months: number) => void
  setSelectedDates: (dates: Date[]) => void
  setErrors: (errors: ValidationErrors) => void
  setIsSubmitting: (submitting: boolean) => void
  
  // Handlers
  handleTagClick: (tag: string) => void
  clearAllTags: () => void
  handleToggleAllDevices: () => void
  handleToggleAllKpis: () => void
  updateDateEntry: (date: Date, timeSlot: TimeSlotValue) => void
  removeDateEntry: (index: number) => void
  applyIntervalSelection: (timeSlot?: TimeSlotValue) => void
  updateExistingDateEntry: (index: number, newDate: Date, newTimeSlot: TimeSlotValue) => void
  
  // New fields
  alertConditions: AlertCondition[]
  setAlertConditions: (conditions: AlertCondition[]) => void
  alertEmail: string
  setAlertEmail: (email: string) => void
}

// Creazione del context
const TodolistContext = createContext<TodolistContextType | undefined>(undefined)

// Provider component
export function TodolistProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast()
  
  // Stati base
  const [devices, setDevices] = useState<Device[]>([])
  const [kpis, setKpis] = useState<KPI[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deviceId, setDeviceId] = useState<string | null>(null)
  
  // Selezioni utente
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set())
  const [manualSelectedDevices, setManualSelectedDevices] = useState<Set<string>>(new Set())
  const [selectedKpis, setSelectedKpis] = useState<Set<string>>(new Set())
  const [dateEntries, setDateEntries] = useState<DateTimeEntry[]>([])
  const [defaultTimeSlot, setDefaultTimeSlot] = useState<TimeSlotValue>("mattina")
  const [intervalDays, setIntervalDays] = useState(7)
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [monthsToRepeat, setMonthsToRepeat] = useState(1)
  
  // Stati modali
  const [isDeviceSheetOpen, setIsDeviceSheetOpen] = useState(false)
  const [isKpiSheetOpen, setIsKpiSheetOpen] = useState(false)
  const [isDateSheetOpen, setIsDateSheetOpen] = useState(false)
  
  // Stati UI
  const [deviceSearchTerm, setDeviceSearchTerm] = useState("")
  const [kpiSearchTerm, setKpiSearchTerm] = useState("")
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [selectedDates, setSelectedDates] = useState<Date[]>([])
  
  // Email e Alert
  const [email, setEmail] = useState("")
  const [alertEnabled, setAlertEnabled] = useState(false)

  // New fields
  const [alertConditions, setAlertConditions] = useState<AlertCondition[]>([])
  const [alertEmail, setAlertEmail] = useState("")

  // Caricamento dati iniziale
  useEffect(() => {
    const loadData = async () => {
      try {
        const [devicesResponse, kpisResponse] = await Promise.all([
          getDevices({ limit: 100 }),
          getKpis({ limit: 100 })
        ])
        
        // Map devices to expected format
        const mappedDevices = devicesResponse.devices.map(device => ({
          id: device.id,
          name: device.name,
          location: device.location || null,
          model: device.model || null,
          type: device.type || null,
          description: device.description || null,
          qrcode_url: device.qrcodeUrl || null,
          tags: device.tags || null,
          created_at: null,
          deleted: false
        }))

        // Map KPIs to expected format
        const mappedKpis = kpisResponse.kpis.map(kpi => ({
          id: kpi.id,
          name: kpi.name,
          description: kpi.description,
          value: kpi.value,
          created_at: kpi.created_at,
          deleted: false
        }))

        setDevices(mappedDevices)
        setKpis(mappedKpis)
        setIsLoading(false)
      } catch (error) {
        console.error("Error loading data:", error)
        toast({
          title: "Errore",
          description: "Impossibile caricare i dati. Riprova più tardi.",
          variant: "destructive"
        })
      }
    }
    
    loadData()
  }, [toast])

  // Computazioni derivate - Tags
  const devicesByTag = useMemo(() => {
    const result: Record<string, Set<string>> = {}
    
    for (const device of devices) {
      if (device.tags && device.tags.length > 0) {
        for (const tag of device.tags) {
          if (!result[tag]) {
            result[tag] = new Set()
          }
          result[tag].add(device.id)
        }
      }
    }
    
    return result
  }, [devices])
  
  const availableTags = useMemo(() => 
    Object.keys(devicesByTag).sort((a, b) => a.localeCompare(b)),
  [devicesByTag])
  
  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const tag of availableTags) {
      counts[tag] = devicesByTag[tag].size
    }
    return counts
  }, [availableTags, devicesByTag])
  
  // Dispositivi selezionati automaticamente dai tag
  const autoSelectedFromTags = useMemo(() => {
    const selectedDeviceIds = new Set<string>()
    
    if (selectedTags.size === 0) return selectedDeviceIds
    
    for (const tag of selectedTags) {
      if (devicesByTag[tag]) {
        for (const deviceId of devicesByTag[tag]) {
          selectedDeviceIds.add(deviceId)
        }
      }
    }
    
    return selectedDeviceIds
  }, [selectedTags, devicesByTag])
  
  // Unione dei dispositivi selezionati manualmente e tramite tag
  const selectedDevices = useMemo(() => {
    const allSelected = new Set([...autoSelectedFromTags, ...manualSelectedDevices])
    return allSelected
  }, [autoSelectedFromTags, manualSelectedDevices])
  
  // Dispositivi filtrati per ricerca e pre-selezione
  const filteredDevices = useMemo(() => {
    if (!deviceSearchTerm && selectedTags.size === 0) return devices
    
    return devices.filter(device => {
      const matchesSearch = !deviceSearchTerm || 
        device.name.toLowerCase().includes(deviceSearchTerm.toLowerCase()) ||
        device.id.toLowerCase().includes(deviceSearchTerm.toLowerCase()) ||
        (device.location && device.location.toLowerCase().includes(deviceSearchTerm.toLowerCase()))
      
      const matchesTags = selectedTags.size === 0 || 
        (device.tags && [...selectedTags].every(tag => device.tags?.includes(tag)))
      
      return matchesSearch && matchesTags
    })
  }, [devices, deviceSearchTerm, selectedTags])
  
  // KPIs filtrati per ricerca
  const filteredKpis = useMemo(() => {
    if (!kpiSearchTerm) return kpis
    
    return kpis.filter(kpi => 
      kpi.name.toLowerCase().includes(kpiSearchTerm.toLowerCase()) ||
      kpi.id.toLowerCase().includes(kpiSearchTerm.toLowerCase()) ||
      (kpi.description && kpi.description.toLowerCase().includes(kpiSearchTerm.toLowerCase()))
    )
  }, [kpis, kpiSearchTerm])
  
  // Array di dispositivi e KPI selezionati
  const selectedDevicesArray = useMemo(() => 
    devices.filter(device => selectedDevices.has(device.id)),
  [devices, selectedDevices])
  
  const selectedKpisArray = useMemo(() => 
    kpis.filter(kpi => selectedKpis.has(kpi.id)),
  [kpis, selectedKpis])
  
  // KPI per Punti di controllo selezionati (esempio di funzionalità avanzata)
  const deviceKpis = useMemo(() => {
    // Qui potrebbe esserci una logica che seleziona i Controlli appropriati 
    // in base ai Punti di controllo selezionati
    return kpis
  }, [kpis])
  
  // Conteggio totale delle todolist da creare
  const totalTodolistCount = useMemo(() => 
    selectedDevices.size * dateEntries.length,
  [selectedDevices.size, dateEntries.length])
  
  // Stati di selezione tutti/alcuni
  const allRowsSelected = useMemo(() => 
    filteredDevices.length > 0 && 
    filteredDevices.every(device => selectedDevices.has(device.id)),
  [filteredDevices, selectedDevices])
  
  const someRowsSelected = useMemo(() => 
    !allRowsSelected && 
    filteredDevices.some(device => selectedDevices.has(device.id)),
  [allRowsSelected, filteredDevices, selectedDevices])
  
  const allKpiSelected = useMemo(() => 
    filteredKpis.length > 0 && 
    filteredKpis.every(kpi => selectedKpis.has(kpi.id)),
  [filteredKpis, selectedKpis])
  
  const someKpiSelected = useMemo(() => 
    !allKpiSelected && 
    filteredKpis.some(kpi => selectedKpis.has(kpi.id)),
  [allKpiSelected, filteredKpis, selectedKpis])
  
  // Handler per click su tag
  const handleTagClick = useCallback((tag: string) => {
    setSelectedTags(prev => {
      const next = toggle(prev, tag)
      // When adding a tag, select all devices with that tag
      // When removing a tag, deselect devices that are only selected by that tag
      setManualSelectedDevices(prevDevices => {
        const nextDevices = new Set(prevDevices)
        if (next.has(tag)) {
          // Add all devices with this tag
          if (devicesByTag[tag]) {
            for (const deviceId of devicesByTag[tag]) {
              nextDevices.add(deviceId)
            }
          }
        } else {
          // Remove devices that are only selected by this tag
          if (devicesByTag[tag]) {
            for (const deviceId of devicesByTag[tag]) {
              // Check if device is selected by any other tag
              const isSelectedByOtherTag = [...next].some(otherTag => 
                otherTag !== tag && devicesByTag[otherTag]?.has(deviceId)
              )
              if (!isSelectedByOtherTag) {
                nextDevices.delete(deviceId)
              }
            }
          }
        }
        return nextDevices
      })
      return next
    })
  }, [devicesByTag])
  
  // Cancella tutti i tags selezionati
  const clearAllTags = useCallback(() => {
    setSelectedTags(new Set())
  }, [])
  
  // Toggle selezione di tutti i dispositivi
  const handleToggleAllDevices = useCallback(() => {
    if (allRowsSelected) {
      // Deseleziona tutti i dispositivi filtrati ma mantieni quelli non visibili
      const visibleIds = new Set(filteredDevices.map(d => d.id))
      setManualSelectedDevices(prev => {
        const next = new Set(prev)
        for (const id of visibleIds) {
          if (next.has(id) && !autoSelectedFromTags.has(id)) {
            next.delete(id)
          }
        }
        return next
      })
    } else {
      // Seleziona tutti i dispositivi filtrati
      setManualSelectedDevices(prev => {
        const visibleIds = filteredDevices.map(d => d.id)
        return new Set([...prev, ...visibleIds])
      })
    }
  }, [allRowsSelected, filteredDevices, autoSelectedFromTags])
  
  // Toggle selezione di tutti i KPI
  const handleToggleAllKpis = useCallback(() => {
    if (allKpiSelected) {
      // Deseleziona tutti i KPI filtrati
      const visibleIds = new Set(filteredKpis.map(k => k.id))
      setSelectedKpis(prev => {
        const next = new Set(prev)
        for (const id of visibleIds) {
          next.delete(id)
        }
        return next
      })
    } else {
      // Seleziona tutti i KPI filtrati
      const visibleIds = filteredKpis.map(k => k.id)
      setSelectedKpis(prev => new Set([...prev, ...visibleIds]))
    }
  }, [allKpiSelected, filteredKpis])
  
  // Aggiorna o aggiungi una data entry
  const updateDateEntry = useCallback((date: Date, timeSlot: TimeSlotValue) => {
    if (!date) return;
    
    // Normalize date to avoid timezone issues
    const normalizedDate = new Date(date)
    normalizedDate.setHours(0, 0, 0, 0)
    
    // Format for comparison
    const dateStr = format(normalizedDate, "yyyy-MM-dd")
    
    setDateEntries(prev => {
      // Check if this exact date+timeSlot combination already exists
      const existingIndex = prev.findIndex(
        entry => 
          format(entry.date, "yyyy-MM-dd") === dateStr &&
          (isCustomTimeSlot(timeSlot) && isCustomTimeSlot(entry.timeSlot)
            ? timeSlot.startHour === entry.timeSlot.startHour && timeSlot.endHour === entry.timeSlot.endHour
            : entry.timeSlot === timeSlot)
      )
      
      if (existingIndex >= 0) {
        // Entry already exists, no need to update
        return prev
      } else {
        // Add as new entry - allow multiple time slots for the same date
        return [...prev, { 
          date: normalizedDate, 
          timeSlot, 
          time: format(normalizedDate, "HH:mm") 
        }]
      }
    })
    
    // Also update selectedDates to include this date if it's not already there
    setSelectedDates(prev => {
      const isDateAlreadySelected = prev.some(d => 
        format(d, "yyyy-MM-dd") === dateStr
      )
      
      if (!isDateAlreadySelected) {
        return [...prev, normalizedDate]
      }
      return prev
    })
  }, [])
  
  // Remove a date entry by index
  const removeDateEntry = useCallback((idx: number) => {
    setDateEntries(prev => {
      if (idx < 0 || idx >= prev.length) return prev
      
      const dateToRemove = prev[idx].date
      const dateStr = format(dateToRemove, "yyyy-MM-dd")
      
      const newEntries = prev.filter((_, i) => i !== idx)
      
      // Check if there are any other entries with the same date
      const hasSameDateEntry = newEntries.some(entry => 
        format(entry.date, "yyyy-MM-dd") === dateStr
      )
      
      // If no other entries have the same date, remove from selectedDates too
      if (!hasSameDateEntry) {
        setSelectedDates(prevDates => 
          prevDates.filter(d => format(d, "yyyy-MM-dd") !== dateStr)
        )
      }
      
      return newEntries
    })
  }, [])
  
  // Apply interval selection
  const applyIntervalSelection = useCallback((timeSlot?: TimeSlotValue) => {
    if (!startDate || intervalDays < 1 || monthsToRepeat < 1) return
    
    // Use provided timeSlot or fall back to defaultTimeSlot
    const slotToUse = timeSlot || defaultTimeSlot
    
    // Generate dates at regular intervals
    const newDates: Date[] = []
    const endDate = new Date(startDate)
    endDate.setMonth(endDate.getMonth() + monthsToRepeat)
    
    let currentDate = new Date(startDate)
    currentDate.setHours(0, 0, 0, 0)
    
    while (currentDate <= endDate) {
      newDates.push(new Date(currentDate))
      currentDate.setDate(currentDate.getDate() + intervalDays)
    }
    
    // Add each date with the specified time slot
    for (const newDate of newDates) {
      updateDateEntry(newDate, slotToUse)
    }
    
    // Show feedback message
    toast({
      title: "Date selezionate",
      description: `Aggiunte ${newDates.length} date a intervalli di ${intervalDays} giorni per ${monthsToRepeat} mesi`,
    })
  }, [startDate, intervalDays, monthsToRepeat, defaultTimeSlot, updateDateEntry, toast])



  // Add a new function specifically for updating an existing date entry
  const updateExistingDateEntry = useCallback((index: number, newDate: Date, newTimeSlot: TimeSlotValue) => {
    setDateEntries(prev => {
      if (index < 0 || index >= prev.length) return prev
      
      // Normalize date
      const normalizedDate = new Date(newDate)
      normalizedDate.setHours(0, 0, 0, 0)
      
      // Get the current entry to modify
      const currentEntry = prev[index]
      const oldDateStr = format(currentEntry.date, "yyyy-MM-dd")
      const newDateStr = format(normalizedDate, "yyyy-MM-dd")
      
      // Create a new array with the updated entry
      const newEntries = [...prev]
      newEntries[index] = {
        date: normalizedDate,
        timeSlot: newTimeSlot,
        time: format(normalizedDate, "HH:mm")
      }
      
      // If the date has changed, update selectedDates as well
      if (oldDateStr !== newDateStr) {
        // Check if the old date appears elsewhere in the entries
        const oldDateExists = prev.some((entry, i) => 
          i !== index && format(entry.date, "yyyy-MM-dd") === oldDateStr
        )
        
        // If not, remove it from selectedDates
        if (!oldDateExists) {
          setSelectedDates(prevDates => 
            prevDates.filter(d => format(d, "yyyy-MM-dd") !== oldDateStr)
          )
        }
        
        // Check if the new date is already in selectedDates
        const newDateExists = selectedDates.some(d => 
          format(d, "yyyy-MM-dd") === newDateStr
        )
        
        // If not, add it
        if (!newDateExists) {
          setSelectedDates(prevDates => [...prevDates, normalizedDate])
        }
      }
      
      return newEntries
    })
  }, [selectedDates])

  // Aggiorna deviceId quando viene selezionato un device
  useEffect(() => {
    if (selectedDevices.size === 1) {
      const [id] = selectedDevices
      setDeviceId(id)
    } else {
      setDeviceId(null)
    }
  }, [selectedDevices])

  const contextValue = {
    // Stati
    devices, kpis, isLoading, isSubmitting, deviceId,
    selectedTags, manualSelectedDevices, selectedKpis, dateEntries,
    defaultTimeSlot, intervalDays, startDate, monthsToRepeat,
    isDeviceSheetOpen, isKpiSheetOpen, isDateSheetOpen,
    deviceSearchTerm, kpiSearchTerm, errors, selectedDates,
    
    // Dati derivati
    devicesByTag, availableTags, tagCounts, autoSelectedFromTags,
    selectedDevices, filteredDevices, filteredKpis, deviceKpis,
    selectedDevicesArray, selectedKpisArray, totalTodolistCount,
    allRowsSelected, someRowsSelected, allKpiSelected, someKpiSelected,
    
    // Setters
    setIsDeviceSheetOpen, setIsKpiSheetOpen, setIsDateSheetOpen,
    setDeviceSearchTerm, setKpiSearchTerm, setSelectedTags,
    setManualSelectedDevices, setSelectedKpis, setDateEntries,
    setDefaultTimeSlot, setIntervalDays, setStartDate, setMonthsToRepeat,
    setSelectedDates, setErrors, setIsSubmitting,
    
    // Handlers
    handleTagClick, clearAllTags, handleToggleAllDevices, handleToggleAllKpis,
    updateDateEntry, removeDateEntry, applyIntervalSelection, updateExistingDateEntry,
    
    // New fields
    alertConditions, setAlertConditions, alertEmail, setAlertEmail,
    email,
    setEmail,
    alertEnabled,
    setAlertEnabled
  }

  return <TodolistContext.Provider value={contextValue}>{children}</TodolistContext.Provider>
}

export function useTodolist() {
  const context = useContext(TodolistContext)
  if (context === undefined) {
    throw new Error('useTodolist must be used within a TodolistProvider')
  }
  return context
}
