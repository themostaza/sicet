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
    setControlPoints,
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

        console.log('Loading report data:', report) // Debug

        // Set report name
        setReportName(report.name || "")

        // Carica la struttura controlPoints
        if (report.todolist_params_linked?.controlPoints) {
          const loadedControlPoints = report.todolist_params_linked.controlPoints
          
          console.log('Loaded controlPoints from DB:', loadedControlPoints)
          
          // Converti in formato corretto per lo stato
          const formattedControlPoints = loadedControlPoints.map((cp: {
            id?: string;
            name?: string;
            deviceId?: string;
            controls?: unknown[];
            kpiIds?: string[]; // VECCHIA STRUTTURA
            order?: number;
          }, cpIndex: number) => {
            
            // MIGRAZIONE: Se ha kpiIds (vecchia struttura), converti in controls (nuova struttura)
            let controls = []
            if (cp.controls && Array.isArray(cp.controls) && cp.controls.length > 0) {
              // NUOVA STRUTTURA: usa controls direttamente
              controls = cp.controls.map((ctrl: unknown, ctrlIdx: number) => {
                const c = ctrl as {
                  id?: string;
                  kpiId?: string;
                  fieldId?: string;
                  name?: string;
                  kpiName?: string;
                  fieldName?: string;
                  order?: number;
                }
                return {
                  id: c.id || `ctrl-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                  kpiId: c.kpiId || '',
                  fieldId: c.fieldId || '',
                  name: c.name || '',
                  kpiName: c.kpiName || '',
                  fieldName: c.fieldName || '',
                  order: c.order ?? ctrlIdx
                }
              })
            } else if (cp.kpiIds && Array.isArray(cp.kpiIds) && cp.kpiIds.length > 0) {
              // VECCHIA STRUTTURA: converti kpiIds in controls
              console.warn('⚠️ Migrating old structure (kpiIds) to new structure (controls) for control point:', cp.name)
              
              controls = cp.kpiIds.map((kpiId: string, idx: number) => {
                const kpi = kpis.find(k => k.id === kpiId)
                
                // Determina il fieldId per questo KPI
                let fieldId = `${kpiId}-value`
                let fieldName = kpi?.name || 'Campo'
                
                if (kpi?.value) {
                  if (Array.isArray(kpi.value) && kpi.value.length > 0) {
                    const firstField = kpi.value[0]
                    fieldId = firstField.id || `${kpiId}-${String(firstField.name || '').toLowerCase().replace(/\s+/g, '_')}`
                    fieldName = firstField.name || fieldName
                  } else if (typeof kpi.value === 'object' && !Array.isArray(kpi.value)) {
                    const v = kpi.value as { id?: string; name?: string }
                    fieldId = v.id || `${kpiId}-${String(v.name || 'value').toLowerCase().replace(/\s+/g, '_')}`
                    fieldName = v.name || fieldName
                  }
                }
                
                return {
                  id: `ctrl-migrated-${kpiId}-${idx}`,
                  kpiId: kpiId,
                  fieldId: fieldId,
                  name: `${kpi?.name || 'KPI'} - ${fieldName}`,
                  kpiName: kpi?.name || 'KPI',
                  fieldName: fieldName,
                  order: idx
                }
              })
            }
            
            return {
              id: cp.id || `cp-${Date.now()}-${Math.random().toString(36).substring(7)}`,
              name: cp.name || '',
              deviceId: cp.deviceId || '',
              controls: controls,
              order: cp.order ?? cpIndex
            }
          })

          console.log('Setting formatted controlPoints:', formattedControlPoints)
          setControlPoints(formattedControlPoints)
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
  }, [reportId, devices.length, kpis.length, setReportName, setControlPoints])

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
