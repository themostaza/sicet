"use client"

import { Button } from "@/components/ui/button"
import { ArrowLeft, ArrowRight, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { getTodolists } from "@/lib/actions-todolist"
import { format } from "date-fns"
import { it } from "date-fns/locale"

export default function TodolistOverdue() {
  const router = useRouter()
  const { toast } = useToast()
  const [todolists, setTodolists] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Modifica la logica di filtraggio nella funzione fetchData per considerare anche la fascia oraria
  // e escludere le todolist completate
  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getTodolists()
        // Filtra solo le todolist scadute (data passata o stessa data ma fascia oraria passata)
        // ed esclude quelle completate
        const today = new Date().toISOString().split("T")[0]
        const currentHour = new Date().getHours()

        // Determina la fascia oraria corrente
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

        // Mappa delle fasce orarie per determinare l'ordine
        const timeSlotOrder = {
          mattina: 1,
          pomeriggio: 2,
          sera: 3,
          notte: 4,
        }

        const filteredData = data.filter(
          (item) =>
            item.status !== "completed" &&
            (new Date(item.date) < new Date(today) ||
              (item.date === today && timeSlotOrder[item.time_slot] < timeSlotOrder[currentTimeSlot])),
        )
        setTodolists(filteredData || [])
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

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <Link href="/todolist" className="inline-flex items-center text-sm font-medium">
          <ArrowLeft className="mr-2 h-4 w-4" /> Torna alle categorie
        </Link>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <h1 className="text-2xl font-bold">Todolist</h1>
        <div className="flex items-center text-red-500">
          <AlertTriangle className="h-5 w-5 mr-2" />
          <span className="font-medium">Todolist Scadute</span>
        </div>
      </div>

      <p className="text-gray-500">Attività non completate con data passata</p>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      ) : todolists.length === 0 ? (
        <div className="bg-white rounded-lg border p-8 text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">Nessuna todolist scaduta</h3>
          <p className="mt-1 text-sm text-gray-500">Non ci sono attività scadute da completare.</p>
          <Button className="mt-4 bg-black hover:bg-gray-800" onClick={() => router.push("/todolist/new")}>
            Crea Nuova Todolist
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden mt-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Dispositivo</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Data</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Fascia Oraria</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Attività</th>
                </tr>
              </thead>
              <tbody>
                {todolists.map((todolist, index) => (
                  <tr key={index} className="border-b">
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{todolist.device_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {format(new Date(todolist.date), "d MMMM yyyy", { locale: it })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{formatTimeSlot(todolist.time_slot)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center">
                        <div className="flex -space-x-1">
                          {Array.from({ length: Math.min(3, todolist.count) }).map((_, i) => (
                            <div
                              key={i}
                              className={`h-4 w-4 rounded-full border-2 border-white ${
                                todolist.status === "completed" ? "bg-green-200" : "bg-gray-200"
                              }`}
                            ></div>
                          ))}
                          {todolist.count > 3 && (
                            <div className="h-4 w-4 rounded-full border-2 border-white bg-gray-300 flex items-center justify-center">
                              <span className="text-[8px] text-gray-700">+{todolist.count - 3}</span>
                            </div>
                          )}
                        </div>
                        <span className="ml-2 text-xs text-gray-500">
                          {todolist.status === "completed"
                            ? `${todolist.count}/${todolist.count}`
                            : `0/${todolist.count}`}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Button
                        className="bg-black hover:bg-gray-800"
                        size="sm"
                        onClick={() =>
                          router.push(
                            `/todolist/dettaglio/${todolist.device_id}/${todolist.date}/${todolist.time_slot}`,
                          )
                        }
                      >
                        Apri <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
