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
import { HierarchicalReportSummary } from "@/components/reports/new/hierarchicalSummary"

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
    controlPoints,
    errors,
    setErrors,
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

    if (controlPoints.length === 0) {
      newErrors.controlPoints = "Aggiungi almeno un punto di controllo"
    }

    // Verifica che ogni control point abbia almeno un controllo
    const controlPointsWithoutControls = controlPoints.filter(cp => cp.controls.length === 0)
    if (controlPointsWithoutControls.length > 0) {
      newErrors.controlPointsEmpty = `Alcuni punti di controllo non hanno controlli configurati: ${controlPointsWithoutControls.map(cp => cp.name).join(', ')}`
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
    console.log('🔄 Updating report with controlPoints:', controlPoints)
    
    // Usa direttamente i controlPoints dalla nuova struttura
    const todolistParamsLinked = {
      controlPoints: controlPoints.map((cp, index) => ({
        id: cp.id,
        name: cp.name,
        deviceId: cp.deviceId,
        controls: cp.controls.map((ctrl, ctrlIndex) => ({
          id: ctrl.id,
          kpiId: ctrl.kpiId,
          fieldId: ctrl.fieldId,
          name: ctrl.name,
          kpiName: ctrl.kpiName,
          fieldName: ctrl.fieldName,
          order: ctrlIndex
        })),
        order: index
      }))
    }

    console.log('📤 Sending to API:', {
      name: reportName.trim(),
      todolist_params_linked: todolistParamsLinked,
      mapping_excel: null
    })

    // Il mapping_excel non è più necessario con la nuova struttura
    const response = await fetch(`/api/reports/${reportId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: reportName.trim(),
        todolist_params_linked: todolistParamsLinked,
        mapping_excel: null
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
        
        {controlPoints.length > 0 && (
          <form onSubmit={handleSubmit}>
            <Button 
              type="submit" 
              disabled={
                isSubmitting || 
                !reportName.trim() || 
                controlPoints.length === 0 ||
                controlPoints.some(cp => cp.controls.length === 0)
              }
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
        
        {/* Seconda riga: Configurazione gerarchica punti di controllo e controlli */}
        <HierarchicalReportSummary />
      </div>

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
