"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Card, CardContent } from "@/components/ui/card"
import { format, startOfToday } from "date-fns"
import { it } from "date-fns/locale"
import { CalendarIcon, Clock, Plus, X } from "lucide-react"
import { useTodolist } from "./context"
import { formatTimeSlot } from "./helpers"
import { TimeSlot, TimeSlotValue, CustomTimeSlot, isCustomTimeSlot, formatTimeSlotValue, TIME_SLOT_TOLERANCE, TIME_SLOT_INTERVALS } from "@/lib/validation/todolist-schemas"
import { CustomTimeSlotPicker } from "./custom-time-slot"
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
    sera: "Sera",
    notte: "Notte",
    giornata: "Giornata",
    custom: "Personalizzato"
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

  // Stato locale per il toggle 'Ripeti'
  const [repeatEnabled, setRepeatEnabled] = useState(!!startDate)

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
      }
      return
    }
    setSelectedTimeSlot(value as TimeSlot)
    setCustomTimeSlot(undefined)
  }

  const handleCustomTimeSlotChange = (value: CustomTimeSlot) => {
    setCustomTimeSlot(value)
    setSelectedTimeSlot(value)
  }

  const handleAddDate = () => {
    if (!tempSelectedDate) return
    const validDate = new Date(tempSelectedDate)
    validDate.setHours(0, 0, 0, 0)
    updateDateEntry(validDate, selectedTimeSlot)
    setDefaultTimeSlot(selectedTimeSlot)
  }

  const handleApplyInterval = () => {
    if (!tempSelectedDate) return
    setStartDate(tempSelectedDate)
    // Pass the current selectedTimeSlot directly to applyIntervalSelection
    applyIntervalSelection(selectedTimeSlot)
  }

  const handleReset = () => {
    // Reset all date-related states
    setStartDate(null)
    setIntervalDays(1)
    setMonthsToRepeat(1)
    setDefaultTimeSlot("mattina")
    setTempSelectedDate(new Date())
    setSelectedTimeSlot("mattina")
    // Clear all date entries
    dateEntries.forEach((_, index) => removeDateEntry(index))
  }

  // Sincronizza startDate con repeatEnabled
  const handleRepeatToggle = (v: boolean) => {
    setRepeatEnabled(v)
    if (!v) {
      setStartDate(null)
    } else {
      setStartDate(new Date())
    }
  }

  return (
    <Sheet open={isDateSheetOpen} onOpenChange={setIsDateSheetOpen}>
      <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle>Seleziona date e orari</SheetTitle>
          <SheetDescription>
            Seleziona le date e le fasce orarie per cui creare le todolist
          </SheetDescription>
        </SheetHeader>

        {/* Blocco notifiche: prende tutta la larghezza */}
        <div className="w-full mb-4 p-4 border rounded-md bg-muted flex flex-col items-start">
          <div className="flex items-center space-x-2 mb-2">
            <Label htmlFor="alertEnabled" className="mb-0">Abilita notifiche</Label>
            <Switch
              id="alertEnabled"
              checked={alertEnabled}
              onCheckedChange={setAlertEnabled}
            />
          </div>
          {alertEnabled && (
            <div className="w-full">
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

        {/* Riga con tasto reset */}
        <div className="flex justify-end mb-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleReset}
            className="h-8"
            disabled={dateEntries.length === 0 && intervalDays === 1 && monthsToRepeat === 1}
          >
            <X className="h-4 w-4 mr-1" /> Reset dati
          </Button>
        </div>

        {/* Riga con fascia oraria e selezione data */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Fascia oraria */}
          <div>
            <Label htmlFor="timeSlot" className="mb-2 block">
              Fascia oraria
            </Label>
            <Select 
              value={isCustomTimeSlot(selectedTimeSlot) ? "custom" : selectedTimeSlot} 
              onValueChange={handleTimeSlotChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleziona fascia oraria" />
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
          {/* Selezione data */}
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
                    format(tempSelectedDate, "EEEE d MMMM", { locale: it })
                  ) : (
                    <span>Seleziona una data</span>
                  )}
                </Button>
              </PopoverTrigger>

              {/*
                pointer-events-auto è ESSENZIALE quando Popover
                vive in un portal (Sheet, Dialog, ecc.).
              */}
              <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
                <Calendar
                  mode="single"
                  selected={tempSelectedDate}
                  onSelect={(d) => {
                    if (d) {
                      setTempSelectedDate(d);
                      setIsCalendarOpen(false); // Close popover when a date is selected
                    }
                  }}
                  defaultMonth={tempSelectedDate}
                  disabled={{ before: startOfToday() }}
                  initialFocus
                  locale={it}
                  className="pointer-events-auto" /* garantisce interazione */
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Toggle ripeti e campi intervallo */}
        <div className="mb-4 flex flex-col md:flex-row md:items-center md:space-x-4">
          <div className="flex items-center space-x-2 mb-2 md:mb-0">
            <Label htmlFor="repeatToggle" className="mb-0">Ripeti</Label>
            <Switch
              id="repeatToggle"
              checked={repeatEnabled}
              onCheckedChange={handleRepeatToggle}
            />
          </div>
          {repeatEnabled && (
            <>
              <div className="flex items-center space-x-2 mb-2 md:mb-0">
                <Label htmlFor="intervalDays" className="mb-0">Intervallo giorni</Label>
                <Input
                  id="intervalDays"
                  type="number"
                  min={1}
                  value={intervalDays}
                  onChange={e => setIntervalDays(Number(e.target.value))}
                  className="w-24"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Label htmlFor="monthsToRepeat" className="mb-0">Mesi</Label>
                <Input
                  id="monthsToRepeat"
                  type="number"
                  min={1}
                  value={monthsToRepeat}
                  onChange={e => setMonthsToRepeat(Number(e.target.value))}
                  className="w-16"
                />
              </div>
            </>
          )}
        </div>

        {/* Pulsanti azione: aggiungi data o applica intervallo */}
        <div className="flex justify-end mb-4">
          {repeatEnabled ? (
            <Button onClick={handleApplyInterval}>Applica intervallo</Button>
          ) : (
            <Button onClick={handleAddDate}>Aggiungi data</Button>
          )}
        </div>

        {/* -------- DATE LIST -------- */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium">Date selezionate ({dateEntries.length})</h3>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDateEntries([])}
              disabled={dateEntries.length === 0}
            >
              Elimina tutte
            </Button>
          </div>
          <div className="border rounded-md p-4">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left pb-2">Data</th>
                  <th className="text-left pb-2">Fascia oraria</th>
                  <th className="text-left pb-2">Notifiche</th>
                  <th className="text-right pb-2">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {dateEntries.length > 0 ? (
                  dateEntries.map((entry, idx) => (
                    <tr key={idx} className="border-b last:border-b-0">
                      <td className="py-2">
                        {format(entry.date, "EEEE d MMMM", { locale: it })}
                      </td>
                      <td className="py-2">
                        <span className="flex items-center">
                          <Clock className="h-3 w-3 inline mr-1" />
                          {formatTimeSlotValue(entry.timeSlot)}
                        </span>
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
                          onClick={() => removeDateEntry(idx)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="py-4 text-center text-muted-foreground">
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
