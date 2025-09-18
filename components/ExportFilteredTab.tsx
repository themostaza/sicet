"use client"

import React, { useState, useEffect } from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { FileDown, Loader2, CalendarIcon, Filter } from "lucide-react"
import { format, subDays } from "date-fns"
import { cn } from "@/lib/utils"
import { toast } from "@/components/ui/use-toast"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

interface TodolistItem {
  id: string
  device_name: string
  scheduled_execution: string
  status: string
  completion_date?: string
}

export default function ExportFilteredTab() {
  // Date range - default ultimi 30 giorni
  const [startDate, setStartDate] = useState<Date>(subDays(new Date(), 30))
  const [endDate, setEndDate] = useState<Date>(new Date())
  
  // Todolist
  const [todolists, setTodolists] = useState<TodolistItem[]>([])
  const [selectedTodolistIds, setSelectedTodolistIds] = useState<string[]>([])
  
  // Stati
  const [isLoading, setIsLoading] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  
  // Carica le todolist per il periodo selezionato
  const loadTodolists = async () => {
    setIsLoading(true)
    setSelectedTodolistIds([]) // Reset selezione quando si ricaricano i dati
    try {
      const params = new URLSearchParams({
        startDate: format(startDate, "yyyy-MM-dd"),
        endDate: format(endDate, "yyyy-MM-dd")
      })
      
      const response = await fetch(`/api/export/todolists-preview?${params}`)
      
      if (response.ok) {
        const data = await response.json()
        setTodolists(data.todolists || [])
      } else {
        throw new Error('Errore nel caricamento delle todolist')
      }
    } catch (error) {
      console.error('Errore nel caricamento todolist:', error)
      toast({
        title: "Errore",
        description: "Impossibile caricare le todolist per il periodo selezionato",
        variant: "destructive"
      })
      setTodolists([])
    } finally {
      setIsLoading(false)
    }
  }
  
  // Carica le todolist quando cambiano le date
  useEffect(() => {
    loadTodolists()
  }, [startDate, endDate])
  
  // Toggle selezione todolist
  const toggleTodolist = (todolistId: string) => {
    setSelectedTodolistIds(prev => 
      prev.includes(todolistId)
        ? prev.filter(id => id !== todolistId)
        : [...prev, todolistId]
    )
  }
  
  // Seleziona tutte le todolist
  const selectAllTodolists = () => {
    setSelectedTodolistIds(todolists.map(t => t.id))
  }
  
  // Deseleziona tutte le todolist
  const clearTodolistSelection = () => {
    setSelectedTodolistIds([])
  }
  
  // Handle export
  const handleExport = async () => {
    if (isExporting) return
    
    setIsExporting(true)
    try {
      let response: Response
      
      // Se ci sono todolist selezionate, usa POST, altrimenti usa GET per tutte del periodo
      if (selectedTodolistIds.length > 0) {
        // POST per todolist specifiche
        response = await fetch('/api/export/csv-filtered', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            startDate: format(startDate, "yyyy-MM-dd"),
            endDate: format(endDate, "yyyy-MM-dd"),
            todolistIds: selectedTodolistIds,
            filename: 'export_todolist_filtrato'
          })
        })
      } else {
        // GET per tutte le todolist del periodo
        const params = new URLSearchParams({
          startDate: format(startDate, "yyyy-MM-dd"),
          endDate: format(endDate, "yyyy-MM-dd"),
          filename: 'export_todolist_filtrato'
        })
        response = await fetch(`/api/export/csv?${params}`)
      }
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Export error response:', errorText)
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`)
      }
      
      const blob = await response.blob()
      
      // Download del file
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `export_todolist_${format(startDate, "yyyy-MM-dd")}_${format(endDate, "yyyy-MM-dd")}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      toast({
        title: "Esportazione completata",
        description: `Il file CSV è stato scaricato con successo ${selectedTodolistIds.length > 0 ? `(${selectedTodolistIds.length} todolist)` : '(tutte le todolist del periodo)'}`
      })
    } catch (error) {
      console.error("Errore durante l'esportazione:", error)
      toast({
        title: "Errore",
        description: "Si è verificato un problema durante l'esportazione",
        variant: "destructive"
      })
    } finally {
      setIsExporting(false)
    }
  }
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Export Filtrato Tasks
          </CardTitle>
          <CardDescription>
            Seleziona il periodo e le todolist specifiche da esportare. Se non selezioni nessuna todolist, verranno esportate tutte quelle del periodo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Selezione Periodo */}
          <div className="space-y-3">
            <h3 className="font-medium">Periodo di Export</h3>
            <div className="flex flex-wrap gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="start-date" className="text-sm">Data inizio</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="start-date"
                      variant="outline"
                      className={cn(
                        "w-[180px] justify-start text-left font-normal h-9",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "dd/MM/yyyy") : <span>Seleziona data</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => date && setStartDate(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="end-date" className="text-sm">Data fine</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="end-date"
                      variant="outline"
                      className={cn(
                        "w-[180px] justify-start text-left font-normal h-9",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "dd/MM/yyyy") : <span>Seleziona data</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={(date) => date && setEndDate(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
          
          <Separator />
          
          {/* Lista Todolist */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">
                Todolist del Periodo ({selectedTodolistIds.length}/{todolists.length})
              </h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAllTodolists} disabled={isLoading}>
                  Seleziona tutte
                </Button>
                <Button variant="outline" size="sm" onClick={clearTodolistSelection} disabled={isLoading}>
                  Deseleziona tutte
                </Button>
                <Button 
                  onClick={handleExport}
                  disabled={isExporting || todolists.length === 0}
                  size="sm"
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Esportazione...
                    </>
                  ) : (
                    <>
                      <FileDown className="mr-2 h-4 w-4" />
                      Esporta CSV
                    </>
                  )}
                </Button>
              </div>
            </div>
            
            {isLoading ? (
              <div className="flex items-center justify-center p-8 border rounded-lg">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>Caricamento todolist...</span>
              </div>
            ) : todolists.length === 0 ? (
              <div className="text-center text-muted-foreground py-8 border rounded-lg">
                Nessuna todolist trovata per il periodo selezionato
              </div>
            ) : (
              <ScrollArea className="h-fit border rounded-lg">
                <div className="p-4 space-y-2">
                  {todolists.map(todolist => (
                    <div
                      key={todolist.id}
                      className={cn(
                        "flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors",
                        selectedTodolistIds.includes(todolist.id) && "bg-muted border-primary"
                      )}
                      onClick={() => toggleTodolist(todolist.id)}
                    >
                      <div className="flex-1">
                        <div className="font-medium">{todolist.device_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(todolist.scheduled_execution), "dd/MM/yyyy HH:mm")}
                        </div>
                        <div className={cn(
                          "text-xs px-2 py-1 rounded-full inline-block mt-1",
                          todolist.status === "completed" 
                            ? "bg-green-100 text-green-800" 
                            : "bg-yellow-100 text-yellow-800"
                        )}>
                          {todolist.status === "completed" ? "Completata" : "In Corso"}
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={selectedTodolistIds.includes(todolist.id)}
                        onChange={(e) => {
                          e.stopPropagation()
                          toggleTodolist(todolist.id)
                        }}
                        className="h-4 w-4"
                      />
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
            
            {selectedTodolistIds.length > 0 && (
              <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                ✓ {selectedTodolistIds.length} todolist selezionate per l'export
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
