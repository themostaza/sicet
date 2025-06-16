"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Calendar, AlertTriangle, ArrowRight, CheckCircle2, Plus, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { TimeSlot, TimeSlotValue, CustomTimeSlot, isCustomTimeSlot, isTodolistExpired } from "@/lib/validation/todolist-schemas"

type FilterType = "all" | "today" | "overdue" | "future" | "completed"

type TodolistItem = {
  id: string
  device_id: string
  device_name: string
  date: string
  time_slot: TimeSlot
  status: string
  scheduled_execution: string
  count: number
}

type Props = {
  todolistsByFilter: Record<FilterType, TodolistItem[]>
  counts: Record<FilterType, number>
  initialFilter: FilterType
  userRole: string | null
}

const timeSlotOrder: Record<TimeSlot, number> = {
  mattina: 1,
  pomeriggio: 2,
  sera: 3,
  notte: 4,
  giornata: 5,
  custom: 6
}

export default function TodolistListClient({ todolistsByFilter, counts, initialFilter, userRole }: Props) {
  const router = useRouter()
  const [activeFilter, setActiveFilter] = useState<FilterType>(userRole === 'operator' ? 'today' : initialFilter)

  const isOperator = userRole === 'operator'
  const filtered = todolistsByFilter[activeFilter]

  const handleRowClick = (todolist: TodolistItem) => {
    if (isOperator) {
      if (activeFilter === 'today' || activeFilter === 'completed') {
        router.push(`/todolist/view/${todolist.id}/${todolist.device_id}/${todolist.date}/${todolist.time_slot}`)
      }
    } else {
      router.push(`/todolist/view/${todolist.id}/${todolist.device_id}/${todolist.date}/${todolist.time_slot}`)
    }
  }

  const handleCreateTodolist = () => {
    if (!isOperator) {
      router.push("/todolist/new")
    }
  }

  const getStatusDisplay = (todolist: TodolistItem) => {
    const isExpired = todolist.status !== "completed" && isTodolistExpired(todolist.scheduled_execution)
    
    if (todolist.status === "completed") {
      return (
        <span className="inline-flex items-center gap-1 text-green-600">
          <CheckCircle2 size={16} /> Completata
        </span>
      )
    }
    
    if (isExpired) {
      return (
        <span className="inline-flex items-center gap-1 text-red-600">
          <Clock size={16} /> Scaduta
        </span>
      )
    }
    
    if (todolist.status === "in_progress") {
      return (
        <span className="inline-flex items-center gap-1 text-yellow-600">
          <AlertTriangle size={16} /> In corso
        </span>
      )
    }
    
    return (
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        <Calendar size={16} /> Da fare
      </span>
    )
  }

  const formatTimeSlot = (timeSlot: TimeSlotValue) => {
    if (isCustomTimeSlot(timeSlot)) {
      const startStr = timeSlot.startHour.toString().padStart(2, '0')
      const endStr = timeSlot.endHour.toString().padStart(2, '0')
      return `Personalizzato (${startStr}:00-${endStr}:00)`
    }
    const slot = timeSlot as TimeSlot
    const timeSlotNames: Record<TimeSlot, string> = {
      mattina: "Mattina",
      pomeriggio: "Pomeriggio",
      sera: "Sera",
      notte: "Notte",
      giornata: "Giornata",
      custom: "Personalizzato"
    }
    return timeSlotNames[slot]
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Todolist</CardTitle>
        {!isOperator && (
          <Button onClick={handleCreateTodolist}>
            <Plus className="mr-2 h-4 w-4" />
            Nuova Todolist
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2 mb-4">
          {!isOperator && (
            <Button
              variant={activeFilter === "all" ? "default" : "outline"}
              onClick={() => setActiveFilter("all")}
              size="sm"
              className={activeFilter === "all" ? "bg-blue-500 hover:bg-blue-600" : ""}
            >
              Tutte <Badge className="ml-2" variant={activeFilter === "all" ? "outline" : "secondary"}>{counts.all}</Badge>
            </Button>
          )}
          <Button
            variant={activeFilter === "today" ? "default" : "outline"}
            onClick={() => setActiveFilter("today")}
            size="sm"
            className={activeFilter === "today" ? "bg-yellow-500 hover:bg-yellow-600" : ""}
          >
            Oggi <Badge className="ml-2" variant={activeFilter === "today" ? "outline" : "secondary"}>{counts.today}</Badge>
          </Button>
          {!isOperator && (
            <>
              <Button
                variant={activeFilter === "overdue" ? "default" : "outline"}
                onClick={() => setActiveFilter("overdue")}
                size="sm"
                className={activeFilter === "overdue" ? "bg-red-500 hover:bg-red-600" : ""}
              >
                Scadute <Badge className="ml-2" variant={activeFilter === "overdue" ? "outline" : "secondary"}>{counts.overdue}</Badge>
              </Button>
              <Button
                variant={activeFilter === "future" ? "default" : "outline"}
                onClick={() => setActiveFilter("future")}
                size="sm"
                className={activeFilter === "future" ? "bg-purple-500 hover:bg-purple-600" : ""}
              >
                Future <Badge className="ml-2" variant={activeFilter === "future" ? "outline" : "secondary"}>{counts.future}</Badge>
              </Button>
            </>
          )}
          <Button
            variant={activeFilter === "completed" ? "default" : "outline"}
            onClick={() => setActiveFilter("completed")}
            size="sm"
            className={activeFilter === "completed" ? "bg-green-500 hover:bg-green-600" : ""}
          >
            Completate <Badge className="ml-2" variant={activeFilter === "completed" ? "outline" : "secondary"}>{counts.completed}</Badge>
          </Button>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dispositivo</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Fascia</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead>Task</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Nessuna todolist trovata.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((item) => {
                  const isExpired = item.status !== "completed" && isTodolistExpired(item.scheduled_execution)
                  const canClick = !isOperator || (activeFilter === 'today' || activeFilter === 'completed')
                  return (
                    <TableRow
                      key={item.id}
                      className={cn(
                        canClick && 'cursor-pointer',
                        isExpired && 'opacity-75'
                      )}
                      onClick={() => canClick && handleRowClick(item)}
                    >
                      <TableCell>{item.device_name}</TableCell>
                      <TableCell>{item.date}</TableCell>
                      <TableCell>{formatTimeSlot(item.time_slot)}</TableCell>
                      <TableCell>{getStatusDisplay(item)}</TableCell>
                      <TableCell>{item.count}</TableCell>
                      <TableCell>
                        {canClick && <ArrowRight size={18} className="text-muted-foreground" />}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
