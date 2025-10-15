"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BarChart3, Trash2, Check, X, ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from "lucide-react"
import { useReport } from "./context"
import { useState, useEffect, useRef } from "react"
import { cn } from "@/lib/utils"
import { toast } from "@/components/ui/use-toast"

export function ReportSummary() {
  const { 
    selectedDevicesArray,
    selectedKpisArray,
    mappings,
    setMappings,
    moveDevice,
    moveField,
    devicesOrder,
    fieldsOrder
  } = useReport()

  // Debug per verificare i mappings
  useEffect(() => {
    console.log('ReportSummary - mappings changed:', mappings)
  }, [mappings])

  const [editingCell, setEditingCell] = useState<string | null>(null) // "deviceId-kpiId"
  const [editValue, setEditValue] = useState("")
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)
  const [hoveredColumn, setHoveredColumn] = useState<string | null>(null)
  const [focusedCell, setFocusedCell] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const getMappingKey = (deviceId: string, fieldId: string) => `${deviceId}-${fieldId}`

  // Ottieni tutte le celle in ordine per la navigazione
  const getAllCells = () => {
    const cells: Array<{deviceId: string, fieldId: string, mappingKey: string}> = []
    const allFields = getAllKpiFields()
    
    allFields.forEach(field => {
      selectedDevicesArray.forEach(device => {
        cells.push({
          deviceId: device.id,
          fieldId: field.fieldId,
          mappingKey: getMappingKey(device.id, field.fieldId)
        })
      })
    })
    return cells
  }

  // Naviga alla cella successiva o precedente
  const navigateToCell = (direction: 'next' | 'prev' | 'up' | 'down') => {
    const allCells = getAllCells()
    if (allCells.length === 0) return

    const currentIndex = allCells.findIndex(cell => cell.mappingKey === focusedCell)
    let newIndex = currentIndex

    if (direction === 'next') {
      newIndex = currentIndex < allCells.length - 1 ? currentIndex + 1 : 0
    } else if (direction === 'prev') {
      newIndex = currentIndex > 0 ? currentIndex - 1 : allCells.length - 1
    } else if (direction === 'down') {
      const devicesCount = selectedDevicesArray.length
      newIndex = currentIndex + devicesCount < allCells.length ? currentIndex + devicesCount : currentIndex
    } else if (direction === 'up') {
      const devicesCount = selectedDevicesArray.length
      newIndex = currentIndex - devicesCount >= 0 ? currentIndex - devicesCount : currentIndex
    }

    if (newIndex !== currentIndex && allCells[newIndex]) {
      const newCell = allCells[newIndex]
      setFocusedCell(newCell.mappingKey)
      
      // Trova l'elemento DOM e dagli il focus
      setTimeout(() => {
        const cellElement = document.querySelector(`[data-cell-id="${newCell.mappingKey}"]`) as HTMLElement
        if (cellElement) {
          cellElement.focus()
        }
      }, 0)
    }
  }

  // Estrai i campi da tutti i KPI selezionati e ordinali secondo fieldsOrder
  const getAllKpiFields = () => {
    // Prima crea una mappa di tutti i campi
    const fieldsMap = new Map<string, {
      kpiId: string
      kpiName: string
      fieldId: string
      fieldName: string
      fieldType: string
      fieldDescription?: string
      fieldRequired: boolean
    }>()

    selectedKpisArray.forEach(kpi => {
      // Gestisci il caso in cui kpi.value è un array con campi multipli
      if (kpi.value && Array.isArray(kpi.value) && kpi.value.length > 0) {
        kpi.value.forEach((field: any, index: number) => {
          const fieldId = field.id || `${kpi.id}-${String(field.name || '').toLowerCase().replace(/\s+/g, '_')}`
          fieldsMap.set(fieldId, {
            kpiId: kpi.id,
            kpiName: kpi.name,
            fieldId,
            fieldName: field.name || `Campo ${index + 1}`,
            fieldType: field.type || 'text',
            fieldDescription: field.description,
            fieldRequired: field.required || false
          })
        })
      } 
      // Gestisci il caso in cui kpi.value è un singolo oggetto
      else if (kpi.value && typeof kpi.value === 'object' && kpi.value !== null && !Array.isArray(kpi.value)) {
        const valueObj = kpi.value as any
        const fieldId = valueObj.id || `${kpi.id}-${String(valueObj.name || 'value').toLowerCase().replace(/\s+/g, '_')}`
        fieldsMap.set(fieldId, {
          kpiId: kpi.id,
          kpiName: kpi.name,
          fieldId,
          fieldName: valueObj.name || kpi.name,
          fieldType: valueObj.type || 'text',
          fieldDescription: valueObj.description || kpi.description,
          fieldRequired: valueObj.required || false
        })
      }
      // Se non ha campi specifici o value è null/undefined, crea un campo default
      else {
        const fieldId = `${kpi.id}-value`
        fieldsMap.set(fieldId, {
          kpiId: kpi.id,
          kpiName: kpi.name,
          fieldId,
          fieldName: kpi.name, // Usa il nome del KPI come fallback
          fieldType: 'text',
          fieldDescription: kpi.description,
          fieldRequired: true
        })
      }
    })

    // Ordina i campi secondo fieldsOrder
    const orderedFields = fieldsOrder
      .map(fieldId => fieldsMap.get(fieldId))
      .filter(field => field !== undefined)

    return orderedFields as Array<{
      kpiId: string
      kpiName: string
      fieldId: string
      fieldName: string
      fieldType: string
      fieldDescription?: string
      fieldRequired: boolean
    }>
  }

  const handleCellClick = (deviceId: string, fieldId: string) => {
    const mappingKey = getMappingKey(deviceId, fieldId)
    setFocusedCell(mappingKey)
  }

  const handleCellDoubleClick = (deviceId: string, fieldId: string) => {
    const mappingKey = getMappingKey(deviceId, fieldId)
    setEditingCell(mappingKey)
    setEditValue(mappings[mappingKey] || "")
    setFocusedCell(mappingKey)
  }

  const startEditing = (mappingKey: string) => {
    setEditingCell(mappingKey)
    setEditValue(mappings[mappingKey] || "")
    setFocusedCell(mappingKey)
  }

  // Effetto per focalizzare l'input quando iniziamo l'editing
  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus()
    }
  }, [editingCell])

  const handleSaveMapping = (value: string) => {
    if (!editingCell || !value.trim()) {
      setEditingCell(null)
      setEditValue("")
      return
    }
    
    const cellValue = value.trim().toUpperCase()
    
    // Validazione: non permettere celle nella riga 1 o colonna A
    const cellMatch = cellValue.match(/^([A-Z]+)(\d+)$/)
    if (cellMatch) {
      const column = cellMatch[1]
      const row = parseInt(cellMatch[2])
      
      if (column === 'A') {
        // Non permettere colonna A
        toast({
          title: "Cella non valida",
          description: "Non è possibile mappare celle nella colonna A. La colonna A è riservata per gli header.",
          variant: "destructive"
        })
        setEditValue("")
        return
      }
      
      if (row === 1) {
        // Non permettere riga 1
        toast({
          title: "Cella non valida",
          description: "Non è possibile mappare celle nella riga 1. La riga 1 è riservata per gli header.",
          variant: "destructive"
        })
        setEditValue("")
        return
      }
    } else {
      // Formato non valido
      toast({
        title: "Formato non valido",
        description: "Usa il formato Excel (es. B2, C3, D5, ecc.). Le celle devono iniziare dalla colonna B e dalla riga 2.",
        variant: "destructive"
      })
      setEditValue("")
      return
    }
    
    setMappings(prev => ({
      ...prev,
      [editingCell]: cellValue
    }))
    setEditingCell(null)
    setEditValue("")
  }

  const handleInputChange = (value: string) => {
    setEditValue(value.toUpperCase())
    // Rimuovo il salvataggio automatico per permettere la digitazione continua
  }

  const handleRemoveMapping = (deviceId: string, fieldId: string) => {
    const mappingKey = getMappingKey(deviceId, fieldId)
    setMappings(prev => {
      const newMappings = { ...prev }
      delete newMappings[mappingKey]
      return newMappings
    })
  }

  const handleCellMouseEnter = (rowId: string, columnId: string) => {
    setHoveredRow(rowId)
    setHoveredColumn(columnId)
  }

  const handleCellMouseLeave = () => {
    setHoveredRow(null)
    setHoveredColumn(null)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveMapping(editValue)
    } else if (e.key === 'Escape') {
      setEditingCell(null)
      setEditValue("")
    } else if (e.key === 'Tab') {
      e.preventDefault()
      handleSaveMapping(editValue)
      navigateToCell(e.shiftKey ? 'prev' : 'next')
    }
  }

  const handleCellKeyDown = (e: React.KeyboardEvent, mappingKey: string) => {
    if (editingCell === mappingKey) return // Se stiamo editando, lascia che handleKeyPress gestisca

    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault()
        startEditing(mappingKey)
        break
      case 'Tab':
        e.preventDefault()
        navigateToCell(e.shiftKey ? 'prev' : 'next')
        break
      case 'ArrowRight':
        e.preventDefault()
        navigateToCell('next')
        break
      case 'ArrowLeft':
        e.preventDefault()
        navigateToCell('prev')
        break
      case 'ArrowDown':
        e.preventDefault()
        navigateToCell('down')
        break
      case 'ArrowUp':
        e.preventDefault()
        navigateToCell('up')
        break
      case 'Delete':
      case 'Backspace':
        e.preventDefault()
        const [deviceId, fieldId] = mappingKey.split('-', 2)
        handleRemoveMapping(deviceId, fieldId)
        break
      default:
        // Se è un carattere stampabile, inizia l'editing
        if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
          e.preventDefault()
          // Assicurati che stiamo editando la cella corretta
          setFocusedCell(mappingKey)
          setEditingCell(mappingKey)
          setEditValue(e.key.toUpperCase()) // Inizia con il carattere digitato
        }
        break
    }
  }

  const allFields = getAllKpiFields()

  if (selectedDevicesArray.length === 0 || allFields.length === 0) {
    return (
      <div className="w-full">
        <div className="border rounded-lg p-8 text-center">
          <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Matrice di Mappatura</h3>
          <p className="text-sm text-gray-500">
            Seleziona punti di controllo e controlli per configurare la mappatura Excel
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Matrice di Mappatura Excel
          </h3>
          <div className="flex items-center gap-4">
            <Badge variant="secondary">
              {Object.keys(mappings).length} mappature configurate
            </Badge>
          </div>
        </div>
        
        {/* Nota informativa sulle restrizioni */}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
          <p className="text-sm text-blue-800">
            <strong>Nota:</strong> La colonna A e la riga 1 sono riservate per gli header nell'Excel esportato. 
            Inserisci celle a partire da <strong>B2</strong> (es. B2, C3, D4, ecc.).
          </p>
        </div>

        <div className="overflow-x-auto overflow-y-auto border rounded-md">
          <Table className="w-auto border-separate border-spacing-0">
            <TableHeader>
              <TableRow>
                <TableHead className={cn(
                  "min-w-[200px] max-w-[200px] w-[200px] border-r border-b border-gray-200 transition-colors",
                  hoveredColumn === "fields" && "bg-blue-50"
                )}>
                  Campi Controlli
                </TableHead>
                {selectedDevicesArray.map((device, index) => (
                  <TableHead 
                    key={device.id}
                    className={cn(
                      "min-w-[150px] max-w-[200px] w-fit border-r border-b border-gray-200 transition-colors text-center",
                      hoveredColumn === device.id && "bg-blue-50"
                    )}
                  >
                    <div className="py-2">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => moveDevice(device.id, 'left')}
                          disabled={index === 0}
                          title="Sposta a sinistra"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => moveDevice(device.id, 'right')}
                          disabled={index === selectedDevicesArray.length - 1}
                          title="Sposta a destra"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="font-medium text-sm">{device.name}</div>
                      <div className="text-xs text-gray-500">ID: {device.id}</div>
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {allFields.map((field, fieldIndex) => {
                // Ogni campo può spostarsi su/giù
                const isFirstField = fieldIndex === 0
                const isLastField = fieldIndex === allFields.length - 1
                
                return (
                  <TableRow 
                    key={field.fieldId}
                    className={cn(
                      "transition-colors",
                      hoveredRow === field.fieldId && "bg-blue-50"
                    )}
                  >
                    <TableCell 
                      className={cn(
                        "font-medium min-w-[200px] max-w-[200px] w-[200px] border-r border-b border-gray-200 transition-colors",
                        hoveredRow === field.fieldId && "bg-blue-50"
                      )}
                    >
                      <div className="py-1 flex gap-2">
                        <div className="flex flex-col gap-0.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0"
                            onClick={() => moveField(field.fieldId, 'up')}
                            disabled={isFirstField}
                            title="Sposta in alto"
                          >
                            <ChevronUp className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0"
                            onClick={() => moveField(field.fieldId, 'down')}
                            disabled={isLastField}
                            title="Sposta in basso"
                          >
                            <ChevronDown className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-sm">{field.fieldName}</div>
                          <div className="text-xs text-blue-600 font-medium">{field.kpiName}</div>
                          <div className="text-xs text-gray-500">
                            {field.fieldType}
                            {field.fieldRequired && <span className="text-red-500 ml-1">*</span>}
                          </div>
                          {field.fieldDescription && (
                            <div className="text-xs text-gray-400 mt-1">{field.fieldDescription}</div>
                          )}
                        </div>
                    </div>
                  </TableCell>
                    {selectedDevicesArray.map((device) => {
                      const mappingKey = getMappingKey(device.id, field.fieldId)
                      const cellMapping = mappings[mappingKey]
                      
                      return (
                      <TableCell 
                        key={device.id}
                        data-cell-id={mappingKey}
                        className={cn(
                          "min-w-[150px] max-w-[200px] w-fit p-1 border-r border-b border-gray-200 transition-colors",
                          (hoveredRow === field.fieldId || hoveredColumn === device.id) && "bg-blue-50",
                          (hoveredRow === field.fieldId && hoveredColumn === device.id) && "bg-blue-100",
                          editingCell === mappingKey && "bg-blue-100",
                          focusedCell === mappingKey && "ring-2 ring-blue-500 ring-inset"
                        )}
                        onMouseEnter={() => handleCellMouseEnter(field.fieldId, device.id)}
                        onMouseLeave={handleCellMouseLeave}
                        tabIndex={0}
                        onKeyDown={(e) => handleCellKeyDown(e, mappingKey)}
                        onFocus={() => setFocusedCell(mappingKey)}
                      >
                        <div className="min-h-[60px] flex items-center justify-center p-1 relative group">
                          {editingCell === mappingKey ? (
                            // Modalità editing
                            <Input
                              ref={inputRef}
                              value={editValue}
                              onChange={(e) => handleInputChange(e.target.value)}
                              onKeyDown={handleKeyPress}
                              onBlur={() => {
                                // Salva il valore quando l'utente esce dall'input
                                if (editValue.trim()) {
                                  handleSaveMapping(editValue)
                                } else {
                                  setEditingCell(null)
                                  setEditValue("")
                                }
                              }}
                              placeholder="es. B2, C3"
                              className="h-8 text-center text-sm font-mono"
                              autoFocus
                            />
                          ) : cellMapping ? (
                            // Modalità visualizzazione con valore
                            <div 
                              className="text-center cursor-pointer w-full" 
                              onClick={() => handleCellClick(device.id, field.fieldId)}
                              onDoubleClick={() => handleCellDoubleClick(device.id, field.fieldId)}
                            >
                              <div className="text-sm font-mono font-semibold text-blue-700">
                                {cellMapping}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                Cella Excel
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleRemoveMapping(device.id, field.fieldId)
                                }}
                                tabIndex={-1}
                              >
                                <Trash2 className="h-3 w-3 text-red-500" />
                              </Button>
                            </div>
                          ) : (
                            // Modalità vuota
                            <div 
                              className="text-center text-gray-400 cursor-pointer w-full" 
                              onClick={() => handleCellClick(device.id, field.fieldId)}
                              onDoubleClick={() => handleCellDoubleClick(device.id, field.fieldId)}
                            >
                              <div className="text-sm">
                                {focusedCell === mappingKey ? "Inizia a scrivere" : "Clicca per mappare"}
                              </div>
                              <div className="text-xs">
                                {focusedCell === mappingKey ? "o Tab per navigare" : ""}
                              </div>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      )
                    })}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
