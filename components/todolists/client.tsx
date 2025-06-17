"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Calendar, AlertTriangle, ArrowRight, CheckCircle2, Plus, Clock, Trash2, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { TimeSlot, TimeSlotValue, CustomTimeSlot, isCustomTimeSlot, isTodolistExpired } from "@/lib/validation/todolist-schemas"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { deleteTodolistById } from "@/app/actions/actions-todolist"
import { toast } from "@/components/ui/use-toast"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Checkbox as UICheckbox } from "@/components/ui/checkbox"

type TodolistItem = {
  id: string
  device_id: string
  device_name: string
  date: string
  time_slot: TimeSlotValue
  scheduled_execution: string
  status: "pending" | "in_progress" | "completed"
  count: number
  time_slot_type: "standard" | "custom"
  time_slot_start: number | null
  time_slot_end: number | null
  tasks: Array<{
    id: string
    kpi_id: string
    status: string
  }>
}

type FilterType = "all" | "today" | "overdue" | "future" | "completed"

type Props = {
  todolistsByFilter: Record<FilterType, TodolistItem[]>
  counts: Record<FilterType, number>
  initialFilter: FilterType
  userRole: string | null
  devices: Array<{ id: string; name: string }>
}

const timeSlotOrder: Record<TimeSlot, number> = {
  mattina: 1,
  pomeriggio: 2,
  sera: 3,
  notte: 4,
  giornata: 5,
  custom: 6
}

export default function TodolistListClient({ todolistsByFilter, counts, initialFilter, userRole, devices }: Props) {
  const router = useRouter()
  const [activeFilter, setActiveFilter] = useState<FilterType>(userRole === 'operator' ? 'today' : initialFilter)
  const [selectedDate, setSelectedDate] = useState<string>("")
  const [selectedDevice, setSelectedDevice] = useState<string>("all")
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)

  const isOperator = userRole === 'operator'
  const isAdmin = userRole === 'admin'

  const filtered = todolistsByFilter[activeFilter].filter(item => {
    const matchesDate = !selectedDate || item.date === selectedDate
    const matchesDevice = selectedDevice === "all" || item.device_id === selectedDevice
    return matchesDate && matchesDevice
  })

  const handleRowClick = (todolist: TodolistItem) => {
    if (isOperator) {
      if (activeFilter === 'today' || activeFilter === 'completed') {
        router.push(`/todolist/view/${todolist.id}/${todolist.device_id}/${todolist.date}/${todolist.time_slot}`)
      }
    } else {
      router.push(`/todolist/view/${todolist.id}/${todolist.device_id}/${todolist.date}/${todolist.time_slot}`)
    }
  }

  const handleCreateTodolist = () => {
    if (!isOperator) {
      router.push("/todolist/new")
    }
  }

  const handleDeleteTodolist = async (todolist: TodolistItem) => {
    try {
      setIsDeleting(todolist.id)
      await deleteTodolistById(todolist.id)
      toast({
        title: "Todolist eliminata",
        description: "La todolist è stata eliminata con successo.",
      })
      router.refresh()
    } catch (error) {
      console.error("Error deleting todolist:", error)
      toast({
        title: "Errore",
        description: "Impossibile eliminare la todolist. Riprova più tardi.",
        variant: "destructive"
      })
    } finally {
      setIsDeleting(null)
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(new Set(filtered.map(item => item.id)))
    } else {
      setSelectedItems(new Set())
    }
  }

  const handleSelectItem = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedItems)
    if (checked) {
      newSelected.add(id)
    } else {
      newSelected.delete(id)
    }
    setSelectedItems(newSelected)
  }

  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) return

    try {
      setIsBulkDeleting(true)
      const deletePromises = Array.from(selectedItems).map(async (id) => {
        await deleteTodolistById(id)
      })

      await Promise.all(deletePromises)
      
      toast({
        title: "Todolist eliminate",
        description: `${selectedItems.size} todolist sono state eliminate con successo.`,
      })
      
      setSelectedItems(new Set())
      router.refresh()
    } catch (error) {
      console.error("Error deleting todolists:", error)
      toast({
        title: "Errore",
        description: "Impossibile eliminare alcune todolist. Riprova più tardi.",
        variant: "destructive"
      })
    } finally {
      setIsBulkDeleting(false)
    }
  }

  const getStatusDisplay = (todolist: TodolistItem) => {
    const isExpired = todolist.status !== "completed" && isTodolistExpired(
      todolist.scheduled_execution, 
      todolist.time_slot_type, 
      todolist.time_slot_end
    )
    
    if (todolist.status === "completed") {
      return (
        <span className="inline-flex items-center gap-1 text-green-600">
          <CheckCircle2 size={16} /> Completata
        </span>
      )
    }
    
    if (isExpired) {
      return (
        <span className="inline-flex items-center gap-1 text-red-600">
          <Clock size={16} /> Scaduta
        </span>
      )
    }
    
    if (todolist.status === "in_progress") {
      return (
        <span className="inline-flex items-center gap-1 text-yellow-600">
          <AlertTriangle size={16} /> In corso
        </span>
      )
    }
    
    return (
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        <Calendar size={16} /> Da fare
      </span>
    )
  }

  const formatTimeSlot = (timeSlot: TimeSlotValue) => {
    if (isCustomTimeSlot(timeSlot)) {
      const startStr = `${timeSlot.startHour.toString().padStart(2, '0')}:${(timeSlot.startMinute || 0).toString().padStart(2, '0')}`
      const endStr = `${timeSlot.endHour.toString().padStart(2, '0')}:${(timeSlot.endMinute || 0).toString().padStart(2, '0')}`
      return `Personalizzato (${startStr}-${endStr})`
    }
    const slot = timeSlot as TimeSlot
    const timeSlotNames: Record<TimeSlot, string> = {
      mattina: "Mattina",
      pomeriggio: "Pomeriggio",
      sera: "Sera",
      notte: "Notte",
      giornata: "Giornata",
      custom: "Personalizzato"
    }
    return timeSlotNames[slot]
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-4">
          <CardTitle>Todolist</CardTitle>
          {isAdmin && selectedItems.size > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={isBulkDeleting}
                >
                  {isBulkDeleting ? (
                    <>
                      <Clock className="mr-2 h-4 w-4 animate-spin" />
                      Eliminazione...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Elimina selezionate ({selectedItems.size})
                    </>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Sei sicuro?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Questa azione non può essere annullata. Le {selectedItems.size} todolist selezionate e tutte le loro attività verranno eliminate permanentemente.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annulla</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleBulkDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Elimina
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
        {!isOperator && (
          <Button onClick={handleCreateTodolist}>
            <Plus className="mr-2 h-4 w-4" />
            Nuova Todolist
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2 mb-4">
          {!isOperator && (
            <Button
              variant={activeFilter === "all" ? "default" : "outline"}
              onClick={() => setActiveFilter("all")}
              size="sm"
              className={activeFilter === "all" ? "bg-blue-500 hover:bg-blue-600" : ""}
            >
              Tutte <Badge className="ml-2" variant={activeFilter === "all" ? "outline" : "secondary"}>{counts.all}</Badge>
            </Button>
          )}
          <Button
            variant={activeFilter === "today" ? "default" : "outline"}
            onClick={() => setActiveFilter("today")}
            size="sm"
            className={activeFilter === "today" ? "bg-yellow-500 hover:bg-yellow-600" : ""}
          >
            Oggi <Badge className="ml-2" variant={activeFilter === "today" ? "outline" : "secondary"}>{counts.today}</Badge>
          </Button>
          {!isOperator && (
            <>
              <Button
                variant={activeFilter === "overdue" ? "default" : "outline"}
                onClick={() => setActiveFilter("overdue")}
                size="sm"
                className={activeFilter === "overdue" ? "bg-red-500 hover:bg-red-600" : ""}
              >
                Scadute <Badge className="ml-2" variant={activeFilter === "overdue" ? "outline" : "secondary"}>{counts.overdue}</Badge>
              </Button>
              <Button
                variant={activeFilter === "future" ? "default" : "outline"}
                onClick={() => setActiveFilter("future")}
                size="sm"
                className={activeFilter === "future" ? "bg-purple-500 hover:bg-purple-600" : ""}
              >
                Future <Badge className="ml-2" variant={activeFilter === "future" ? "outline" : "secondary"}>{counts.future}</Badge>
              </Button>
            </>
          )}
          <Button
            variant={activeFilter === "completed" ? "default" : "outline"}
            onClick={() => setActiveFilter("completed")}
            size="sm"
            className={activeFilter === "completed" ? "bg-green-500 hover:bg-green-600" : ""}
          >
            Completate <Badge className="ml-2" variant={activeFilter === "completed" ? "outline" : "secondary"}>{counts.completed}</Badge>
          </Button>
        </div>

        {isAdmin && (
          <div className="flex flex-wrap gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-[200px]"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={selectedDevice} onValueChange={setSelectedDevice}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Seleziona dispositivo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti i dispositivi</SelectItem>
                  {devices.map(device => (
                    <SelectItem key={device.id} value={device.id}>
                      {device.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {isAdmin && (
                  <TableHead className="w-[50px]">
                    <UICheckbox
                      checked={filtered.length > 0 && selectedItems.size === filtered.length}
                      onCheckedChange={handleSelectAll}
                      aria-label="Seleziona tutte"
                    />
                  </TableHead>
                )}
                <TableHead>Dispositivo</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Fascia</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead>Task</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 7 : 6} className="text-center text-muted-foreground py-8">
                    Nessuna todolist trovata.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((item) => {
                  const isExpired = item.status !== "completed" && isTodolistExpired(
                    item.scheduled_execution, 
                    item.time_slot_type, 
                    item.time_slot_end
                  )
                  const canClick = !isOperator || (activeFilter === 'today' || activeFilter === 'completed')
                  return (
                    <TableRow
                      key={item.id}
                      className={cn(
                        canClick && 'cursor-pointer',
                        isExpired && 'opacity-75'
                      )}
                    >
                      {isAdmin && (
                        <TableCell>
                          <UICheckbox
                            checked={selectedItems.has(item.id)}
                            onCheckedChange={(checked) => handleSelectItem(item.id, checked as boolean)}
                            aria-label={`Seleziona todolist ${item.device_name} ${item.date}`}
                          />
                        </TableCell>
                      )}
                      <TableCell onClick={() => canClick && handleRowClick(item)}>{item.device_name}</TableCell>
                      <TableCell onClick={() => canClick && handleRowClick(item)}>{item.date}</TableCell>
                      <TableCell onClick={() => canClick && handleRowClick(item)}>{formatTimeSlot(item.time_slot)}</TableCell>
                      <TableCell onClick={() => canClick && handleRowClick(item)}>{getStatusDisplay(item)}</TableCell>
                      <TableCell onClick={() => canClick && handleRowClick(item)}>{item.count}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {canClick && <ArrowRight size={18} className="text-muted-foreground" />}
                          {isAdmin && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  disabled={isDeleting === item.id}
                                >
                                  {isDeleting === item.id ? (
                                    <Clock className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Sei sicuro?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Questa azione non può essere annullata. La todolist e tutte le sue attività verranno eliminate permanentemente.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Annulla</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteTodolist(item)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Elimina
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
