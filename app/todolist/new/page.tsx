"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
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
          email
        )
        todolistResults.push({ todolist, deviceId, kpiIds })
      }
    }

    // Poi crea gli alert KPI associati alle nuove todolist
    if (alertConditions.length > 0 && alertEmail) {
      for (const result of todolistResults) {
        for (const kpiId of result.kpiIds) {
          await createAlert(kpiId, result.todolist.id, alertEmail, alertConditions)
        }
      }
    }

    const createdCount = todolistResults.length
    toast({
      title: "Todolist create con successo",
      description: `Sono state create ${createdCount} todolist`,
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