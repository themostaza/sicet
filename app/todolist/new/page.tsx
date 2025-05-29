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
  const {
    selectedDevices,
    dateEntries,
    selectedKpis,
    errors,
    isSubmitting,
    setErrors,
    setIsSubmitting,
    totalTodolistCount,
    alertConditions,
    alertEmail
  } = useTodolist()

  // Add a ref to track if submission is in progress
  const isSubmittingRef = useRef(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Prevent double submission
    if (isSubmittingRef.current) {
      console.log('Preventing double submission')
      return
    }
    isSubmittingRef.current = true
    
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
      isSubmittingRef.current = false
      return
    }
    
    // Creazione todolist
    setIsSubmitting(true)
    try {
      // Log alert conditions
      console.log('Starting todolist creation with alerts:', {
        hasAlertConditions: alertConditions.length > 0,
        alertConditionsCount: alertConditions.length,
        alertEmail,
        selectedDevicesCount: selectedDevices.size,
        selectedKpisCount: selectedKpis.size,
        dateEntriesCount: dateEntries.length,
        totalTodolistCount
      })

      // Creiamo una todolist per ogni combinazione di device, kpi e data
      const todolistPromises = []
      const alertPromises = []
      
      for (const deviceId of selectedDevices) {
        for (const kpiId of selectedKpis) {
          // Create alerts if conditions are set
          if (alertConditions.length > 0 && alertEmail) {
            console.log(`Queueing alert creation for KPI ${kpiId} and device ${deviceId}`)
            alertPromises.push(
              createAlert(kpiId, deviceId, alertEmail, alertConditions)
                .then(() => {
                  console.log(`Successfully created alert for KPI ${kpiId} and device ${deviceId}`)
                })
                .catch(error => {
                  console.error(`Error creating alert for KPI ${kpiId} and device ${deviceId}:`, error)
                  toast({
                    title: "Errore nella creazione dell'alert",
                    description: `Impossibile creare l'alert per il controllo ${kpiId}. Riprova più tardi.`,
                    variant: "destructive",
                  })
                })
            )
          }

          for (const entry of dateEntries) {
            todolistPromises.push(
              createTodolist(
                deviceId,
                format(entry.date, "yyyy-MM-dd"),
                entry.timeSlot,
                kpiId
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
      
      toast({
        title: "Todolist create con successo",
        description: `Sono state create ${totalTodolistCount} todolist`,
      })
      
      router.push("/todolist")
    } catch (error) {
      console.error("Errore durante la creazione delle todolist:", error)
      toast({
        title: "Errore durante la creazione",
        description: "Si è verificato un errore durante la creazione delle todolist. Riprova più tardi.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
      isSubmittingRef.current = false
    }
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