"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { it } from "date-fns/locale"
import { useRouter } from "next/navigation"
import { getTimeSlotFromDateTime } from "@/lib/validation/todolist-schemas"
import { Badge } from "@/components/ui/badge"

type Todolist = {
  id: string
  device_id: string
  scheduled_execution: string
  status: "pending" | "in_progress" | "completed"
  created_at: string
  time_slot_type: "standard" | "custom"
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
          <CardTitle>Nessuna todolist disponibile oggi</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Non ci sono todolist non completate e non scadute per oggi.
          </p>
        </CardContent>
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
          const timeSlot = getTimeSlotFromDateTime(todolist.scheduled_execution)
          const formattedTime = format(new Date(todolist.scheduled_execution), "HH:mm", { locale: it })
          
          return (
            <Button
              key={todolist.id}
              variant="outline"
              className="w-full justify-between"
              onClick={() => router.push(`/todolist/view/${todolist.id}/${deviceId}/${today}/${timeSlot}`)}
            >
              <div className="flex items-center gap-2">
                <span className="capitalize">{timeSlot}</span>
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