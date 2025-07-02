"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getCurrentTimeSlot, customTimeSlotToString, minutesToTime } from "@/lib/validation/todolist-schemas"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, MapPin, Info } from "lucide-react"
import { use } from "react"
import { getTodolistsForDeviceToday } from "@/app/actions/actions-todolist"
import { getDevice } from "@/app/actions/actions-device"
import { TodolistSelector } from "./todolist-selector"
import { Badge } from "@/components/ui/badge"

// Helper function to get time slot string for URL
const getTimeSlotString = (todolist: any): string => {
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
    return getCurrentTimeSlot(new Date(todolist.scheduled_execution))
  }
}

export default function DeviceScanPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { id } = use(params)
  const [loading, setLoading] = useState(true)
  const [todolists, setTodolists] = useState<any[] | null>(null)
  const [device, setDevice] = useState<any>(null)

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    
    const loadData = async () => {
      try {
        // Carica i dati del dispositivo e le todolist in parallelo
        const [deviceData, todolistsData] = await Promise.all([
          getDevice(id),
          getTodolistsForDeviceToday(id, today)
        ])
        
        setDevice(deviceData)
        setTodolists(todolistsData)
        
        // Se c'è una sola todolist, vai direttamente a quella
        if (todolistsData && todolistsData.length === 1) {
          const timeSlotString = getTimeSlotString(todolistsData[0])
          router.push(`/todolist/view/${todolistsData[0].id}/${id}/${today}/${timeSlotString}`)
          return
        }
      } catch (error) {
        console.error("Error loading data:", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [id, router])

  if (loading) {
    return (
      <div className="container max-w-md py-12">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-center gap-2 text-lg">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              Caricamento...
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center text-muted-foreground">
            <p>Stiamo caricando le informazioni del dispositivo</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!device) {
    return (
      <div className="container max-w-md py-12">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-destructive">Dispositivo non trovato</CardTitle>
          </CardHeader>
          <CardContent className="text-center text-muted-foreground">
            <p>Il dispositivo richiesto non esiste o non è accessibile.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container max-w-md py-12 space-y-6">
      {/* Header con informazioni del dispositivo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MapPin className="h-5 w-5 text-primary" />
            Punto di Controllo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <h3 className="font-semibold text-lg">{device.name}</h3>
            {device.location && (
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <MapPin className="h-3 w-3" />
                {device.location}
              </p>
            )}
          </div>
          
          {device.description && (
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p>{device.description}</p>
            </div>
          )}
          
          {device.tags && device.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {device.tags.map((tag: string, index: number) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selettore todolist */}
      <TodolistSelector 
        todolists={todolists || []} 
        deviceId={id} 
        today={new Date().toISOString().split('T')[0]} 
      />
    </div>
  )
} 