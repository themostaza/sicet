"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { it } from "date-fns/locale"
import { useRouter } from "next/navigation"
import { getTimeSlotFromDateTime, customTimeSlotToString, minutesToTime } from "@/lib/validation/todolist-schemas"
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
    // For custom time slots, create the custom time slot object and convert to string
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
  } else {
    // For standard time slots, use the existing function
    return getTimeSlotFromDateTime(todolist.scheduled_execution)
  }
}

// Helper function to format time slot for display
const formatTimeSlotDisplay = (todolist: Todolist): string => {
  if (todolist.time_slot_type === "custom" && todolist.time_slot_start !== null && todolist.time_slot_end !== null) {
    const startTime = minutesToTime(todolist.time_slot_start)
    const endTime = minutesToTime(todolist.time_slot_end)
    const startStr = `${startTime.hour.toString().padStart(2, '0')}:${startTime.minute.toString().padStart(2, '0')}`
    const endStr = `${endTime.hour.toString().padStart(2, '0')}:${endTime.minute.toString().padStart(2, '0')}`
    return `Personalizzato (${startStr}-${endStr})`
  } else {
    const timeSlot = getTimeSlotFromDateTime(todolist.scheduled_execution)
    const timeSlotNames: Record<string, string> = {
      mattina: "Mattina",
      pomeriggio: "Pomeriggio",
      sera: "Sera",
      notte: "Notte",
      giornata: "Giornata"
    }
    return timeSlotNames[timeSlot] || timeSlot
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
        <CardTitle>Seleziona una todolist di oggi</CardTitle>
        <p className="text-sm text-muted-foreground">
          Mostra solo todolist non completate e non scadute
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {sortedTodolists.map((todolist) => {
          const timeSlotString = getTimeSlotString(todolist)
          const timeSlotDisplay = formatTimeSlotDisplay(todolist)
          const formattedTime = format(new Date(todolist.scheduled_execution), "HH:mm", { locale: it })
          
          return (
            <Button
              key={todolist.id}
              variant="outline"
              className="w-full justify-between"
              onClick={() => router.push(`/todolist/view/${todolist.id}/${deviceId}/${today}/${timeSlotString}`)}
            >
              <div className="flex items-center gap-2">
                <span className="capitalize">{timeSlotDisplay}</span>
                <span className="text-muted-foreground">({formattedTime})</span>
              </div>
              <Badge className={statusColors[todolist.status]}>
                {statusLabels[todolist.status]}
              </Badge>
            </Button>
          )
        })}
      </CardContent>
    </Card>
  )
} 