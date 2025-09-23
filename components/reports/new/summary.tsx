"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BarChart3, Trash2, Check, X } from "lucide-react"
import { useReport } from "./context"
import { useState } from "react"
import { cn } from "@/lib/utils"

export function ReportSummary() {
  const { 
    selectedDevicesArray,
    selectedKpisArray,
    mappings,
    setMappings
  } = useReport()

  const [editingCell, setEditingCell] = useState<string | null>(null) // "deviceId-kpiId"
  const [editValue, setEditValue] = useState("")
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)
  const [hoveredColumn, setHoveredColumn] = useState<string | null>(null)

  const getMappingKey = (deviceId: string, fieldId: string) => `${deviceId}-${fieldId}`

  // Estrai i campi da tutti i KPI selezionati
  const getAllKpiFields = () => {
    const fields: Array<{
      kpiId: string
      kpiName: string
      fieldId: string
      fieldName: string
      fieldType: string
      fieldDescription?: string
      fieldRequired: boolean
    }> = []

    selectedKpisArray.forEach(kpi => {
      // Gestisci il caso in cui kpi.value è un array con campi multipli
      if (kpi.value && Array.isArray(kpi.value) && kpi.value.length > 0) {
        kpi.value.forEach((field: any, index: number) => {
          fields.push({
            kpiId: kpi.id,
            kpiName: kpi.name,
            fieldId: field.id || `${kpi.id}-${String(field.name || '').toLowerCase().replace(/\s+/g, '_')}`,
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
        fields.push({
          kpiId: kpi.id,
          kpiName: kpi.name,
          fieldId: valueObj.id || `${kpi.id}-${String(valueObj.name || 'value').toLowerCase().replace(/\s+/g, '_')}`,
          fieldName: valueObj.name || kpi.name,
          fieldType: valueObj.type || 'text',
          fieldDescription: valueObj.description || kpi.description,
          fieldRequired: valueObj.required || false
        })
      }
      // Se non ha campi specifici o value è null/undefined, crea un campo default
      else {
        fields.push({
          kpiId: kpi.id,
          kpiName: kpi.name,
          fieldId: `${kpi.id}-value`,
          fieldName: kpi.name, // Usa il nome del KPI come fallback
          fieldType: 'text',
          fieldDescription: kpi.description,
          fieldRequired: true
        })
      }
    })

    return fields
  }

  const handleCellClick = (deviceId: string, fieldId: string) => {
    const mappingKey = getMappingKey(deviceId, fieldId)
    setEditingCell(mappingKey)
    setEditValue(mappings[mappingKey] || "")
  }

  const handleSaveMapping = (value: string) => {
    if (editingCell && value.trim()) {
      setMappings(prev => ({
        ...prev,
        [editingCell]: value.trim().toUpperCase()
      }))
    }
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
            Seleziona dispositivi e KPI per configurare la mappatura Excel
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

        <div className="overflow-x-auto overflow-y-auto border rounded-md">
          <Table className="w-auto border-separate border-spacing-0">
            <TableHeader>
              <TableRow>
                <TableHead className={cn(
                  "min-w-[200px] max-w-[200px] w-[200px] border-r border-b border-gray-200 transition-colors",
                  hoveredColumn === "fields" && "bg-blue-50"
                )}>
                  Campi KPI
                </TableHead>
                {selectedDevicesArray.map((device) => (
                  <TableHead 
                    key={device.id}
                    className={cn(
                      "min-w-[150px] max-w-[200px] w-fit border-r border-b border-gray-200 transition-colors text-center",
                      hoveredColumn === device.id && "bg-blue-50"
                    )}
                  >
                    <div className="py-2">
                      <div className="font-medium text-sm">{device.name}</div>
                      <div className="text-xs text-gray-500">ID: {device.id}</div>
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {allFields.map((field) => (
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
                    <div className="py-1">
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
                  </TableCell>
                  {selectedDevicesArray.map((device) => {
                    const mappingKey = getMappingKey(device.id, field.fieldId)
                    const cellMapping = mappings[mappingKey]
                    
                    return (
                      <TableCell 
                        key={device.id}
                        className={cn(
                          "min-w-[150px] max-w-[200px] w-fit p-1 border-r border-b border-gray-200 transition-colors",
                          (hoveredRow === field.fieldId || hoveredColumn === device.id) && "bg-blue-50",
                          (hoveredRow === field.fieldId && hoveredColumn === device.id) && "bg-blue-100",
                          editingCell === mappingKey && "bg-blue-100"
                        )}
                        onMouseEnter={() => handleCellMouseEnter(field.fieldId, device.id)}
                        onMouseLeave={handleCellMouseLeave}
                      >
                        <div className="min-h-[60px] flex items-center justify-center p-1 relative group">
                          {editingCell === mappingKey ? (
                            // Modalità editing
                            <Input
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
                              placeholder="es. B5"
                              className="h-8 text-center text-sm font-mono"
                              autoFocus
                            />
                          ) : cellMapping ? (
                            // Modalità visualizzazione con valore
                            <div className="text-center cursor-pointer w-full" onClick={() => handleCellClick(device.id, field.fieldId)}>
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
                              >
                                <Trash2 className="h-3 w-3 text-red-500" />
                              </Button>
                            </div>
                          ) : (
                            // Modalità vuota
                            <div className="text-center text-gray-400 cursor-pointer w-full" onClick={() => handleCellClick(device.id, field.fieldId)}>
                              <div className="text-sm">Clicca per</div>
                              <div className="text-xs">mappare</div>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
