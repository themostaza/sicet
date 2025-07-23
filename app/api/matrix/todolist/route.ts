import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { isTodolistExpired } from "@/lib/validation/todolist-schemas"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { searchParams } = new URL(request.url)
    
    const dateFrom = searchParams.get("dateFrom")
    const dateTo = searchParams.get("dateTo")
    
    if (!dateFrom || !dateTo) {
      return NextResponse.json(
        { error: "dateFrom and dateTo parameters are required" },
        { status: 400 }
      )
    }

    // Recupera le todolist nel periodo specificato
    const { data: todolists, error: todolistError } = await supabase
      .from("todolist")
      .select(`
        id,
        device_id,
        scheduled_execution,
        status,
        time_slot_type,
        time_slot_start,
        time_slot_end,
        completion_date,
        devices!inner(name)
      `)
      .gte("scheduled_execution", `${dateFrom}T00:00:00`)
      .lte("scheduled_execution", `${dateTo}T23:59:59`)
      .order("scheduled_execution", { ascending: true })

    if (todolistError) {
      console.error("Error fetching todolists:", todolistError)
      return NextResponse.json(
        { error: "Failed to fetch todolists" },
        { status: 500 }
      )
    }

    // Filtra le todolist completate o scadute
    const filteredTodolists = todolists?.filter(todolist => {
      if (todolist.status === "completed") {
        return true
      }
      
      // Verifica se è scaduta
      const isExpired = isTodolistExpired(
        todolist.scheduled_execution,
        todolist.time_slot_type as "standard" | "custom",
        todolist.time_slot_end,
        todolist.time_slot_start
      )
      
      return isExpired
    }) || []

    if (filteredTodolists.length === 0) {
      return NextResponse.json({ todolists: [], controls: [] })
    }

    // Recupera i tasks per tutte le todolist filtrate
    const todolistIds = filteredTodolists.map(t => t.id)
    
    const { data: tasks, error: tasksError } = await supabase
      .from("tasks")
      .select(`
        id,
        kpi_id,
        todolist_id,
        status,
        value,
        kpis!tasks_kpi_id_fkey(id, name)
      `)
      .in("todolist_id", todolistIds)

    if (tasksError) {
      console.error("Error fetching tasks:", tasksError)
      return NextResponse.json(
        { error: "Failed to fetch tasks" },
        { status: 500 }
      )
    }

    // Raggruppa i tasks per todolist ed estrai i campi JSONB
    const tasksByTodolist = tasks?.reduce((acc, task) => {
      if (!acc[task.todolist_id]) {
        acc[task.todolist_id] = []
      }
      acc[task.todolist_id].push({
        id: task.id,
        kpi_id: task.kpi_id,
        kpi_name: task.kpis.name,
        status: task.status,
        value: task.value
      })
      return acc
    }, {} as Record<string, any[]>) || {}

    // Estrai tutti i campi JSONB unici da tutti i tasks
    const allJsonbFields = new Set<string>()
    tasks?.forEach(task => {
      if (task.value && Array.isArray(task.value)) {
        task.value.forEach((item: any) => {
          if (item.id) {
            allJsonbFields.add(item.id)
          }
        })
      }
    })

    // Funzione per formattare il nome del campo
    const formatFieldName = (fieldId: string): string => {
      // Rimuovi il codice alfanumerico iniziale e i trattini
      const withoutCode = fieldId.replace(/^[A-Z0-9]+-/, '')
      // Sostituisci underscore con spazi e capitalizza
      return withoutCode.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    }

    // Crea la lista dei controlli (ora sono i campi JSONB)
    const allControls = Array.from(allJsonbFields).map(fieldId => ({
      id: fieldId,
      name: formatFieldName(fieldId)
    }))

    // Formatta i dati per la risposta
    const formattedTodolists = filteredTodolists.map(todolist => ({
      id: todolist.id,
      device_id: todolist.device_id,
      device_name: todolist.devices.name,
      scheduled_execution: todolist.scheduled_execution,
      status: todolist.status,
      time_slot_type: todolist.time_slot_type,
      time_slot_start: todolist.time_slot_start,
      time_slot_end: todolist.time_slot_end,
      completion_date: todolist.completion_date,
      isExpired: todolist.status !== "completed" && isTodolistExpired(
        todolist.scheduled_execution,
        todolist.time_slot_type as "standard" | "custom",
        todolist.time_slot_end,
        todolist.time_slot_start
      ),
      tasks: tasksByTodolist[todolist.id] || []
    }))

    return NextResponse.json({
      todolists: formattedTodolists,
      controls: allControls
    })

  } catch (error) {
    console.error("Error in matrix todolist API:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 