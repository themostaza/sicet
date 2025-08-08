"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { it } from "date-fns/locale"
import { useRouter } from "next/navigation"
import { getTimeSlotFromDateTime, customTimeSlotToString, minutesToTime, getTodolistDeadlineDisplay, isTodolistInGracePeriod } from "@/lib/validation/todolist-schemas"
import { Badge } from "@/components/ui/badge"

type Todolist = {
  id: string
  device_id: string
  scheduled_execution: string
  status: "pending" | "in_progress" | "completed"
  created_at: string
  time_slot_type: "standard" | "custom"
  time_slot_start: number | null
  time_slot_end: number | null
  todolist_category?: string | null
}

type TodolistSelectorProps = {
  todolists: Todolist[]
  deviceId: string
  today: string
}

const statusColors = {
  pending: "bg-yellow-500",
  in_progress: "bg-blue-500",
  completed: "bg-green-500"
}

const statusLabels = {
  pending: "In attesa",
  in_progress: "In corso",
  completed: "Completata"
}

// Helper function to get time slot string for URL
const getTimeSlotString = (todolist: Todolist): string => {
  if (todolist.time_slot_type === "custom" && todolist.time_slot_start !== null && todolist.time_slot_end !== null) {
    // Custom time slot - convert to string
    const startTime = minutesToTime(todolist.time_slot_start)
    const endTime = minutesToTime(todolist.time_slot_end)
    const customSlot = {
      type: "custom" as const,
      startHour: startTime.hour,
      startMinute: startTime.minute,
      endHour: endTime.hour,
      endMinute: endTime.minute
    }
    return customTimeSlotToString(customSlot)
  } else if (todolist.time_slot_type === "standard" && todolist.time_slot_start !== null && todolist.time_slot_end !== null) {
    // Standard time slot - reconstruct from stored values
    const startTime = minutesToTime(todolist.time_slot_start)
    const endTime = minutesToTime(todolist.time_slot_end)
    
    // Map to standard time slot string
    if (startTime.hour === 6 && endTime.hour === 14) {
      return "mattina"
    } else if (startTime.hour === 14 && endTime.hour === 22) {
      return "pomeriggio"
    } else if (startTime.hour === 22 && endTime.hour === 6) {
      return "notte"
    } else if (startTime.hour === 7 && endTime.hour === 17) {
      return "giornata"
    } else {
      // Fallback to custom string
      const customSlot = {
        type: "custom" as const,
        startHour: startTime.hour,
        startMinute: startTime.minute,
        endHour: endTime.hour,
        endMinute: endTime.minute
      }
      return customTimeSlotToString(customSlot)
    }
  } else {
    // Fallback for old data - reconstruct from scheduled_execution
    return getTimeSlotFromDateTime(todolist.scheduled_execution)
  }
}

// Helper function to format time slot for display
const formatTimeSlotDisplay = (todolist: Todolist): string => {
  if (todolist.time_slot_type === "custom" && todolist.time_slot_start !== null && todolist.time_slot_end !== null) {
    // Custom time slot
    const startTime = minutesToTime(todolist.time_slot_start)
    const endTime = minutesToTime(todolist.time_slot_end)
    const startStr = `${startTime.hour.toString().padStart(2, '0')}:${startTime.minute.toString().padStart(2, '0')}`
    const endStr = `${endTime.hour.toString().padStart(2, '0')}:${endTime.minute.toString().padStart(2, '0')}`
    return `Personalizzato (${startStr}-${endStr})`
  } else if (todolist.time_slot_type === "standard" && todolist.time_slot_start !== null && todolist.time_slot_end !== null) {
    // Standard time slot - reconstruct from stored values
    const startTime = minutesToTime(todolist.time_slot_start)
    const endTime = minutesToTime(todolist.time_slot_end)
    
    const timeSlotNames: Record<string, string> = {
      mattina: "Mattina",
      pomeriggio: "Pomeriggio",
      notte: "Notte",
      giornata: "Giornata"
    }
    
    // Map to standard time slot name
    if (startTime.hour === 6 && endTime.hour === 14) {
      return timeSlotNames.mattina
    } else if (startTime.hour === 14 && endTime.hour === 22) {
      return timeSlotNames.pomeriggio
    } else if (startTime.hour === 22 && endTime.hour === 6) {
      return timeSlotNames.notte
    } else if (startTime.hour === 7 && endTime.hour === 17) {
      return timeSlotNames.giornata
    } else {
      // Fallback to custom display
      const startStr = `${startTime.hour.toString().padStart(2, '0')}:${startTime.minute.toString().padStart(2, '0')}`
      const endStr = `${endTime.hour.toString().padStart(2, '0')}:${endTime.minute.toString().padStart(2, '0')}`
      return `Personalizzato (${startStr}-${endStr})`
    }
  } else {
    // Fallback for old data
    const timeSlot = getTimeSlotFromDateTime(todolist.scheduled_execution)
    const timeSlotNames: Record<string, string> = {
      mattina: "Mattina",
      pomeriggio: "Pomeriggio",
      notte: "Notte",
      giornata: "Giornata"
    }
    return timeSlotNames[timeSlot] || "Custom"
  }
}

export function TodolistSelector({ todolists, deviceId, today }: TodolistSelectorProps) {
  const router = useRouter()

  // Ordina per data di esecuzione (le todolist scadute sono già filtrate)
  const sortedTodolists = [...todolists].sort((a, b) => {
    return new Date(a.scheduled_execution).getTime() - new Date(b.scheduled_execution).getTime()
  })

  if (todolists.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Nessuna todolist da eseguire</CardTitle>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Seleziona una todolist attiva</CardTitle>
        <p className="text-sm text-muted-foreground">
          Mostra solo todolist già iniziate e non ancora scadute
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {sortedTodolists.map((todolist) => {
          const timeSlotString = getTimeSlotString(todolist)
          const timeSlotDisplay = formatTimeSlotDisplay(todolist)
          
          // Calcola l'orario di deadline reale (senza tolleranza)
          const deadline = getTodolistDeadlineDisplay(todolist.scheduled_execution, todolist.time_slot_end)
          const deadlineTime = deadline ? format(deadline, "HH:mm", { locale: it }) : null
          
          // Verifica se è in periodo di grazia
          const isInGracePeriod = isTodolistInGracePeriod(
            todolist.scheduled_execution,
            todolist.time_slot_start,
            todolist.time_slot_end,
            todolist.status
          )
          
          return (
            <Button
              key={todolist.id}
              variant="outline"
              className="w-full justify-between"
              onClick={() => router.push(`/todolist/view/${todolist.id}/${deviceId}/${today}/${timeSlotString}`)}
            >
              <div className="flex flex-col items-start gap-1">
                <div className="flex items-center gap-2">
                  <span className="capitalize">{timeSlotDisplay}</span>
                  {deadlineTime && (
                    <span className="text-muted-foreground">
                      (scade alle {deadlineTime})
                    </span>
                  )}
                </div>
                {todolist.todolist_category && (
                  <Badge variant="outline" className="text-xs py-0 px-1 h-4">
                    {todolist.todolist_category}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {isInGracePeriod ? (
                  <Badge variant="destructive" className="text-xs">
                    In scadenza
                  </Badge>
                ) : (
                  <Badge className={statusColors[todolist.status]}>
                    {statusLabels[todolist.status]}
                  </Badge>
                )}
              </div>
            </Button>
          )
        })}
      </CardContent>
    </Card>
  )
} 