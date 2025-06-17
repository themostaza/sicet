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
    // Create alerts if conditions are set
    const alertPromises = []
    const todolistPromises = []
    
    for (const deviceId of selectedDevices) {
      // Create alerts for each KPI if conditions are set
      if (alertConditions.length > 0 && alertEmail) {
        for (const kpiId of selectedKpis) {
          console.log(`Queueing alert creation for KPI ${kpiId} and device ${deviceId}`)
          alertPromises.push(
            createAlert(kpiId, deviceId, alertEmail, alertConditions)
          )
        }
      }

      // Create todolists for each date and KPI
      for (const entry of dateEntries) {
        for (const kpiId of selectedKpis) {
          todolistPromises.push(
            createTodolist(
              deviceId,
              format(entry.date, "yyyy-MM-dd"),
              isCustomTimeSlot(entry.timeSlot) ? customTimeSlotToString(entry.timeSlot) : entry.timeSlot,
              kpiId,
              alertEnabled,
              email
            )
          )
        }
      }
    }
    
    // First create all alerts, then create all todolists
    if (alertPromises.length > 0) {
      console.log(`Waiting for ${alertPromises.length} alerts to be created...`)
      await Promise.all(alertPromises)
      console.log('All alerts created successfully')
    }
    
    console.log(`Creating ${todolistPromises.length} todolists...`)
    await Promise.all(todolistPromises)
    console.log('All todolists created successfully')
    
    const createdCount = todolistPromises.length
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