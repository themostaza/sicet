"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { FileDown, Loader2, CalendarIcon } from "lucide-react"
import { format, subDays } from "date-fns"
import { cn } from "@/lib/utils"
import { exportTodolistData } from "@/app/actions/actions-export"
import { getDevices } from "@/app/actions/actions-device"
import { toast } from "@/components/ui/use-toast"
import { getKpisByDevice } from "@/app/actions/actions-export"
import { ScrollArea } from "@/components/ui/scroll-area"

export default function ExportCsvTab() {
  // Date range
  const [startDate, setStartDate] = useState<Date>(subDays(new Date(), 30))
  const [endDate, setEndDate] = useState<Date>(new Date())
  
  // Filter selections
  const [selectedDevices, setSelectedDevices] = useState<string[]>([])
  // Map device IDs to their selected KPIs
  const [deviceKpis, setDeviceKpis] = useState<Record<string, string[]>>({})
  
  // Options for filters
  const [devices, setDevices] = useState<Array<{label: string, value: string}>>([])
  // Map device IDs to available KPIs for that device
  const [deviceKpiOptions, setDeviceKpiOptions] = useState<Record<string, Array<{label: string, value: string}>>>({})
  
  // Loading states
  const [isLoading, setIsLoading] = useState(false)
  const [loadingDeviceKpis, setLoadingDeviceKpis] = useState<Record<string, boolean>>({})
  const [isExporting, setIsExporting] = useState(false)
  
  // Device names map for display
  const [deviceNamesMap, setDeviceNamesMap] = useState<Record<string, string>>({})
  
  // Track date changes separately to avoid reloads on selection changes
  const [dateChanged, setDateChanged] = useState(false)
  
  // Stato per la selezione globale
  const [selectAll, setSelectAll] = useState(false)
  
  // Load devices
  useEffect(() => {
    const loadDevices = async () => {
      setIsLoading(true)
      try {
        const devicesData = await getDevices({ limit: 100 })
        const devicesOptions = devicesData.devices.map(d => ({ label: d.name, value: d.id }))
        setDevices(devicesOptions)
        
        // Create a device ID to name map for easier access
        const namesMap: Record<string, string> = {}
        devicesData.devices.forEach(d => {
          namesMap[d.id] = d.name
        })
        setDeviceNamesMap(namesMap)
      } catch (error) {
        console.error("Errore nel caricamento dei dispositivi:", error)
        toast({
          title: "Errore",
          description: "Impossibile caricare i dispositivi",
          variant: "destructive"
        })
      } finally {
        setIsLoading(false)
      }
    }
    
    loadDevices()
  }, [])
  
  // Load KPIs for a specific device - using memo to avoid recreating function
  const loadKpisForDevice = useCallback(async (deviceId: string) => {
    // Skip if already loading
    if (loadingDeviceKpis[deviceId]) return
    
    // Mark this device as loading KPIs
    setLoadingDeviceKpis(prev => ({ ...prev, [deviceId]: true }))
    
    try {
      const kpis = await getKpisByDevice({
        startDate: format(startDate, "yyyy-MM-dd"),
        endDate: format(endDate, "yyyy-MM-dd"),
        deviceId
      })
      
      // Update KPI options for this device
      setDeviceKpiOptions(prev => ({
        ...prev,
        [deviceId]: kpis.map(k => ({ label: k.name, value: k.id }))
      }))
      
      // Initialize selected KPIs for this device if not already set
      setDeviceKpis(prev => ({
        ...prev,
        [deviceId]: prev[deviceId] || []
      }))
    } catch (error) {
      console.error(`Errore nel caricamento dei KPI per il dispositivo ${deviceId}:`, error)
      toast({
        title: "Errore",
        description: `Impossibile caricare i KPI per il dispositivo selezionato: ${deviceNamesMap[deviceId] || deviceId}`,
        variant: "destructive"
      })
      
      // Reset KPI options per questo device on error
      setDeviceKpiOptions(prev => ({
        ...prev,
        [deviceId]: []
      }))
    } finally {
      setLoadingDeviceKpis(prev => ({ ...prev, [deviceId]: false }))
    }
  }, [startDate, endDate, deviceNamesMap])
  
  // Load KPIs when device selection changes (only for newly selected devices)
  useEffect(() => {
    // Load KPIs only for newly selected devices that don't have KPIs loaded yet
    const newlySelectedDevices = selectedDevices.filter(
      deviceId => !deviceKpiOptions[deviceId] && !loadingDeviceKpis[deviceId]
    )
    
    newlySelectedDevices.forEach(deviceId => {
      loadKpisForDevice(deviceId)
    })
    
    // Clean up deselected devices
    Object.keys(deviceKpis).forEach(deviceId => {
      if (!selectedDevices.includes(deviceId)) {
        // Remove selected KPIs for devices no longer selected
        setDeviceKpis(prev => {
          const newState = { ...prev }
          delete newState[deviceId]
          return newState
        })
      }
    })
  }, [selectedDevices, deviceKpiOptions, loadingDeviceKpis, loadKpisForDevice, deviceKpis])
  
  // Handle date changes
  useEffect(() => {
    if (dateChanged && selectedDevices.length > 0) {
      // Reset dateChanged flag
      setDateChanged(false)
      
      // Reload KPIs for all selected devices
      selectedDevices.forEach(deviceId => {
        loadKpisForDevice(deviceId)
      })
    }
  }, [dateChanged, selectedDevices, loadKpisForDevice])
  
  // Toggle device selection
  const toggleDevice = useCallback((deviceId: string) => {
    setSelectedDevices(prev => {
      if (prev.includes(deviceId)) {
        return prev.filter(id => id !== deviceId)
      } else {
        return [...prev, deviceId]
      }
    })
  }, [])
  
  // Set date and mark that dates have changed
  const handleStartDateChange = useCallback((date: Date | undefined) => {
    if (date) {
      setStartDate(date)
      setDateChanged(true) // Mark that dates have changed to trigger reload
    }
  }, [])
  
  const handleEndDateChange = useCallback((date: Date | undefined) => {
    if (date) {
      setEndDate(date)
      setDateChanged(true) // Mark that dates have changed to trigger reload
    }
  }, [])
  
  // Handle selecting KPIs for a specific device
  const toggleKpi = useCallback((deviceId: string, kpiId: string) => {
    setDeviceKpis(prev => {
      const deviceSelectedKpis = prev[deviceId] || []
      
      return {
        ...prev,
        [deviceId]: deviceSelectedKpis.includes(kpiId)
          ? deviceSelectedKpis.filter(id => id !== kpiId)
          : [...deviceSelectedKpis, kpiId]
      }
    })
  }, [])
  
  // Helper to check if all KPIs for a device are selected
  const areAllKpisSelected = useCallback((deviceId: string) => {
    const availableKpis = deviceKpiOptions[deviceId] || []
    const selectedKpis = deviceKpis[deviceId] || []
    return availableKpis.length > 0 && availableKpis.length === selectedKpis.length
  }, [deviceKpiOptions, deviceKpis])
  
  // Toggle all KPIs for a device
  const toggleAllKpis = useCallback((deviceId: string) => {
    if (areAllKpisSelected(deviceId)) {
      // Deselect all
      setDeviceKpis(prev => ({
        ...prev,
        [deviceId]: []
      }))
    } else {
      // Select all
      setDeviceKpis(prev => ({
        ...prev,
        [deviceId]: deviceKpiOptions[deviceId]?.map(kpi => kpi.value) || []
      }))
    }
  }, [areAllKpisSelected, deviceKpiOptions])
  
  // Get all selected KPIs across all devices
  const getAllSelectedKpis = useCallback(() => {
    return Object.values(deviceKpis).flat()
  }, [deviceKpis])
  
  // Funzione per selezionare/deselezionare tutti i dispositivi e KPI
  const handleToggleSelectAll = useCallback(() => {
    if (selectAll) {
      // Deseleziona tutto
      setSelectedDevices([])
      setDeviceKpis({})
      setSelectAll(false)
    } else {
      // Seleziona tutti i dispositivi e tutti i KPI disponibili
      const allDeviceIds = devices.map(d => d.value)
      setSelectedDevices(allDeviceIds)
      // Per ogni device, seleziona tutti i KPI disponibili
      const newDeviceKpis: Record<string, string[]> = {}
      allDeviceIds.forEach(deviceId => {
        const kpis = deviceKpiOptions[deviceId]?.map(k => k.value) || []
        newDeviceKpis[deviceId] = kpis
      })
      setDeviceKpis(newDeviceKpis)
      setSelectAll(true)
    }
  }, [selectAll, devices, deviceKpiOptions])

  // Effetto per aggiornare lo stato della checkbox globale
  useEffect(() => {
    // Tutti i dispositivi selezionati e tutti i KPI selezionati per ogni dispositivo
    const allDeviceIds = devices.map(d => d.value)
    const allDevicesSelected = allDeviceIds.length > 0 && allDeviceIds.every(id => selectedDevices.includes(id))
    const allKpisSelected = allDeviceIds.every(deviceId => {
      const availableKpis = deviceKpiOptions[deviceId] || []
      const selectedKpis = deviceKpis[deviceId] || []
      return availableKpis.length === selectedKpis.length && availableKpis.length > 0
    })
    setSelectAll(allDevicesSelected && allKpisSelected)
  }, [devices, selectedDevices, deviceKpiOptions, deviceKpis])
  
  // Handle export
  const handleExport = async () => {
    if (isExporting) return
    
    setIsExporting(true)
    try {
      const exportConfig = {
        startDate: format(startDate, "yyyy-MM-dd"),
        endDate: format(endDate, "yyyy-MM-dd"),
        deviceIds: selectedDevices.length > 0 ? selectedDevices : undefined,
        kpiIds: getAllSelectedKpis().length > 0 ? getAllSelectedKpis() : undefined
      }
      
      const blob = await exportTodolistData(exportConfig)
      
      // Download the file
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `todolist_export_${format(new Date(), "yyyy-MM-dd")}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      toast({
        title: "Esportazione completata",
        description: "Il file CSV è stato scaricato con successo"
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
    <div>
      <Card className="w-full border-0">
        <CardHeader className="pb-4">
          <CardTitle>Esportazione CSV</CardTitle>
          <CardDescription>
            Seleziona l'intervallo di date e filtra per Punti di controllo e Controlli
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Date Range */}
          <div className="space-y-2">
            <h3 className="font-medium text-sm">Intervallo di date</h3>
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
                      {startDate ? format(startDate, "PPP") : <span>Seleziona data</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={handleStartDateChange}
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
                      {endDate ? format(endDate, "PPP") : <span>Seleziona data</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={handleEndDateChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
          {/* Devices and KPIs table */}
          <div className="space-y-2">
            <h3 className="font-medium text-sm">Dispositivi e KPI</h3>
            {isLoading ? (
              <div className="flex items-center justify-center p-3">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                <span className="text-sm">Caricamento dispositivi...</span>
              </div>
            ) : devices.length > 0 ? (
              <div className="border rounded-md overflow-hidden">
                <ScrollArea className="h-[350px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8">
                          {/* Checkbox globale */}
                          <Checkbox
                            id="select-all-devices"
                            checked={selectAll}
                            onCheckedChange={handleToggleSelectAll}
                          />
                        </TableHead>
                        <TableHead>Seleziona tutti i Punti di Controllo e i Controlli</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {devices.map(device => (
                        <React.Fragment key={device.value}>
                          <TableRow>
                            <TableCell className="py-2">
                              <Checkbox 
                                id={`device-${device.value}`} 
                                checked={selectedDevices.includes(device.value)}
                                onCheckedChange={() => toggleDevice(device.value)}
                              />
                            </TableCell>
                            <TableCell className="py-2">
                              <Label 
                                htmlFor={`device-${device.value}`}
                                className="cursor-pointer text-sm"
                              >
                                {device.label} <span className="text-muted-foreground text-xs">[{device.value}]</span>
                              </Label>
                            </TableCell>
                          </TableRow>
                          {/* KPI rows - shown when device is selected */}
                          {selectedDevices.includes(device.value) && (
                            <TableRow className="bg-muted/50">
                              <TableCell colSpan={2} className="p-0">
                                <div className="pl-6 pr-3 py-1.5">
                                  {loadingDeviceKpis[device.value] ? (
                                    <div className="flex items-center py-1.5">
                                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                      <span className="text-sm">Caricamento KPI...</span>
                                    </div>
                                  ) : deviceKpiOptions[device.value]?.length > 0 ? (
                                    <div className="space-y-1.5">
                                      <div className="flex items-center space-x-2 mb-1.5">
                                        <Checkbox 
                                          id={`device-${device.value}-all-kpis`}
                                          checked={areAllKpisSelected(device.value)}
                                          onCheckedChange={() => toggleAllKpis(device.value)}
                                        />
                                        <Label 
                                          htmlFor={`device-${device.value}-all-kpis`}
                                          className="font-medium text-sm text-gray-500"
                                        >
                                          Seleziona tutti i Controlli
                                        </Label>
                                      </div>
                                      <div className="space-y-1.5 ml-4">
                                        {deviceKpiOptions[device.value].map(kpi => (
                                          <div key={`${device.value}-${kpi.value}`} className="flex items-center space-x-2">
                                            <Checkbox 
                                              id={`${device.value}-kpi-${kpi.value}`}
                                              checked={(deviceKpis[device.value] || []).includes(kpi.value)}
                                              onCheckedChange={() => toggleKpi(device.value, kpi.value)}
                                            />
                                            <Label 
                                              htmlFor={`${device.value}-kpi-${kpi.value}`}
                                              className="cursor-pointer text-sm"
                                            >
                                              {kpi.label} <span className="text-muted-foreground text-xs">[{kpi.value}]</span>
                                            </Label>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="text-sm text-muted-foreground py-1.5">
                                      Nessun KPI disponibile per questo dispositivo nel periodo indicato
                                    </p>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground p-3 border rounded-md">
                Nessun dispositivo disponibile
              </p>
            )}
          </div>
        </CardContent>
        <CardFooter className="pt-2">
          <Button 
            onClick={handleExport}
            disabled={isExporting || isLoading || selectedDevices.length === 0 || getAllSelectedKpis().length === 0}
            className="ml-auto h-9"
          >
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Esportazione in corso...
              </>
            ) : (
              <>
                <FileDown className="mr-2 h-4 w-4" />
                Esporta CSV
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
} 