"use client"

import React from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Calendar, AlertTriangle, ArrowRight, CheckCircle2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"

type TimeSlot = "mattina" | "pomeriggio" | "sera" | "notte"
type FilterType = "all" | "today" | "overdue" | "future" | "completed"

type TodolistItem = {
  device_id: string
  device_name: string
  date: string
  time_slot: TimeSlot
  status: string
  count: number
}

interface Props {
  todolistsByFilter: Record<FilterType, TodolistItem[]>
  counts: Record<FilterType, number>
  initialFilter: FilterType
}

const timeSlotOrder: Record<TimeSlot, number> = {
  mattina: 1,
  pomeriggio: 2,
  sera: 3,
  notte: 4,
}

export default function TodolistListClient({ todolistsByFilter, counts, initialFilter }: Props) {
  const router = useRouter()
  const [activeFilter, setActiveFilter] = React.useState<FilterType>(initialFilter)

  const filtered = todolistsByFilter[activeFilter]

  const handleRowClick = (todolist: TodolistItem) => {
    router.push(`/todolist/view/${todolist.device_id}/${todolist.date}/${todolist.time_slot}`)
  }

  const handleCreateTodolist = () => {
    router.push("/todolist/new")
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Todolist</CardTitle>
        <Button onClick={handleCreateTodolist} className="ml-auto" variant="default">
          <Plus className="mr-2 h-4 w-4" /> Crea Todolist
        </Button>
      </CardHeader>
      <CardContent>
        {/* Filtri */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Button
            variant={activeFilter === "all" ? "default" : "outline"}
            onClick={() => setActiveFilter("all")}
            size="sm"
            className={activeFilter === "all" ? "bg-blue-500 hover:bg-blue-600" : ""}
          >
            Tutte <Badge className="ml-2" variant={activeFilter === "all" ? "outline" : "secondary"}>{counts.all}</Badge>
          </Button>
          <Button
            variant={activeFilter === "today" ? "default" : "outline"}
            onClick={() => setActiveFilter("today")}
            size="sm"
            className={activeFilter === "today" ? "bg-yellow-500 hover:bg-yellow-600" : ""}
          >
            Oggi <Badge className="ml-2" variant={activeFilter === "today" ? "outline" : "secondary"}>{counts.today}</Badge>
          </Button>
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
          <Button
            variant={activeFilter === "completed" ? "default" : "outline"}
            onClick={() => setActiveFilter("completed")}
            size="sm"
            className={activeFilter === "completed" ? "bg-green-500 hover:bg-green-600" : ""}
          >
            Completate <Badge className="ml-2" variant={activeFilter === "completed" ? "outline" : "secondary"}>{counts.completed}</Badge>
          </Button>
        </div>

        {/* Tabella */}
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
                filtered.map((item) => (
                  <TableRow
                    key={`${item.device_id}_${item.date}_${item.time_slot}`}
                    className="cursor-pointer"
                    onClick={() => handleRowClick(item)}
                  >
                    <TableCell>{item.device_name}</TableCell>
                    <TableCell>{item.date}</TableCell>
                    <TableCell>{item.time_slot}</TableCell>
                    <TableCell>
                      {item.status === "completed" ? (
                        <span className="inline-flex items-center gap-1 text-green-600">
                          <CheckCircle2 size={16} /> Completata
                        </span>
                      ) : item.status === "in_progress" ? (
                        <span className="inline-flex items-center gap-1 text-yellow-600">
                          <AlertTriangle size={16} /> In corso
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <Calendar size={16} /> Da fare
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{item.count}</TableCell>
                    <TableCell>
                      <ArrowRight size={18} className="text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
