import type React from "react"
import { Suspense } from "react"
import { AlertCircle, Loader2 } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { getTodolistTasksById, getTodolistById } from "@/app/actions/actions-todolist"
import TodolistClient from "@/components/todolist/todolist-client"
import { getKpis } from "@/app/actions/actions-kpi"
import { getDevice } from "@/app/actions/actions-device"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

// Componente di loading
function TodolistLoading() {
  return (
    <div className="flex items-center justify-center h-96 w-full">
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Caricamento todolist...</p>
      </div>
    </div>
  )
}

// Componente per il contenuto della todolist 
async function TodolistContent({ params }: { params: { todolistId: string; deviceId: string; date: string; timeSlot: string } }) {
  // Fetch server-side con paginazione
  const initialData = await getTodolistTasksById({
    todolistId: params.todolistId,
    offset: 0,
    limit: 20,
  })

  // If no tasks are found, show a message
  if (initialData.tasks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            Nessuna attività programmata
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Non ci sono attività programmate per questo punto di controllo nella fascia oraria attuale.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <TodolistClient
      initialData={initialData}
      todolistId={params.todolistId}
      deviceId={params.deviceId}
      date={params.date}
      timeSlot={params.timeSlot}
    />
  )
}

export default async function Page(
  props: { params: Promise<{ todolistId: string; deviceId: string; date: string; timeSlot: string }> }
) {
  const params = await props.params;
  // Awaiting params to ensure they're fully available
  const { todolistId, deviceId, date, timeSlot } = await Promise.resolve(params);

  // Carica in parallelo tutti i dati necessari
  const [initialData, kpisData, device, todolist] = await Promise.all([
    getTodolistTasksById({
      todolistId,
      offset: 0,
      limit: 20,
    }),
    getKpis({ offset: 0, limit: 100 }),
    getDevice(deviceId),
    getTodolistById(todolistId)
  ]);

  return (
    <Suspense fallback={<div className="p-6">Caricamento todolist...</div>}>
      <TodolistClient
        initialData={initialData}
        todolistId={todolistId}
        deviceId={deviceId}
        date={date}
        timeSlot={timeSlot}
        initialKpis={kpisData.kpis}
        deviceInfo={device ? { name: device.name, location: device.location } : null}
        todolistData={todolist}
      />
    </Suspense>
  )
} 