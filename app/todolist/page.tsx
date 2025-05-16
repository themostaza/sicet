"use client"

import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Calendar, AlertTriangle, ArrowRight, CheckCircle, Plus } from "lucide-react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { getTodolists } from "@/lib/actions-todolist"

// Modify the groupTodolistsByStatus function to ensure completed todolists only appear in the "completed" section
function groupTodolistsByStatus(todolists) {
  const today = new Date().toISOString().split("T")[0]
  const currentHour = new Date().getHours()

  // Determine current time slot
  let currentTimeSlot = ""
  if (currentHour >= 6 && currentHour < 12) {
    currentTimeSlot = "mattina"
  } else if (currentHour >= 12 && currentHour < 18) {
    currentTimeSlot = "pomeriggio"
  } else if (currentHour >= 18 && currentHour < 22) {
    currentTimeSlot = "sera"
  } else {
    currentTimeSlot = "notte"
  }

  // Time slot order map
  const timeSlotOrder = {
    mattina: 1,
    pomeriggio: 2,
    sera: 3,
    notte: 4,
  }

  // First separate completed todolists
  const completed = todolists.filter((item) => item.status === "completed")

  // Then handle other categories, excluding completed todolists
  const nonCompleted = todolists.filter((item) => item.status !== "completed")

  return {
    today: nonCompleted.filter(
      (item) => item.date === today && !(timeSlotOrder[item.time_slot] < timeSlotOrder[currentTimeSlot]),
    ),
    overdue: nonCompleted.filter(
      (item) =>
        new Date(item.date) < new Date(today) ||
        (item.date === today && timeSlotOrder[item.time_slot] < timeSlotOrder[currentTimeSlot]),
    ),
    future: nonCompleted.filter(
      (item) =>
        new Date(item.date) > new Date(today) ||
        (item.date === today && timeSlotOrder[item.time_slot] > timeSlotOrder[currentTimeSlot]),
    ),
    completed: completed,
  }
}

export default function TodolistPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [todolists, setTodolists] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

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

  const groupedTodolists = groupTodolistsByStatus(todolists)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Todolist</h1>
        <Button className="bg-black hover:bg-gray-800" onClick={() => router.push("/todolist/new")}>
          <Plus className="mr-2 h-4 w-4" /> Aggiungi Todolist
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Todolist di Oggi */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center text-lg">
                <Calendar className="mr-2 h-5 w-5 text-blue-500" />
                Todolist di Oggi
              </CardTitle>
              <p className="text-sm text-gray-500">Visualizza e gestisci le attività pianificate per oggi</p>
            </CardHeader>
            <CardContent>
              <div className="mt-4 mb-6 flex justify-center">
                <span className="text-4xl font-bold text-blue-500">{groupedTodolists.today.length}</span>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push("/todolist/today")}
                disabled={groupedTodolists.today.length === 0}
              >
                Visualizza Todolist di Oggi
              </Button>
            </CardContent>
          </Card>

          {/* Todolist Scadute */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center text-lg">
                <AlertTriangle className="mr-2 h-5 w-5 text-red-500" />
                Todolist Scadute
              </CardTitle>
              <p className="text-sm text-gray-500">Attività non completate con data passata</p>
            </CardHeader>
            <CardContent>
              <div className="mt-4 mb-6 flex justify-center">
                <span className="text-4xl font-bold text-red-500">{groupedTodolists.overdue.length}</span>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push("/todolist/overdue")}
                disabled={groupedTodolists.overdue.length === 0}
              >
                Visualizza Todolist Scadute
              </Button>
            </CardContent>
          </Card>

          {/* Todolist Future */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center text-lg">
                <ArrowRight className="mr-2 h-5 w-5 text-orange-500" />
                Todolist Future
              </CardTitle>
              <p className="text-sm text-gray-500">Visualizza e gestisci le attività pianificate per il futuro</p>
            </CardHeader>
            <CardContent>
              <div className="mt-4 mb-6 flex justify-center">
                <span className="text-4xl font-bold text-orange-500">{groupedTodolists.future.length}</span>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push("/todolist/future")}
                disabled={groupedTodolists.future.length === 0}
              >
                Visualizza Todolist Future
              </Button>
            </CardContent>
          </Card>

          {/* Todolist Completate */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center text-lg">
                <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
                Todolist Completate
              </CardTitle>
              <p className="text-sm text-gray-500">Visualizza lo storico delle attività completate</p>
            </CardHeader>
            <CardContent>
              <div className="mt-4 mb-6 flex justify-center">
                <span className="text-4xl font-bold text-green-500">{groupedTodolists.completed.length}</span>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push("/todolist/completed")}
                disabled={groupedTodolists.completed.length === 0}
              >
                Visualizza Todolist Completate
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
