"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, AlertTriangle, ArrowRight, CheckCircle2, Plus, Loader2 } from "lucide-react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { getTodolists } from "@/lib/actions-todolist"
import { format } from "date-fns"
import { it } from "date-fns/locale"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"

type FilterType = "all" | "today" | "overdue" | "future" | "completed"

type TodolistItem = {
  device_id: string
  device_name: string
  date: string
  time_slot: "mattina" | "pomeriggio" | "sera" | "notte"
  status: string
  count: number
}

type TimeSlot = "mattina" | "pomeriggio" | "sera" | "notte"

export default function TodolistPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [todolists, setTodolists] = useState<TodolistItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<FilterType>("all")

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getTodolists()
        setTodolists(data || [])
      } catch (error) {
        toast({
          title: "Errore",
          description: "Impossibile caricare le todolist.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [toast])

  const getFilteredTodolists = () => {
    const today = new Date().toISOString().split("T")[0]
    const currentHour = new Date().getHours()

    const timeSlotOrder: Record<TimeSlot, number> = {
      mattina: 1,
      pomeriggio: 2,
      sera: 3,
      notte: 4,
    }

    let currentTimeSlot: TimeSlot
    if (currentHour >= 6 && currentHour < 12) {
      currentTimeSlot = "mattina"
    } else if (currentHour >= 12 && currentHour < 18) {
      currentTimeSlot = "pomeriggio"
    } else if (currentHour >= 18 && currentHour < 22) {
      currentTimeSlot = "sera"
    } else {
      currentTimeSlot = "notte"
    }

    switch (activeFilter) {
      case "today":
        return todolists.filter(
          (item) =>
            item.date === today &&
            item.status !== "completed" &&
            !(timeSlotOrder[item.time_slot] < timeSlotOrder[currentTimeSlot]),
        )
      case "overdue":
        return todolists.filter(
          (item) =>
            item.status !== "completed" &&
            (new Date(item.date) < new Date(today) ||
              (item.date === today && timeSlotOrder[item.time_slot] < timeSlotOrder[currentTimeSlot])),
        )
      case "future":
        return todolists.filter(
          (item) =>
            item.status !== "completed" &&
            (new Date(item.date) > new Date(today) ||
              (item.date === today && timeSlotOrder[item.time_slot] > timeSlotOrder[currentTimeSlot])),
        )
      case "completed":
        return todolists.filter((item) => item.status === "completed")
      default:
        return todolists
    }
  }

  const getCounts = () => {
    const today = new Date().toISOString().split("T")[0]
    const currentHour = new Date().getHours()

    const timeSlotOrder: Record<TimeSlot, number> = {
      mattina: 1,
      pomeriggio: 2,
      sera: 3,
      notte: 4,
    }

    let currentTimeSlot: TimeSlot
    if (currentHour >= 6 && currentHour < 12) {
      currentTimeSlot = "mattina"
    } else if (currentHour >= 12 && currentHour < 18) {
      currentTimeSlot = "pomeriggio"
    } else if (currentHour >= 18 && currentHour < 22) {
      currentTimeSlot = "sera"
    } else {
      currentTimeSlot = "notte"
    }

    return {
      all: todolists.length,
      today: todolists.filter(
        (item) =>
          item.date === today &&
          item.status !== "completed" &&
          !(timeSlotOrder[item.time_slot] < timeSlotOrder[currentTimeSlot]),
      ).length,
      overdue: todolists.filter(
        (item) =>
          item.status !== "completed" &&
          (new Date(item.date) < new Date(today) ||
            (item.date === today && timeSlotOrder[item.time_slot] < timeSlotOrder[currentTimeSlot])),
      ).length,
      future: todolists.filter(
        (item) =>
          item.status !== "completed" &&
          (new Date(item.date) > new Date(today) ||
            (item.date === today && timeSlotOrder[item.time_slot] > timeSlotOrder[currentTimeSlot])),
      ).length,
      completed: todolists.filter((item) => item.status === "completed").length,
    }
  }

  const counts = getCounts()
  const filteredTodolists = getFilteredTodolists()

  const formatTimeSlot = (timeSlot: string) => {
    switch (timeSlot) {
      case "mattina":
        return "Mattina (fino alle 12:00)"
      case "pomeriggio":
        return "Pomeriggio (fino alle 18:00)"
      case "sera":
        return "Sera (fino alle 22:00)"
      case "notte":
        return "Notte (fino alle 06:00)"
      default:
        return timeSlot
    }
  }

  const getFilterInfo = () => {
    switch (activeFilter) {
      case "today":
        return {
          title: "Todolist di Oggi",
          description: "Visualizza e gestisci le attività pianificate per oggi",
          icon: <Calendar className="h-5 w-5 mr-2 text-blue-500" />,
          color: "text-blue-500",
        }
      case "overdue":
        return {
          title: "Todolist Scadute",
          description: "Attività non completate con data passata",
          icon: <AlertTriangle className="h-5 w-5 mr-2 text-red-500" />,
          color: "text-red-500",
        }
      case "future":
        return {
          title: "Todolist Future",
          description: "Visualizza e gestisci le attività pianificate per il futuro",
          icon: <ArrowRight className="h-5 w-5 mr-2 text-orange-500" />,
          color: "text-orange-500",
        }
      case "completed":
        return {
          title: "Todolist Completate",
          description: "Visualizza lo storico delle attività completate",
          icon: <CheckCircle2 className="h-5 w-5 mr-2 text-green-500" />,
          color: "text-green-500",
        }
      default:
        return {
          title: "Tutte le Todolist",
          description: "Visualizza e gestisci tutte le attività",
          icon: null,
          color: "text-gray-900",
        }
    }
  }

  const filterInfo = getFilterInfo()

  const handleRowClick = (todolist: TodolistItem) => {
    router.push(`/todolist/view/${todolist.device_id}/${todolist.date}/${todolist.time_slot}`)
  }

  const getCompletionPercentage = (todolist: TodolistItem) => {
    if (todolist.status === "completed") {
      return 100
    }
    return 0
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Todolist</h1>
        <Button className="bg-black hover:bg-gray-800" onClick={() => router.push("/todolist/new")}>
          <Plus className="mr-2 h-4 w-4" /> Aggiungi Todolist
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge
          variant={activeFilter === "all" ? "default" : "outline"}
          className={`cursor-pointer hover:bg-gray-100 ${
            activeFilter === "all" ? "bg-gray-900 hover:bg-gray-800" : ""
          }`}
          onClick={() => setActiveFilter("all")}
        >
          Tutte ({counts.all})
        </Badge>
        <Badge
          variant={activeFilter === "today" ? "default" : "outline"}
          className={`cursor-pointer hover:bg-blue-100 ${
            activeFilter === "today" ? "bg-blue-500 hover:bg-blue-600" : ""
          }`}
          onClick={() => setActiveFilter("today")}
        >
          <Calendar className="h-3 w-3 mr-1" /> Oggi ({counts.today})
        </Badge>
        <Badge
          variant={activeFilter === "overdue" ? "default" : "outline"}
          className={`cursor-pointer hover:bg-red-100 ${
            activeFilter === "overdue" ? "bg-red-500 hover:bg-red-600" : ""
          }`}
          onClick={() => setActiveFilter("overdue")}
        >
          <AlertTriangle className="h-3 w-3 mr-1" /> Scadute ({counts.overdue})
        </Badge>
        <Badge
          variant={activeFilter === "future" ? "default" : "outline"}
          className={`cursor-pointer hover:bg-orange-100 ${
            activeFilter === "future" ? "bg-orange-500 hover:bg-orange-600" : ""
          }`}
          onClick={() => setActiveFilter("future")}
        >
          <ArrowRight className="h-3 w-3 mr-1" /> Future ({counts.future})
        </Badge>
        <Badge
          variant={activeFilter === "completed" ? "default" : "outline"}
          className={`cursor-pointer hover:bg-green-100 ${
            activeFilter === "completed" ? "bg-green-500 hover:bg-green-600" : ""
          }`}
          onClick={() => setActiveFilter("completed")}
        >
          <CheckCircle2 className="h-3 w-3 mr-1" /> Completate ({counts.completed})
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            {filterInfo.icon}
            <div>
              <CardTitle className={filterInfo.color}>{filterInfo.title}</CardTitle>
              <CardDescription>{filterInfo.description}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-12 w-12 animate-spin text-gray-400" />
            </div>
          ) : filteredTodolists.length === 0 ? (
            <div className="bg-white rounded-lg border p-8 text-center">
              {filterInfo.icon ? (
                <div className="mx-auto h-12 w-12 text-gray-400 flex justify-center">{filterInfo.icon}</div>
              ) : (
                <Calendar className="mx-auto h-12 w-12 text-gray-400" />
              )}
              <h3 className="mt-2 text-lg font-medium text-gray-900">Nessuna todolist trovata</h3>
              <p className="mt-1 text-sm text-gray-500">
                Non ci sono attività{" "}
                {activeFilter === "all" ? "" : activeFilter === "completed" ? "completate" : "pianificate"} da
                visualizzare.
              </p>
              <Button className="mt-4 bg-black hover:bg-gray-800" onClick={() => router.push("/todolist/new")}>
                Crea Nuova Todolist
              </Button>
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dispositivo</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Fascia Oraria</TableHead>
                    <TableHead>Attività</TableHead>
                    <TableHead>Stato</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTodolists.map((todolist, index) => {
                    const completionPercentage = getCompletionPercentage(todolist)
                    const completedCount = todolist.status === "completed" ? todolist.count : 0

                    return (
                      <TableRow
                        key={index}
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => handleRowClick(todolist)}
                      >
                        <TableCell className="font-medium">{todolist.device_name}</TableCell>
                        <TableCell>{format(new Date(todolist.date), "d MMMM yyyy", { locale: it })}</TableCell>
                        <TableCell>{formatTimeSlot(todolist.time_slot)}</TableCell>
                        <TableCell>
                          <div className="flex flex-col space-y-1">
                            <Progress
                              value={completionPercentage}
                              className={`h-2 w-24 ${todolist.status === "completed" ? "bg-green-100" : "bg-gray-100"}`}
                            />
                            <span className="text-xs text-gray-500">
                              {completedCount}/{todolist.count}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {todolist.status === "completed" ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              <CheckCircle2 className="h-3 w-3 mr-1" /> Completata
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                              In attesa
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
