"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getCurrentTimeSlot } from "@/lib/validation/todolist-schemas"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { use } from "react"
import { getTodolistsForDeviceToday } from "@/app/actions/actions-todolist"
import { TodolistSelector } from "./todolist-selector"

export default function DeviceScanPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { id } = use(params)
  const [loading, setLoading] = useState(true)
  const [todolists, setTodolists] = useState<any[] | null>(null)

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    
    const loadTodolists = async () => {
      try {
        const data = await getTodolistsForDeviceToday(id, today)
        setTodolists(data)
        
        // Se c'è una sola todolist, vai direttamente a quella
        if (data && data.length === 1) {
          const timeSlot = getCurrentTimeSlot(new Date(data[0].scheduled_execution))
          router.push(`/todolist/view/${data[0].id}/${id}/${today}/${timeSlot}`)
          return
        }
      } catch (error) {
        console.error("Error loading todolists:", error)
      } finally {
        setLoading(false)
      }
    }

    loadTodolists()
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
            <p>Stiamo caricando le todolist disponibili</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container max-w-md py-12">
      <TodolistSelector 
        todolists={todolists || []} 
        deviceId={id} 
        today={new Date().toISOString().split('T')[0]} 
      />
    </div>
  )
} 