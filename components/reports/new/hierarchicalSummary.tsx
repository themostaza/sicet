"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  BarChart3, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  ChevronUp, 
  ChevronDown,
  Plus
} from "lucide-react"
import { useReport } from "./context"
import { cn } from "@/lib/utils"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { Search } from "lucide-react"

export function HierarchicalReportSummary() {
  const { 
    controlPoints,
    addControlPoint,
    removeControlPoint,
    moveControlPoint,
    addControlToControlPoint,
    removeControlFromControlPoint,
    moveControlInControlPoint,
    devices,
    kpis
  } = useReport()

  const [expandedControlPoints, setExpandedControlPoints] = useState<Set<string>>(
    new Set(controlPoints.map(cp => cp.id))
  )
  const [isDeviceSheetOpen, setIsDeviceSheetOpen] = useState(false)
  const [isControlSheetOpen, setIsControlSheetOpen] = useState(false)
  const [selectedControlPointForAdding, setSelectedControlPointForAdding] = useState<string | null>(null)
  const [deviceSearchQuery, setDeviceSearchQuery] = useState("")
  const [controlSearchQuery, setControlSearchQuery] = useState("")

  // Ottieni TUTTI i campi KPI disponibili nel sistema (non solo quelli selezionati)
  const getAllAvailableKpiFields = () => {
    const fields: Array<{
      kpiId: string
      kpiName: string
      fieldId: string
      fieldName: string
      fieldType: string
      fieldDescription?: string
      fieldRequired: boolean
    }> = []

    // Usa TUTTI i KPI, non solo quelli selezionati
    kpis.forEach(kpi => {
      if (kpi.value && Array.isArray(kpi.value) && kpi.value.length > 0) {
        kpi.value.forEach((field: { id?: string; name?: string; type?: string; description?: string; required?: boolean }, index: number) => {
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
      } else if (kpi.value && typeof kpi.value === 'object' && kpi.value !== null && !Array.isArray(kpi.value)) {
        const valueObj = kpi.value as { id?: string; name?: string; type?: string; description?: string; required?: boolean }
        fields.push({
          kpiId: kpi.id,
          kpiName: kpi.name,
          fieldId: valueObj.id || `${kpi.id}-${String(valueObj.name || 'value').toLowerCase().replace(/\s+/g, '_')}`,
          fieldName: valueObj.name || kpi.name,
          fieldType: valueObj.type || 'text',
          fieldDescription: valueObj.description || kpi.description,
          fieldRequired: valueObj.required || false
        })
      } else {
        fields.push({
          kpiId: kpi.id,
          kpiName: kpi.name,
          fieldId: `${kpi.id}-value`,
          fieldName: kpi.name,
          fieldType: 'text',
          fieldDescription: kpi.description,
          fieldRequired: true
        })
      }
    })

    return fields
  }

  const availableKpiFields = getAllAvailableKpiFields()

  const toggleControlPoint = (controlPointId: string) => {
    setExpandedControlPoints(prev => {
      const newSet = new Set(prev)
      if (newSet.has(controlPointId)) {
        newSet.delete(controlPointId)
      } else {
        newSet.add(controlPointId)
      }
      return newSet
    })
  }

  const handleAddControl = (controlPointId: string, fieldId: string) => {
    const field = availableKpiFields.find(f => f.fieldId === fieldId)
    if (!field) return

    addControlToControlPoint(controlPointId, {
      kpiId: field.kpiId,
      fieldId: field.fieldId,
      name: `${field.kpiName} - ${field.fieldName}`,
      kpiName: field.kpiName,
      fieldName: field.fieldName
    })
    setIsControlSheetOpen(false)
    setControlSearchQuery("")
  }

  const handleAddDevice = (deviceId: string) => {
    addControlPoint(deviceId)
    setIsDeviceSheetOpen(false)
    setDeviceSearchQuery("")
  }

  const openControlSheet = (controlPointId: string) => {
    setSelectedControlPointForAdding(controlPointId)
    setIsControlSheetOpen(true)
  }

  const filteredDevices = devices.filter(device => 
    device.name.toLowerCase().includes(deviceSearchQuery.toLowerCase())
  )

  const getAvailableFieldsForControlPoint = (controlPointId: string) => {
    const cp = controlPoints.find(c => c.id === controlPointId)
    if (!cp) return []

    const usedFieldIds = new Set(cp.controls.map(c => c.fieldId))
    const available = availableKpiFields.filter(f => !usedFieldIds.has(f.fieldId))
    
    if (controlSearchQuery) {
      return available.filter(f => 
        f.fieldName.toLowerCase().includes(controlSearchQuery.toLowerCase()) ||
        f.kpiName.toLowerCase().includes(controlSearchQuery.toLowerCase())
      )
    }
    
    return available
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Configurazione Punti di Controllo e Controlli
          </h3>
          <p className="text-sm text-gray-500">
            Per ogni punto di controllo (device), seleziona quali controlli (campi KPI) monitorare e il loro ordine
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="secondary">
            {controlPoints.length} {controlPoints.length === 1 ? 'punto di controllo' : 'punti di controllo'}
          </Badge>
          <Badge variant="secondary">
            {controlPoints.reduce((acc, cp) => acc + cp.controls.length, 0)} controlli totali
          </Badge>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
        <p className="text-sm text-blue-800">
          <strong>Come funziona:</strong>
        </p>
        <ul className="text-sm text-blue-800 list-disc list-inside mt-2 space-y-1">
          <li>Aggiungi un <strong>Punto di Controllo</strong> selezionando un dispositivo</li>
          <li>Per ogni Punto di Controllo, aggiungi i <strong>Controlli</strong> (campi KPI) che vuoi monitorare</li>
          <li>Riordina i controlli con le frecce su/giù - questo determinerà l&apos;ordine nell&apos;Excel finale</li>
          <li>Nell&apos;Excel: ogni Punto di Controllo sarà una colonna con i suoi controlli sotto come righe</li>
        </ul>
      </div>

      <div className="border-2 border-dashed rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium">Aggiungi Punto di Controllo</h4>
            <p className="text-sm text-gray-500">Seleziona un dispositivo da monitorare</p>
          </div>
          <Button onClick={() => setIsDeviceSheetOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Aggiungi Dispositivo
          </Button>
        </div>
      </div>

      {controlPoints.length === 0 ? (
        <div className="border rounded-lg p-8 text-center bg-gray-50">
          <p className="text-gray-500">
            Nessun punto di controllo configurato. Aggiungi un punto di controllo per iniziare.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {controlPoints.map((controlPoint, index) => {
            const isExpanded = expandedControlPoints.has(controlPoint.id)
            const availableFields = getAvailableFieldsForControlPoint(controlPoint.id)
            
            return (
              <Card key={controlPoint.id} className="border-2">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => toggleControlPoint(controlPoint.id)}
                        title={isExpanded ? "Comprimi" : "Espandi"}
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                      
                      <div className="flex-1">
                        <CardTitle className="text-base flex items-center gap-2">
                          {controlPoint.name}
                          <Badge variant="outline" className="font-normal">
                            {controlPoint.controls.length} {controlPoint.controls.length === 1 ? 'controllo' : 'controlli'}
                          </Badge>
                        </CardTitle>
                        <p className="text-sm text-gray-500 mt-1">
                          Device ID: {controlPoint.deviceId}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => moveControlPoint(controlPoint.id, 'left')}
                          disabled={index === 0}
                          title="Sposta a sinistra"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => moveControlPoint(controlPoint.id, 'right')}
                          disabled={index === controlPoints.length - 1}
                          title="Sposta a destra"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => removeControlPoint(controlPoint.id)}
                        title="Rimuovi punto di controllo"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pt-3 border-t">
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">Aggiungi controllo:</span>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => openControlSheet(controlPoint.id)}
                          disabled={availableFields.length === 0}
                          className="gap-2"
                        >
                          <Plus className="h-4 w-4" />
                          {availableFields.length === 0 
                            ? "Tutti i controlli aggiunti" 
                            : "Seleziona controllo"}
                        </Button>
                      </div>
                    </div>

                    {controlPoint.controls.length === 0 ? (
                      <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                        <p>Nessun controllo configurato per questo punto di controllo.</p>
                        <p className="text-sm mt-1">Usa il menu sopra per aggiungere controlli.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="text-sm font-medium text-gray-700">
                          Controlli configurati (struttura Excel):
                        </div>
                        
                        {/* Tabella orizzontale dei controlli */}
                        <div className="border rounded-lg overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="bg-blue-50">
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 border-r">
                                  #
                                </th>
                                {controlPoint.controls.map((control, controlIndex) => (
                                  <th 
                                    key={control.id} 
                                    className="px-4 py-3 text-left border-r last:border-r-0 min-w-[180px]"
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex-1 min-w-0">
                                        <div className="font-medium text-sm text-gray-900">
                                          {control.fieldName}
                                        </div>
                                        <div className="text-xs text-blue-600 mt-0.5">
                                          {control.kpiName}
                                        </div>
                                      </div>
                                      
                                      <div className="flex items-center gap-0.5 flex-shrink-0">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 w-6 p-0"
                                          onClick={() => moveControlInControlPoint(controlPoint.id, control.id, 'up')}
                                          disabled={controlIndex === 0}
                                          title="Sposta a sinistra"
                                        >
                                          <ChevronLeft className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 w-6 p-0"
                                          onClick={() => moveControlInControlPoint(controlPoint.id, control.id, 'down')}
                                          disabled={controlIndex === controlPoint.controls.length - 1}
                                          title="Sposta a destra"
                                        >
                                          <ChevronRight className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                                          onClick={() => removeControlFromControlPoint(controlPoint.id, control.id)}
                                          title="Rimuovi controllo"
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              <tr className="bg-gray-50">
                                <td className="px-3 py-2 text-xs text-gray-600 border-r border-t">
                                  Valori
                                </td>
                                {controlPoint.controls.map((control) => (
                                  <td 
                                    key={control.id}
                                    className="px-4 py-3 text-center border-r border-t last:border-r-0"
                                  >
                                    <div className="text-sm text-gray-400 italic">
                                      [valore runtime]
                                    </div>
                                  </td>
                                ))}
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Sheet per selezionare dispositivo */}
      <Sheet open={isDeviceSheetOpen} onOpenChange={setIsDeviceSheetOpen}>
        <SheetContent side="right" className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle>Seleziona Dispositivo</SheetTitle>
            <SheetDescription>
              Scegli un dispositivo da aggiungere come punto di controllo
            </SheetDescription>
          </SheetHeader>
          
          <div className="mt-6 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Cerca dispositivo..."
                value={deviceSearchQuery}
                onChange={(e) => setDeviceSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="space-y-2 max-h-[calc(100vh-250px)] overflow-y-auto">
              {filteredDevices.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>Nessun dispositivo trovato</p>
                </div>
              ) : (
                filteredDevices.map((device) => (
                  <div
                    key={device.id}
                    onClick={() => handleAddDevice(device.id)}
                    className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="font-medium">{device.name}</div>
                    <div className="text-sm text-gray-500 mt-1">ID: {device.id}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Sheet per selezionare controllo */}
      <Sheet open={isControlSheetOpen} onOpenChange={setIsControlSheetOpen}>
        <SheetContent side="right" className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle>Seleziona Controllo</SheetTitle>
            <SheetDescription>
              Scegli un controllo (campo KPI) da aggiungere al punto di controllo
            </SheetDescription>
          </SheetHeader>
          
          <div className="mt-6 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Cerca controllo..."
                value={controlSearchQuery}
                onChange={(e) => setControlSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="space-y-2 max-h-[calc(100vh-250px)] overflow-y-auto">
              {selectedControlPointForAdding && getAvailableFieldsForControlPoint(selectedControlPointForAdding).length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>Nessun controllo disponibile</p>
                  <p className="text-sm mt-1">Tutti i controlli sono già stati aggiunti</p>
                </div>
              ) : (
                selectedControlPointForAdding && 
                getAvailableFieldsForControlPoint(selectedControlPointForAdding).map((field) => (
                  <div
                    key={field.fieldId}
                    onClick={() => handleAddControl(selectedControlPointForAdding, field.fieldId)}
                    className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="font-medium">{field.fieldName}</div>
                    <div className="text-sm text-blue-600 mt-1">{field.kpiName}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      Tipo: {field.fieldType}
                      {field.fieldRequired && <span className="text-red-500 ml-1">*</span>}
                    </div>
                    {field.fieldDescription && (
                      <div className="text-xs text-gray-400 mt-1">{field.fieldDescription}</div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
