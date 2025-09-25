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

        console.log('Loading report data:', report) // Debug

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
          console.log('Raw mapping_excel from DB:', report.mapping_excel) // Debug
          const mappingsObj: {[key: string]: string} = {}
          
          // Prepara mappa KPI -> possibili fieldId e defaultFieldId, così la normalizzazione segue lo schema reale
          const kpiToFieldInfo = new Map<string, { fieldIds: Set<string>, defaultFieldId: string }>()
          try {
            kpis.forEach((k: any) => {
              const fieldIds: string[] = []
              if (k?.value && Array.isArray(k.value) && k.value.length > 0) {
                k.value.forEach((f: any) => {
                  const fid = f?.id || `${k.id}-${String(f?.name || '').toLowerCase().replace(/\s+/g, '_')}`
                  fieldIds.push(String(fid))
                })
              } else if (k?.value && typeof k.value === 'object' && !Array.isArray(k.value)) {
                const v = k.value as any
                const fid = v?.id || `${k.id}-${String(v?.name || 'value').toLowerCase().replace(/\s+/g, '_')}`
                fieldIds.push(String(fid))
              } else {
                fieldIds.push(`${k.id}-value`)
              }
              const preferred = fieldIds.includes(`${k.id}-value`) ? `${k.id}-value` : fieldIds[0]
              kpiToFieldInfo.set(String(k.id), { fieldIds: new Set(fieldIds), defaultFieldId: preferred })
            })
          } catch (e) {
            console.warn('Failed computing KPI fieldId map for normalization', e)
          }
          
          report.mapping_excel.mappings.forEach((mapping: any) => {
            // Normalizza in modo che la chiave corrisponda a quella usata dalla griglia: deviceId-fieldId
            // Se manca fieldId ma abbiamo controlId che è un KPI id, mappiamo a `${kpiId}-value`
            let fieldId = ''
            if (mapping.fieldId) {
              fieldId = String(mapping.fieldId)
              if (!fieldId.includes('-')) {
                // fieldId potrebbe essere in realtà un KPI id semplice: normalizza al default field id
                const info = kpiToFieldInfo.get(fieldId)
                if (info) {
                  fieldId = info.defaultFieldId
                }
              }
            } else if (mapping.controlId) {
              const controlId = String(mapping.controlId)
              if (controlId.includes('-')) {
                // già in formato composito (es. KPIID-value o KPIID-sottoCampo)
                fieldId = controlId
              } else {
                // potrebbe essere un KPI id semplice o un fieldId semplice
                const info = kpiToFieldInfo.get(controlId)
                if (info) {
                  // è un KPI id: usa il default field id definito dallo schema KPI
                  fieldId = info.defaultFieldId
                } else {
                  // non è un KPI id noto: fallback al controlId
                  fieldId = controlId
                }
              }
            }

            const deviceId = mapping.deviceId ? String(mapping.deviceId) : ''
            const key = deviceId && fieldId ? `${deviceId}-${fieldId}` : ''
            
            if (key && mapping.cellPosition) {
              const cell = String(mapping.cellPosition).toUpperCase()
              mappingsObj[key] = cell
              console.log(`Mapping loaded (normalized): ${key} -> ${cell}`) // Debug specifico
            }
          })
          
          console.log('Loaded mappings:', mappingsObj) // Debug
          
          // Imposta i mappings direttamente
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
