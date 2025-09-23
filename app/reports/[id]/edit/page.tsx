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
    const mappingExcel = {
      mappings: Object.entries(mappings).map(([key, cellPosition]) => {
        const [deviceId, fieldId] = key.split('-', 2) // Usa split con limit per gestire fieldId con trattini
        const device = devices.find(d => d.id === deviceId)
        
        // Trova il KPI e il campo corrispondente
        let kpiName = 'Unknown KPI'
        let fieldName = 'Unknown Field'
        
        for (const kpi of kpis) {
          if (kpi.value && Array.isArray(kpi.value)) {
            const field = kpi.value.find((f: any) => {
              const fId = f.id || `${kpi.id}-${String(f.name || '').toLowerCase().replace(/\s+/g, '_')}`
              return fId === fieldId
            })
            if (field) {
              kpiName = kpi.name
              fieldName = field.name || 'Campo'
              break
            }
          } else if (fieldId === `${kpi.id}-value`) {
            kpiName = kpi.name
            fieldName = 'Valore'
            break
          }
        }
        
        return {
          controlId: fieldId,
          cellPosition: cellPosition,
          label: `${device?.name || deviceId} - ${kpiName} - ${fieldName}`,
          deviceId: deviceId,
          deviceName: device?.name || deviceId,
          kpiName: kpiName,
          fieldName: fieldName,
          fieldId: fieldId
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
