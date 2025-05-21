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
import { TimeSlot } from "./types"
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
  } = useTodolist()

  /**
   * TEMP STATES
   */
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot>(defaultTimeSlot)
  const [tempSelectedDate, setTempSelectedDate] = useState<Date | undefined>(new Date())
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)

  /**
   * HANDLERS
   */
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
    applyIntervalSelection()
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

        <Card className="border-none shadow-none">
          <CardContent className="p-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              {/* -------- Fascia oraria -------- */}
              <div>
                <Label htmlFor="timeSlot" className="mb-2 block">
                  Fascia oraria
                </Label>
                <Select value={selectedTimeSlot} onValueChange={(v) => setSelectedTimeSlot(v as TimeSlot)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleziona fascia oraria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mattina">Mattina (fino alle 14:00)</SelectItem>
                    <SelectItem value="pomeriggio">Pomeriggio (fino alle 22:00)</SelectItem>
                    <SelectItem value="notte">Notte (fino alle 06:00)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* -------- Intervallo giorni -------- */}
              <div>
                <Label htmlFor="intervalDays" className="mb-2 block">
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

              {/* -------- Date Picker -------- */}
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

              {/* -------- Mesi da ripetere -------- */}
              <div>
                <Label htmlFor="months" className="mb-2 block">
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
            </div>

            {/* -------- ACTION BUTTONS -------- */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <Button type="button" onClick={handleAddDate} disabled={!tempSelectedDate} className="flex items-center w-full">
                <Plus className="h-4 w-4 mr-1" /> Aggiungi data
              </Button>

              <Button type="button" onClick={handleApplyInterval} disabled={!tempSelectedDate || intervalDays < 1} className="w-full">
                Applica intervallo
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* -------- DATE LIST -------- */}
        <div className="mt-6">
          <h3 className="text-sm font-medium mb-2">Date selezionate ({dateEntries.length})</h3>
          <div className="border rounded-md p-4">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left pb-2">Data</th>
                  <th className="text-left pb-2">Fascia oraria</th>
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
                          {formatTimeSlot(entry.timeSlot)}
                        </span>
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
