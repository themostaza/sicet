"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { toast } from "@/components/ui/use-toast"
import { getDeviceTags, getDevicesByTags } from "@/app/actions/actions-device"

export interface Device {
  id: string
  name: string
  location?: string
  tags?: string[]
}

export interface KPI {
  id: string
  name: string
  description?: string
  value?: any
}

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
  
  // Excel mappings
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
  
  // Device tags
  const [allTags, setAllTags] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [tagFilterMode, setTagFilterMode] = useState<'OR' | 'AND'>('OR')
  const [filteredDevices, setFilteredDevices] = useState<Device[]>([])
  const [tagLoading, setTagLoading] = useState(false)
  
  // UI state
  const [isDeviceSheetOpen, setIsDeviceSheetOpen] = useState(false)
  const [isKpiSheetOpen, setIsKpiSheetOpen] = useState(false)
  
  // Excel mappings
  const [mappings, setMappings] = useState<{[key: string]: string}>({})
  
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
  
  // Computed values
  const selectedDevicesArray = devices.filter(device => selectedDevices.has(device.id))
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
    
    // Excel mappings
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
