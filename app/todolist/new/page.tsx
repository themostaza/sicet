"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ArrowLeft, Loader2 } from "lucide-react"
import { TooltipProvider } from "@/components/ui/tooltip"
import { createTodolist, createMultipleTasks } from "@/app/actions/actions-todolist"
import { createAlert } from "@/app/actions/actions-alerts"
import { format } from "date-fns"
import { timeSlotToScheduledTime } from "@/components/todolist/new/types"
import { formatTimeSlotValue, isCustomTimeSlot, customTimeSlotToString } from "@/lib/validation/todolist-schemas"
import type { Device, KPI, DateTimeEntry, TimeSlotValue } from "@/components/todolist/new/types"

// Context
import { TodolistProvider, useTodolist } from "@/components/todolist/new/context"

// Components
import { DeviceSelection } from "@/components/todolist/new/deviceSelection"
import { KpiSelection } from "@/components/todolist/new/kpiSelection"
import { DateSelection } from "@/components/todolist/new/dateSelection"
import { Summary } from "@/components/todolist/new/summary"
import { DeviceSelectionSheet } from "@/components/todolist/new/deviceSelectionSheet"
import { KpiSelectionSheet } from "@/components/todolist/new/kpiSelectionSheet"
import { DateSelectionSheet } from "@/components/todolist/new/dateSelectionSheet"

// Main Content Component
function TodolistCreationForm() {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [creationProgress, setCreationProgress] = useState(0)
  const [createdCount, setCreatedCount] = useState(0)

  const {
    selectedDevices,
    selectedKpis,
    dateEntries,
    alertConditions,
    alertEmail,
    email,
    alertEnabled,
    devices,
    kpis,
    errors,
    setErrors,
    totalTodolistCount
  } = useTodolist()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return

    // Validazione
    const newErrors: {[key: string]: string} = {}
    
    if (selectedDevices.size === 0) {
      newErrors.devices = "Seleziona almeno un Punto di controllo"
    }
    
    if (selectedKpis.size === 0) {
      newErrors.kpis = "Seleziona almeno un Controllo"
    }
    
    if (dateEntries.length === 0) {
      newErrors.dates = "Seleziona almeno una data"
    }
    
    setErrors(newErrors)
    
    if (Object.keys(newErrors).length > 0) {
      return
    }

    // Reset progress
    setCreationProgress(0)
    setCreatedCount(0)

    // Creazione todolist
    setIsSubmitting(true)
    try {
      await createTodolistsAndAlerts()
    } catch (error) {
      console.error("Errore durante la creazione delle todolist:", error)
      toast({
        title: "Errore durante la creazione",
        description: "Si è verificato un errore durante la creazione delle todolist. Riprova più tardi.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const createTodolistsAndAlerts = async () => {
    const todolistResults = []
    let currentProgress = 0
    
    // Prima crea tutte le todolist (e tasks)
    for (const deviceId of selectedDevices) {
      for (const entry of dateEntries) {
        const kpiIds = Array.from(selectedKpis)
        // createMultipleTasks deve restituire l'id della todolist creata
        const todolist = await createMultipleTasks(
          deviceId,
          format(entry.date, "yyyy-MM-dd"),
          isCustomTimeSlot(entry.timeSlot) ? customTimeSlotToString(entry.timeSlot) : entry.timeSlot,
          kpiIds,
          alertEnabled,
          email,
          entry.category
        )
        todolistResults.push({ todolist, deviceId, kpiIds })
        
        // Update progress
        currentProgress++
        setCreatedCount(currentProgress)
        setCreationProgress((currentProgress / totalTodolistCount) * 100)
      }
    }

    // Poi crea gli alert KPI associati alle nuove todolist
    if (alertConditions.length > 0 && alertEmail) {
      // Converti le condizioni per assicurarsi che min e max siano numeri
      const convertedConditions = alertConditions.map(condition => ({
        ...condition,
        min: condition.min !== undefined ? Number(condition.min) : undefined,
        max: condition.max !== undefined ? Number(condition.max) : undefined
      }))
      
      for (const result of todolistResults) {
        for (const kpiId of result.kpiIds) {
          await createAlert(kpiId, result.todolist.id, alertEmail, convertedConditions)
        }
      }
    }

    const finalCreatedCount = todolistResults.length
    toast({
      title: "Todolist create con successo",
      description: `Sono state create ${finalCreatedCount} todolist`,
    })
    router.push("/todolist")
  }

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" asChild className="mr-2" disabled={isSubmitting}>
            <Link href="/todolist">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-xl font-semibold">Nuova Todolist</h1>
        </div>
        
        {totalTodolistCount > 0 && (
          <form onSubmit={handleSubmit}>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="relative"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creazione in corso...
                </>
              ) : (
                `Crea ${totalTodolistCount} todolist`
              )}
            </Button>
          </form>
        )}
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        <DeviceSelection />
        <KpiSelection />
        <DateSelection />
        <Summary />
      </div>
      
      <DeviceSelectionSheet />
      <KpiSelectionSheet />
      <DateSelectionSheet />

      {/* Progress Modal */}
      <Dialog open={isSubmitting} onOpenChange={(open) => {
        // Prevent closing the dialog during creation
        if (isSubmitting && !open) {
          return
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Creazione Todolist
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">
                Creazione todolist in corso...
              </p>
              <div className="flex items-center justify-center gap-2 text-lg font-semibold">
                <span>{createdCount}</span>
                <span className="text-muted-foreground">/</span>
                <span>{totalTodolistCount}</span>
              </div>
            </div>
            <Progress value={creationProgress} className="h-3" />
            <p className="text-xs text-center text-muted-foreground">
              {Math.round(creationProgress)}% completato
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function NewTodoListPage() {
  return (
    <TooltipProvider>
      <TodolistProvider>
        <TodolistCreationForm />
      </TodolistProvider>
    </TooltipProvider>
  )
}