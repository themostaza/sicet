"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Loader2 } from "lucide-react"
import { TooltipProvider } from "@/components/ui/tooltip"
import { createTodolist, createMultipleTasks } from "@/app/actions/actions-todolist"
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
    totalTodolistCount
  } = useTodolist()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
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
      // Creiamo una todolist per ogni combinazione di device, kpi e data
      const todolistPromises = []
      
      for (const deviceId of selectedDevices) {
        for (const kpiId of selectedKpis) {
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
      
      await Promise.all(todolistPromises)
      
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
          <Button 
            type="submit" 
            onClick={handleSubmit}
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