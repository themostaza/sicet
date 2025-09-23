"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Plus, Trash2, Save } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

interface Device {
  id: string
  name: string
}

interface KPI {
  id: string
  name: string
}

interface ControlPoint {
  id: string
  name: string
  deviceId: string // UN SOLO device per punto di controllo
  kpiIds: string[] // N KPI per questo device
  categories?: string[]
  timeSlots?: string[]
}

interface TodolistParamsLinked {
  controlPoints: ControlPoint[]
}

interface Report {
  id: string
  name: string
  description?: string
  todolist_params_linked: TodolistParamsLinked | null
  mapping_excel: any | null
}

interface ReportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  report?: Report | null
  onSave: () => void
}

export default function ReportDialog({ open, onOpenChange, report, onSave }: ReportDialogProps) {
  const [name, setName] = useState("")
  const [controlPoints, setControlPoints] = useState<ControlPoint[]>([])
  const [devices, setDevices] = useState<Device[]>([])
  const [kpis, setKpis] = useState<KPI[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Carica devices, KPIs e controlli disponibili
  const loadData = async () => {
    setIsLoading(true)
    try {
      // Carica devices
      const devicesResponse = await fetch('/api/reports/devices')
      if (!devicesResponse.ok) throw new Error('Failed to fetch devices')
      const devicesData = await devicesResponse.json()
      setDevices(devicesData.devices || [])

      // Carica KPIs
      const kpisResponse = await fetch('/api/templates/kpis')
      if (!kpisResponse.ok) throw new Error('Failed to fetch KPIs')
      const kpisData = await kpisResponse.json()
      setKpis(kpisData.kpis || [])
    } catch (error) {
      console.error('Error loading data:', error)
      toast({
        title: "Errore",
        description: "Impossibile caricare i dati.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      loadData()
      
      if (report) {
        // Modifica report esistente
        setName(report.name || "")
        setControlPoints(report.todolist_params_linked?.controlPoints || [])
      } else {
        // Nuovo report
        setName("")
        setControlPoints([])
      }
    }
  }, [open, report])

  // Gestione punti di controllo
  const addControlPoint = () => {
    const newControlPoint: ControlPoint = {
      id: Date.now().toString(),
      name: "",
      deviceId: "",
      kpiIds: [],
      categories: [],
      timeSlots: ["standard"]
    }
    setControlPoints([...controlPoints, newControlPoint])
  }

  const updateControlPoint = (id: string, field: keyof ControlPoint, value: any) => {
    console.log('updateControlPoint called:', { id, field, value })
    setControlPoints((prev) => {
      const newControlPoints = prev.map((cp) => {
        if (cp.id === id) {
          const updated = { ...cp, [field]: value }
          console.log('Updating controlPoint:', cp, 'to:', updated)
          return updated
        }
        return cp
      })
      console.log('New controlPoints:', newControlPoints)
      return newControlPoints
    })
  }

  const removeControlPoint = (id: string) => {
    setControlPoints(controlPoints.filter(cp => cp.id !== id))
  }


  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        title: "Errore",
        description: "Il nome del report è obbligatorio.",
        variant: "destructive"
      })
      return
    }

    if (controlPoints.length === 0) {
      toast({
        title: "Errore",
        description: "Aggiungi almeno un punto di controllo.",
        variant: "destructive"
      })
      return
    }


    // Verifica che tutti i punti di controllo siano completi
    const incompleteControlPoints = controlPoints.filter(cp => 
      !cp.name.trim() || !cp.deviceId || cp.kpiIds.length === 0
    )
    if (incompleteControlPoints.length > 0) {
      toast({
        title: "Errore",
        description: "Completa tutti i punti di controllo prima di salvare.",
        variant: "destructive"
      })
      return
    }


    setIsSaving(true)
    try {
      const todolistParamsLinked: TodolistParamsLinked = {
        controlPoints: controlPoints.map(cp => ({
          id: cp.id,
          name: cp.name.trim(),
          deviceId: cp.deviceId,
          kpiIds: cp.kpiIds,
          categories: cp.categories,
          timeSlots: cp.timeSlots
        }))
      }


      const method = report ? 'PUT' : 'POST'
      const url = report ? `/api/reports/${report.id}` : '/api/reports'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          todolist_params_linked: todolistParamsLinked,
          mapping_excel: null
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Failed to ${report ? 'update' : 'create'} report`)
      }

      toast({
        title: report ? "Report aggiornato" : "Report creato",
        description: `Il report "${name}" è stato ${report ? 'aggiornato' : 'creato'} con successo.`,
      })

      onSave()
      onOpenChange(false)
    } catch (error) {
      console.error(`Error ${report ? 'updating' : 'creating'} report:`, error)
      toast({
        title: "Errore",
        description: error instanceof Error ? error.message : `Impossibile ${report ? 'aggiornare' : 'creare'} il report.`,
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[70vw] h-[100vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {report ? "Modifica Report" : "Nuovo Report"}
          </DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Caricamento dati...</span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Nome Report - posizionato direttamente sotto l'header */}
            <div className="space-y-2 items-start justify-start">
              <Label htmlFor="name" className="text-sm font-medium">Nome Report *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Inserisci il nome del report"
                className="w-full"
              />
            </div>

            {/* Selezione Dispositivi e KPI */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Dispositivi e KPI da Monitorare</h3>
                <Button onClick={addControlPoint} size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Aggiungi Dispositivo
                </Button>
              </div>
              
              {controlPoints.length === 0 ? (
                <div className="py-8 text-gray-500">
                  <p>Nessun dispositivo selezionato.</p>
                  <p className="text-sm">Aggiungi un dispositivo per iniziare.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {controlPoints.map((controlPoint, index) => (
                    <div key={controlPoint.id} className="border rounded-lg p-4">
                      {/* Header della sezione */}
                      <div className="flex items-center justify-between mb-4 pb-2 border-b">
                        <div className="flex flex-col">
                          <h4 className="font-medium text-gray-900">
                            {controlPoint.deviceId && devices.find(d => String(d.id) === String(controlPoint.deviceId)) 
                              ? devices.find(d => String(d.id) === String(controlPoint.deviceId))?.name 
                              : `Dispositivo #${index + 1}`}
                          </h4>
                          {controlPoint.deviceId && devices.find(d => String(d.id) === String(controlPoint.deviceId)) && (
                            <span className="text-xs text-gray-500">
                              Dispositivo #{index + 1}
                            </span>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeControlPoint(controlPoint.id)}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-6">
                        {/* Colonna Dispositivi */}
                        <div>
                          <Label className="text-base font-medium">Seleziona Dispositivo * (Disponibili: {devices.length}) - Current: {controlPoint.deviceId || 'none'}</Label>
                          <div className="mt-2 border rounded-lg p-3 bg-gray-50 max-h-[70vh] overflow-y-auto" style={{pointerEvents: 'auto'}}>
                            {devices.length === 0 ? (
                              <p className="text-gray-500 text-sm">Nessun dispositivo disponibile (Totale: {devices.length})</p>
                            ) : (
                              <div className="space-y-2">
                                {devices.map((device) => (
                                  <div
                                    key={`${device.id}-${controlPoint.deviceId}`}
                                    className={`p-3 rounded-lg border cursor-pointer transition-all select-none ${
                                      String(controlPoint.deviceId) === String(device.id)
                                        ? 'bg-blue-100 border-blue-300 ring-1 ring-blue-500'
                                        : 'bg-white border-gray-200 hover:border-blue-200 hover:bg-blue-50'
                                    }`}
                                    data-selected={String(controlPoint.deviceId) === String(device.id)}
                                    data-device-id={device.id}
                                    data-control-device-id={controlPoint.deviceId}
                                    onClick={(e) => {
                                      e.preventDefault()
                                      e.stopPropagation()
                                      console.log('Device clicked:', device.name, device.id)
                                      console.log('Current deviceId:', controlPoint.deviceId)
                                      console.log('Comparison result:', String(controlPoint.deviceId) === String(device.id))
                                      updateControlPoint(controlPoint.id, 'deviceId', device.id)
                                      updateControlPoint(controlPoint.id, 'name', device.name)
                                      // Force re-render
                                      setTimeout(() => {
                                        console.log('Force re-render check:', controlPoint.deviceId)
                                      }, 100)
                                      console.log('After update - should be:', device.id)
                                    }}
                                    onMouseDown={(e) => e.preventDefault()}
                                  >
                                    <div className="flex items-center space-x-2">
                                      <div className={`w-3 h-3 rounded-full ${
                                        String(controlPoint.deviceId) === String(device.id) ? 'bg-blue-500' : 'bg-gray-300'
                                      }`} />
                                      <span className={`font-medium ${
                                        String(controlPoint.deviceId) === String(device.id) ? 'text-blue-900' : 'text-gray-900'
                                      }`}>
                                        {device.name}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Colonna KPI */}
                        <div>
                          <Label className="text-base font-medium">Seleziona KPI da Monitorare *</Label>
                          <div className="mt-2 border rounded-lg p-3 bg-gray-50 max-h-[70vh] overflow-y-auto">
                            {kpis.length === 0 ? (
                              <p className="text-gray-500 text-sm">Nessun KPI disponibile</p>
                            ) : (
                              <div className="space-y-2">
                                {kpis.map((kpi) => (
                                  <div
                                    key={kpi.id}
                                    className={`p-3 rounded-lg border cursor-pointer transition-all select-none ${
                                      controlPoint.kpiIds.includes(kpi.id)
                                        ? 'bg-green-100 border-green-300 ring-1 ring-green-500'
                                        : 'bg-white border-gray-200 hover:border-green-200 hover:bg-green-50'
                                    }`}
                                    onClick={(e) => {
                                      e.preventDefault()
                                      e.stopPropagation()
                                      console.log('KPI clicked:', kpi.name, kpi.id)
                                      const currentIds = controlPoint.kpiIds
                                      const newIds = currentIds.includes(kpi.id)
                                        ? currentIds.filter(id => id !== kpi.id)
                                        : [...currentIds, kpi.id]
                                      updateControlPoint(controlPoint.id, 'kpiIds', newIds)
                                    }}
                                    onMouseDown={(e) => e.preventDefault()}
                                  >
                                    <div className="flex items-center space-x-2">
                                      <div className={`w-3 h-3 rounded-full ${
                                        controlPoint.kpiIds.includes(kpi.id) ? 'bg-green-500' : 'bg-gray-300'
                                      }`} />
                                      <span className={`font-medium ${
                                        controlPoint.kpiIds.includes(kpi.id) ? 'text-green-900' : 'text-gray-900'
                                      }`}>
                                        {kpi.name}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          
                          {/* Mostra KPI selezionati */}
                          {controlPoint.kpiIds.length > 0 && (
                            <div className="mt-3">
                              <div className="text-xs text-gray-500 mb-2">
                                Selezionati: {controlPoint.kpiIds.length} KPI
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {controlPoint.kpiIds.map((kpiId) => {
                                  const kpi = kpis.find(k => k.id === kpiId)
                                  return kpi ? (
                                    <span key={kpiId} className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                      {kpi.name}
                                    </span>
                                  ) : null
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Annulla
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="gap-2">
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Salvataggio...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                {report ? "Aggiorna" : "Crea"} Report
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
