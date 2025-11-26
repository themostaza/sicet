import { createServerSupabaseClient } from "@/lib/supabase-server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"
import TodolistListClient from "@/components/todolists/client"
import { getTodolistCategories, getTodolistCounts } from "@/app/actions/actions-todolist"

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

    // Get all existing todolist categories and counts in parallel (optimized RPC calls)
    const [allCategories, counts] = await Promise.all([
      getTodolistCategories(),
      getTodolistCounts(userRole)
    ])

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
