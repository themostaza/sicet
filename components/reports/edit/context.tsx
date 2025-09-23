"use client"

import React, { createContext, useContext, useEffect, ReactNode } from "react"
import { useParams } from "next/navigation"
import { toast } from "@/components/ui/use-toast"
import { useReport } from "@/components/reports/new/context"

interface EditReportContextType {
  isLoading: boolean
  reportId: string | null
}

const EditReportContext = createContext<EditReportContextType | undefined>(undefined)

interface EditReportProviderProps {
  children: ReactNode
}

export function EditReportProvider({ children }: EditReportProviderProps) {
  const params = useParams()
  const reportId = params.id as string
  const [isLoading, setIsLoading] = React.useState(true)
  
  const {
    setReportName,
    setSelectedDevices,
    setSelectedKpis,
    setMappings,
    devices,
    kpis
  } = useReport()

  // Load existing report data
  useEffect(() => {
    const loadReportData = async () => {
      if (!reportId) return
      
      setIsLoading(true)
      try {
        const response = await fetch(`/api/reports/${reportId}`)
        if (!response.ok) {
          throw new Error('Failed to fetch report')
        }
        
        const data = await response.json()
        const report = data.report
        
        if (!report) {
          throw new Error('Report not found')
        }

        // Set report name
        setReportName(report.name || "")

        // Extract devices and KPIs from todolist_params_linked
        if (report.todolist_params_linked?.controlPoints) {
          const controlPoints = report.todolist_params_linked.controlPoints
          
          // Get unique device IDs
          const deviceIds = new Set<string>()
          const kpiIds = new Set<string>()
          
          controlPoints.forEach((cp: any) => {
            if (cp.deviceId) {
              deviceIds.add(cp.deviceId)
            }
            if (cp.kpiIds && Array.isArray(cp.kpiIds)) {
              cp.kpiIds.forEach((kpiId: string) => kpiIds.add(kpiId))
            }
          })
          
          setSelectedDevices(deviceIds)
          setSelectedKpis(kpiIds)
        }

        // Extract mappings from mapping_excel
        if (report.mapping_excel?.mappings) {
          const mappingsObj: {[key: string]: string} = {}
          
          report.mapping_excel.mappings.forEach((mapping: any) => {
            if (mapping.deviceId && mapping.fieldId && mapping.cellPosition) {
              const key = `${mapping.deviceId}-${mapping.fieldId}`
              mappingsObj[key] = mapping.cellPosition
            }
          })
          
          setMappings(mappingsObj)
        }

      } catch (error) {
        console.error('Error loading report:', error)
        toast({
          title: "Errore",
          description: "Impossibile caricare il report. Riprova più tardi.",
          variant: "destructive"
        })
      } finally {
        setIsLoading(false)
      }
    }

    // Wait for devices and KPIs to be loaded first
    if (devices.length > 0 && kpis.length > 0) {
      loadReportData()
    }
  }, [reportId, devices.length, kpis.length, setReportName, setSelectedDevices, setSelectedKpis, setMappings])

  const value: EditReportContextType = {
    isLoading,
    reportId
  }

  return (
    <EditReportContext.Provider value={value}>
      {children}
    </EditReportContext.Provider>
  )
}

export function useEditReport() {
  const context = useContext(EditReportContext)
  if (context === undefined) {
    throw new Error('useEditReport must be used within a EditReportProvider')
  }
  return context
}
