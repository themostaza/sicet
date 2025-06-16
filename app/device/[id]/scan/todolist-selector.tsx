"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { it } from "date-fns/locale"
import { useRouter } from "next/navigation"
import { getTimeSlotFromDateTime, isTodolistExpired } from "@/lib/validation/todolist-schemas"
import { Badge } from "@/components/ui/badge"

type Todolist = {
  id: string
  scheduled_execution: string
  status: "pending" | "in_progress" | "completed"
  created_at: string
}

type TodolistSelectorProps = {
  todolists: Todolist[]
  deviceId: string
  today: string
}

const statusColors = {
  pending: "bg-yellow-500",
  in_progress: "bg-blue-500",
  completed: "bg-green-500",
  expired: "bg-red-500"
}

const statusLabels = {
  pending: "In attesa",
  in_progress: "In corso",
  completed: "Completata",
  expired: "Scaduta"
}

export function TodolistSelector({ todolists, deviceId, today }: TodolistSelectorProps) {
  const router = useRouter()

  // Filtra le todolist: prima quelle non scadute, poi quelle scadute
  const sortedTodolists = [...todolists].sort((a, b) => {
    const aExpired = isTodolistExpired(a.scheduled_execution)
    const bExpired = isTodolistExpired(b.scheduled_execution)
    
    if (aExpired === bExpired) {
      // Se entrambe sono scadute o non scadute, ordina per data di esecuzione
      return new Date(a.scheduled_execution).getTime() - new Date(b.scheduled_execution).getTime()
    }
    
    // Prima le non scadute
    return aExpired ? 1 : -1
  })

  if (todolists.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Nessuna todolist disponibile</CardTitle>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={() => router.push(`/todolist/new?deviceId=${deviceId}&date=${today}`)}
            className="w-full"
          >
            Crea nuova todolist
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Seleziona una todolist</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {sortedTodolists.map((todolist) => {
          const timeSlot = getTimeSlotFromDateTime(todolist.scheduled_execution)
          const formattedTime = format(new Date(todolist.scheduled_execution), "HH:mm", { locale: it })
          const isExpired = isTodolistExpired(todolist.scheduled_execution)
          const status = isExpired ? "expired" : todolist.status
          
          return (
            <Button
              key={todolist.id}
              variant="outline"
              className={`w-full justify-between ${isExpired ? 'opacity-75' : ''}`}
              onClick={() => router.push(`/todolist/view/${todolist.id}/${deviceId}/${today}/${timeSlot}`)}
            >
              <div className="flex items-center gap-2">
                <span className="capitalize">{timeSlot}</span>
                <span className="text-muted-foreground">({formattedTime})</span>
              </div>
              <Badge className={statusColors[status]}>
                {statusLabels[status]}
              </Badge>
            </Button>
          )
        })}
        
        <Button 
          variant="secondary"
          onClick={() => router.push(`/todolist/new?deviceId=${deviceId}&date=${today}`)}
          className="w-full mt-4"
        >
          Crea nuova todolist
        </Button>
      </CardContent>
    </Card>
  )
} 