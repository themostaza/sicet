"use client"

import React, { useEffect, useState, useMemo, useCallback, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Calendar, AlertTriangle, ArrowRight, CheckCircle2, Plus, Clock, Trash2, Filter, ArrowUp, ArrowDown, Loader2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { TimeSlot, TimeSlotValue, CustomTimeSlot, isCustomTimeSlot, isTodolistExpired, customTimeSlotToString, isTodolistCurrentlyValid, getTodolistDeadlineDisplay, isTodolistInGracePeriod } from "@/lib/validation/todolist-schemas"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { deleteTodolistById, getTodolistFilteredIds, getTodolistFilteredCount } from "@/app/actions/actions-todolist"
import { toast } from "@/components/ui/use-toast"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Checkbox as UICheckbox } from "@/components/ui/checkbox"
import { formatDateForDisplay, formatDateEuropean } from "@/lib/utils"
import { format } from "date-fns"
import { it } from "date-fns/locale"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

type TodolistItem = {
  id: string
  device_id: string
  device_name: string
  device_tags: string[]
  date: string
  time_slot: TimeSlotValue
  scheduled_execution: string
  end_day_time: string | null
  status: "pending" | "in_progress" | "completed"
  count: number
  time_slot_type: "standard" | "custom"
  time_slot_start: number | null
  time_slot_end: number | null
  todolist_category: string | null
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
  devices: Array<{ id: string; name: string; tags?: string[] | null }>
  allTags: string[]
  allCategories: string[]
}

const timeSlotOrder: Record<TimeSlot, number> = {
  mattina: 1,
  pomeriggio: 2,
  notte: 3,
  giornata: 4,
  custom: 5
}

const ITEMS_PER_PAGE = 20

// Helper function to convert TimeSlotValue to string for URL
const timeSlotToUrlString = (timeSlot: TimeSlotValue): string => {
  if (isCustomTimeSlot(timeSlot)) {
    return customTimeSlotToString(timeSlot)
  }
  return timeSlot as string
}

export default function TodolistListClient({ todolistsByFilter, counts, initialFilter, userRole, devices, allTags, allCategories }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Initialize states from URL params or defaults
  const [activeFilter, setActiveFilter] = useState<FilterType>(userRole === 'operator' ? 'today' : initialFilter)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    searchParams.get('date') ? new Date(searchParams.get('date')!) : undefined
  )
  const [selectedDevice, setSelectedDevice] = useState<string>(
    searchParams.get('device') || "all"
  )
  const [selectedTags, setSelectedTags] = useState<string[]>(
    searchParams.get('tags')?.split(',').filter(Boolean) || []
  )
  const [selectedCategory, setSelectedCategory] = useState<string>(
    searchParams.get('category') || "all"
  )
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)
  const [sortColumn, setSortColumn] = useState<string>("date")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [isSelectingAllFiltered, setIsSelectingAllFiltered] = useState(false)
  const [allFilteredIds, setAllFilteredIds] = useState<Set<string>>(new Set())
  const [filteredCount, setFilteredCount] = useState<number>(0)
  const [isLoadingCount, setIsLoadingCount] = useState(false)
  
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

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }

  const clearAllTags = () => {
    setSelectedTags([])
  }

  const toggleCategory = (category: string) => {
    // When using multiselect, reset single select
    setSelectedCategory("all")
    
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    )
  }

  const handleSingleCategoryChange = (category: string) => {
    // Ignore MULTI selection (disabled option)
    if (category === "MULTI") return
    
    // When using single select, reset multiselect
    setSelectedCategories([])
    setSelectedCategory(category)
  }

  const clearAllCategories = () => {
    setSelectedCategories([])
  }

  const clearAllFilters = () => {
    setSelectedDate(undefined)
    setSelectedDevice("all")
    clearAllTags()
    clearAllCategories()
    setSelectedCategory("all")
  }

  const applyFilters = () => {
    setIsFilterModalOpen(false)
    // Force re-fetch with current filters
    setCurrentOffset(0)
    setTodolists([])
    setHasMore(true)
    setSelectedItems(new Set())
    setAllFilteredIds(new Set())
    fetchTodolists(true)
  }

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
        ...(selectedDevice !== "all" && { selectedDevice }),
        ...(selectedTags.length > 0 && { selectedTags: selectedTags.join(',') }),
        ...(selectedCategories.length > 0 ? { selectedCategories: selectedCategories.join(',') } : selectedCategory !== "all" && { selectedCategory }),
        sortColumn: sortColumn === "date" ? "scheduled_execution" : sortColumn,
        sortDirection,
        ...(userRole && { userRole })
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
  }, [activeFilter, selectedDate, selectedDevice, selectedCategory, currentOffset, isLoading, selectedTags, sortColumn, sortDirection, userRole])

  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams()
    
    if (selectedDate) {
      params.set('date', format(selectedDate, 'yyyy-MM-dd'))
    }
    if (selectedDevice !== "all") {
      params.set('device', selectedDevice)
    }
    if (selectedTags.length > 0) {
      params.set('tags', selectedTags.join(','))
    }
    if (selectedCategory !== "all") {
      params.set('category', selectedCategory)
    }
    
    const newUrl = params.toString() ? `?${params.toString()}` : ''
    router.replace(newUrl, { scroll: false })
  }, [selectedDate, selectedDevice, selectedTags, selectedCategory, router])

  // Reset and fetch when filters change
  useEffect(() => {
    setCurrentOffset(0)
    setTodolists([])
    setHasMore(true)
    setSelectedItems(new Set()) // Clear selected items when filters change
    setAllFilteredIds(new Set()) // Clear filtered ids when filters change
    fetchTodolists(true)
  }, [activeFilter, selectedDate, selectedDevice, selectedTags, selectedCategory, selectedCategories, sortColumn, sortDirection])

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

  const handleSort = (col: string) => {
    if (sortColumn === col || (col === "date" && sortColumn === "scheduled_execution")) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortColumn(col)
      setSortDirection(col === "date" || col === "scheduled_execution" ? "desc" : "asc")
    }
  }

  const handleRowClick = (todolist: TodolistItem) => {
    const timeSlotString = timeSlotToUrlString(todolist.time_slot)
    if (!isOperator) {
      router.push(`/todolist/view/${todolist.id}/${todolist.device_id}/${todolist.date}/${timeSlotString}`)
    }
    // Gli operatori non possono mai cliccare sulle righe
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
      setSelectedItems(new Set(todolists.map(item => item.id)))
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
      // Remove from allFilteredIds if it was selected via "select all filtered"
      const newAllFiltered = new Set(allFilteredIds)
      newAllFiltered.delete(id)
      setAllFilteredIds(newAllFiltered)
    }
    setSelectedItems(newSelected)
  }

  const handleSelectAllFiltered = async () => {
    if (isSelectingAllFiltered) return

    try {
      setIsSelectingAllFiltered(true)
      
      const filteredIds = await getTodolistFilteredIds({
        filter: activeFilter,
        selectedDate: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : undefined,
        selectedDevice: selectedDevice !== "all" ? selectedDevice : undefined,
        selectedTags: selectedTags.length > 0 ? selectedTags : undefined,
        selectedCategory: selectedCategories.length > 0 ? selectedCategories.join(',') : selectedCategory !== "all" ? selectedCategory : undefined,
        userRole: userRole || undefined,
      })

      const filteredIdsSet = new Set(filteredIds)
      setAllFilteredIds(filteredIdsSet)
      setSelectedItems(filteredIdsSet)

      toast({
        title: "Selezione completata",
        description: `${filteredIds.length} todolist sono state selezionate.`,
      })
    } catch (error) {
      console.error("Error selecting all filtered:", error)
      toast({
        title: "Errore",
        description: "Errore durante la selezione delle todolist.",
        variant: "destructive",
      })
    } finally {
      setIsSelectingAllFiltered(false)
    }
  }

  const handleDeselectAll = () => {
    setSelectedItems(new Set())
    setAllFilteredIds(new Set())
    
    toast({
      title: "Deselezione completata",
      description: "Tutte le todolist sono state deselezionate.",
    })
  }

  const updateFilteredCount = useCallback(async () => {
    try {
      setIsLoadingCount(true)
      
      const count = await getTodolistFilteredCount({
        filter: activeFilter,
        selectedDate: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : undefined,
        selectedDevice: selectedDevice !== "all" ? selectedDevice : undefined,
        selectedTags: selectedTags.length > 0 ? selectedTags : undefined,
        selectedCategory: selectedCategories.length > 0 ? selectedCategories.join(',') : selectedCategory !== "all" ? selectedCategory : undefined,
        userRole: userRole || undefined,
      })

      setFilteredCount(count)
    } catch (error) {
      console.error("Error updating filtered count:", error)
      setFilteredCount(0)
    } finally {
      setIsLoadingCount(false)
    }
  }, [activeFilter, selectedDate, selectedDevice, selectedTags, selectedCategories, selectedCategory, userRole])

  // Update filtered count when filters change
  useEffect(() => {
    updateFilteredCount()
  }, [updateFilteredCount])

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
      todolist.time_slot_end,
      todolist.time_slot_start
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
    
    // Per gli operator, aggiungi orario di deadline alla stringa "Da fare"
    if (isOperator && todolist.time_slot_end !== null) {
      const deadline = getTodolistDeadlineDisplay(todolist.scheduled_execution, todolist.time_slot_end)
      const deadlineTime = deadline ? format(deadline, "HH:mm", { locale: it }) : null
      const isInGracePeriod = isTodolistInGracePeriod(
        todolist.scheduled_execution,
        todolist.time_slot_start,
        todolist.time_slot_end,
        todolist.status
      )
      
      return (
        <span className={cn(
          "inline-flex items-center gap-1",
          isInGracePeriod ? "text-red-600" : "text-muted-foreground"
        )}>
          <Calendar size={16} /> 
          {deadlineTime ? `Da fare entro le ${deadlineTime}` : "Da fare"}
          {isInGracePeriod && (
            <Badge variant="destructive" className="text-xs ml-1">
              In scadenza
            </Badge>
          )}
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
      notte: "Notte",
      giornata: "Giornata",
      custom: "Personalizzato"
    }
    return timeSlotNames[slot]
  }

  const formatTimeIntervalFromDb = (startIso: string, endIso: string | null) => {
    const extractHHmm = (iso: string | null | undefined): string | null => {
      if (!iso) return null
      // Estrarre direttamente HH:mm dalla stringa senza conversioni di fuso
      // Supporta formati: 2025-08-12T14:00:00Z, 2025-08-12T14:00:00+00:00, 2025-08-12T14:00:00
      const match = iso.match(/T(\d{2}):(\d{2})/)
      if (match) return `${match[1]}:${match[2]}`
      return null
    }

    const startStr = extractHHmm(startIso)
    const endStr = extractHHmm(endIso ?? undefined)
    if (startStr && endStr) return `${startStr}–${endStr}`
    if (startStr) return startStr
    return ""
  }

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <CardTitle>Todolist</CardTitle>
            
            {/* Category Filter - Responsive position */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground"></span>
              <Select value={selectedCategories.length > 0 ? "MULTI" : selectedCategory} onValueChange={handleSingleCategoryChange}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Tutte" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte</SelectItem>
                  {selectedCategories.length > 0 && (
                    <SelectItem value="MULTI" disabled>
                      Categoria ({selectedCategories.length})
                    </SelectItem>
                  )}
                  <SelectItem value="__NULL__">Senza categoria</SelectItem>
                  {allCategories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {userRole !== 'operator' && (
              <Button onClick={handleCreateTodolist}>
                <Plus className="mr-2 h-4 w-4" />
                Nuova Todolist
              </Button>
            )}
            {isAdmin && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAllFiltered}
                  disabled={isSelectingAllFiltered || isLoadingCount}
                >
                  {isSelectingAllFiltered ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Selezione...
                    </>
                  ) : isLoadingCount ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Conteggio...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Seleziona tutte filtrate ({filteredCount})
                    </>
                  )}
                </Button>
                {selectedItems.size > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDeselectAll}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Deseleziona tutte
                  </Button>
                )}
              </>
            )}
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
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2 mb-4 items-center">
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
            Oggi <Badge className="ml-2" variant={activeFilter === "today" ? "outline" : "secondary"}>{isOperator ? totalCount : counts.today}</Badge>
          </Button>
          {/* Gruppo: Scadute, Future, Completate */}
          {!isOperator && (
            <div className="flex flex-wrap gap-2 px-2 py-1 rounded-md border border-muted bg-muted/50">
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
              <Button
                variant={activeFilter === "completed" ? "default" : "outline"}
                onClick={() => setActiveFilter("completed")}
                size="sm"
                className={activeFilter === "completed" ? "bg-green-500 hover:bg-green-600" : ""}
              >
                Completate <Badge className="ml-2" variant={activeFilter === "completed" ? "outline" : "secondary"}>{counts.completed}</Badge>
              </Button>
            </div>
          )}
        </div>

        {isAdmin && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
            <Dialog open={isFilterModalOpen} onOpenChange={setIsFilterModalOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filtri
                  {(selectedDate || selectedDevice !== "all" || selectedTags.length > 0) && (
                    <Badge variant="secondary" className="ml-1">
                                              {(selectedDate ? 1 : 0) + (selectedDevice !== "all" ? 1 : 0) + selectedTags.length}
                    </Badge>
                  )}
                </Button>
              </DialogTrigger>
              {/* MAPPA CONTEGGI COLORATA */}
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-green-500 text-white" variant="default">Completate: {counts.completed}</Badge>
                <Badge className="bg-red-500 text-white" variant="default">Scadute: {counts.overdue}</Badge>
                <Badge className="bg-yellow-500 text-black" variant="default">Da fare: {counts.today}</Badge>
              </div>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Filtri</DialogTitle>
                  <DialogDescription>
                    Seleziona i filtri per personalizzare la visualizzazione delle todolist
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-6">
                  {/* Date Filter */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium">Data</h3>
                    <div className="flex items-center gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !selectedDate && "text-muted-foreground"
                            )}
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            {selectedDate ? format(selectedDate, "dd/MM/yyyy", { locale: it }) : "Seleziona data"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
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
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Device Filter */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium">Dispositivo</h3>
                    <Select value={selectedDevice} onValueChange={setSelectedDevice}>
                      <SelectTrigger>
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

                  {/* Tag Filter */}
                  {allTags.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium">Tag</h3>
                        {selectedTags.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearAllTags}
                            className="text-xs text-gray-500 hover:text-gray-700"
                          >
                            <X className="w-3 h-3 mr-1" />
                            Cancella tutti
                          </Button>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {allTags.map((tag) => (
                          <Badge
                            key={tag}
                            variant={selectedTags.includes(tag) ? "default" : "outline"}
                            className={`cursor-pointer transition-colors ${
                              selectedTags.includes(tag)
                                ? "bg-black text-white hover:bg-gray-800"
                                : "hover:bg-gray-100"
                            }`}
                            onClick={() => toggleTag(tag)}
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Category Filter */}
                  {allCategories.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium">Categorie</h3>
                        {selectedCategories.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearAllCategories}
                            className="text-xs text-gray-500 hover:text-gray-700"
                          >
                            <X className="w-3 h-3 mr-1" />
                            Cancella tutte
                          </Button>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {/* Special option for items without category */}
                        <Badge
                          key="__NULL__"
                          variant={selectedCategories.includes("__NULL__") ? "default" : "outline"}
                          className={`cursor-pointer transition-colors ${
                            selectedCategories.includes("__NULL__")
                              ? "bg-gray-600 text-white hover:bg-gray-700"
                              : "hover:bg-gray-100"
                          }`}
                          onClick={() => toggleCategory("__NULL__")}
                        >
                          Senza categoria
                        </Badge>
                        {allCategories.map((category) => (
                          <Badge
                            key={category}
                            variant={selectedCategories.includes(category) ? "default" : "outline"}
                            className={`cursor-pointer transition-colors ${
                              selectedCategories.includes(category)
                                ? "bg-black text-white hover:bg-gray-800"
                                : "hover:bg-gray-100"
                            }`}
                            onClick={() => toggleCategory(category)}
                          >
                            {category}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={clearAllFilters}
                      className="flex-1"
                    >
                      Cancella tutti
                    </Button>
                    <Button
                      onClick={applyFilters}
                      className="flex-1"
                    >
                      Applica filtri
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {/* Filter Summary */}
        {(selectedDate || selectedDevice !== "all" || selectedCategory !== "all" || selectedTags.length > 0 || selectedCategories.length > 0) && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-sm text-gray-600 bg-gray-50 px-4 py-2 rounded-lg mb-4 gap-2">
            <div className="flex flex-wrap gap-2">
              Filtri applicati:
              {selectedDate && <span className="inline-block bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs">Data: {format(selectedDate, "dd/MM/yyyy", { locale: it })}</span>}
              {selectedDevice !== "all" && <span className="inline-block bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs">Dispositivo: {devices.find(d => d.id === selectedDevice)?.name}</span>}

              {selectedTags.length > 0 && (
                <span className="inline-block bg-purple-100 text-purple-800 px-2 py-0.5 rounded text-xs">
                  Tag: {selectedTags.join(", ")}
                </span>
              )}

              {selectedCategories.length > 0 && (
                <span className="inline-block bg-orange-100 text-orange-800 px-2 py-0.5 rounded text-xs">
                  Categorie: {selectedCategories.map(cat => cat === "__NULL__" ? "Senza categoria" : cat).join(", ")}
                </span>
              )}

              {selectedCategory !== "all" && selectedCategories.length === 0 && (
                <span className="inline-block bg-orange-100 text-orange-800 px-2 py-0.5 rounded text-xs">
                  Categoria: {selectedCategory}
                </span>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="text-xs self-start sm:self-auto"
            >
              <X className="w-3 h-3 mr-1" />
              Cancella filtri
            </Button>
          </div>
        )}

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader className={cn(isOperator && "hidden md:table-header-group")}>
              <TableRow>
                {isAdmin && (
                  <TableHead className="w-[50px]">
                    <UICheckbox
                      checked={todolists.length > 0 && selectedItems.size === todolists.length}
                      onCheckedChange={handleSelectAll}
                      aria-label="Seleziona tutte"
                    />
                  </TableHead>
                )}
                <TableHead onClick={() => handleSort("device_name")}
                  className="cursor-pointer select-none min-w-[120px]">
                  Dispositivo
                </TableHead>
                <TableHead onClick={() => handleSort("date")}
                  className={cn(
                    "cursor-pointer select-none min-w-[100px]",
                    isOperator && "hidden md:table-cell"
                  )}>
                  Data
                  {sortColumn === "date" || sortColumn === "scheduled_execution" ? (sortDirection === "asc" ? <ArrowUp className="inline ml-1 w-3 h-3" /> : <ArrowDown className="inline ml-1 w-3 h-3" />) : null}
                </TableHead>
                <TableHead onClick={() => handleSort("time_slot")}
                  className={cn(
                    "cursor-pointer select-none min-w-[80px]",
                    isOperator && "hidden md:table-cell"
                  )}>
                  Fascia
                </TableHead>
                <TableHead className={cn(
                  "min-w-[100px]",
                  isOperator && "hidden md:table-cell"
                )}>
                  Categoria
                </TableHead>
                <TableHead onClick={() => handleSort("status")}
                  className={cn(
                    "cursor-pointer select-none min-w-[100px]",
                    isOperator && "hidden md:table-cell"
                  )}>
                  Stato
                </TableHead>
                <TableHead onClick={() => handleSort("count")}
                  className={cn(
                    "cursor-pointer select-none min-w-[60px]",
                    isOperator && "hidden md:table-cell"
                  )}>
                  Task
                </TableHead>
                <TableHead onClick={() => handleSort("created_at")}
                  className={cn(
                    "cursor-pointer select-none min-w-[100px]",
                    isOperator && "hidden md:table-cell"
                  )}>
                  Creato
                </TableHead>
                <TableHead className="w-[100px] min-w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {todolists.length === 0 && !isLoading ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 9 : 8} className="text-center text-muted-foreground py-8">
                    Nessuna todolist trovata.
                  </TableCell>
                </TableRow>
              ) : (
                todolists.map((item: TodolistItem) => {
                  const isExpired = item.status !== "completed" && isTodolistExpired(
                    item.scheduled_execution, 
                    item.time_slot_type, 
                    item.time_slot_end,
                    item.time_slot_start
                  )
                  const canClick = !isOperator
                  
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
                      <TableCell {...(canClick && { onClick: () => handleRowClick(item) })}>
                        <div>
                          {isOperator && (
                            // Su mobile per operatori: stato sopra al nome
                            <div className="mb-1 md:hidden">
                              {getStatusDisplay(item)}
                            </div>
                          )}
                          <div className="font-medium">{item.device_name}</div>
                          {isOperator ? (
                            // Per operatori: mostra categoria e fascia oraria sotto al nome
                            <div className="mt-1 space-y-1">
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{formatTimeSlot(item.time_slot)}</span>
                                {item.todolist_category && (
                                  <>
                                    <span>•</span>
                                    <Badge variant="outline" className="text-xs py-0 px-1 h-4">
                                      {item.todolist_category}
                                    </Badge>
                                  </>
                                )}
                              </div>
                            </div>
                          ) : (
                            // Per admin/referrer: mostra i tag come prima
                            item.device_tags && item.device_tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {item.device_tags.map((tag: string) => (
                                  <span key={tag} className="inline-block bg-gray-100 rounded-full px-2 py-0.5 text-xs text-gray-800">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )
                          )}
                        </div>
                      </TableCell>
                      <TableCell 
                        {...(canClick && { onClick: () => handleRowClick(item) })}
                        className={cn(isOperator && "hidden md:table-cell")}
                      >
                        <div className="flex flex-col">
                          <span>{formatDateEuropean(item.date)}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatTimeIntervalFromDb(item.scheduled_execution, item.end_day_time)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell 
                        {...(canClick && { onClick: () => handleRowClick(item) })}
                        className={cn(isOperator && "hidden md:table-cell")}
                      >
                        {formatTimeSlot(item.time_slot)}
                      </TableCell>
                      <TableCell 
                        {...(canClick && { onClick: () => handleRowClick(item) })}
                        className={cn(isOperator && "hidden md:table-cell")}
                      >
                        {item.todolist_category ? (
                          <Badge variant="outline" className="text-xs">
                            {item.todolist_category}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell 
                        {...(canClick && { onClick: () => handleRowClick(item) })}
                        className={cn(isOperator && "hidden md:table-cell")}
                      >
                        {getStatusDisplay(item)}
                      </TableCell>
                      <TableCell 
                        {...(canClick && { onClick: () => handleRowClick(item) })}
                        className={cn(isOperator && "hidden md:table-cell")}
                      >
                        {item.count}
                      </TableCell>
                      <TableCell 
                        {...(canClick && { onClick: () => handleRowClick(item) })}
                        className={cn(isOperator && "hidden md:table-cell")}
                      >
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
