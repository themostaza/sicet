"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { getPuntoControllo } from "@/app/actions/actions-device"
import { getTodayTodolistForDevice } from "@/lib/actions-todolist"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"

export default function DeviceScanPage({ params }: { params: { deviceId: string } }) {
  const router = useRouter()
  const { toast } = useToast()
  const [device, setDevice] = useState<any>(null)
  const [todolist, setTodolist] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch device info
        const deviceData = await getPuntoControllo(params.deviceId)
        setDevice(deviceData)

        // Check if there's a todolist for today
        const todolistData = await getTodayTodolistForDevice(params.deviceId)
        setTodolist(todolistData)

        // Redirect directly to compilation page if todolist exists
        if (todolistData) {
          router.push(`/todolist/compilazione/${params.deviceId}/${todolistData.date}/${todolistData.time_slot}`)
          return
        }
      } catch (error) {
        toast({
          title: "Errore",
          description: "Impossibile caricare i dati del dispositivo.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [params.deviceId, toast, router])

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!device) {
    return (
      <div className="container mx-auto max-w-4xl p-6">
        <div className="mb-6">
          <Link href="/" className="inline-flex items-center text-sm font-medium">
            <ArrowLeft className="mr-2 h-4 w-4" /> Torna alla Home
          </Link>
        </div>

        <Card>
          <CardContent className="p-6 text-center">
            <div className="mb-4 mt-2 text-red-500">
              <svg
                className="mx-auto h-12 w-12"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                ></path>
              </svg>
            </div>
            <h2 className="mb-2 text-xl font-bold">Dispositivo non trovato</h2>
            <p className="text-gray-500">Il dispositivo con ID "{params.deviceId}" non è stato trovato nel sistema.</p>
            <Button className="mt-4 bg-black hover:bg-gray-800" onClick={() => router.push("/")}>
              Torna alla Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-4xl p-6">
      <div className="mb-6">
        <Link href="/" className="inline-flex items-center text-sm font-medium">
          <ArrowLeft className="mr-2 h-4 w-4" /> Torna alla Home
        </Link>
      </div>

      <Card>
        <CardContent className="p-6">
          <h1 className="mb-2 text-2xl font-bold">{device.nome}</h1>
          <p className="mb-6 text-gray-500">{device.posizione}</p>

          <div className="rounded-lg bg-gray-50 p-4">
            <div className="flex items-start">
              <svg
                className="mr-3 h-6 w-6 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                ></path>
              </svg>
              <div>
                <h3 className="font-medium text-gray-800">Nessuna todolist per oggi</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Non ci sono attività pianificate per oggi per questo dispositivo.
                </p>
                <Button className="mt-3 bg-black hover:bg-gray-800" onClick={() => router.push("/todolist")}>
                  Visualizza tutte le todolist
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
