"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { getCurrentTimeSlot } from "@/lib/validation/todolist-schemas"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { use } from "react"

export default function DeviceScanPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { id } = use(params)

  useEffect(() => {
    // Get current date and time slot
    const today = new Date().toISOString().split('T')[0]
    const currentTimeSlot = getCurrentTimeSlot(new Date())
    
    // Redirect to today's todolist after a short delay
    const timeout = setTimeout(() => {
      router.push(`/todolist/view/${id}/${today}/${currentTimeSlot}`)
    }, 1000) // 1 second delay to show loading state

    return () => clearTimeout(timeout)
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