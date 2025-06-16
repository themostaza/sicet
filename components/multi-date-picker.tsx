"use client"

import { useState } from "react"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { it } from "date-fns/locale"
import { CalendarIcon, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

export type TimeSlot = "mattina" | "pomeriggio" | "sera" | "notte" | "giornata"

export interface DateEntry {
  date: Date
  timeSlot: TimeSlot
}

interface MultiDatePickerProps {
  selectedEntries: DateEntry[]
  onEntriesChange: (entries: DateEntry[]) => void
  className?: string
}

export function MultiDatePicker({ selectedEntries = [], onEntriesChange, className }: MultiDatePickerProps) {
  const [selectedDates, setSelectedDates] = useState<Date[]>((selectedEntries || []).map((entry) => entry.date))
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot>("mattina")

  // Handle calendar selection changes
  const handleCalendarSelect = (dates: Date[] | undefined) => {
    if (!dates) {
      setSelectedDates([])
      onEntriesChange([])
      return
    }

    setSelectedDates(dates)

    // Update entries based on selected dates
    const newEntries: DateEntry[] = []

    // Process each selected date
    dates.forEach((date) => {
      // Check if this date is already in the entries
      const existingEntry = selectedEntries.find(
        (entry) => format(entry.date, "yyyy-MM-dd") === format(date, "yyyy-MM-dd"),
      )

      if (existingEntry) {
        // Keep existing entry with its time slot
        newEntries.push(existingEntry)
      } else {
        // Add new entry with default time slot
        newEntries.push({
          date,
          timeSlot: selectedTimeSlot,
        })
      }
    })

    onEntriesChange(newEntries)
  }

  const handleRemoveEntry = (index: number) => {
    const entryToRemove = selectedEntries[index]

    // Remove from entries
    const newEntries = selectedEntries.filter((_, i) => i !== index)
    onEntriesChange(newEntries)

    // Remove from selected dates
    const newSelectedDates = selectedDates.filter(
      (date) => format(date, "yyyy-MM-dd") !== format(entryToRemove.date, "yyyy-MM-dd"),
    )
    setSelectedDates(newSelectedDates)
  }

  const handleDateChange = (index: number, newDate: Date) => {
    // Check if the new date already exists in another entry
    const dateExists = selectedEntries.some(
      (entry, i) => i !== index && format(entry.date, "yyyy-MM-dd") === format(newDate, "yyyy-MM-dd"),
    )

    if (dateExists) {
      // If date exists, don't update
      return
    }

    const oldDate = selectedEntries[index].date

    // Update entry
    const newEntries = [...selectedEntries]
    newEntries[index].date = newDate
    onEntriesChange(newEntries)

    // Update selected dates
    const newSelectedDates = selectedDates.map((date) =>
      format(date, "yyyy-MM-dd") === format(oldDate, "yyyy-MM-dd") ? newDate : date,
    )
    setSelectedDates(newSelectedDates)
  }

  const handleTimeSlotChange = (index: number, timeSlot: TimeSlot) => {
    const newEntries = [...selectedEntries]
    newEntries[index].timeSlot = timeSlot
    onEntriesChange(newEntries)
  }

  // Format time slot for display
  const formatTimeSlot = (timeSlot: TimeSlot) => {
    switch (timeSlot) {
      case "mattina":
        return "Mattina (fino alle 14:00)"
      case "pomeriggio":
        return "Pomeriggio (fino alle 22:00)"
      case "notte":
        return "Notte (fino alle 06:00)"
      default:
        return timeSlot
    }
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle>Seleziona Date</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6">
              <Calendar
                mode="multiple"
                selected={selectedDates}
                onSelect={handleCalendarSelect}
                className="rounded-md border"
                locale={it}
              />

              <div>
                <label className="text-sm font-medium mb-2 block">Fascia Oraria Predefinita</label>
                <Select
                  value={selectedTimeSlot}
                  onValueChange={(value) => {
                    setSelectedTimeSlot(value as TimeSlot)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona fascia oraria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mattina">Mattina (fino alle 14:00)</SelectItem>
                    <SelectItem value="pomeriggio">Pomeriggio (fino alle 22:00)</SelectItem>
                    <SelectItem value="sera">Sera (fino alle 22:00)</SelectItem>
                    <SelectItem value="notte">Notte (fino alle 06:00)</SelectItem>
                    <SelectItem value="giornata">Giornata (fino alle 20:00)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground mt-2">
                  Questa fascia oraria verrà applicata alle nuove date selezionate
                </p>
              </div>
            </div>

            <div className="border rounded-md p-4">
              <h3 className="font-medium mb-4">Date Selezionate ({selectedEntries.length})</h3>

              {selectedEntries.length > 0 ? (
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
                      {selectedEntries.map((entry, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !entry.date && "text-muted-foreground",
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {format(entry.date, "dd MMMM yyyy", { locale: it })}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={entry.date}
                                  onSelect={(date) => date && handleDateChange(index, date)}
                                  initialFocus
                                  locale={it}
                                />
                              </PopoverContent>
                            </Popover>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={entry.timeSlot}
                              onValueChange={(value) => handleTimeSlotChange(index, value as TimeSlot)}
                            >
                              <SelectTrigger className="h-10">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="mattina">Mattina (fino alle 14:00)</SelectItem>
                                <SelectItem value="pomeriggio">Pomeriggio (fino alle 22:00)</SelectItem>
                                <SelectItem value="sera">Sera (fino alle 22:00)</SelectItem>
                                <SelectItem value="notte">Notte (fino alle 06:00)</SelectItem>
                                <SelectItem value="giornata">Giornata (fino alle 20:00)</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => handleRemoveEntry(index)}>
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
    </div>
  )
}
