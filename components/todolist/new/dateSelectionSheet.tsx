"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Card, CardContent } from "@/components/ui/card"
import { format, startOfToday } from "date-fns"
import { it } from "date-fns/locale"
import { CalendarIcon, Clock, Plus, RotateCcw, X } from "lucide-react"
import { useTodolist } from "./context"
import { formatTimeSlot } from "./helpers"
import { TimeSlot, TimeSlotValue, CustomTimeSlot, isCustomTimeSlot, formatTimeSlotValue, TIME_SLOT_TOLERANCE, TIME_SLOT_INTERVALS } from "@/lib/validation/todolist-schemas"
import { CATEGORY_TIME_SLOT_RULES, isCategoryTimeSlotRecommended } from "./types"
import { CustomTimeSlotPicker } from "./custom-time-slot"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { Switch } from "@/components/ui/switch"

const getTimeSlotLabel = (timeSlot: TimeSlot) => {
  if (timeSlot === "custom") return "Personalizzato"
  
  const interval = TIME_SLOT_INTERVALS[timeSlot]
  if (!interval) return "Personalizzato"

  const startStr = interval.start.toString().padStart(2, '0')
  const endStr = interval.end.toString().padStart(2, '0')
  const endWithTolerance = interval.end + TIME_SLOT_TOLERANCE
  const endToleranceStr = (endWithTolerance >= 24 ? endWithTolerance - 24 : endWithTolerance).toString().padStart(2, '0')

  const timeSlotNames: Record<TimeSlot, string> = {
    mattina: "Mattina",
    pomeriggio: "Pomeriggio",
    notte: "Notte",
    giornata: "Giornata",
    custom: "Personalizzato"
  }

  // Gestione speciale per la visualizzazione della fascia notte
  if (timeSlot === "notte") {
    return `${timeSlotNames[timeSlot]} (${startStr}:00-${endStr}:00+1, scade alle ${endToleranceStr}:00)`
  }

  return `${timeSlotNames[timeSlot]} (${startStr}:00-${endStr}:00, scade alle ${endToleranceStr}:00)`
}

export function DateSelectionSheet() {
  const {
    isDateSheetOpen,
    setIsDateSheetOpen,
    dateEntries,
    updateDateEntry,
    removeDateEntry,
    defaultTimeSlot,
    setDefaultTimeSlot,
    startDate,
    setStartDate,
    intervalDays,
    setIntervalDays,
    monthsToRepeat,
    setMonthsToRepeat,
    applyIntervalSelection,
    email,
    setEmail,
    alertEnabled,
    setAlertEnabled,
    setDateEntries,
    setSelectedDates,
    availableCategories,
    selectedCategory,
    setSelectedCategory,
  } = useTodolist()

  /**
   * TEMP STATES
   */
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlotValue>(defaultTimeSlot)
  const [customTimeSlot, setCustomTimeSlot] = useState<CustomTimeSlot | undefined>(
    isCustomTimeSlot(defaultTimeSlot) ? defaultTimeSlot : undefined
  )
  const [tempSelectedDate, setTempSelectedDate] = useState<Date | undefined>(new Date())
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [repeatEnabled, setRepeatEnabled] = useState(false)
  const [tempSelectedCategory, setTempSelectedCategory] = useState<string>(selectedCategory)

  // Sincronizza tempSelectedCategory quando selectedCategory cambia
  useEffect(() => {
    setTempSelectedCategory(selectedCategory)
  }, [selectedCategory])

  // Validation states
  const [categoryWarning, setCategoryWarning] = useState<string>("")

  /**
   * HANDLERS
   */
  const handleTimeSlotChange = (value: string) => {
    if (value === "custom") {
      // Se non c'è già un custom time slot, ne creiamo uno di default
      if (!customTimeSlot) {
        const defaultCustomSlot: CustomTimeSlot = {
          type: "custom",
          startHour: 9,
          endHour: 17
        }
        setCustomTimeSlot(defaultCustomSlot)
        setSelectedTimeSlot(defaultCustomSlot)
        checkCategoryWarning(tempSelectedCategory, defaultCustomSlot)
      }
      return
    }
    const newTimeSlot = value as TimeSlot
    setSelectedTimeSlot(newTimeSlot)
    setCustomTimeSlot(undefined)
    checkCategoryWarning(tempSelectedCategory, newTimeSlot)
  }

  const handleCustomTimeSlotChange = (value: CustomTimeSlot) => {
    setCustomTimeSlot(value)
    setSelectedTimeSlot(value)
    checkCategoryWarning(tempSelectedCategory, value)
  }

  const checkCategoryWarning = (category: string, timeSlot: TimeSlotValue) => {
    if (!category || !timeSlot) {
      setCategoryWarning("")
      return
    }

    const timeSlotType = isCustomTimeSlot(timeSlot) ? "custom" : timeSlot as TimeSlot
    
    if (timeSlotType === "custom") {
      setCategoryWarning("")
      return
    }

    if (!isCategoryTimeSlotRecommended(category, timeSlotType)) {
      const recommendedSlots = CATEGORY_TIME_SLOT_RULES[category.toLowerCase()]
      const slotsText = recommendedSlots ? recommendedSlots.join(", ") : "nessuna"
      setCategoryWarning(`⚠️ Combinazione non standard: '${category}' di solito opera in: ${slotsText}`)
    } else {
      setCategoryWarning("")
    }
  }

  const handleCategoryChange = (value: string) => {
    // Validate category format: only lowercase letters, no spaces, no numbers
    const sanitizedValue = value.toLowerCase().replace(/[^a-z]/g, '')
    setTempSelectedCategory(sanitizedValue)
    setSelectedCategory(sanitizedValue)
    checkCategoryWarning(sanitizedValue, selectedTimeSlot)
  }

  const handleAddDate = () => {
    if (!tempSelectedDate) return
    const validDate = new Date(tempSelectedDate)
    validDate.setHours(0, 0, 0, 0)
    // Passa la categoria direttamente alla funzione updateDateEntry
    updateDateEntry(validDate, selectedTimeSlot, tempSelectedCategory)
    setDefaultTimeSlot(selectedTimeSlot)
    // Aggiorna anche il context per mantenere la sincronizzazione
    setSelectedCategory(tempSelectedCategory)
  }

  const handleApplyInterval = () => {
    if (!tempSelectedDate) return
    setStartDate(tempSelectedDate)
    // Aggiorna la categoria nel context prima di applicare l'intervallo
    setSelectedCategory(tempSelectedCategory)
    // Pass the current selectedTimeSlot directly to applyIntervalSelection
    applyIntervalSelection(selectedTimeSlot)
  }

  const handleReset = () => {
    // Reset all date-related states
    setStartDate(null)
    setIntervalDays(7)
    setMonthsToRepeat(1)
    setDefaultTimeSlot("mattina")
    setTempSelectedDate(new Date())
    setSelectedTimeSlot("mattina")
    setRepeatEnabled(false)
    // Clear all date entries at once
    setDateEntries([])
    setSelectedDates([])
  }

  const handleMainAction = () => {
    if (repeatEnabled) {
      handleApplyInterval()
    } else {
      handleAddDate()
    }
  }

  return (
    <Sheet open={isDateSheetOpen} onOpenChange={setIsDateSheetOpen}>
      <SheetContent className="w-full sm:max-w-5xl overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>Seleziona date e orari</SheetTitle>
          <SheetDescription>
            Seleziona le date e le fasce orarie per cui creare le todolist
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6">
          {/* -------- Notifiche -------- */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <div className="flex items-center space-x-2">
              <Switch
                id="alertEnabled"
                checked={alertEnabled}
                onCheckedChange={setAlertEnabled}
              />
              <Label htmlFor="alertEnabled">Abilita notifiche</Label>
            </div>
            
            {alertEnabled && (
              <div>
                <Label htmlFor="email" className="text-sm text-muted-foreground mb-1 block">
                  Email per notifiche
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Inserisci email per le notifiche"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* -------- Categoria Todolist -------- */}
          <div>
            <Label htmlFor="category" className="mb-2 block">
              Categoria Todolist
            </Label>
            <div className="space-y-2">
              <Select 
                value={tempSelectedCategory} 
                onValueChange={handleCategoryChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleziona o digita una categoria" />
                </SelectTrigger>
                <SelectContent>
                  {availableCategories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <div className="text-xs text-muted-foreground">
                oppure inserisci una nuova categoria:
              </div>
              
              <Input
                placeholder="es: caldaista, manutentore, operatore..."
                value={tempSelectedCategory}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="text-sm"
              />
              
              {categoryWarning && (
                <div className="p-2 bg-amber-50 border border-amber-200 rounded-md">
                  <p className="text-sm text-amber-800">{categoryWarning}</p>
                </div>
              )}
            </div>
          </div>

          {/* -------- Reset Button -------- */}
          <div className="flex justify-end">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleReset}
              disabled={dateEntries.length === 0 && intervalDays === 7 && monthsToRepeat === 1}
            >
              <RotateCcw className="h-4 w-4 mr-2" /> Reset
            </Button>
          </div>

          {/* -------- Fascia oraria e Data -------- */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="timeSlot" className="mb-2 block">
                Fascia oraria
              </Label>
              <Select 
                value={isCustomTimeSlot(selectedTimeSlot) ? "custom" : selectedTimeSlot} 
                onValueChange={handleTimeSlotChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue 
                    placeholder={
                      isCustomTimeSlot(selectedTimeSlot) 
                        ? `Personalizzato (${selectedTimeSlot.startHour.toString().padStart(2, '0')}:00-${selectedTimeSlot.endHour.toString().padStart(2, '0')}:00)`
                        : "Seleziona fascia oraria"
                    } 
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mattina">{getTimeSlotLabel("mattina")}</SelectItem>
                  <SelectItem value="pomeriggio">{getTimeSlotLabel("pomeriggio")}</SelectItem>
                  <SelectItem value="notte">{getTimeSlotLabel("notte")}</SelectItem>
                  <SelectItem value="giornata">{getTimeSlotLabel("giornata")}</SelectItem>
                  <SelectItem value="custom">{getTimeSlotLabel("custom")}</SelectItem>
                </SelectContent>
              </Select>
              {isCustomTimeSlot(selectedTimeSlot) && (
                <div className="mt-2">
                  <CustomTimeSlotPicker
                    value={selectedTimeSlot}
                    onChange={handleCustomTimeSlotChange}
                  />
                </div>
              )}
            </div>

            <div>
              <Label className="mb-2 block">Seleziona data</Label>
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !tempSelectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {tempSelectedDate ? (
                      format(tempSelectedDate, "EEEE dd/MM/yyyy", { locale: it })
                    ) : (
                      <span>Seleziona una data</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
                  <Calendar
                    mode="single"
                    selected={tempSelectedDate}
                    onSelect={(d) => {
                      if (d) {
                        setTempSelectedDate(d);
                        setIsCalendarOpen(false);
                      }
                    }}
                    defaultMonth={tempSelectedDate || new Date()}
                    disabled={{ before: startOfToday() }}
                    initialFocus
                    locale={it}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* -------- Opzioni Ripetizione -------- */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="flex items-center space-x-2">
              <Switch
                id="repeatEnabled"
                checked={repeatEnabled}
                onCheckedChange={setRepeatEnabled}
              />
              <Label htmlFor="repeatEnabled">Ripeti con intervallo</Label>
            </div>
            
            {repeatEnabled && (
              <>
                <div>
                  <Label htmlFor="intervalDays" className="mb-2 block text-sm">
                    Intervallo (giorni)
                  </Label>
                  <Input
                    id="intervalDays"
                    type="number"
                    min={1}
                    max={31}
                    value={intervalDays}
                    onChange={(e) => setIntervalDays(parseInt(e.target.value))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="months" className="mb-2 block text-sm">
                    Mesi da ripetere
                  </Label>
                  <Input
                    id="months"
                    type="number"
                    min={1}
                    max={12}
                    value={monthsToRepeat}
                    onChange={(e) => setMonthsToRepeat(parseInt(e.target.value))}
                  />
                </div>
              </>
            )}
          </div>

          {/* -------- CTA Button -------- */}
          <Button 
            type="button" 
            onClick={handleMainAction} 
            disabled={!tempSelectedDate || (repeatEnabled && intervalDays < 1)} 
            className="w-full"
            size="lg"
          >
            {repeatEnabled ? (
              <>
                <CalendarIcon className="h-4 w-4 mr-2" />
                Applica intervallo
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Aggiungi data
              </>
            )}
          </Button>
        </div>

        {/* -------- DATE LIST -------- */}
        <div className="mt-8">
          <h3 className="text-sm font-medium mb-3">Date selezionate ({dateEntries.length})</h3>
          <div className="border rounded-md p-4">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left pb-2">Data</th>
                  <th className="text-left pb-2">Fascia oraria</th>
                  <th className="text-left pb-2">Categoria</th>
                  <th className="text-left pb-2">Notifiche</th>
                  <th className="text-right pb-2">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {dateEntries.length > 0 ? (
                  dateEntries
                    .map((entry, originalIdx) => ({ ...entry, originalIdx }))
                    .sort((a, b) => {
                      // Prima ordiniamo per data
                      const dateComparison = new Date(a.date).getTime() - new Date(b.date).getTime()
                      if (dateComparison !== 0) return dateComparison
                      
                      // Se le date sono uguali, ordiniamo per orario di inizio
                      const getStartHour = (timeSlot: TimeSlotValue) => {
                        if (isCustomTimeSlot(timeSlot)) {
                          return timeSlot.startHour
                        }
                        if (typeof timeSlot === 'string') {
                          const interval = TIME_SLOT_INTERVALS[timeSlot as keyof typeof TIME_SLOT_INTERVALS]
                          return interval ? interval.start : 0
                        }
                        return 0
                      }
                      
                      return getStartHour(a.timeSlot) - getStartHour(b.timeSlot)
                    })
                    .map((entry, idx) => (
                      <tr key={idx} className="border-b last:border-b-0">
                        <td className="py-2">
                          {format(entry.date, "EEEE dd/MM/yyyy", { locale: it })}
                        </td>
                        <td className="py-2">
                          <span className="flex items-center">
                            <Clock className="h-3 w-3 inline mr-1" />
                            {formatTimeSlotValue(entry.timeSlot)}
                          </span>
                        </td>
                        <td className="py-2">
                          {entry.category ? (
                            <Badge variant="outline" className="text-xs">
                              {entry.category}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">Nessuna</span>
                          )}
                        </td>
                        <td className="py-2">
                          {alertEnabled ? (
                            <div className="flex items-center text-sm">
                              <Switch
                                checked={alertEnabled}
                                className="scale-75 origin-left"
                                onCheckedChange={setAlertEnabled}
                              />
                              <span className="ml-2 text-xs text-muted-foreground">{email}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">Disattivate</span>
                          )}
                        </td>
                        <td className="py-2 text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 hover:bg-gray-200 rounded-full"
                            onClick={() => removeDateEntry(entry.originalIdx)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-muted-foreground">
                      Nessuna data selezionata
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

export default DateSelectionSheet;
