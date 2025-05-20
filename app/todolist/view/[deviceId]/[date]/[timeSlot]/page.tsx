import type React from "react"

import { AlertCircle } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { getTodolistTasks } from "@/app/actions/actions-todolist"
import TodolistClient from "@/components/todolist/todolist-client"

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

export default async function TodolistViewPage({ params }: { params: { deviceId: string; date: string; timeSlot: string } }) {
  const { deviceId, date, timeSlot } = await params

  // Fetch server-side con paginazione
  const initialData = await getTodolistTasks({
    deviceId,
    date,
    timeSlot,
    offset: 0,
    limit: 20,
  })

  return (
    <div>
      <TodolistClient
        initialData={initialData}
        deviceId={deviceId}
        date={date}
        timeSlot={timeSlot}
      />
    </div>
  )
}
