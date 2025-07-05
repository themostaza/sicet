"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, CalendarIcon, X, Columns, Rows } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

interface Column {
  id: string
  title: string
}

interface TodolistRow {
  id: number
  name: string
}

export default function MatriceTodolist() {
  const [dateFrom, setDateFrom] = useState<Date>(() => {
    const today = new Date()
    const sevenDaysAgo = new Date(today)
    sevenDaysAgo.setDate(today.getDate() - 7)
    return sevenDaysAgo
  })
  const [dateTo, setDateTo] = useState<Date>(() => new Date())
  const [showAddColumnDialog, setShowAddColumnDialog] = useState(false)
  const [showManageColumnsDialog, setShowManageColumnsDialog] = useState(false)
  const [showManageRowsDialog, setShowManageRowsDialog] = useState(false)
  const [newColumnTitle, setNewColumnTitle] = useState("")
  const [showFromCalendar, setShowFromCalendar] = useState(false)
  const [showToCalendar, setShowToCalendar] = useState(false)
  
  // Stato per gestire la visibilità delle righe
  const [visibleRows, setVisibleRows] = useState<Set<number>>(new Set())
  
  // Stato per gestire la visibilità delle colonne
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set())

  // Esempio dati righe (questi arriveranno dal DB)
  const allRows: TodolistRow[] = [
    { id: 1, name: "Esempio Todolist 1" },
    { id: 2, name: "Esempio Todolist 2" },
    { id: 3, name: "Esempio Todolist 3" },
    { id: 4, name: "Esempio Todolist 4" },
    { id: 5, name: "Esempio Todolist 5" },
    { id: 6, name: "Esempio Todolist 6" },
    { id: 7, name: "Esempio Todolist 7" },
    { id: 8, name: "Esempio Todolist 8" },
    { id: 9, name: "Esempio Todolist 9" },
    { id: 10, name: "Esempio Todolist 10" },
    { id: 11, name: "Esempio Todolist 11" },
    { id: 12, name: "Esempio Todolist 12" },
    { id: 13, name: "Esempio Todolist 13" },
    { id: 14, name: "Esempio Todolist 14" },
    { id: 15, name: "Esempio Todolist 15" },
  ]

  // Esempio dati colonne (questi arriveranno dal DB)
  const allColumns: Column[] = [
    { id: "temp", title: "Temperatura" },
    { id: "press", title: "Pressione" },
    { id: "umid", title: "Umidità" },
    { id: "volt", title: "Voltaggio" },
    { id: "corr", title: "Corrente" },
    { id: "ph", title: "pH" },
    { id: "cond", title: "Conducibilità" },
    { id: "turb", title: "Torbidità" },
    { id: "oss", title: "Ossigeno Disciolto" },
    { id: "clor", title: "Cloro Residuo" },
    { id: "dur", title: "Durezza" },
    { id: "alc", title: "Alcalinità" },
  ]

  // Inizializza tutte le righe come visibili al primo render
  React.useEffect(() => {
    if (visibleRows.size === 0) {
      setVisibleRows(new Set(allRows.map(row => row.id)))
    }
  }, [allRows])

  // Inizializza tutte le colonne come visibili al primo render
  React.useEffect(() => {
    if (visibleColumns.size === 0) {
      setVisibleColumns(new Set(allColumns.map(col => col.id)))
    }
  }, [allColumns])

  // Filtra le righe visibili
  const visibleRowsData = allRows.filter(row => visibleRows.has(row.id))
  
  // Filtra le colonne visibili
  const visibleColumnsData = allColumns.filter(col => visibleColumns.has(col.id))

  const openAddColumnDialog = () => {
    setShowAddColumnDialog(true)
    setNewColumnTitle("")
  }

  const openManageColumnsDialog = () => {
    setShowManageColumnsDialog(true)
  }

  const openManageRowsDialog = () => {
    setShowManageRowsDialog(true)
  }

  const addColumn = () => {
    if (newColumnTitle.trim()) {
      const newColumn: Column = {
        id: Date.now().toString(),
        title: newColumnTitle.trim()
      }
      // Aggiungi alla lista delle colonne e rendila visibile
      allColumns.push(newColumn)
      const newVisibleColumns = new Set(visibleColumns)
      newVisibleColumns.add(newColumn.id)
      setVisibleColumns(newVisibleColumns)
      setShowAddColumnDialog(false)
      setNewColumnTitle("")
    }
  }

  const removeColumn = (columnId: string) => {
    const newVisibleColumns = new Set(visibleColumns)
    newVisibleColumns.delete(columnId)
    setVisibleColumns(newVisibleColumns)
  }

  // Nasconde una singola colonna
  const hideColumn = (columnId: string) => {
    const newVisibleColumns = new Set(visibleColumns)
    newVisibleColumns.delete(columnId)
    setVisibleColumns(newVisibleColumns)
  }

  // Gestisce la selezione/deselezione di una colonna dal dialog
  const toggleColumnVisibility = (columnId: string) => {
    const newVisibleColumns = new Set(visibleColumns)
    if (newVisibleColumns.has(columnId)) {
      newVisibleColumns.delete(columnId)
    } else {
      newVisibleColumns.add(columnId)
    }
    setVisibleColumns(newVisibleColumns)
  }

  // Seleziona/deseleziona tutte le colonne
  const toggleAllColumns = () => {
    if (visibleColumns.size === allColumns.length) {
      // Se tutte sono selezionate, deseleziona tutte
      setVisibleColumns(new Set())
    } else {
      // Altrimenti seleziona tutte
      setVisibleColumns(new Set(allColumns.map(col => col.id)))
    }
  }

  // Nasconde una singola riga
  const hideRow = (rowId: number) => {
    const newVisibleRows = new Set(visibleRows)
    newVisibleRows.delete(rowId)
    setVisibleRows(newVisibleRows)
  }

  // Gestisce la selezione/deselezione di una riga dal dialog
  const toggleRowVisibility = (rowId: number) => {
    const newVisibleRows = new Set(visibleRows)
    if (newVisibleRows.has(rowId)) {
      newVisibleRows.delete(rowId)
    } else {
      newVisibleRows.add(rowId)
    }
    setVisibleRows(newVisibleRows)
  }

  // Seleziona/deseleziona tutte le righe
  const toggleAllRows = () => {
    if (visibleRows.size === allRows.length) {
      // Se tutte sono selezionate, deseleziona tutte
      setVisibleRows(new Set())
    } else {
      // Altrimenti seleziona tutte
      setVisibleRows(new Set(allRows.map(row => row.id)))
    }
  }

  return (
    <div className="w-full">
      {/* Filtri date e pulsanti gestione sopra la tabella */}
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
                 {/* Pulsante gestione colonne */}
         <Button
           variant="outline"
           size="icon"
           className="w-fit h-8 px-2 text-gray-500 gap-2"
           onClick={openManageColumnsDialog}
           aria-label="Gestisci colonne"
         >
           <Columns className="h-4 w-4" />
           Gestisci Controlli (colonne)
         </Button>
        {/* Pulsante gestione righe */}
        <Button
          variant="outline"
          size="icon"
          className="w-fit h-8 px-2 text-gray-500 gap-2"
          onClick={openManageRowsDialog}
          aria-label="Gestisci righe"
        >
          <Rows className="h-4 w-4" />
          Gestisci Todolist (righe)
        </Button>
      </div>
      
      <div className="overflow-x-auto overflow-y-auto">
        <Table className="w-auto border-separate border-spacing-0">
          <TableHeader>
            <TableRow>
              {/* Colonna intestazione righe */}
              <TableHead className="min-w-[160px] max-w-[160px] w-[160px] border-r border-b border-gray-200">Todolist</TableHead>
              {/* Colonne dinamiche */}
              {visibleColumnsData.map((column) => (
                <TableHead key={column.id} className="min-w-[120px] max-w-[200px] w-fit border-r border-b border-gray-200">
                  <div className="flex items-center justify-between gap-1 py-2">
                    <span className="text-sm break-words leading-tight w-[160px]">{column.title}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => hideColumn(column.id)}
                      className="h-5 w-5 p-0 hover:bg-red-100 flex-shrink-0 mt-0"
                      title="Nascondi colonna"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleRowsData.map((row) => (
              <TableRow key={row.id}>
                {/* Prima cella: nome todolist con pulsante X */}
                <TableCell className="font-medium min-w-[160px] max-w-[160px] w-[160px] border-r border-b border-gray-200">
                  <div className="flex items-center justify-between gap-1 py-1">
                    <div className="break-words text-sm text-gray-500 leading-tight w-[120px]">{row.name}</div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => hideRow(row.id)}
                      className="h-5 w-5 p-0 hover:bg-red-100 flex-shrink-0"
                      title="Nascondi riga"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
                {/* Celle dinamiche */}
                {visibleColumnsData.map((column) => (
                  <TableCell key={column.id} className="min-w-[120px] max-w-[200px] w-fit p-0 border-r border-b border-gray-200">
                    <div className="min-h-[32px] flex items-center justify-start">
                      <span className="p-1">Ciao</span>
                    </div>
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      {/* Dialog per aggiungere colonna */}
      <Dialog open={showAddColumnDialog} onOpenChange={setShowAddColumnDialog}>
        <DialogContent className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[1000]">
          <DialogHeader>
            <DialogTitle>Aggiungi Colonna</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="columnTitle">Titolo Colonna</Label>
              <Input
                id="columnTitle"
                value={newColumnTitle}
                onChange={(e) => setNewColumnTitle(e.target.value)}
                placeholder="Inserisci il titolo della colonna"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    addColumn()
                  }
                }}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddColumnDialog(false)}>
                Annulla
              </Button>
              <Button onClick={addColumn} disabled={!newColumnTitle.trim()}>
                Aggiungi
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog per gestire la visibilità delle colonne */}
      <Dialog open={showManageColumnsDialog} onOpenChange={setShowManageColumnsDialog}>
        <DialogContent className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[1000] max-w-md">
          <DialogHeader>
            <DialogTitle>Gestisci Controlli</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Seleziona i controlli da visualizzare:</span>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleAllColumns}
              >
                {visibleColumns.size === allColumns.length ? 'Deseleziona tutto' : 'Seleziona tutto'}
              </Button>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {allColumns.map((column) => (
                <div key={column.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`column-${column.id}`}
                    checked={visibleColumns.has(column.id)}
                    onCheckedChange={() => toggleColumnVisibility(column.id)}
                  />
                  <Label
                    htmlFor={`column-${column.id}`}
                    className="text-sm cursor-pointer flex-1"
                  >
                    {column.title}
                  </Label>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={openAddColumnDialog}
              >
                <Plus className="h-4 w-4 mr-2" />
                Aggiungi Controllo
              </Button>
              <Button variant="outline" onClick={() => setShowManageColumnsDialog(false)}>
                Chiudi
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog per gestire la visibilità delle righe */}
      <Dialog open={showManageRowsDialog} onOpenChange={setShowManageRowsDialog}>
        <DialogContent className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[1000] max-w-md">
          <DialogHeader>
            <DialogTitle>Gestisci Todolist</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Seleziona le todolist da visualizzare:</span>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleAllRows}
              >
                {visibleRows.size === allRows.length ? 'Deseleziona tutto' : 'Seleziona tutto'}
              </Button>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {allRows.map((row) => (
                <div key={row.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`row-${row.id}`}
                    checked={visibleRows.has(row.id)}
                    onCheckedChange={() => toggleRowVisibility(row.id)}
                  />
                  <Label
                    htmlFor={`row-${row.id}`}
                    className="text-sm cursor-pointer flex-1"
                  >
                    {row.name}
                  </Label>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowManageRowsDialog(false)}>
                Chiudi
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 