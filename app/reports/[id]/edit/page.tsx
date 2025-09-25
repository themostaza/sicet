"use client"

import { useState, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ArrowLeft, Loader2 } from "lucide-react"
import { TooltipProvider } from "@/components/ui/tooltip"

// Context
import { ReportProvider, useReport } from "@/components/reports/new/context"

// Components
import { ReportNameSection } from "@/components/reports/new/reportNameSection"
import { DeviceSelection } from "@/components/reports/new/deviceSelection"
import { KpiSelection } from "@/components/reports/new/kpiSelection"
import { ReportSummary } from "@/components/reports/new/summary"
import { DeviceSelectionSheet } from "@/components/reports/new/deviceSelectionSheet"
import { KpiSelectionSheet } from "@/components/reports/new/kpiSelectionSheet"

// Edit Context Wrapper
import { EditReportProvider, useEditReport } from "@/components/reports/edit/context"

// Main Content Component
function ReportEditForm() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    reportName,
    selectedDevices,
    selectedKpis,
    selectedKpisArray,
    devices,
    kpis,
    mappings,
    errors,
    setErrors,
    totalControlPointsCount
  } = useReport()

  const { isLoading, reportId } = useEditReport()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return

    // Validazione
    const newErrors: {[key: string]: string} = {}
    
    if (!reportName.trim()) {
      newErrors.name = "Il nome del report è obbligatorio"
    }
    
    if (selectedDevices.size === 0) {
      newErrors.devices = "Seleziona almeno un dispositivo"
    }
    
    if (selectedKpis.size === 0) {
      newErrors.kpis = "Seleziona almeno un KPI"
    }

    if (Object.keys(mappings).length === 0) {
      newErrors.mappings = "Configura almeno una mappatura Excel"
    }
    
    setErrors(newErrors)
    
    if (Object.keys(newErrors).length > 0) {
      return
    }

    // Aggiornamento report
    setIsSubmitting(true)
    try {
      await updateReport()
    } catch (error) {
      console.error("Errore durante l'aggiornamento del report:", error)
      toast({
        title: "Errore durante l'aggiornamento",
        description: "Si è verificato un errore durante l'aggiornamento del report. Riprova più tardi.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Helper function per replicare la logica di getAllKpiFields
  const getAllKpiFields = () => {
    const fields: Array<{
      kpiId: string
      kpiName: string
      fieldId: string
      fieldName: string
      fieldType: string
      fieldDescription?: string
      fieldRequired: boolean
    }> = []

    selectedKpisArray.forEach((kpi: any) => {
      // Gestisci il caso in cui kpi.value è un array con campi multipli
      if (kpi.value && Array.isArray(kpi.value) && kpi.value.length > 0) {
        kpi.value.forEach((field: any, index: number) => {
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
      } 
      // Gestisci il caso in cui kpi.value è un singolo oggetto
      else if (kpi.value && typeof kpi.value === 'object' && kpi.value !== null && !Array.isArray(kpi.value)) {
        const valueObj = kpi.value as any
        fields.push({
          kpiId: kpi.id,
          kpiName: kpi.name,
          fieldId: valueObj.id || `${kpi.id}-${String(valueObj.name || 'value').toLowerCase().replace(/\s+/g, '_')}`,
          fieldName: valueObj.name || kpi.name,
          fieldType: valueObj.type || 'text',
          fieldDescription: valueObj.description || kpi.description,
          fieldRequired: valueObj.required || false
        })
      }
      // Se non ha campi specifici o value è null/undefined, crea un campo default
      else {
        fields.push({
          kpiId: kpi.id,
          kpiName: kpi.name,
          fieldId: `${kpi.id}-value`,
          fieldName: kpi.name, // Usa il nome del KPI come fallback
          fieldType: 'text',
          fieldDescription: kpi.description,
          fieldRequired: true
        })
      }
    })

    return fields
  }

  const updateReport = async () => {
    // Costruisci i control points dal formato richiesto
    const controlPoints = Array.from(selectedDevices).map((deviceId, index) => ({
      id: `${Date.now()}-${index}`,
      name: devices.find(d => d.id === deviceId)?.name || `Dispositivo ${index + 1}`,
      deviceId: deviceId,
      kpiIds: Array.from(selectedKpis),
      categories: [],
      timeSlots: ["standard"]
    }))

    const todolistParamsLinked = {
      controlPoints: controlPoints
    }

    // Costruisci il mapping_excel dal formato richiesto
    // Filtra solo le mappature che hanno effettivamente un valore
    const allKpiFields = getAllKpiFields()
    
    const mappingExcel = {
      mappings: Object.entries(mappings)
        .filter(([key, cellPosition]) => cellPosition && cellPosition.trim())
        .map(([key, cellPosition]) => {
        // Il key è nel formato: deviceId-kpiId-fieldName
        // Dividiamo solo sul primo trattino per separare deviceId dal resto
        const firstDashIndex = key.indexOf('-')
        const deviceId = key.substring(0, firstDashIndex)
        const fieldId = key.substring(firstDashIndex + 1) // Questo conterrà "kpiId-fieldName"
        const device = devices.find(d => d.id === deviceId)
        
        // Trova il campo corrispondente usando la lista generata da getAllKpiFields
        const matchingField = allKpiFields.find(field => field.fieldId === fieldId)
        
        if (matchingField) {
          return {
            controlId: fieldId,
            cellPosition: cellPosition,
            label: `${device?.name || deviceId} - ${matchingField.kpiName} - ${matchingField.fieldName}`,
            deviceId: deviceId,
            deviceName: device?.name || deviceId,
            kpiName: matchingField.kpiName,
            kpiId: matchingField.kpiId,
            fieldName: matchingField.fieldName,
            fieldId: fieldId
          }
        } else {
          // Fallback per campi non trovati
          return {
            controlId: fieldId,
            cellPosition: cellPosition,
            label: `${device?.name || deviceId} - Unknown KPI - Unknown Field`,
            deviceId: deviceId,
            deviceName: device?.name || deviceId,
            kpiName: 'Unknown KPI',
            kpiId: 'Unknown KPI ID',
            fieldName: 'Unknown Field',
            fieldId: fieldId
          }
        }
      })
    }

    const response = await fetch(`/api/reports/${reportId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: reportName.trim(),
        todolist_params_linked: todolistParamsLinked,
        mapping_excel: mappingExcel
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to update report')
    }

    toast({
      title: "Report aggiornato",
      description: `Il report "${reportName}" è stato aggiornato con successo.`,
    })
    
    router.push("/reports")
  }

  if (isLoading) {
    return (
      <div className="container py-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Caricamento report...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" asChild className="mr-2" disabled={isSubmitting}>
            <Link href="/reports">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-xl font-semibold">Modifica Report</h1>
        </div>
        
        {totalControlPointsCount > 0 && Object.keys(mappings).length > 0 && (
          <form onSubmit={handleSubmit}>
            <Button 
              type="submit" 
              disabled={isSubmitting || !reportName.trim() || Object.keys(mappings).length === 0}
              className="relative"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Aggiornamento in corso...
                </>
              ) : (
                `Aggiorna Report`
              )}
            </Button>
          </form>
        )}
      </div>
      
      <div className="space-y-6">
        {/* Prima riga: Nome del report */}
        <ReportNameSection />
        
        {/* Seconda riga: Device e KPI su 2 colonne */}
        <div className="grid gap-6 md:grid-cols-2">
          <DeviceSelection />
          <KpiSelection />
        </div>
        
        {/* Terza riga: Tabella di mappatura a larghezza piena */}
        <ReportSummary />
      </div>
      
      <DeviceSelectionSheet />
      <KpiSelectionSheet />

      {/* Progress Modal */}
      <Dialog open={isSubmitting} onOpenChange={(open) => {
        // Prevent closing the dialog during update
        if (isSubmitting && !open) {
          return
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Aggiornamento Report
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">
                Aggiornamento report in corso...
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function EditReportPage() {
  return (
    <TooltipProvider>
      <ReportProvider>
        <EditReportProvider>
          <ReportEditForm />
        </EditReportProvider>
      </ReportProvider>
    </TooltipProvider>
  )
}
