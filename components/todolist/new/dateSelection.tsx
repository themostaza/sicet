"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { it } from "date-fns/locale"
import { AlertCircle, Clock, Plus, Settings, X } from "lucide-react"
import { useTodolist } from "./context"
import { formatTimeSlotValue } from "@/lib/validation/todolist-schemas"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Switch } from "@/components/ui/switch"

export function DateSelection() {
  const { 
    dateEntries, 
    isDateSheetOpen, 
    setIsDateSheetOpen,
    removeDateEntry,
    errors,
    alertEnabled,
    email
  } = useTodolist()

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center">
            Date e orari
            {errors.dates && (
              <div className="ml-2 text-red-500 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                <span className="text-xs font-normal">{errors.dates}</span>
              </div>
            )}
          </CardTitle>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{dateEntries.length} selezionati</span>
            <Button type="button" variant="outline" size="sm" className="flex items-center"
              onClick={() => setIsDateSheetOpen(true)}>
              <Settings className="h-4 w-4 mr-2" />
              Seleziona
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {dateEntries.length > 0 ? (
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Orario</TableHead>
                  <TableHead>Notifiche</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dateEntries.map((entry, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      {format(entry.date, "EEEE d MMMM", { locale: it })}
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatTimeSlotValue(entry.timeSlot)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {alertEnabled ? (
                        <div className="flex items-center text-sm">
                          <span className="inline-flex items-center gap-1.5">
                            <div className="h-2 w-2 rounded-full bg-green-500"></div>
                            <span className="text-xs">Alert attivo</span>
                          </span>
                          <span className="ml-2 text-xs text-muted-foreground">({email})</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Alert disattivato</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center border rounded-md p-8 text-center">
            <Clock className="h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium mb-2">Nessuna data selezionata</h3>
            <p className="text-sm text-gray-500 mb-4">
              Clicca sul pulsante "Seleziona" per aggiungere date e orari alla todolist
            </p>
            <Button type="button" onClick={() => setIsDateSheetOpen(true)} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Seleziona date
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}