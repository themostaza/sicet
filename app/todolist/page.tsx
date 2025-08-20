import { createServerSupabaseClient } from "@/lib/supabase-server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"
import TodolistListClient from "@/components/todolists/client"
import { getTodolistCategories } from "@/app/actions/actions-todolist"
import { TIME_SLOT_TOLERANCE } from "@/lib/validation/todolist-schemas"

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

    // Get all existing todolist categories
    const allCategories = await getTodolistCategories()

    // Get initial counts for the filter badges
    const { count: allCount } = await supabase
      .from("todolist")
      .select("*", { count: "exact", head: true })

    const today = new Date().toISOString().split("T")[0]
    
    let todayCount = 0
    if (userRole === 'operator') {
      // Operatore (CET): scheduled_execution <= now_IT <= end_day_time + TOLLERANZA
      const now = new Date()
      const fmt = new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      })
      const parts = Object.fromEntries(fmt.formatToParts(now).map(p => [p.type, p.value])) as any
      const y = Number(parts.year), m = Number(parts.month), d = Number(parts.day)
      const hh = Number(parts.hour), mm = Number(parts.minute), ss = Number(parts.second)

      const nowPseudo = new Date(Date.UTC(y, m - 1, d, hh, mm, ss))
      const thresholdPseudo = new Date(nowPseudo.getTime() - (TIME_SLOT_TOLERANCE * 60 * 60 * 1000))

      const toPseudoIso = (dt: Date) => {
        const yy = dt.getUTCFullYear()
        const mo = String(dt.getUTCMonth() + 1).padStart(2, '0')
        const da = String(dt.getUTCDate()).padStart(2, '0')
        const ho = String(dt.getUTCHours()).padStart(2, '0')
        const mi = String(dt.getUTCMinutes()).padStart(2, '0')
        const se = String(dt.getUTCSeconds()).padStart(2, '0')
        return `${yy}-${mo}-${da}T${ho}:${mi}:${se}+00:00`
      }

      const nowItalyPseudo = toPseudoIso(nowPseudo)
      const thresholdItalyPseudo = toPseudoIso(thresholdPseudo)

      const { count } = await supabase
        .from("todolist")
        .select("*", { count: "exact", head: true })
        .neq("status", "completed")
        .lte("scheduled_execution", nowItalyPseudo)
        .gte("end_day_time", thresholdItalyPseudo)

      todayCount = count || 0
    } else {
      // Admin/referrer: tutte le todolist di oggi (qualsiasi stato)
      const { count } = await supabase
        .from("todolist")
        .select("*", { count: "exact", head: true })
        .gte("scheduled_execution", `${today}T00:00:00`)
        .lt("scheduled_execution", `${today}T23:59:59`)
      
      todayCount = count || 0
    }

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
      today: todayCount,
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
        allCategories={allCategories}
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
