"use client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, CheckCircle, Clock, Calendar, Layers } from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { getTodolistTasks, updateTaskStatus } from "@/lib/actions-todolist"
import { getPuntoControllo } from "@/lib/actions"
import { format } from "date-fns"
import { it } from "date-fns/locale"

export default function TodolistDetail({
  params,
}: {
  params: { deviceId: string; date: string; timeSlot: string }
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [tasks, setTasks] = useState<any[]>([])
  const [device, setDevice] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState<string | null>(null)
  const { deviceId, date, timeSlot } = params

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tasksData, deviceData] = await Promise.all([
          getTodolistTasks(deviceId, date, timeSlot),
          getPuntoControllo(deviceId),
        ])
        setTasks(tasksData || [])
        setDevice(deviceData)
      } catch (error) {
        toast({
          title: "Errore",
          description: "Impossibile caricare i dati della todolist.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [deviceId, date, timeSlot, toast])

  // Funzione per formattare la fascia oraria
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

  // Update the handleUpdateStatus function to redirect to the completed section when all tasks are completed
  const handleUpdateStatus = async (taskId: string, newStatus: string) => {
    setIsUpdating(taskId)
    try {
      await updateTaskStatus(taskId, newStatus)
      setTasks(
        tasks.map((task) => {
          if (task.id === taskId) {
            return { ...task, status: newStatus }
          }
          return task
        }),
      )

      // Check if all tasks are now completed
      const updatedTasks = tasks.map((task) => (task.id === taskId ? { ...task, status: newStatus } : task))
      const allCompleted = updatedTasks.every((task) => task.status === "completed")

      if (allCompleted) {
        toast({
          title: "Todolist completata",
          description: "Tutte le attività sono state completate con successo!",
          variant: "default",
        })

        // Redirect to completed section after a short delay
        setTimeout(() => {
          router.push("/todolist/completed")
        }, 1500)
      } else {
        toast({
          title: "Stato aggiornato",
          description: "Lo stato dell'attività è stato aggiornato con successo.",
          variant: "default",
        })
      }
    } catch (error) {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'aggiornamento dello stato.",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(null)
    }
  }

  const allCompleted = tasks.length > 0 && tasks.every((task) => task.status === "completed")

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <Link href="/todolist" className="inline-flex items-center text-sm font-medium">
          <ArrowLeft className="mr-2 h-4 w-4" /> Torna alle Todolist
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      ) : (
        <>
          <div className="bg-white p-6 rounded-lg border">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold mb-1">Dettaglio Todolist</h1>
                <p className="text-gray-500">Visualizza e gestisci le attività di questa todolist</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <Layers className="h-5 w-5 text-gray-500 mr-2" />
                    <h3 className="font-medium">Punto di Controllo</h3>
                  </div>
                  <p className="mt-2 text-lg font-semibold">{device?.titolo || deviceId}</p>
                  <p className="text-sm text-gray-500">{device?.posizione || "Posizione non disponibile"}</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <Calendar className="h-5 w-5 text-gray-500 mr-2" />
                    <h3 className="font-medium">Data</h3>
                  </div>
                  <p className="mt-2 text-lg font-semibold">{format(new Date(date), "d MMMM yyyy", { locale: it })}</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <Clock className="h-5 w-5 text-gray-500 mr-2" />
                    <h3 className="font-medium">Fascia Oraria</h3>
                  </div>
                  <p className="mt-2 text-lg font-semibold">{formatTimeSlot(timeSlot)}</p>
                </CardContent>
              </Card>
            </div>

            <div className="mt-8">
              <h2 className="text-lg font-semibold mb-4">Attività da completare</h2>

              {tasks.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed">
                  <p className="text-gray-500">Nessuna attività trovata per questa todolist.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {tasks.map((task) => (
                    <Card key={task.id} className="overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium">{task.kpis?.name || "Controllo"}</h3>
                            <p className="text-sm text-gray-500 mt-1">ID: {task.kpi_id}</p>
                          </div>
                          <div className="flex items-center">
                            {task.status === "completed" ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <CheckCircle className="h-3 w-3 mr-1" /> Completata
                              </span>
                            ) : (
                              <Button
                                size="sm"
                                className="bg-black hover:bg-gray-800"
                                onClick={() => handleUpdateStatus(task.id, "completed")}
                                disabled={!!isUpdating}
                              >
                                {isUpdating === task.id ? (
                                  <span className="flex items-center">
                                    <svg
                                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                                      xmlns="http://www.w3.org/2000/svg"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                    >
                                      <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                      ></circle>
                                      <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                      ></path>
                                    </svg>
                                    Aggiornamento...
                                  </span>
                                ) : (
                                  <>
                                    <CheckCircle className="h-4 w-4 mr-2" /> Segna come completata
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {allCompleted && (
              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  <p className="font-medium text-green-700">Tutte le attività sono state completate!</p>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
