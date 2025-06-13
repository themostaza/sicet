"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { getCurrentTimeSlot, getTimeRangeFromSlot } from "@/lib/validation/todolist-schemas"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { use } from "react"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export default function DeviceScanPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { id } = use(params)

  useEffect(() => {
    // Get current date and time slot
    const today = new Date().toISOString().split('T')[0]
    const currentTimeSlot = getCurrentTimeSlot(new Date())
    
    // First get the todolist ID for this device/date/time slot
    const getTodolistId = async () => {
      try {
        const supabase = await createServerSupabaseClient()
        const { data } = await supabase
          .from("todolist")
          .select("id")
          .eq("device_id", id)
          .eq("scheduled_execution", getTimeRangeFromSlot(today, currentTimeSlot).startTime)
          .order("created_at", { ascending: false })
          .limit(1)
          .single()

        if (data) {
          router.push(`/todolist/view/${data.id}/${id}/${today}/${currentTimeSlot}`)
        } else {
          // If no todolist exists, redirect to create new
          router.push(`/todolist/new?deviceId=${id}&date=${today}&timeSlot=${currentTimeSlot}`)
        }
      } catch (error) {
        console.error("Error fetching todolist:", error)
        // On error, redirect to create new
        router.push(`/todolist/new?deviceId=${id}&date=${today}&timeSlot=${currentTimeSlot}`)
      }
    }

    getTodolistId()
  }, [id, router])

  return (
    <div className="container max-w-md py-12">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-center gap-2 text-lg">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            Reindirizzamento...
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground">
          <p>Stiamo caricando la todolist per questo punto di controllo</p>
        </CardContent>
      </Card>
    </div>
  )
} 