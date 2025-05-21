import type React from "react"
import { Suspense } from "react"
import { AlertCircle, Loader2 } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { getTodolistTasks } from "@/app/actions/actions-todolist"
import TodolistClient from "@/components/todolist/todolist-client"
import { getKpis } from "@/app/actions/actions-kpi"
import { getDevice } from "@/app/actions/actions-device"

interface FieldErrorTooltipProps {
  message: string
}

const FieldErrorTooltip: React.FC<FieldErrorTooltipProps> = ({ message }) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <AlertCircle className="h-4 w-4 ml-1 text-red-500" />
        </TooltipTrigger>
        <TooltipContent className="bg-red-500 text-white">
          <p>{message}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

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
async function TodolistContent({ params }: { params: { deviceId: string; date: string; timeSlot: string } }) {
  // Fetch server-side con paginazione
  const initialData = await getTodolistTasks({
    deviceId: params.deviceId,
    date: params.date,
    timeSlot: params.timeSlot,
    offset: 0,
    limit: 20,
  })

  return (
    <TodolistClient
      initialData={initialData}
      deviceId={params.deviceId}
      date={params.date}
      timeSlot={params.timeSlot}
    />
  )
}

export default async function Page({ params }: { params: { deviceId: string; date: string; timeSlot: string } }) {
  // Awaiting params to ensure they're fully available
  const { deviceId, date, timeSlot } = await Promise.resolve(params);
  
  // Carica in parallelo tutti i dati necessari
  const [initialData, kpisData, device] = await Promise.all([
    getTodolistTasks({
      deviceId,
      date,
      timeSlot,
      offset: 0,
      limit: 20,
    }),
    getKpis({ offset: 0, limit: 100 }),
    getDevice(deviceId)
  ]);

  return (
    <Suspense fallback={<div className="p-6">Caricamento todolist...</div>}>
      <TodolistClient
        initialData={initialData}
        deviceId={deviceId}
        date={date}
        timeSlot={timeSlot}
        initialKpis={kpisData.kpis}
        deviceInfo={device ? { name: device.name, location: device.location } : null}
      />
    </Suspense>
  )
}
