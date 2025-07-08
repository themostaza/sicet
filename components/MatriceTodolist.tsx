"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Plus, CalendarIcon, X, Settings, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { toast } from "@/components/ui/use-toast"

interface Control {
  id: string
  name: string
}

interface Task {
  id: string
  kpi_id: string
  kpi_name: string
  status: string
  value: Array<{id: string, value: any}> | null
}

interface TodolistData {
  id: string
  device_id: string
  device_name: string
  scheduled_execution: string
  status: string
  time_slot_type: string
  time_slot_start: number | null
  time_slot_end: number | null
  isExpired: boolean
  tasks: Task[]
  completion_date?: string
}

interface TodolistControlVisibility {
  [todolistId: string]: {
    [controlId: string]: boolean
  }
}

// Helper per formattare date in UTC
function formatUTC(dateString: string, formatStr: string) {
  const date = new Date(dateString)
  const pad = (n: number) => n.toString().padStart(2, '0')
  if (formatStr === "dd/MM/yyyy HH:mm") {
    return `${pad(date.getUTCDate())}/${pad(date.getUTCMonth() + 1)}/${date.getUTCFullYear()} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`
  }
  if (formatStr === "dd/MM/yyyy") {
    return `${pad(date.getUTCDate())}/${pad(date.getUTCMonth() + 1)}/${date.getUTCFullYear()}`
  }
  if (formatStr === "HH:mm") {
    return `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`
  }
  return date.toISOString()
}

export default function MatriceTodolist() {
  const [dateFrom, setDateFrom] = useState<Date>(() => {
    const today = new Date()
    const sevenDaysAgo = new Date(today)
    sevenDaysAgo.setDate(today.getDate() - 7)
    return sevenDaysAgo
  })
  const [dateTo, setDateTo] = useState<Date>(() => new Date())
  const [showManageDialog, setShowManageDialog] = useState(false)
  const [showFromCalendar, setShowFromCalendar] = useState(false)
  const [showToCalendar, setShowToCalendar] = useState(false)
  
  // Stato per i dati del database
  const [todolists, setTodolists] = useState<TodolistData[]>([])
  const [allControls, setAllControls] = useState<Control[]>([])
  const [isLoading, setIsLoading] = useState(false)
  
  // Stato per gestire la visibilità delle todolist
  const [visibleTodolists, setVisibleTodolists] = useState<Set<string>>(new Set())
  
  // Stato per gestire la visibilità dei controlli per ogni todolist
  const [controlVisibility, setControlVisibility] = useState<TodolistControlVisibility>({})
  
  // Stato per gestire l'hover sulla tabella
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)
  const [hoveredColumn, setHoveredColumn] = useState<string | null>(null)
  const [hoveredRowHeader, setHoveredRowHeader] = useState<string | null>(null)
  const [hoveredColHeader, setHoveredColHeader] = useState<string | null>(null)

  // Funzione per caricare i dati dal database
  const loadData = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        dateFrom: format(dateFrom, 'yyyy-MM-dd'),
        dateTo: format(dateTo, 'yyyy-MM-dd')
      })
      
      const response = await fetch(`/api/matrix/todolist?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch data')
      }
      
      const data = await response.json()
      setTodolists(data.todolists)
      setAllControls(data.controls)
      
      // Inizializza tutte le todolist come visibili
      setVisibleTodolists(new Set(data.todolists.map((t: TodolistData) => t.id)))
      
      // Inizializza tutti i controlli come visibili
      const initialVisibility: TodolistControlVisibility = {}
      data.todolists.forEach((todolist: TodolistData) => {
        initialVisibility[todolist.id] = {}
        // Inizializza tutti i campi JSONB trovati in questa todolist
        data.controls.forEach((control: Control) => {
          // Verifica se questa todolist ha questo campo JSONB (considerando anche task non completati)
          const hasField = todolist.tasks.some((task: Task) => {
            // Se il task è completato, controlla nel valore JSONB
            if (task.value && Array.isArray(task.value)) {
              return task.value.some(item => item.id === control.id)
            }
            // Se il task non è completato ma la todolist è scaduta, mostra comunque i controlli
            // (assumiamo che tutti i KPI potrebbero avere tutti i campi)
            return todolist.isExpired
          })
          initialVisibility[todolist.id][control.id] = hasField
        })
      })
      setControlVisibility(initialVisibility)
      
    } catch (error) {
      console.error('Error loading data:', error)
      toast({
        title: "Errore",
        description: "Impossibile caricare i dati. Riprova più tardi.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Carica i dati quando cambiano le date
  useEffect(() => {
    loadData()
  }, [dateFrom, dateTo])

  // Filtra le todolist visibili
  const visibleTodolistsData = todolists.filter(todolist => visibleTodolists.has(todolist.id))
  
  // Ottieni tutti i controlli visibili (unici) dalle todolist visibili
  const getVisibleControls = (): Control[] => {
    const visibleControlsMap = new Map<string, Control>()
    
    // Cerca in tutti i controlli disponibili e verifica se sono visibili
    allControls.forEach(control => {
      let isVisible = false
      visibleTodolistsData.forEach(todolist => {
        if (controlVisibility[todolist.id]?.[control.id]) {
          isVisible = true
        }
      })
      
      if (isVisible) {
        visibleControlsMap.set(control.id, control)
      }
    })
    
    return Array.from(visibleControlsMap.values())
  }

  const openManageDialog = () => {
    setShowManageDialog(true)
  }

  // Gestisce la selezione/deselezione di una todolist
  const toggleTodolistVisibility = (todolistId: string) => {
    const newVisibleTodolists = new Set(visibleTodolists)
    if (newVisibleTodolists.has(todolistId)) {
      newVisibleTodolists.delete(todolistId)
    } else {
      newVisibleTodolists.add(todolistId)
    }
    setVisibleTodolists(newVisibleTodolists)
  }

  // Gestisce la selezione/deselezione di un controllo per una todolist
  const toggleControlVisibility = (todolistId: string, controlId: string) => {
    const newControlVisibility = { ...controlVisibility }
    const newValue = !newControlVisibility[todolistId]?.[controlId]
    
    // Trova tutte le todolist che hanno questo campo JSONB
    const todolistsWithControl = todolists.filter(todolist => 
      todolist.tasks.some(task => 
        task.value && Array.isArray(task.value) && 
        task.value.some(item => item.id === controlId)
      )
    )
    
    // Applica la modifica a tutte le todolist che hanno questo controllo
    todolistsWithControl.forEach(todolist => {
      if (!newControlVisibility[todolist.id]) {
        newControlVisibility[todolist.id] = {}
      }
      newControlVisibility[todolist.id][controlId] = newValue
    })
    
    setControlVisibility(newControlVisibility)
  }

  // Seleziona/deseleziona tutte le todolist
  const toggleAllTodolists = () => {
    if (visibleTodolists.size === todolists.length) {
      setVisibleTodolists(new Set())
    } else {
      setVisibleTodolists(new Set(todolists.map(todolist => todolist.id)))
    }
  }

  // Seleziona/deseleziona tutti i controlli per una todolist
  const toggleAllControlsForTodolist = (todolistId: string) => {
    const todolist = todolists.find(t => t.id === todolistId)
    if (!todolist) return
    
    const newControlVisibility = { ...controlVisibility }
    
    // Ottieni tutti i campi JSONB che questa todolist ha
    const todolistFields = allControls.filter(control => 
      todolist.tasks.some(task => {
        // Se il task è completato, controlla nel valore JSONB
        if (task.value && Array.isArray(task.value)) {
          return task.value.some(item => item.id === control.id)
        }
        // Se il task non è completato ma la todolist è scaduta, mostra comunque i controlli
        return todolist.isExpired
      })
    )
    
    const allSelected = todolistFields.every(field => 
      newControlVisibility[todolistId]?.[field.id]
    )
    
    todolistFields.forEach(field => {
      // Trova tutte le todolist che hanno questo campo JSONB
      const todolistsWithField = todolists.filter(t => 
        t.tasks.some(task => 
          task.value && Array.isArray(task.value) && 
          task.value.some(item => item.id === field.id)
        )
      )
      
      // Applica la modifica a tutte le todolist che hanno questo campo
      todolistsWithField.forEach(t => {
        if (!newControlVisibility[t.id]) {
          newControlVisibility[t.id] = {}
        }
        newControlVisibility[t.id][field.id] = !allSelected
      })
    })
    
    setControlVisibility(newControlVisibility)
  }

  // Gestione hover tabella
  const handleCellMouseEnter = (rowId: string, columnId: string) => {
    setHoveredRow(rowId)
    setHoveredColumn(columnId)
  }

  const handleCellMouseLeave = () => {
    setHoveredRow(null)
    setHoveredColumn(null)
  }

  // Verifica se una todolist ha almeno un controllo visibile
  const todolistHasVisibleControls = (todolistId: string): boolean => {
    const todolist = todolists.find(t => t.id === todolistId)
    if (!todolist) return false
    
    // Verifica se ha almeno un campo JSONB visibile
    return allControls.some(control => {
      // Controlla se questa todolist ha questo campo JSONB
      const hasField = todolist.tasks.some(task => {
        // Se il task è completato, controlla nel valore JSONB
        if (task.value && Array.isArray(task.value)) {
          return task.value.some(item => item.id === control.id)
        }
        // Se il task non è completato ma la todolist è scaduta, mostra comunque i controlli
        return todolist.isExpired
      })
      return hasField && controlVisibility[todolistId]?.[control.id]
    })
  }

    // Ottieni il valore di un controllo per una todolist
  const getControlValue = (todolist: TodolistData, controlId: string): string => {
    // Cerca in tutti i tasks della todolist per trovare il campo JSONB
    for (const task of todolist.tasks) {
      if (task.status === 'completed' && task.value && Array.isArray(task.value)) {
        const jsonbField = task.value.find(item => item.id === controlId)
        if (jsonbField) {
          // Gestisci diversi tipi di valori
          if (typeof jsonbField.value === 'boolean') {
            return jsonbField.value ? 'Sì' : 'No'
          }
          if (typeof jsonbField.value === 'number') {
            return jsonbField.value.toString()
          }
          if (typeof jsonbField.value === 'string') {
            return jsonbField.value
          }
          return jsonbField.value?.toString() || '-'
        }
      }
    }
    
    // Se non trova il campo ma la todolist è scaduta, mostra che non è stato completato
    if (todolist.isExpired) {
      return 'Non completato'
    }
    
    // Se non trova il campo, restituisci -
    return '-'
  }

  // Formatta la data della todolist
  const formatTodolistDate = (todolist: TodolistData): string => {
    const date = todolist.scheduled_execution
    const formattedDate = formatUTC(date, 'dd/MM/yyyy')
    const formattedTime = formatUTC(date, 'HH:mm')
    return `${formattedDate} ${formattedTime}`
  }

  return (
    <div className="w-full">
      {/* Filtri date e pulsante gestione sopra la tabella */}
      <div className="flex gap-2 mb-4 items-center">
        <Popover open={showFromCalendar} onOpenChange={setShowFromCalendar}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "w-fit min-w-[120px] justify-start text-left font-normal max-w-[180px]",
                !dateFrom && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateFrom ? format(dateFrom, "dd/MM/yyyy") : "Dal"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={dateFrom}
              onSelect={(date) => {
                if (date) {
                  setDateFrom(date)
                }
                setShowFromCalendar(false)
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        <Popover open={showToCalendar} onOpenChange={setShowToCalendar}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "w-fit min-w-[120px] justify-start text-left font-normal max-w-[180px]",
                !dateTo && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateTo ? format(dateTo, "dd/MM/yyyy") : "Al"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={dateTo}
              onSelect={(date) => {
                if (date) {
                  setDateTo(date)
                }
                setShowToCalendar(false)
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        {/* Pulsante gestione unificato */}
        <Button
          variant="outline"
          size="icon"
          className="w-fit h-8 px-2 text-gray-500 gap-2"
          onClick={openManageDialog}
          aria-label="Gestione Todolist e Controlli"
        >
          <Settings className="h-4 w-4" />
          Gestione Todolist e Controlli
        </Button>
        {/* Pulsante ricarica */}
        <Button
          variant="outline"
          size="sm"
          onClick={loadData}
          disabled={isLoading}
          className="gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Caricamento...
            </>
          ) : (
            "Ricarica"
          )}
        </Button>
      </div>

      {/* Contenuto tabella */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Caricamento dati...</span>
        </div>
      ) : todolists.length === 0 ? (
        <div className="flex items-center justify-center h-64 text-gray-500">
          <p>Nessuna todolist trovata nel periodo selezionato</p>
        </div>
      ) : (
        <div className="overflow-x-auto overflow-y-auto">
          <Table className="w-auto border-separate border-spacing-0">
            <TableHeader>
              <TableRow>
                {/* Colonna intestazione righe */}
                <TableHead className={cn(
                  "min-w-[250px] max-w-[250px] w-[250px] border-r border-b border-gray-200 transition-colors",
                  hoveredColumn === "name" && "bg-blue-50"
                )}>Todolist</TableHead>
                                 {/* Colonne dinamiche */}
                 {getVisibleControls().map((control) => (
                   <TableHead 
                     key={control.id} 
                     className={cn(
                       "min-w-[120px] max-w-[200px] w-fit border-r border-b border-gray-200 transition-colors relative",
                       hoveredColumn === control.id && "bg-blue-50"
                     )}
                     onMouseEnter={() => setHoveredColHeader(control.id)}
                     onMouseLeave={() => setHoveredColHeader(null)}
                   >
                     <div className="flex items-center justify-center gap-1 py-2 relative">
                       <span className="text-sm break-words leading-tight text-center">{control.name}</span>
                       {hoveredColHeader === control.id && (
                         <button
                           onClick={() => {
                             // Nascondi questo campo JSONB per tutte le todolist che lo hanno
                             const todolistsWithField = todolists.filter(t => 
                               t.tasks.some(task => 
                                 task.value && Array.isArray(task.value) && 
                                 task.value.some(item => item.id === control.id)
                               )
                             )
                             const newControlVisibility = { ...controlVisibility }
                             todolistsWithField.forEach(todolist => {
                               if (!newControlVisibility[todolist.id]) {
                                 newControlVisibility[todolist.id] = {}
                               }
                               newControlVisibility[todolist.id][control.id] = false
                             })
                             setControlVisibility(newControlVisibility)
                           }}
                           className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-gray-500 text-white flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                         >
                           ×
                         </button>
                       )}
                     </div>
                   </TableHead>
                 ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleTodolistsData.filter(todolist => todolistHasVisibleControls(todolist.id)).map((todolist) => (
                                 <TableRow key={todolist.id} className={cn(
                   "transition-colors",
                   hoveredRow === todolist.id && "bg-blue-50",
                   todolist.isExpired && "bg-red-50"
                 )}>
                                     {/* Prima cella: nome todolist */}
                   <TableCell 
                     className={cn(
                       "font-medium min-w-[250px] max-w-[250px] w-[250px] border-r border-b border-gray-200 transition-colors relative",
                       hoveredRow === todolist.id && "bg-blue-50"
                     )}
                     onMouseEnter={() => {
                       handleCellMouseEnter(todolist.id, "name")
                       setHoveredRowHeader(todolist.id)
                     }}
                     onMouseLeave={() => {
                       handleCellMouseLeave()
                       setHoveredRowHeader(null)
                     }}
                   >
                     <div className="py-1 relative">
                       {/* Data piccola sopra */}
                       <div className="text-xs text-gray-500 leading-tight">
                         {formatTodolistDate(todolist)}
                       </div>
                       {/* Nome device evidente */}
                       <div className="break-words text-sm font-medium text-gray-800 leading-tight">
                         {todolist.device_name}
                       </div>
                       {/* Data e ora di completamento se completata */}
                       {todolist.status === "completed" && todolist.completion_date && (
                         <div className="text-xs text-green-600 font-medium leading-tight">
                           Completata il {formatUTC(todolist.completion_date, "dd/MM/yyyy HH:mm")}
                         </div>
                       )}
                       {/* Stato sotto solo quando scaduta */}
                       {todolist.isExpired && (
                         <div className="text-xs text-red-600 font-medium leading-tight">
                           Scaduta
                         </div>
                       )}
                       {/* X per nascondere la riga */}
                       {hoveredRowHeader === todolist.id && (
                         <button
                           onClick={() => toggleTodolistVisibility(todolist.id)}
                           className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-gray-500 text-white flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                         >
                           ×
                         </button>
                       )}
                     </div>
                   </TableCell>
                  {/* Celle dinamiche */}
                  {getVisibleControls().map((control) => (
                    <TableCell 
                      key={control.id} 
                      className={cn(
                        "min-w-[120px] max-w-[200px] w-fit p-0 border-r border-b border-gray-200 transition-colors cursor-pointer",
                        (hoveredRow === todolist.id || hoveredColumn === control.id) && "bg-blue-50",
                        (hoveredRow === todolist.id && hoveredColumn === control.id) && "bg-blue-100"
                      )}
                      onMouseEnter={() => handleCellMouseEnter(todolist.id, control.id)}
                      onMouseLeave={handleCellMouseLeave}
                    >
                      <div className="min-h-[32px] flex items-center justify-center">
                        <span className="p-1 text-sm text-gray-700 font-medium">
                          {getControlValue(todolist, control.id)}
                        </span>
                      </div>
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      
      {/* Dialog unificato per gestire todolist e controlli */}
      <Dialog open={showManageDialog} onOpenChange={setShowManageDialog}>
        <DialogContent className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[1000] max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gestione Todolist e Controlli</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Gestione Todolist */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Todolist</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleAllTodolists}
                >
                  {visibleTodolists.size === todolists.length ? 'Deseleziona tutto' : 'Seleziona tutto'}
                </Button>
              </div>
              
              <div className="space-y-4">
                {todolists.map((todolist) => (
                  <div key={todolist.id} className="border rounded-lg p-4 space-y-3">
                    {/* Checkbox per la todolist */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`todolist-${todolist.id}`}
                          checked={visibleTodolists.has(todolist.id)}
                          onCheckedChange={() => toggleTodolistVisibility(todolist.id)}
                        />
                                                 <Label
                           htmlFor={`todolist-${todolist.id}`}
                           className="text-sm font-medium cursor-pointer flex-1"
                         >
                           <div className="text-xs text-gray-500">
                             {formatTodolistDate(todolist)}
                           </div>
                           <div className="font-medium text-gray-800">
                             {todolist.device_name}
                           </div>
                           {todolist.isExpired && (
                             <div className="text-xs text-red-600 font-medium">
                               Scaduta
                             </div>
                           )}
                         </Label>
                      </div>
                                               <Button
                           variant="outline"
                           size="sm"
                           onClick={() => toggleAllControlsForTodolist(todolist.id)}
                           disabled={!visibleTodolists.has(todolist.id)}
                         >
                           {allControls.filter(control => 
                             todolist.tasks.some(task => {
                               // Se il task è completato, controlla nel valore JSONB
                               if (task.value && Array.isArray(task.value)) {
                                 return task.value.some(item => item.id === control.id)
                               }
                               // Se il task non è completato ma la todolist è scaduta, mostra comunque i controlli
                               return todolist.isExpired
                             })
                           ).every(control => controlVisibility[todolist.id]?.[control.id]) 
                             ? 'Deseleziona controlli' 
                             : 'Seleziona controlli'}
                         </Button>
                    </div>
                    
                    {/* Controlli della todolist */}
                    {visibleTodolists.has(todolist.id) && (
                                             <div className="ml-6 space-y-2">
                         <div className="grid grid-cols-2 gap-2">
                           {allControls.filter(control => 
                             // Mostra solo i campi JSONB che questa todolist ha
                             todolist.tasks.some(task => {
                               // Se il task è completato, controlla nel valore JSONB
                               if (task.value && Array.isArray(task.value)) {
                                 return task.value.some(item => item.id === control.id)
                               }
                               // Se il task non è completato ma la todolist è scaduta, mostra comunque i controlli
                               return todolist.isExpired
                             })
                           ).map((control) => {
                             // Verifica se il controllo è condiviso
                             const isShared = todolists.filter(t => 
                               t.tasks.some(task => 
                                 task.value && Array.isArray(task.value) && 
                                 task.value.some(item => item.id === control.id)
                               )
                             ).length > 1
                             
                             return (
                               <div key={control.id} className="flex items-center space-x-2">
                                 <Checkbox
                                   id={`control-${todolist.id}-${control.id}`}
                                   checked={controlVisibility[todolist.id]?.[control.id] || false}
                                   onCheckedChange={() => toggleControlVisibility(todolist.id, control.id)}
                                 />
                                 <Label
                                   htmlFor={`control-${todolist.id}-${control.id}`}
                                   className={cn(
                                     "text-sm cursor-pointer flex-1",
                                     isShared && "text-blue-600 font-medium"
                                   )}
                                 >
                                   {control.name}
                                   {isShared && (
                                     <span className="ml-1 text-xs text-blue-500">(condiviso)</span>
                                   )}
                                 </Label>
                               </div>
                             )
                           })}
                         </div>
                       </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowManageDialog(false)}>
                Chiudi
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 