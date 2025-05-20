"use client"

import React from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Calendar, AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react"

type TimeSlot = "mattina" | "pomeriggio" | "sera" | "notte"
type FilterType = "all" | "today" | "overdue" | "future" | "completed"

type TodolistItem = {
  device_id: string
  device_name: string
  date: string
  time_slot: TimeSlot
  status: string
  count: number
}

interface Props {
  todolistsByFilter: Record<FilterType, TodolistItem[]>
  counts: Record<FilterType, number>
  initialFilter: FilterType
}

const timeSlotOrder: Record<TimeSlot, number> = {
  mattina: 1,
  pomeriggio: 2,
  sera: 3,
  notte: 4,
}

export default function TodolistListClient({ todolistsByFilter, counts, initialFilter }: Props) {
  const router = useRouter()
  const [activeFilter, setActiveFilter] = React.useState<FilterType>(initialFilter)

  const filtered = todolistsByFilter[activeFilter]

  const handleRowClick = (todolist: TodolistItem) => {
    router.push(`/todolist/view/${todolist.device_id}/${todolist.date}/${todolist.time_slot}`)
  }

  return (
    <div>
      {/* Filtri */}
      <div className="flex gap-2 mb-4">
        <button
          className={`px-3 py-1 rounded ${activeFilter === "all" ? "bg-primary text-white" : "bg-gray-100"}`}
          onClick={() => setActiveFilter("all")}
        >
          Tutte <Badge>{counts.all}</Badge>
        </button>
        <button
          className={`px-3 py-1 rounded ${activeFilter === "today" ? "bg-primary text-white" : "bg-gray-100"}`}
          onClick={() => setActiveFilter("today")}
        >
          Oggi <Badge>{counts.today}</Badge>
        </button>
        <button
          className={`px-3 py-1 rounded ${activeFilter === "overdue" ? "bg-primary text-white" : "bg-gray-100"}`}
          onClick={() => setActiveFilter("overdue")}
        >
          Scadute <Badge>{counts.overdue}</Badge>
        </button>
        <button
          className={`px-3 py-1 rounded ${activeFilter === "future" ? "bg-primary text-white" : "bg-gray-100"}`}
          onClick={() => setActiveFilter("future")}
        >
          Future <Badge>{counts.future}</Badge>
        </button>
        <button
          className={`px-3 py-1 rounded ${activeFilter === "completed" ? "bg-primary text-white" : "bg-gray-100"}`}
          onClick={() => setActiveFilter("completed")}
        >
          Completate <Badge>{counts.completed}</Badge>
        </button>
      </div>

      {/* Tabella */}
      <div className="overflow-x-auto">
        <table className="min-w-full border bg-white">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-3 py-2 text-left">Dispositivo</th>
              <th className="px-3 py-2 text-left">Data</th>
              <th className="px-3 py-2 text-left">Fascia</th>
              <th className="px-3 py-2 text-left">Stato</th>
              <th className="px-3 py-2 text-left">Task</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-gray-400 py-8">
                  Nessuna todolist trovata.
                </td>
              </tr>
            )}
            {filtered.map((item) => (
              <tr
                key={`${item.device_id}_${item.date}_${item.time_slot}`}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => handleRowClick(item)}
              >
                <td className="px-3 py-2">{item.device_name}</td>
                <td className="px-3 py-2">{item.date}</td>
                <td className="px-3 py-2">{item.time_slot}</td>
                <td className="px-3 py-2">
                  {item.status === "completed" ? (
                    <span className="inline-flex items-center gap-1 text-green-600">
                      <CheckCircle2 size={16} /> Completata
                    </span>
                  ) : item.status === "in_progress" ? (
                    <span className="inline-flex items-center gap-1 text-yellow-600">
                      <AlertTriangle size={16} /> In corso
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-gray-500">
                      <Calendar size={16} /> Da fare
                    </span>
                  )}
                </td>
                <td className="px-3 py-2">{item.count}</td>
                <td className="px-3 py-2">
                  <ArrowRight size={18} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
