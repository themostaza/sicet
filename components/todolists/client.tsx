"use client"

import React, { useEffect, useState, useMemo, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Calendar, AlertTriangle, ArrowRight, CheckCircle2, Plus, Clock, Trash2, Filter, ArrowUp, ArrowDown, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { TimeSlot, TimeSlotValue, CustomTimeSlot, isCustomTimeSlot, isTodolistExpired } from "@/lib/validation/todolist-schemas"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { deleteTodolistById } from "@/app/actions/actions-todolist"
import { toast } from "@/components/ui/use-toast"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Checkbox as UICheckbox } from "@/components/ui/checkbox"
import { formatDateForDisplay } from "@/lib/utils"
import { format } from "date-fns"
import { it } from "date-fns/locale"

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
  created_at: string | "N/A"
  tasks: Array<{
    id: string
    kpi_id: string
    status: string
  }>
}

type FilterType = "all" | "today" | "overdue" | "future" | "completed"

type Props = {
  todolistsByFilter?: Record<FilterType, TodolistItem[]>
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

const ITEMS_PER_PAGE = 20

export default function TodolistListClient({ todolistsByFilter, counts, initialFilter, userRole, devices }: Props) {
  const router = useRouter()
  const [activeFilter, setActiveFilter] = useState<FilterType>(userRole === 'operator' ? 'today' : initialFilter)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [selectedDevice, setSelectedDevice] = useState<string>("all")
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)
  const [sortColumn, setSortColumn] = useState<string>("date")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  
  // Infinite scroll state
  const [todolists, setTodolists] = useState<TodolistItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [currentOffset, setCurrentOffset] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadingRef = useRef<HTMLDivElement>(null)

  const isOperator = userRole === 'operator'
  const isAdmin = userRole === 'admin'

  // Fetch todolists with pagination
  const fetchTodolists = useCallback(async (reset: boolean = false) => {
    if (isLoading) return

    setIsLoading(true)
    const offset = reset ? 0 : currentOffset

    try {
      const params = new URLSearchParams({
        filter: activeFilter,
        offset: offset.toString(),
        limit: ITEMS_PER_PAGE.toString(),
        ...(selectedDate && { selectedDate: format(selectedDate, 'yyyy-MM-dd') }),
        ...(selectedDevice !== "all" && { selectedDevice })
      })

      const response = await fetch(`/api/todolist/paginated?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch todolists')
      }

      const data = await response.json()
      
      if (reset) {
        setTodolists(data.todolists)
        setCurrentOffset(data.todolists.length)
      } else {
        // Prevent duplicates by filtering out items that already exist
        setTodolists(prev => {
          const existingIds = new Set(prev.map(item => item.id))
          const newItems = data.todolists.filter((item: TodolistItem) => !existingIds.has(item.id))
          return [...prev, ...newItems]
        })
        setCurrentOffset(prev => prev + data.todolists.length)
      }
      
      setHasMore(data.hasMore)
      setTotalCount(data.totalCount)
    } catch (error) {
      console.error('Error fetching todolists:', error)
      toast({
        title: "Errore",
        description: "Impossibile caricare le todolist. Riprova più tardi.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }, [activeFilter, selectedDate, selectedDevice, currentOffset, isLoading])

  // Reset and fetch when filters change
  useEffect(() => {
    setCurrentOffset(0)
    setTodolists([])
    setHasMore(true)
    setSelectedItems(new Set()) // Clear selected items when filters change
    fetchTodolists(true)
  }, [activeFilter, selectedDate, selectedDevice])

  // Intersection observer for infinite scroll
  useEffect(() => {
    if (!hasMore || isLoading) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          fetchTodolists()
        }
      },
      { threshold: 0.1 }
    )

    if (loadingRef.current) {
      observer.observe(loadingRef.current)
    }

    observerRef.current = observer

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [hasMore, isLoading, fetchTodolists])

  const sorted = useMemo(() => {
    return [...todolists].sort((a, b) => {
      let aValue = a[sortColumn as keyof TodolistItem]
      let bValue = b[sortColumn as keyof TodolistItem]
      if (sortColumn === "date" || sortColumn === "scheduled_execution") {
        aValue = a.scheduled_execution
        bValue = b.scheduled_execution
        if (aValue && bValue) {
          const aDate = new Date(aValue as string).getTime()
          const bDate = new Date(bValue as string).getTime()
          return sortDirection === "asc" ? aDate - bDate : bDate - aDate
        }
        return 0
      }
      if (sortColumn === "created_at") {
        aValue = a.created_at
        bValue = b.created_at
        if (aValue && bValue && aValue !== "N/A" && bValue !== "N/A") {
          const aDate = new Date(aValue as string).getTime()
          const bDate = new Date(bValue as string).getTime()
          return sortDirection === "asc" ? aDate - bDate : bDate - aDate
        }
        if (aValue === "N/A" && bValue !== "N/A") return 1
        if (aValue !== "N/A" && bValue === "N/A") return -1
        return 0
      }
      if (sortColumn === "count") {
        return sortDirection === "asc"
          ? (a.count as number) - (b.count as number)
          : (b.count as number) - (a.count as number)
      }
      if (sortColumn === "status") {
        return sortDirection === "asc"
          ? String(a.status).localeCompare(String(b.status))
          : String(b.status).localeCompare(String(a.status))
      }
      if (sortColumn === "device_name") {
        return sortDirection === "asc"
          ? String(a.device_name).localeCompare(String(b.device_name))
          : String(b.device_name).localeCompare(String(a.device_name))
      }
      if (sortColumn === "time_slot") {
        return sortDirection === "asc"
          ? String(a.time_slot).localeCompare(String(b.time_slot))
          : String(b.time_slot).localeCompare(String(a.time_slot))
      }
      return 0
    })
  }, [todolists, sortColumn, sortDirection])

  const handleSort = (col: string) => {
    if (sortColumn === col) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortColumn(col)
      setSortDirection(col === "date" || col === "scheduled_execution" ? "desc" : "asc")
    }
  }

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
      // Refresh the list
      setCurrentOffset(0)
      setTodolists([])
      setHasMore(true)
      fetchTodolists(true)
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
      setSelectedItems(new Set(sorted.map(item => item.id)))
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
      // Refresh the list
      setCurrentOffset(0)
      setTodolists([])
      setHasMore(true)
      fetchTodolists(true)
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
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[200px] justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP", { locale: it }) : "Seleziona data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    initialFocus
                    locale={it}
                  />
                </PopoverContent>
              </Popover>
              {selectedDate && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedDate(undefined)}
                  className="h-8 px-2"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
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
                      checked={sorted.length > 0 && selectedItems.size === sorted.length}
                      onCheckedChange={handleSelectAll}
                      aria-label="Seleziona tutte"
                    />
                  </TableHead>
                )}
                <TableHead onClick={() => handleSort("device_name")}
                  className="cursor-pointer select-none">
                  Dispositivo
                  {sortColumn === "device_name" && (sortDirection === "asc" ? <ArrowUp className="inline ml-1 w-3 h-3" /> : <ArrowDown className="inline ml-1 w-3 h-3" />)}
                </TableHead>
                <TableHead onClick={() => handleSort("date")}
                  className="cursor-pointer select-none">
                  Data
                  {sortColumn === "date" && (sortDirection === "asc" ? <ArrowUp className="inline ml-1 w-3 h-3" /> : <ArrowDown className="inline ml-1 w-3 h-3" />)}
                </TableHead>
                <TableHead onClick={() => handleSort("time_slot")}
                  className="cursor-pointer select-none">
                  Fascia
                  {sortColumn === "time_slot" && (sortDirection === "asc" ? <ArrowUp className="inline ml-1 w-3 h-3" /> : <ArrowDown className="inline ml-1 w-3 h-3" />)}
                </TableHead>
                <TableHead onClick={() => handleSort("status")}
                  className="cursor-pointer select-none">
                  Stato
                  {sortColumn === "status" && (sortDirection === "asc" ? <ArrowUp className="inline ml-1 w-3 h-3" /> : <ArrowDown className="inline ml-1 w-3 h-3" />)}
                </TableHead>
                <TableHead onClick={() => handleSort("count")}
                  className="cursor-pointer select-none">
                  Task
                  {sortColumn === "count" && (sortDirection === "asc" ? <ArrowUp className="inline ml-1 w-3 h-3" /> : <ArrowDown className="inline ml-1 w-3 h-3" />)}
                </TableHead>
                <TableHead onClick={() => handleSort("created_at")}
                  className="cursor-pointer select-none">
                  Creato
                  {sortColumn === "created_at" && (sortDirection === "asc" ? <ArrowUp className="inline ml-1 w-3 h-3" /> : <ArrowDown className="inline ml-1 w-3 h-3" />)}
                </TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.length === 0 && !isLoading ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 8 : 7} className="text-center text-muted-foreground py-8">
                    Nessuna todolist trovata.
                  </TableCell>
                </TableRow>
              ) : (
                sorted.map((item) => {
                  const isExpired = item.status !== "completed" && isTodolistExpired(
                    item.scheduled_execution, 
                    item.time_slot_type, 
                    item.time_slot_end
                  )
                  const canClick = !isOperator || (activeFilter === 'today' || activeFilter === 'completed')
                  return (
                    <TableRow
                      key={`${item.id}-${item.device_id}-${item.date}-${item.time_slot}`}
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
                      <TableCell onClick={() => canClick && handleRowClick(item)}>
                        {item.created_at === "N/A" ? "N/A" : formatDateForDisplay(item.created_at)}
                      </TableCell>
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
          
          {/* Infinite scroll loading indicator */}
          {hasMore && (
            <div ref={loadingRef} className="flex justify-center py-4">
              {isLoading && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Caricamento...
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
