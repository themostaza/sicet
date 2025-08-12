"use client"

import React, { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Calendar as CalendarIcon, Download, Loader2, Settings } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { toast } from "@/components/ui/use-toast"

type GroupRow = {
  device_id: string
  device_name: string
  groupType: "single" | "composite"
  kpi_id?: string
  kpi_name?: string
  compositeKey?: string
  kpi_ids?: string[]
  kpi_names?: string[]
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
  customTimeSlot: { minStart: number | null; maxEnd: number | null }
  lastEndOfDayTime: string | null
  categories: string[]
  frequencyDays: number | null
}

type ViewRowBase = {
  totalScheduledCount: number
  futureRemainingCount: number
  firstScheduledExecution: string | null
  lastScheduledExecution: string | null
  nextScheduledExecution: string | null
  statusCounts: { pending: number; in_progress: number; completed: number }
  timeSlotTypes: Array<"standard" | "custom">
  customTimeSlot: { minStart: number | null; maxEnd: number | null }
  lastEndOfDayTime: string | null
  categories: string[]
  frequencyDays: number | null
}

type DeviceRow = ViewRowBase & {
  view: "device"
  device_id: string
  device_name: string
  groupType: "single" | "composite"
  kpi_id?: string
  kpi_name?: string
  compositeKey?: string
  kpi_ids?: string[]
  kpi_names?: string[]
}

type AggregatedRow = ViewRowBase & {
  view: "aggregated"
  baseKey: string // single|<kpi_id> or composite|<compositeKey>
  label: string // KPI name(s)
  deviceCount: number
  deviceBreakdown: DeviceRow[]
}

function formatUTC(dateString: string | null, pattern: string): string {
  if (!dateString) return "-"
  const date = new Date(dateString)
  const pad = (n: number) => n.toString().padStart(2, "0")
  if (pattern === "dd/MM/yyyy HH:mm") {
    return `${pad(date.getUTCDate())}/${pad(date.getUTCMonth() + 1)}/${date.getUTCFullYear()} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`
  }
  if (pattern === "dd/MM/yyyy") {
    return `${pad(date.getUTCDate())}/${pad(date.getUTCMonth() + 1)}/${date.getUTCFullYear()}`
  }
  if (pattern === "HH:mm") {
    return `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`
  }
  return date.toISOString()
}

export default function MatriceMadre() {
  const [dateFrom, setDateFrom] = useState<Date>(() => {
    const d = new Date()
    d.setDate(d.getDate() + 1) // domani
    return d
  })
  const [dateTo, setDateTo] = useState<Date>(() => {
    const d = new Date()
    d.setFullYear(d.getFullYear() + 2) // tra 2 anni
    return d
  })
  const [isLoading, setIsLoading] = useState(false)
  const [groups, setGroups] = useState<GroupRow[]>([])
  const [showFromCalendar, setShowFromCalendar] = useState(false)
  const [showToCalendar, setShowToCalendar] = useState(false)
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set())

  const loadData = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        dateFrom: format(dateFrom, "yyyy-MM-dd"),
        dateTo: format(dateTo, "yyyy-MM-dd"),
      })
      const res = await fetch(`/api/matrix/madre?${params.toString()}`)
      if (!res.ok) {
        throw new Error("Failed to load data")
      }
      const data: { groups: GroupRow[] } = await res.json()
      setGroups(data.groups)
    } catch (e) {
      console.error(e)
      toast({ title: "Errore", description: "Impossibile caricare i dati.", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo])

  const exportToExcel = async () => {
    try {
      if (groups.length === 0) {
        toast({ title: "Nessun dato", description: "Non ci sono gruppi da esportare.", variant: "destructive" })
        return
      }
      const XLSX = await import("xlsx")
      const excelData: (string | number)[][] = []
      const header = [
        "Device/Grupo",
        "KPI",
        "Da compilare (future)",
        "Frequenza media (giorni)",
        "Ultima programmata",
        "Ultimo end_day_time",
      ]
      excelData.push(header)
      groups.forEach(g => {
        const label = g.groupType === "single" ? (g.kpi_name ?? g.kpi_id ?? "") : (g.kpi_names?.join(", ") ?? g.compositeKey ?? "")
        excelData.push([
          `${g.device_name} (${g.device_id})`,
          label,
          g.futureRemainingCount,
          g.frequencyDays !== null ? Number(g.frequencyDays.toFixed(2)) : "-",
          formatUTC(g.lastScheduledExecution, "dd/MM/yyyy HH:mm"),
          formatUTC(g.lastEndOfDayTime, "dd/MM/yyyy HH:mm"),
        ])
      })
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.aoa_to_sheet(excelData)
      ws["!cols"] = [
        { wch: 28 },
        { wch: 28 },
        { wch: 18 },
        { wch: 20 },
        { wch: 22 },
        { wch: 12 },
        { wch: 22 },
      ]
      XLSX.utils.book_append_sheet(wb, ws, "Matrice Madre")
      const fileName = `matrice-madre_${format(dateFrom, "dd-MM-yyyy")}_${format(dateTo, "dd-MM-yyyy")}.xlsx`
      XLSX.writeFile(wb, fileName)
      toast({ title: "Export completato", description: `File: ${fileName}` })
    } catch (e) {
      console.error(e)
      toast({ title: "Errore Export", description: "Si è verificato un errore.", variant: "destructive" })
    }
  }

  const sortedGroups = useMemo(() => {
    return [...groups].sort((a, b) => {
      const gt = (x: GroupRow) => x.groupType
      // Sort: groupType, KPI/composite label, then device
      const labelA = a.groupType === "single" ? (a.kpi_name ?? a.kpi_id ?? "") : (a.kpi_names?.join(", ") ?? a.compositeKey ?? "")
      const labelB = b.groupType === "single" ? (b.kpi_name ?? b.kpi_id ?? "") : (b.kpi_names?.join(", ") ?? b.compositeKey ?? "")
      const gl = labelA.localeCompare(labelB)
      if (gl !== 0) return gl
      return a.device_name.localeCompare(b.device_name)
    })
  }, [groups])

  const aggregateAcrossDevices = (rows: GroupRow[]): AggregatedRow[] => {
    const map = new Map<string, AggregatedRow>()
    const toDeviceRow = (r: GroupRow): DeviceRow => ({
      view: "device",
      device_id: r.device_id,
      device_name: r.device_name,
      groupType: r.groupType,
      kpi_id: r.kpi_id,
      kpi_name: r.kpi_name,
      compositeKey: r.compositeKey,
      kpi_ids: r.kpi_ids,
      kpi_names: r.kpi_names,
      totalScheduledCount: r.totalScheduledCount,
      futureRemainingCount: r.futureRemainingCount,
      firstScheduledExecution: r.firstScheduledExecution,
      lastScheduledExecution: r.lastScheduledExecution,
      nextScheduledExecution: r.nextScheduledExecution,
      statusCounts: r.statusCounts,
      timeSlotTypes: r.timeSlotTypes,
      customTimeSlot: r.customTimeSlot,
      lastEndOfDayTime: r.lastEndOfDayTime,
      categories: r.categories,
      frequencyDays: r.frequencyDays,
    })

    const now = new Date()

    for (const r of rows) {
      const baseKey = r.groupType === "single" ? `single|${r.kpi_id}` : `composite|${r.compositeKey}`
      const label = r.groupType === "single" ? (r.kpi_name ?? r.kpi_id ?? "") : (r.kpi_names?.join(", ") ?? r.compositeKey ?? "")
      if (!map.has(baseKey)) {
        map.set(baseKey, {
          view: "aggregated",
          baseKey,
          label,
          deviceCount: 0,
          deviceBreakdown: [],
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
          frequencyDays: null,
        })
      }
      const agg = map.get(baseKey)!
      agg.deviceCount += 1
      agg.deviceBreakdown.push(toDeviceRow(r))
      agg.totalScheduledCount += r.totalScheduledCount
      agg.futureRemainingCount += r.futureRemainingCount
      // dates
      const firsts = [agg.firstScheduledExecution, r.firstScheduledExecution].filter(Boolean) as string[]
      agg.firstScheduledExecution = firsts.length ? new Date(Math.min(...firsts.map(d => new Date(d).getTime()))).toISOString() : agg.firstScheduledExecution ?? r.firstScheduledExecution
      const lasts = [agg.lastScheduledExecution, r.lastScheduledExecution].filter(Boolean) as string[]
      agg.lastScheduledExecution = lasts.length ? new Date(Math.max(...lasts.map(d => new Date(d).getTime()))).toISOString() : agg.lastScheduledExecution ?? r.lastScheduledExecution
      const candidates = [agg.nextScheduledExecution, r.nextScheduledExecution].filter(d => d && new Date(d) > now) as string[]
      agg.nextScheduledExecution = candidates.length ? new Date(Math.min(...candidates.map(d => new Date(d).getTime()))).toISOString() : agg.nextScheduledExecution ?? r.nextScheduledExecution
      // status
      agg.statusCounts.pending += r.statusCounts.pending
      agg.statusCounts.in_progress += r.statusCounts.in_progress
      agg.statusCounts.completed += r.statusCounts.completed
      // time slots
      for (const t of r.timeSlotTypes) if (!agg.timeSlotTypes.includes(t)) agg.timeSlotTypes.push(t)
      agg.customTimeSlot.minStart = (
        agg.customTimeSlot.minStart === null ? r.customTimeSlot.minStart : (r.customTimeSlot.minStart === null ? agg.customTimeSlot.minStart : Math.min(agg.customTimeSlot.minStart, r.customTimeSlot.minStart))
      )
      agg.customTimeSlot.maxEnd = (
        agg.customTimeSlot.maxEnd === null ? r.customTimeSlot.maxEnd : (r.customTimeSlot.maxEnd === null ? agg.customTimeSlot.maxEnd : Math.max(agg.customTimeSlot.maxEnd, r.customTimeSlot.maxEnd))
      )
      // last end-of-day
      const endCandidates = [agg.lastEndOfDayTime, r.lastEndOfDayTime].filter(Boolean) as string[]
      agg.lastEndOfDayTime = endCandidates.length ? new Date(Math.max(...endCandidates.map(d => new Date(d).getTime()))).toISOString() : agg.lastEndOfDayTime ?? r.lastEndOfDayTime
      // categories
      const catSet = new Set([...
        agg.categories,
        ...r.categories,
      ])
      agg.categories = Array.from(catSet)
      // frequency: average of device frequencies (simple mean across devices that have it)
      const existing = agg.frequencyDays
      if (existing === null) {
        agg.frequencyDays = r.frequencyDays
      } else if (r.frequencyDays !== null) {
        // naive running mean: average of two; acceptable for display
        agg.frequencyDays = (existing + r.frequencyDays) / 2
      }
    }

    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label))
  }

  const viewRows = useMemo<(DeviceRow | AggregatedRow)[]>(() => {
    return aggregateAcrossDevices(sortedGroups)
  }, [sortedGroups])

  const toggleExpand = (key: string) => {
    const s = new Set(expandedKeys)
    if (s.has(key)) s.delete(key); else s.add(key)
    setExpandedKeys(s)
  }

  return (
    <div className="w-full">
      <div className="flex gap-2 mb-4 items-center">
        <Popover open={showFromCalendar} onOpenChange={setShowFromCalendar}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn("w-fit min-w-[120px] justify-start text-left font-normal max-w-[180px]")}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(dateFrom, "dd/MM/yyyy")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={dateFrom}
              onSelect={(d) => { if (d) setDateFrom(d); setShowFromCalendar(false) }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        <Popover open={showToCalendar} onOpenChange={setShowToCalendar}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn("w-fit min-w[120px] justify-start text-left font-normal max-w-[180px]")}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(dateTo, "dd/MM/yyyy")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={dateTo}
              onSelect={(d) => { if (d) setDateTo(d); setShowToCalendar(false) }}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        <Button variant="outline" size="sm" onClick={loadData} disabled={isLoading} className="gap-2">
          {isLoading ? (<><Loader2 className="h-4 w-4 animate-spin" /> Caricamento...</>) : ("Ricarica")}
        </Button>

        <Button variant="outline" size="sm" onClick={exportToExcel} disabled={isLoading || groups.length === 0} className="gap-2 ml-auto">
          <Download className="h-4 w-4" /> Export Excel
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Caricamento dati...</span>
        </div>
      ) : groups.length === 0 ? (
        <div className="flex items-center justify-center h-64 text-gray-500">
          <p>Nessun gruppo trovato nel periodo selezionato</p>
        </div>
      ) : (
        <div className="overflow-x-auto overflow-y-auto">
          <Table className="w-auto border-separate border-spacing-0">
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[240px] border-r border-b">Punti di Controllo / Gruppo</TableHead>
                <TableHead className="min-w-[240px] border-r border-b">Controlli</TableHead>
                <TableHead className="min-w-[160px] border-r border-b">Da compilare (future)</TableHead>
                <TableHead className="min-w-[180px] border-r border-b">Frequenza media (giorni)</TableHead>
                <TableHead className="min-w-[180px] border-r border-b">Ultima programmata</TableHead>
                <TableHead className="min-w-[200px] border-r border-b">Ultimo end_day_time</TableHead>
                <TableHead className="min-w-[200px] border-b"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {viewRows.map((row, idx) => {
                if (row.view === "device") {
                  const g = row
                  const kpiLabel = g.groupType === "single" ? `${g.kpi_name ?? g.kpi_id}` : `${g.kpi_names?.join(", ") ?? g.compositeKey}`
                  const kpiKey = g.groupType === "single" ? `${g.kpi_id}` : `${g.compositeKey}`
                  return (
                    <TableRow key={`dev-${g.device_id}-${kpiKey}-${idx}`}>
                      <TableCell className="border-r border-b">{g.device_name} <span className="text-xs text-gray-500">({g.device_id})</span></TableCell>
                      <TableCell className="border-r border-b">{kpiLabel}</TableCell>
                      <TableCell className="border-r border-b">{g.totalScheduledCount}</TableCell>
                      <TableCell className="border-r border-b">{g.futureRemainingCount}</TableCell>
                      <TableCell className="border-r border-b">{formatUTC(g.nextScheduledExecution, "dd/MM/yyyy HH:mm")}</TableCell>
                      <TableCell className="border-r border-b">{formatUTC(g.lastScheduledExecution, "dd/MM/yyyy HH:mm")}</TableCell>
                      <TableCell className="border-r border-b">{g.statusCounts.completed}</TableCell>
                      <TableCell className="border-r border-b">{g.statusCounts.in_progress}</TableCell>
                      <TableCell className="border-r border-b">{g.statusCounts.pending}</TableCell>
                      <TableCell className="border-r border-b">{g.timeSlotTypes.join(", ")}</TableCell>
                      <TableCell className="border-r border-b">{g.customTimeSlot.minStart ?? "-"}</TableCell>
                      <TableCell className="border-r border-b">{g.customTimeSlot.maxEnd ?? "-"}</TableCell>
                      <TableCell className="border-r border-b">{formatUTC(g.lastEndOfDayTime, "dd/MM/yyyy HH:mm")}</TableCell>
                      <TableCell className="border-b">{g.categories.join(", ") || "-"}</TableCell>
                    </TableRow>
                  )
                } else {
                  const g = row
                  const isOpen = expandedKeys.has(g.baseKey)
                  return (
                    <React.Fragment key={`agg-frag-${g.baseKey}-${idx}`}>
                      <TableRow key={`agg-${g.baseKey}-${idx}`}>
                        <TableCell className="border-r border-b">
                          <button className="mr-2 text-sm underline" onClick={() => toggleExpand(g.baseKey)}>
                            {isOpen ? "Nascondi" : "Dettagli"}
                          </button>
                          Tutti i device <span className="text-xs text-gray-500">({g.deviceCount})</span>
                        </TableCell>
                        <TableCell className="border-r border-b">{g.label}</TableCell>
                        <TableCell className="border-r border-b">{g.futureRemainingCount}</TableCell>
                        <TableCell className="border-r border-b">{g.frequencyDays !== null ? g.frequencyDays.toFixed(2) : "-"}</TableCell>
                        <TableCell className="border-r border-b">{formatUTC(g.lastScheduledExecution, "dd/MM/yyyy HH:mm")}</TableCell>
                        <TableCell className="border-r border-b">{formatUTC(g.lastEndOfDayTime, "dd/MM/yyyy HH:mm")}</TableCell>
                        <TableCell className="border-b"></TableCell>
                      </TableRow>
                      {isOpen && g.deviceBreakdown.map((d, j) => {
                        const kpiLabel = d.groupType === "single" ? `${d.kpi_name ?? d.kpi_id}` : `${d.kpi_names?.join(", ") ?? d.compositeKey}`
                        const kpiKey = d.groupType === "single" ? `${d.kpi_id}` : `${d.compositeKey}`
                        return (
                          <TableRow key={`agg-${g.baseKey}-dev-${kpiKey}-${j}`}>
                            <TableCell className="border-r border-b pl-8">{d.device_name} <span className="text-xs text-gray-500">({d.device_id})</span></TableCell>
                            <TableCell className="border-r border-b">{kpiLabel}</TableCell>
                            <TableCell className="border-r border-b">{d.futureRemainingCount}</TableCell>
                            <TableCell className="border-r border-b">{d.frequencyDays !== null ? d.frequencyDays.toFixed(2) : "-"}</TableCell>
                            <TableCell className="border-r border-b">{formatUTC(d.lastScheduledExecution, "dd/MM/yyyy HH:mm")}</TableCell>
                            <TableCell className="border-r border-b">{formatUTC(d.lastEndOfDayTime, "dd/MM/yyyy HH:mm")}</TableCell>
                            <TableCell className="border-b"></TableCell>
                          </TableRow>
                        )
                      })}
                    </React.Fragment>
                  )
                }
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}


