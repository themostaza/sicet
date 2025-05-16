"use client"

import type React from "react"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { format } from "date-fns"
import { it } from "date-fns/locale"
import { useToast } from "@/components/ui/use-toast"
import { getPuntiControllo } from "@/lib/actions"
import { getControlli } from "@/lib/actions-kpi"
import { createTodolist } from "@/lib/actions-todolist"

// UI Components
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

// Icons
import { ArrowLeft, Search, Trash2, Tag, X, AlertCircle, CalendarIcon } from "lucide-react"

// Types
interface Device {
  id: string
  nome: string
  posizione?: string
  tags?: string[]
}

interface KPI {
  id: string
  nome: string
  descrizione?: string
}

interface DateTimeEntry {
  date: Date
  timeSlot: "mattina" | "pomeriggio" | "sera" | "notte"
}

interface ValidationErrors {
  devices?: string
  dates?: string
  kpis?: string
}

type TimeSlot = "mattina" | "pomeriggio" | "sera" | "notte"

export default function NewTodoListPage() {
  const router = useRouter()
  const { toast } = useToast()

  // Data state
  const [devices, setDevices] = useState<Device[]>([])
  const [kpis, setKpis] = useState<KPI[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Selection state
  const [selectedDevices, setSelectedDevices] = useState<string[]>([])
  const [selectedKpis, setSelectedKpis] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [dateEntries, setDateEntries] = useState<DateTimeEntry[]>([])
  const [tagFilterMode, setTagFilterMode] = useState<"OR" | "AND">("OR")
  const [selectedDates, setSelectedDates] = useState<Date[]>([])

  // UI state
  const [deviceSearchTerm, setDeviceSearchTerm] = useState("")
  const [kpiSearchTerm, setKpiSearchTerm] = useState("")
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [newDate, setNewDate] = useState<Date | undefined>(undefined)
  const [newTimeSlot, setNewTimeSlot] = useState<TimeSlot>("mattina")

  // Ref per tracciare se siamo in fase di aggiornamento
  const isUpdatingRef = useRef(false)
  // Ref per memorizzare l'ultimo stato dei tag selezionati
  const selectedTagsRef = useRef<string[]>([])

  // Aggiorna il ref quando selectedTags cambia
  useEffect(() => {
    selectedTagsRef.current = selectedTags
  }, [selectedTags])

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [devicesData, kpisData] = await Promise.all([getPuntiControllo(), getControlli()])
        setDevices(devicesData)
        setKpis(kpisData)
      } catch (error) {
        toast({
          title: "Errore",
          description: "Impossibile caricare i dati necessari.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [toast])

  // Extract all unique tags from devices
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>()
    devices.forEach((device) => {
      if (device.tags && Array.isArray(device.tags)) {
        device.tags.forEach((tag) => tagSet.add(tag))
      }
    })
    return Array.from(tagSet).sort()
  }, [devices])

  // Calculate tag counts
  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    devices.forEach((device) => {
      if (device.tags && Array.isArray(device.tags)) {
        device.tags.forEach((tag) => {
          counts[tag] = (counts[tag] || 0) + 1
        })
      }
    })
    return counts
  }, [devices])

  // Map of devices by tag for quick lookup
  const devicesByTag = useMemo(() => {
    const map: Record<string, Set<string>> = {}
    devices.forEach((device) => {
      if (device.tags && Array.isArray(device.tags) && device.id) {
        device.tags.forEach((tag) => {
          if (!map[tag]) map[tag] = new Set()
          map[tag].add(device.id)
        })
      }
    })
    return map
  }, [devices])

  // Filter devices based on search term and selected tags
  const filteredDevices = useMemo(() => {
    return devices.filter((device) => {
      // Text search filter
      const matchesSearch =
        device.nome.toLowerCase().includes(deviceSearchTerm.toLowerCase()) ||
        device.id.toLowerCase().includes(deviceSearchTerm.toLowerCase()) ||
        (device.posizione && device.posizione.toLowerCase().includes(deviceSearchTerm.toLowerCase()))

      // Se non ci sono tag selezionati, applica solo il filtro di ricerca
      if (selectedTags.length === 0) {
        return matchesSearch
      }

      // Se il dispositivo non ha tag, non può corrispondere ai filtri dei tag
      if (!device.tags || !Array.isArray(device.tags)) {
        return false
      }

      // Applica il filtro dei tag in base alla modalità
      const matchesTags =
        tagFilterMode === "AND"
          ? selectedTags.every((tag) => device.tags?.includes(tag))
          : selectedTags.some((tag) => device.tags?.includes(tag))

      return matchesSearch && matchesTags
    })
  }, [devices, deviceSearchTerm, selectedTags, tagFilterMode])

  // Filter KPIs based on search term
  const filteredKpis = useMemo(() => {
    return kpis.filter(
      (kpi) =>
        kpi.nome.toLowerCase().includes(kpiSearchTerm.toLowerCase()) ||
        (kpi.descrizione && kpi.descrizione.toLowerCase().includes(kpiSearchTerm.toLowerCase())),
    )
  }, [kpis, kpiSearchTerm])

  // Device selection handlers
  const handleDeviceToggle = useCallback((id: string) => {
    setSelectedDevices((prev) => (prev.includes(id) ? prev.filter((deviceId) => deviceId !== id) : [...prev, id]))
  }, [])

  const handleSelectAllDevices = useCallback(() => {
    const allDeviceIds = filteredDevices.map((device) => device.id)
    setSelectedDevices((prev) => (prev.length === allDeviceIds.length ? [] : allDeviceIds))
  }, [filteredDevices])

  // KPI selection handlers
  const handleKpiToggle = useCallback((id: string) => {
    setSelectedKpis((prev) => (prev.includes(id) ? prev.filter((kpiId) => kpiId !== id) : [...prev, id]))
  }, [])

  const handleSelectAllKpis = useCallback(() => {
    const allKpiIds = filteredKpis.map((kpi) => kpi.id)
    setSelectedKpis((prev) => (prev.length === allKpiIds.length ? [] : allKpiIds))
  }, [filteredKpis])

  // Funzione per calcolare i dispositivi da mantenere quando un tag viene deselezionato
  const getDevicesToKeep = useCallback(
    (deselectedTag: string, remainingTags: string[]): Set<string> => {
      // Se non ci sono tag rimanenti, restituisci un set vuoto
      if (remainingTags.length === 0) return new Set()

      // Crea un set per memorizzare i dispositivi da mantenere
      const devicesToKeep = new Set<string>()

      // Per ogni tag rimanente, aggiungi i dispositivi associati
      remainingTags.forEach((tag) => {
        const devicesWithTag = devicesByTag[tag]
        if (devicesWithTag) {
          devicesWithTag.forEach((deviceId) => devicesToKeep.add(deviceId))
        }
      })

      return devicesToKeep
    },
    [devicesByTag],
  )

  // Tag selection handler - completamente rivisto per evitare aggiornamenti circolari
  const handleTagToggle = useCallback(
    (tag: string) => {
      // Previeni aggiornamenti annidati
      if (isUpdatingRef.current) return
      isUpdatingRef.current = true

      try {
        // Usa il ref per accedere all'ultimo stato noto dei tag selezionati
        const currentSelectedTags = [...selectedTagsRef.current]
        const isSelected = currentSelectedTags.includes(tag)

        if (isSelected) {
          // Rimuovi il tag dalla selezione
          const newSelectedTags = currentSelectedTags.filter((t) => t !== tag)

          // Aggiorna prima i tag selezionati
          setSelectedTags(newSelectedTags)

          // Calcola i dispositivi da mantenere in base ai tag rimanenti
          const devicesToKeep = getDevicesToKeep(tag, newSelectedTags)

          // Aggiorna i dispositivi selezionati in un'unica operazione
          setSelectedDevices((prev) => {
            // Se non ci sono più tag selezionati, mantieni tutti i dispositivi selezionati
            if (newSelectedTags.length === 0) return prev

            return prev.filter((deviceId) => {
              // Se il dispositivo non ha il tag deselezionato, mantienilo
              const device = devices.find((d) => d.id === deviceId)
              if (!device || !device.tags) return true

              // Se il dispositivo ha il tag deselezionato ma ha anche altri tag selezionati, mantienilo
              if (device.tags.includes(tag)) {
                return devicesToKeep.has(deviceId)
              }

              // Altrimenti mantienilo
              return true
            })
          })
        } else {
          // Aggiungi il tag alla selezione
          const newSelectedTags = [...currentSelectedTags, tag]

          // Aggiorna prima i tag selezionati
          setSelectedTags(newSelectedTags)

          // Trova i dispositivi con questo tag
          const devicesWithTag = devicesByTag[tag] || new Set()

          // Aggiorna i dispositivi selezionati in un'unica operazione
          setSelectedDevices((prev) => {
            const newSelection = new Set(prev)
            devicesWithTag.forEach((deviceId) => newSelection.add(deviceId))
            return Array.from(newSelection)
          })
        }
      } finally {
        // Resetta il flag di aggiornamento
        setTimeout(() => {
          isUpdatingRef.current = false
        }, 0)
      }
    },
    [devices, getDevicesToKeep, devicesByTag],
  )

  const clearAllTags = useCallback(() => {
    // Previeni aggiornamenti annidati
    if (isUpdatingRef.current) return
    isUpdatingRef.current = true

    try {
      setSelectedTags([])
      setSelectedDevices([])
    } finally {
      setTimeout(() => {
        isUpdatingRef.current = false
      }, 0)
    }
  }, [])

  const toggleTagFilterMode = useCallback(() => {
    setTagFilterMode((prev) => (prev === "OR" ? "AND" : "OR"))
  }, [])

  // Handle calendar selection changes
  const handleCalendarSelect = useCallback(
    (dates: Date[] | undefined) => {
      if (!dates) {
        setSelectedDates([])
        setDateEntries([])
        return
      }

      setSelectedDates(dates)

      // Update entries based on selected dates
      const newEntries: DateTimeEntry[] = []

      // Process each selected date
      dates.forEach((date) => {
        // Check if this date is already in the entries
        const existingEntry = dateEntries.find(
          (entry) => format(entry.date, "yyyy-MM-dd") === format(date, "yyyy-MM-dd"),
        )

        if (existingEntry) {
          // Keep existing entry with its time slot
          newEntries.push(existingEntry)
        } else {
          // Add new entry with default time slot
          newEntries.push({
            date,
            timeSlot: newTimeSlot,
          })
        }
      })

      setDateEntries(newEntries)
    },
    [dateEntries, newTimeSlot],
  )

  const removeDateEntry = useCallback((index: number) => {
    setDateEntries((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const updateDateEntry = useCallback((index: number, field: "date" | "timeSlot", value: any) => {
    setDateEntries((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }, [])

  // Format time slot for display
  const formatTimeSlot = useCallback((timeSlot: TimeSlot) => {
    switch (timeSlot) {
      case "mattina":
        return "Mattina (fino alle 12:00)"
      case "pomeriggio":
        return "Pomeriggio (fino alle 18:00)"
      case "sera":
        return "Sera (fino alle 22:00)"
      case "notte":
        return "Notte (fino alle 06:00)"
      default:
        return timeSlot
    }
  }, [])

  // Form submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    // Validate form
    const newErrors: ValidationErrors = {}
    let isValid = true

    if (selectedDevices.length === 0) {
      newErrors.devices = "Seleziona almeno un dispositivo"
      isValid = false
    }

    if (dateEntries.length === 0) {
      newErrors.dates = "Seleziona almeno una data"
      isValid = false
    }

    if (selectedKpis.length === 0) {
      newErrors.kpis = "Seleziona almeno un KPI"
      isValid = false
    }

    setErrors(newErrors)

    if (!isValid) return

    setIsSubmitting(true)

    try {
      // Create todolist for each device and date combination
      const creationPromises = []

      for (const deviceId of selectedDevices) {
        for (const entry of dateEntries) {
          const formattedDate = format(entry.date, "yyyy-MM-dd")
          creationPromises.push(createTodolist(deviceId, formattedDate, entry.timeSlot, selectedKpis))
        }
      }

      await Promise.all(creationPromises)

      const totalTodolistCount = selectedDevices.length * dateEntries.length

      toast({
        title: "Todolist create",
        description: `${totalTodolistCount} todolist sono state create con successo.`,
        variant: "default",
      })

      router.push("/todolist")
    } catch (error) {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante la creazione delle todolist.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Calculate total todolist count
  const totalTodolistCount = selectedDevices.length * dateEntries.length * selectedKpis.length

  // Loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="container mx-auto py-6 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <Link href="/todolist" className="inline-flex items-center text-sm font-medium mb-2">
              <ArrowLeft className="mr-2 h-4 w-4" /> Torna alle Todolist
            </Link>
            <h1 className="text-2xl font-bold">Crea Nuove Todolist</h1>
            <p className="text-gray-500">
              Crea nuove todolist per uno o più dispositivi con attività pianificate per date e fasce orarie specifiche.
            </p>
          </div>

          <div className="text-right">
            <div className="text-sm text-gray-500 mb-2">
              {totalTodolistCount > 0 ? (
                <span>
                  Verranno create <strong>{totalTodolistCount}</strong> attività
                </span>
              ) : (
                <span></span>
              )}
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => router.push("/todolist")}>
                Annulla
              </Button>
              <Button
                onClick={() => document.getElementById("todolist-form")?.requestSubmit()}
                className="bg-black hover:bg-gray-800 text-white"
                disabled={
                  isSubmitting || selectedDevices.length === 0 || dateEntries.length === 0 || selectedKpis.length === 0
                }
              >
                {isSubmitting ? "Creazione in corso..." : "Crea Todolist"}
              </Button>
            </div>
          </div>
        </div>

        <form id="todolist-form" onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 gap-6">
            {/* Device Selection Section */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold flex items-center">
                    Punti di controllo
                    {errors.devices && (
                      <div className="ml-2 text-red-500 flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        <span className="text-xs font-normal">{errors.devices}</span>
                      </div>
                    )}
                  </CardTitle>
                  <span className="text-sm text-gray-500">{selectedDevices.length} selezionati</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                  <Input
                    placeholder="Cerca punti di controllo..."
                    className="pl-9"
                    value={deviceSearchTerm}
                    onChange={(e) => setDeviceSearchTerm(e.target.value)}
                  />
                </div>

                {/* Tag Selection */}
                <div className="border rounded-md p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Tag className="h-4 w-4" />
                      <h3 className="text-sm font-medium">Selezione per Tag</h3>
                    </div>

                    <div className="flex items-center space-x-2">
                      {selectedTags.length > 0 && (
                        <Button variant="outline" size="sm" onClick={clearAllTags} className="h-7 px-2 text-xs">
                          <X className="h-3 w-3 mr-1" />
                          Rimuovi tutti
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-md p-3">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">Seleziona</TableHead>
                          <TableHead>Tag</TableHead>
                          <TableHead>Dispositivi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {availableTags.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center py-4 text-gray-500">
                              Nessun tag disponibile
                            </TableCell>
                          </TableRow>
                        ) : (
                          availableTags.map((tag) => {
                            const isSelected = selectedTags.includes(tag)
                            const count = tagCounts[tag] || 0

                            return (
                              <TableRow key={tag}>
                                <TableCell>
                                  <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={() => handleTagToggle(tag)}
                                    aria-label={`Seleziona tag ${tag}`}
                                  />
                                </TableCell>
                                <TableCell className="font-medium">
                                  <div className="flex items-center">
                                    <Tag className="h-3 w-3 mr-2" />
                                    {tag}
                                  </div>
                                </TableCell>
                                <TableCell>{count}</TableCell>
                              </TableRow>
                            )
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Device Table */}
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={filteredDevices.length > 0 && selectedDevices.length === filteredDevices.length}
                            onCheckedChange={handleSelectAllDevices}
                            aria-label="Seleziona tutti"
                          />
                        </TableHead>
                        <TableHead>ID</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead className="hidden md:table-cell">Posizione</TableHead>
                        <TableHead className="hidden lg:table-cell">Tag</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDevices.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-4 text-gray-500">
                            Nessun dispositivo trovato
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredDevices.map((device) => (
                          <TableRow
                            key={device.id}
                            className={`
                              cursor-pointer transition-colors duration-150 
                              hover:bg-gray-50
                              ${selectedDevices.includes(device.id) ? "bg-gray-100" : ""}
                            `}
                            onClick={() => handleDeviceToggle(device.id)}
                          >
                            <TableCell>
                              <Checkbox
                                checked={selectedDevices.includes(device.id)}
                                onCheckedChange={() => handleDeviceToggle(device.id)}
                                aria-label={`Seleziona ${device.nome}`}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{device.id}</TableCell>
                            <TableCell>{device.nome}</TableCell>
                            <TableCell className="hidden md:table-cell">{device.posizione || "-"}</TableCell>
                            <TableCell className="hidden lg:table-cell">
                              <div className="flex flex-wrap gap-1">
                                {device.tags && device.tags.length > 0 ? (
                                  device.tags.map((tag: string, i: number) => (
                                    <Badge
                                      key={i}
                                      variant={selectedTags.includes(tag) ? "default" : "secondary"}
                                      className="text-xs"
                                    >
                                      {tag}
                                    </Badge>
                                  ))
                                ) : (
                                  <span className="text-gray-400 text-xs">Nessun tag</span>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* KPI Selection Section */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold flex items-center">
                    Controlli
                    {errors.kpis && (
                      <div className="ml-2 text-red-500 flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        <span className="text-xs font-normal">{errors.kpis}</span>
                      </div>
                    )}
                  </CardTitle>
                  <span className="text-sm text-gray-500">{selectedKpis.length} selezionati</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                  <Input
                    placeholder="Cerca controlli..."
                    className="pl-9"
                    value={kpiSearchTerm}
                    onChange={(e) => setKpiSearchTerm(e.target.value)}
                  />
                </div>

                {/* KPI Table */}
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={filteredKpis.length > 0 && selectedKpis.length === filteredKpis.length}
                            onCheckedChange={handleSelectAllKpis}
                            aria-label="Seleziona tutti"
                          />
                        </TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead className="hidden md:table-cell">Descrizione</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredKpis.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-4 text-gray-500">
                            Nessun KPI trovato
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredKpis.map((kpi) => (
                          <TableRow
                            key={kpi.id}
                            className={`
                              cursor-pointer transition-colors duration-150 
                              hover:bg-gray-50
                              ${selectedKpis.includes(kpi.id) ? "bg-gray-100" : ""}
                            `}
                            onClick={() => handleKpiToggle(kpi.id)}
                          >
                            <TableCell>
                              <Checkbox
                                checked={selectedKpis.includes(kpi.id)}
                                onCheckedChange={() => handleKpiToggle(kpi.id)}
                                aria-label={`Seleziona ${kpi.nome}`}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{kpi.nome}</TableCell>
                            <TableCell className="hidden md:table-cell">{kpi.descrizione || "-"}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Date and Time Selection Section */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold flex items-center">
                  Date e Fasce Orarie
                  {errors.dates && (
                    <div className="ml-2 text-red-500 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      <span className="text-xs font-normal">{errors.dates}</span>
                    </div>
                  )}
                </CardTitle>
                <span className="text-sm text-gray-500">{dateEntries.length} selezionate</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Date Selector */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-medium">Seleziona date</h3>
                    <Select value={newTimeSlot} onValueChange={(value) => setNewTimeSlot(value as TimeSlot)}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Fascia oraria predefinita" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mattina">Mattina (fino alle 12:00)</SelectItem>
                        <SelectItem value="pomeriggio">Pomeriggio (fino alle 18:00)</SelectItem>
                        <SelectItem value="sera">Sera (fino alle 22:00)</SelectItem>
                        <SelectItem value="notte">Notte (fino alle 06:00)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="border rounded-md p-4">
                    <Calendar
                      mode="multiple"
                      selected={selectedDates}
                      onSelect={handleCalendarSelect}
                      className="w-full"
                      locale={it}
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Seleziona una o più date. La fascia oraria predefinita verrà applicata alle nuove date
                      selezionate.
                    </p>
                  </div>
                </div>

                {/* Selected Dates List */}
                <div className="border rounded-md p-4">
                  <h3 className="font-medium mb-4">Date Selezionate ({dateEntries.length})</h3>

                  {dateEntries.length > 0 ? (
                    <div className="overflow-auto max-h-[400px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Data</TableHead>
                            <TableHead>Fascia Oraria</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dateEntries.map((entry, index) => (
                            <TableRow key={index}>
                              <TableCell>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                                      <CalendarIcon className="mr-2 h-4 w-4" />
                                      {format(entry.date, "dd MMMM yyyy", { locale: it })}
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                      mode="single"
                                      selected={entry.date}
                                      onSelect={(date) => date && updateDateEntry(index, "date", date)}
                                      initialFocus
                                      locale={it}
                                    />
                                  </PopoverContent>
                                </Popover>
                              </TableCell>
                              <TableCell>
                                <Select
                                  value={entry.timeSlot}
                                  onValueChange={(value) => updateDateEntry(index, "timeSlot", value as TimeSlot)}
                                >
                                  <SelectTrigger className="h-10">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="mattina">Mattina (fino alle 12:00)</SelectItem>
                                    <SelectItem value="pomeriggio">Pomeriggio (fino alle 18:00)</SelectItem>
                                    <SelectItem value="sera">Sera (fino alle 22:00)</SelectItem>
                                    <SelectItem value="notte">Notte (fino alle 06:00)</SelectItem>
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                <Button variant="ghost" size="icon" onClick={() => removeDateEntry(index)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground border border-dashed rounded-md">
                      Nessuna data selezionata
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary Section */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-2">
                  <h3 className="font-medium">Riepilogo</h3>
                  <ul className="text-sm text-gray-500 space-y-1">
                    <li>
                      • Punti di controllo selezionati: <strong>{selectedDevices.length}</strong>
                    </li>
                    <li>
                      • Date selezionate: <strong>{dateEntries.length}</strong>
                    </li>
                    <li>
                      • Controlli selezionati: <strong>{selectedKpis.length}</strong>
                    </li>
                    <li>
                      • Totale attività da creare: <strong>{totalTodolistCount}</strong>
                    </li>
                  </ul>
                </div>

                <div className="flex space-x-4">
                  <Button type="button" variant="outline" onClick={() => router.push("/todolist")}>
                    Annulla
                  </Button>
                  <Button
                    type="submit"
                    className="bg-black hover:bg-gray-800 text-white"
                    disabled={
                      isSubmitting ||
                      selectedKpis.length === 0 ||
                      dateEntries.length === 0 ||
                      selectedDevices.length === 0
                    }
                  >
                    {isSubmitting ? `Creazione in corso...` : `Crea ${totalTodolistCount} Attività`}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </TooltipProvider>
  )
}
