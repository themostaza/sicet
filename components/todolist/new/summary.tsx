"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ClipboardList } from "lucide-react"
import { useTodolist } from "./context"

export function Summary() {
  const { 
    selectedDevicesArray,
    selectedKpisArray,
    dateEntries,
    totalTodolistCount
  } = useTodolist()

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">Riepilogo</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-4 border-b">
            <div className="flex items-center">
              <ClipboardList className="h-5 w-5 mr-2 text-gray-500" />
              <span className="text-gray-900 font-medium">Todolist da creare</span>
            </div>
            <div className="text-2xl font-bold">{totalTodolistCount}</div>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Punti di controllo:</span>
              <span className="text-gray-900">{selectedDevicesArray.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Controlli:</span>
              <span className="text-gray-900">{selectedKpisArray.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Ripetizioni:</span>
              <span className="text-gray-900">{dateEntries.length}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}