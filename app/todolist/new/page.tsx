"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
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
      newErrors.devices = "Seleziona almeno un dispositivo"
    }
    
    if (selectedKpis.size === 0) {
      newErrors.kpis = "Seleziona almeno un KPI"
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
      const promises = []
      
      for (const deviceId of selectedDevices) {
        const kpiIds = Array.from(selectedKpis)
        
        for (const entry of dateEntries) {
          // Format the date as a string instead of passing a Date object
          const formattedDate = format(entry.date, "yyyy-MM-dd")
          
          // Usa createMultipleTasks quando abbiamo più KPI
          if (kpiIds.length > 1) {
            promises.push(createMultipleTasks(deviceId, formattedDate, entry.timeSlot, kpiIds))
          } 
          // Usa createTodolist per un singolo KPI
          else if (kpiIds.length === 1) {
            promises.push(createTodolist(deviceId, formattedDate, entry.timeSlot, kpiIds[0]))
          }
        }
      }

      await Promise.all(promises)

      toast({
        title: "Todolist create",
        description: `${totalTodolistCount} todolist sono state create con successo.`,
        variant: "default",
      })

      router.push("/todolist")
    } catch (error) {
      console.error("Errore durante la creazione delle todolist:", error)
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante la creazione delle todolist.",
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
          <Button variant="ghost" size="icon" asChild className="mr-2">
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
          >
            Crea {totalTodolistCount} todolist
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