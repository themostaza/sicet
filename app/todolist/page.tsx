import { createServerSupabaseClient } from "@/lib/supabase-server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"
import TodolistListClient from "@/components/todolists/client"

export const dynamic = 'force-dynamic'

export default async function TodolistPage() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    let userRole = null
    if (user && user.email) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('email', user.email)
        .single()
      userRole = profile?.role ?? null
    }

    // Fetch devices list with tags
    const { data: devices } = await supabase
      .from('devices')
      .select('id, name, tags')
      .order('name')

    // Extract all unique tags from devices
    const allTags = devices?.reduce((tags: string[], device) => {
      if (device.tags) {
        device.tags.forEach(tag => {
          if (!tags.includes(tag)) {
            tags.push(tag)
          }
        })
      }
      return tags
    }, []) || []

    // Get initial counts for the filter badges
    const { count: allCount } = await supabase
      .from("todolist")
      .select("*", { count: "exact", head: true })

    const today = new Date().toISOString().split("T")[0]
    const { count: todayCount } = await supabase
      .from("todolist")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending")
      .gte("scheduled_execution", `${today}T00:00:00`)
      .lt("scheduled_execution", `${today}T23:59:59`)

    const { count: overdueCount } = await supabase
      .from("todolist")
      .select("*", { count: "exact", head: true })
      .neq("status", "completed")
      .lt("scheduled_execution", new Date().toISOString())

    const { count: futureCount } = await supabase
      .from("todolist")
      .select("*", { count: "exact", head: true })
      .neq("status", "completed")
      .gt("scheduled_execution", `${today}T23:59:59`)

    const { count: completedCount } = await supabase
      .from("todolist")
      .select("*", { count: "exact", head: true })
      .eq("status", "completed")

    const counts = {
      all: allCount || 0,
      today: todayCount || 0,
      overdue: overdueCount || 0,
      future: futureCount || 0,
      completed: completedCount || 0,
    }

    return (
      <TodolistListClient
        counts={counts}
        initialFilter="today"
        userRole={userRole}
        devices={devices || []}
        allTags={allTags}
      />
    )
  } catch (error) {
    console.error("Error in TodolistPage:", error);
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            Errore nel caricamento delle todolist
          </CardTitle>
          <CardDescription>
            {error instanceof Error ? error.message : "Si è verificato un errore inatteso. Riprova più tardi."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Se il problema persiste, contatta l&apos;amministratore del sistema.
          </p>
        </CardContent>
      </Card>
    )
  }
}
