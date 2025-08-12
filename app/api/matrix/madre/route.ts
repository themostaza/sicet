import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"

type GroupResponse = {
  device_id: string
  device_name: string
  groupType: "single" | "composite"
  // single-kpi
  kpi_id?: string
  kpi_name?: string
  // composite-kpi
  compositeKey?: string
  kpi_ids?: string[]
  kpi_names?: string[]
  // metrics
  totalScheduledCount: number
  futureRemainingCount: number
  firstScheduledExecution: string | null
  lastScheduledExecution: string | null
  nextScheduledExecution: string | null
  statusCounts: {
    pending: number
    in_progress: number
    completed: number
  }
  timeSlotTypes: Array<"standard" | "custom">
  customTimeSlot: {
    minStart: number | null
    maxEnd: number | null
  }
  lastEndOfDayTime: string | null
  categories: string[]
  label: string
  frequencyDays: number | null
}

type TodolistRow = {
  id: string
  device_id: string
  scheduled_execution: string
  status: "pending" | "in_progress" | "completed"
  time_slot_type: "standard" | "custom"
  time_slot_start: number | null
  time_slot_end: number | null
  end_day_time: string | null
  todolist_category: string | null
  devices: { name: string }
  tasks: { kpi_id: string }[]
}

type TaskRow = {
  todolist_id: string
  kpi_id: string
}

type KpiRow = {
  id: string
  name: string
}

type MutableGroup = Omit<GroupResponse, "label" | "frequencyDays"> & {
  _dates: Date[]
  _customStarts: number[]
  _customEnds: number[]
  _endOfDayDates: Date[]
  _categories: Set<string>
}

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

    // AuthZ: allow only admin
    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("auth_id", userData.user.id)
      .single()
    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Fetch todolists in range with device name and embedded tasks (kpi_id)
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
        end_day_time,
        todolist_category,
        devices!inner(name),
        tasks(kpi_id)
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

    const castTodolists = (todolists ?? []) as unknown as TodolistRow[]
    if (castTodolists.length === 0) {
      return NextResponse.json({ groups: [] as GroupResponse[] })
    }

    // Build mapping: todolist_id -> set of kpi_id (a todolist may contain multiple tasks/kpi)
    const todolistIdToKpiIds = new Map<string, Set<string>>()
    const allKpiIds = new Set<string>()
    for (const t of castTodolists) {
      const kpiIds = new Set<string>()
      for (const task of t.tasks ?? []) {
        if (task?.kpi_id) {
          kpiIds.add(task.kpi_id)
          allKpiIds.add(task.kpi_id)
        }
      }
      todolistIdToKpiIds.set(t.id, kpiIds)
    }

    // Fetch KPI names
    const { data: kpis, error: kpiError } = await supabase
      .from("kpis")
      .select("id,name")
      .in("id", Array.from(allKpiIds))

    if (kpiError) {
      console.error("Error fetching kpis:", kpiError)
      return NextResponse.json(
        { error: "Failed to fetch kpis" },
        { status: 500 }
      )
    }

    const kpiIdToName = new Map<string, string>()
    for (const k of (kpis ?? []) as unknown as KpiRow[]) {
      kpiIdToName.set(k.id, k.name)
    }

    // Group by rules:
    // - If a todolist has exactly 1 KPI: group as single with key (device_id, kpi_id)
    // - If a todolist has >1 KPIs: group as composite with key (device_id, compositeKey=sorted kpi ids)
    const groups = new Map<string, MutableGroup>()
    const now = new Date()

    for (const t of castTodolists) {
      const kpiIds = todolistIdToKpiIds.get(t.id)
      if (!kpiIds || kpiIds.size === 0) {
        continue
      }
      const kpiIdList = Array.from(kpiIds)
      if (kpiIdList.length === 1) {
        const kpiId = kpiIdList[0]
        const groupKey = `${t.device_id}|single|${kpiId}`
        if (!groups.has(groupKey)) {
          groups.set(groupKey, {
            device_id: t.device_id,
            device_name: t.devices?.name ?? t.device_id,
            groupType: "single",
            kpi_id: kpiId,
            kpi_name: kpiIdToName.get(kpiId) ?? kpiId,
            totalScheduledCount: 0,
            futureRemainingCount: 0,
            firstScheduledExecution: null,
            lastScheduledExecution: null,
            nextScheduledExecution: null,
            statusCounts: { pending: 0, in_progress: 0, completed: 0 },
            timeSlotTypes: [],
            customTimeSlot: { minStart: null, maxEnd: null },
            lastEndOfDayTime: null,
            categories: [],
            _dates: [],
            _customStarts: [],
            _customEnds: [],
            _endOfDayDates: [],
            _categories: new Set<string>(),
          })
        }
        const g = groups.get(groupKey)!
        g.totalScheduledCount += 1
        if (new Date(t.scheduled_execution) > now && t.status !== "completed") {
          g.futureRemainingCount += 1
        }
        if (t.status === "pending") g.statusCounts.pending += 1
        else if (t.status === "in_progress") g.statusCounts.in_progress += 1
        else if (t.status === "completed") g.statusCounts.completed += 1
        const slotType = t.time_slot_type === "custom" ? "custom" : "standard"
        if (!g.timeSlotTypes.includes(slotType)) {
          g.timeSlotTypes.push(slotType)
        }
        if (slotType === "custom") {
          if (typeof t.time_slot_start === "number") g._customStarts.push(t.time_slot_start)
          if (typeof t.time_slot_end === "number") g._customEnds.push(t.time_slot_end)
        }
        g._dates.push(new Date(t.scheduled_execution))
        if (t.end_day_time) g._endOfDayDates.push(new Date(t.end_day_time))
        if (t.todolist_category) g._categories.add(t.todolist_category)
      } else {
        const sortedKpis = kpiIdList.slice().sort()
        const compositeKey = sortedKpis.join("+")
        const groupKey = `${t.device_id}|composite|${compositeKey}`
        if (!groups.has(groupKey)) {
          groups.set(groupKey, {
            device_id: t.device_id,
            device_name: t.devices?.name ?? t.device_id,
            groupType: "composite",
            compositeKey,
            kpi_ids: sortedKpis,
            kpi_names: sortedKpis.map(id => kpiIdToName.get(id) ?? id),
            totalScheduledCount: 0,
            futureRemainingCount: 0,
            firstScheduledExecution: null,
            lastScheduledExecution: null,
            nextScheduledExecution: null,
            statusCounts: { pending: 0, in_progress: 0, completed: 0 },
            timeSlotTypes: [],
            customTimeSlot: { minStart: null, maxEnd: null },
            lastEndOfDayTime: null,
            categories: [],
            _dates: [],
            _customStarts: [],
            _customEnds: [],
            _endOfDayDates: [],
            _categories: new Set<string>(),
          })
        }
        const g = groups.get(groupKey)!
        g.totalScheduledCount += 1
        if (new Date(t.scheduled_execution) > now && t.status !== "completed") {
          g.futureRemainingCount += 1
        }
        if (t.status === "pending") g.statusCounts.pending += 1
        else if (t.status === "in_progress") g.statusCounts.in_progress += 1
        else if (t.status === "completed") g.statusCounts.completed += 1
        const slotType = t.time_slot_type === "custom" ? "custom" : "standard"
        if (!g.timeSlotTypes.includes(slotType)) {
          g.timeSlotTypes.push(slotType)
        }
        if (slotType === "custom") {
          if (typeof t.time_slot_start === "number") g._customStarts.push(t.time_slot_start)
          if (typeof t.time_slot_end === "number") g._customEnds.push(t.time_slot_end)
        }
        g._dates.push(new Date(t.scheduled_execution))
        if (t.end_day_time) g._endOfDayDates.push(new Date(t.end_day_time))
        if (t.todolist_category) g._categories.add(t.todolist_category)
      }
    }

    // Finalize aggregates
    const results: GroupResponse[] = []
    for (const [, g] of groups) {
      g._dates.sort((a, b) => a.getTime() - b.getTime())
      const first = g._dates[0]
      const last = g._dates[g._dates.length - 1]
      const next = g._dates.find(d => d > now) || null

      const minStart = g._customStarts.length ? Math.min(...g._customStarts) : null
      const maxEnd = g._customEnds.length ? Math.max(...g._customEnds) : null

      const lastEnd = g._endOfDayDates.length
        ? g._endOfDayDates.sort((a, b) => b.getTime() - a.getTime())[0]
        : null

      // Frequency in days: average interval between consecutive scheduled_execution dates
      let frequencyDays: number | null = null
      if (g._dates.length >= 2) {
        let sumDays = 0
        for (let i = 0; i < g._dates.length - 1; i++) {
          const diffMs = g._dates[i + 1].getTime() - g._dates[i].getTime()
          sumDays += diffMs / (1000 * 60 * 60 * 24)
        }
        frequencyDays = sumDays / (g._dates.length - 1)
      }

      const base = {
        device_id: g.device_id,
        device_name: g.device_name,
        totalScheduledCount: g.totalScheduledCount,
        futureRemainingCount: g.futureRemainingCount,
        firstScheduledExecution: first ? first.toISOString() : null,
        lastScheduledExecution: last ? last.toISOString() : null,
        nextScheduledExecution: next ? next.toISOString() : null,
        statusCounts: g.statusCounts,
        timeSlotTypes: g.timeSlotTypes,
        customTimeSlot: { minStart, maxEnd },
        lastEndOfDayTime: lastEnd ? lastEnd.toISOString() : null,
        categories: Array.from(g._categories),
      }

      if (g.groupType === "composite") {
        const compNames: string[] = g.kpi_names || []
        const compKey: string = g.compositeKey || ""
        results.push({
          ...base,
          groupType: "composite",
          compositeKey: g.compositeKey,
          kpi_ids: g.kpi_ids,
          kpi_names: g.kpi_names,
          label: compNames.length ? compNames.join(", ") : compKey,
          frequencyDays,
        })
      } else {
        const singleName: string | undefined = g.kpi_name
        const singleId: string | undefined = g.kpi_id
        results.push({
          ...base,
          groupType: "single",
          kpi_id: g.kpi_id,
          kpi_name: g.kpi_name,
          label: singleName ?? singleId ?? "-",
          frequencyDays,
        })
      }
    }

    return NextResponse.json({ groups: results })
  } catch (error) {
    console.error("Error in matrix madre API:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}


