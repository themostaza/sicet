"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CalendarIcon, Download, X, Filter, CheckCircle2, Circle } from "lucide-react"
import { format } from "date-fns"
import { it } from "date-fns/locale"
import { getDevicesByTags, getDevices } from "@/app/actions/actions-device"
import { Device } from "@/lib/validation/device-schemas"

interface Props {
  isOpen: boolean
  onClose: () => void
  allTags: string[]
  initialDevices: Device[]
}

export function QRCodeFilterDialog({ isOpen, onClose, allTags, initialDevices }: Props) {
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined)
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined)
  const [devices, setDevices] = useState<Device[]>(initialDevices)
  const [filteredDevices, setFilteredDevices] = useState<Device[]>([])
  const [selectedDevices, setSelectedDevices] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  // Dispositivi da mostrare (filtrati per tag se selezionati)
  const currentDevices = selectedTags.length > 0 ? filteredDevices : devices

  // Filtro per ricerca testuale e date
  const finalDevices = currentDevices.filter(device => {
    // Filtro per ricerca testuale
    const matchesSearch = searchTerm === "" || 
      device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (device.location && device.location.toLowerCase().includes(searchTerm.toLowerCase()))

    // Filtro per data
    const deviceDate = device.created_at ? new Date(device.created_at) : null
    const matchesDateFrom = !dateFrom || (deviceDate && deviceDate >= dateFrom)
    const matchesDateTo = !dateTo || (deviceDate && deviceDate <= dateTo)

    return matchesSearch && matchesDateFrom && matchesDateTo
  })

  // Effetto per caricare dispositivi filtrati per tag
  useEffect(() => {
    const loadFilteredDevices = async () => {
      if (selectedTags.length === 0) {
        setFilteredDevices([])
        // Auto-selezione quando si torna a tutti i dispositivi
        setTimeout(() => updateSelectionBasedOnFilters(), 100)
        return
      }

      setLoading(true)
      try {
        const filtered = await getDevicesByTags(selectedTags)
        setFilteredDevices(filtered)
        // Auto-selezione dopo caricamento filtri per tag
        setTimeout(() => updateSelectionBasedOnFilters(), 200)
      } catch (error) {
        console.error('Errore nel caricamento dispositivi filtrati:', error)
        setFilteredDevices([])
      } finally {
        setLoading(false)
      }
    }

    loadFilteredDevices()
  }, [selectedTags])

  // Carica tutti i dispositivi quando il dialog si apre
  useEffect(() => {
    const loadAllDevices = async () => {
      if (isOpen) {
        setLoading(true)
        try {
          // Carica tutti i dispositivi (con un limite molto alto)
          const result = await getDevices({ offset: 0, limit: 1000 })
          setDevices(result.devices)
          
          // Seleziona tutti i dispositivi per default
          const allDeviceIds = new Set(result.devices.map(d => d.id))
          setSelectedDevices(allDeviceIds)
        } catch (error) {
          console.error('Errore nel caricamento di tutti i dispositivi:', error)
          // Fallback ai dispositivi iniziali
          setDevices(initialDevices)
          const allDeviceIds = new Set(initialDevices.map(d => d.id))
          setSelectedDevices(allDeviceIds)
        } finally {
          setLoading(false)
        }
      }
    }

    loadAllDevices()
  }, [isOpen, initialDevices])

  // Funzione helper per aggiornare la selezione in base ai filtri
  const updateSelectionBasedOnFilters = () => {
    const filtered = currentDevices.filter(device => {
      const matchesSearch = searchTerm === "" || 
        device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        device.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (device.location && device.location.toLowerCase().includes(searchTerm.toLowerCase()))

      const deviceDate = device.created_at ? new Date(device.created_at) : null
      const matchesDateFrom = !dateFrom || (deviceDate && deviceDate >= dateFrom)
      const matchesDateTo = !dateTo || (deviceDate && deviceDate <= dateTo)

      return matchesSearch && matchesDateFrom && matchesDateTo
    })
    
    const filteredDeviceIds = new Set(filtered.map(d => d.id))
    setSelectedDevices(filteredDeviceIds)
  }

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
    // Non chiamiamo updateSelectionBasedOnFilters qui perché currentDevices 
    // non è ancora aggiornato. La chiamata avviene nell'useEffect dopo il caricamento
  }

  const toggleDevice = (deviceId: string) => {
    setSelectedDevices(prev => {
      const newSet = new Set(prev)
      if (newSet.has(deviceId)) {
        newSet.delete(deviceId)
      } else {
        newSet.add(deviceId)
      }
      return newSet
    })
  }

  const toggleAllDevices = () => {
    const visibleDeviceIds = finalDevices.map(d => d.id)
    const visibleSelectedCount = visibleDeviceIds.filter(id => selectedDevices.has(id)).length
    
    if (visibleSelectedCount === finalDevices.length) {
      // Deseleziona tutti i dispositivi visibili
      setSelectedDevices(prev => {
        const newSet = new Set(prev)
        visibleDeviceIds.forEach(id => newSet.delete(id))
        return newSet
      })
    } else {
      // Seleziona tutti i dispositivi visibili
      setSelectedDevices(prev => {
        const newSet = new Set(prev)
        visibleDeviceIds.forEach(id => newSet.add(id))
        return newSet
      })
    }
  }

  const handleDownload = async () => {
    if (selectedDevices.size === 0) {
      alert("Seleziona almeno un dispositivo per generare il PDF")
      return
    }

    setLoading(true)
    try {
      const deviceIds = Array.from(selectedDevices)
      const params = new URLSearchParams({
        deviceIds: deviceIds.join(',')
      })

      const res = await fetch(`/api/device/qrcodes-pdf?${params}`)
      if (!res.ok) {
        alert("Errore durante la generazione del PDF")
        return
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      
      const disposition = res.headers.get("content-disposition")
      let filename = "qrcodes-dispositivi-filtrati.pdf"
      if (disposition && disposition.includes("filename=")) {
        filename = disposition.split("filename=")[1].replaceAll('"', '')
      }
      
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      
      onClose()
    } catch (error) {
      console.error('Errore durante il download:', error)
      alert("Errore durante il download del PDF")
    } finally {
      setLoading(false)
    }
  }

  // Wrapper functions per auto-selezione
  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
    setTimeout(() => updateSelectionBasedOnFilters(), 0)
  }

  const handleDateFromChange = (date: Date | undefined) => {
    setDateFrom(date)
    setTimeout(() => updateSelectionBasedOnFilters(), 0)
  }

  const handleDateToChange = (date: Date | undefined) => {
    setDateTo(date)
    setTimeout(() => updateSelectionBasedOnFilters(), 0)
  }

  const clearFilters = () => {
    setSelectedTags([])
    setDateFrom(undefined)
    setDateTo(undefined)
    setSearchTerm("")
    setTimeout(() => updateSelectionBasedOnFilters(), 0)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[95vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtra e Scarica QR Code
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto pb-4">
          {/* Filtri */}
          <div className="space-y-4 border-b pb-4">
            {/* Ricerca */}
            <div className="space-y-2">
              <Label>Cerca dispositivi</Label>
              <Input
                placeholder="Cerca per nome, ID o posizione..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>

            {/* Filtro per tag */}
            {allTags.length > 0 && (
              <div className="space-y-2">
                <Label>Filtra per tag</Label>
                <div className="flex flex-wrap gap-2">
                  {allTags.map(tag => (
                    <Badge
                      key={tag}
                      variant={selectedTags.includes(tag) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleTag(tag)}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Filtro per data */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data da</Label>
                <Popover modal={false}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFrom ? format(dateFrom, "dd/MM/yyyy", { locale: it }) : "Seleziona data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-[9999] bg-white shadow-lg border pointer-events-auto">
                    <Calendar
                      mode="single"
                      selected={dateFrom}
                      onSelect={handleDateFromChange}
                      locale={it}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Data a</Label>
                <Popover modal={false}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateTo ? format(dateTo, "dd/MM/yyyy", { locale: it }) : "Seleziona data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-[9999] bg-white shadow-lg border pointer-events-auto">
                    <Calendar
                      mode="single"
                      selected={dateTo}
                      onSelect={handleDateToChange}
                      locale={it}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Bottone per cancellare filtri */}
            <Button variant="ghost" onClick={clearFilters} className="w-full">
              <X className="mr-2 h-4 w-4" />
              Cancella tutti i filtri
            </Button>
            </div>

          {/* Lista dispositivi */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Dispositivi da includere ({finalDevices.length})</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleAllDevices}
                className="text-sm"
              >
                {finalDevices.filter(d => selectedDevices.has(d.id)).length === finalDevices.length ? (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Deseleziona tutti
                  </>
                ) : (
                  <>
                    <Circle className="mr-2 h-4 w-4" />
                    Seleziona tutti
                  </>
                )}
              </Button>
            </div>

            <div className="border rounded-md p-2">
              <div className="space-y-2">
                {loading ? (
                  <div className="text-center py-4 text-gray-500">Caricamento...</div>
                ) : finalDevices.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">Nessun dispositivo trovato</div>
                ) : (
                  finalDevices.map(device => (
                    <div
                      key={device.id}
                      className="flex items-center space-x-3 p-2 rounded border hover:bg-gray-50"
                    >
                      <Checkbox
                        checked={selectedDevices.has(device.id)}
                        onCheckedChange={() => toggleDevice(device.id)}
                      />
                      <div className="flex-1">
                        <div className="font-medium">{device.name}</div>
                        <div className="text-sm text-gray-500">{device.id}</div>
                        <div className="text-xs text-gray-400">
                          Creato: {device.created_at ? format(new Date(device.created_at), "dd/MM/yyyy HH:mm", { locale: it }) : "N/A"}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {device.tags?.map(tag => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annulla
          </Button>
          <Button
            onClick={handleDownload}
            disabled={loading || selectedDevices.size === 0}
            className="bg-black hover:bg-gray-800"
          >
            {loading ? (
              "Generazione PDF..."
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Scarica PDF ({selectedDevices.size} dispositivi)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 