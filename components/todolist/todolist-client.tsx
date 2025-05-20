"use client"

import { useState, useTransition } from "react"
import { updateTaskStatus, updateTaskValue, deleteTodolist, getTodolistTasks } from "@/app/actions/actions-todolist"
import type { Task } from "@/app/actions/actions-todolist"

interface Props {
  initialData: { tasks: Task[]; hasMore: boolean }
  deviceId: string
  date: string
  timeSlot: string
}

export default function TodolistClient({ initialData, deviceId, date, timeSlot }: Props) {
  const [tasks, setTasks] = useState(initialData.tasks)
  const [hasMore, setHasMore] = useState(initialData.hasMore)
  const [offset, setOffset] = useState(initialData.tasks.length)
  const [isPending, startTransition] = useTransition()

  // Paginazione
  const loadMore = () => {
    startTransition(async () => {
      const res = await getTodolistTasks({ deviceId, date, timeSlot, offset, limit: 20 })
      setTasks(prev => [...prev, ...res.tasks])
      setHasMore(res.hasMore)
      setOffset(prev => prev + res.tasks.length)
    })
  }

  // Aggiorna stato
  const handleStatus = (taskId: string, status: string) => {
    startTransition(async () => {
      const updated = await updateTaskStatus(taskId, status)
      setTasks(prev => prev.map(t => t.id === taskId ? updated : t))
    })
  }

  // Aggiorna valore
  const handleValue = (taskId: string, value: any) => {
    startTransition(async () => {
      const updated = await updateTaskValue(taskId, value)
      setTasks(prev => prev.map(t => t.id === taskId ? updated : t))
    })
  }

  // Elimina tutta la todolist
  const handleDelete = () => {
    if (!confirm("Eliminare tutta la todolist?")) return
    startTransition(async () => {
      await deleteTodolist(deviceId, date, timeSlot)
      setTasks([])
      setHasMore(false)
    })
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">Todolist ({date} - {timeSlot})</h2>
        <button onClick={handleDelete} className="text-red-600 text-sm">Elimina tutto</button>
      </div>
      <ul className="space-y-2">
        {tasks.map(task => (
          <li key={task.id} className="border rounded p-2 flex items-center gap-2">
            <span className="flex-1">{task.kpi_id}</span>
            <select
              value={task.status}
              onChange={e => handleStatus(task.id, e.target.value)}
              disabled={isPending}
              className="border rounded px-2 py-1"
            >
              <option value="pending">Da fare</option>
              <option value="completed">Completata</option>
            </select>
            <input
              type="text"
              value={task.value ?? ""}
              onChange={e => handleValue(task.id, e.target.value)}
              disabled={isPending}
              className="border rounded px-2 py-1 w-24"
              placeholder="Valore"
            />
          </li>
        ))}
      </ul>
      {hasMore && (
        <button
          onClick={loadMore}
          disabled={isPending}
          className="mt-4 px-4 py-2 bg-gray-200 rounded"
        >
          Carica altri
        </button>
      )}
      {tasks.length === 0 && <div className="text-gray-500 mt-4">Nessuna task trovata.</div>}
    </div>
  )
} 