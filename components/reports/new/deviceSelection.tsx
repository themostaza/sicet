"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { AlertCircle, Plus, Settings } from "lucide-react"
import { useReport } from "./context"
import { Device } from "./context"

export function DeviceSelection() {
  const { 
    selectedDevicesArray, 
    selectedDevices, 
    isDeviceSheetOpen, 
    setIsDeviceSheetOpen,
    errors 
  } = useReport()

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center">
            Dispositivi
            {errors.devices && (
              <div className="ml-2 text-red-500 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                <span className="text-xs font-normal">{errors.devices}</span>
              </div>
            )}
          </CardTitle>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{selectedDevices.size} selezionati</span>
            <Button variant="outline" size="sm" onClick={() => setIsDeviceSheetOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Seleziona
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {selectedDevicesArray.length > 0 ? (
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead className="hidden md:table-cell">Posizione</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedDevicesArray.map((device: Device) => (
                  <TableRow key={device.id}>
                    <TableCell className="font-medium">{device.id}</TableCell>
                    <TableCell>{device.name}</TableCell>
                    <TableCell className="hidden md:table-cell">{device.location || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center border rounded-md p-8 text-center">
            <Settings className="h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium mb-2">Nessun dispositivo selezionato</h3>
            <p className="text-sm text-gray-500 mb-4">
              Clicca sul pulsante "Seleziona" per aggiungere dispositivi al report
            </p>
            <Button type="button" onClick={() => setIsDeviceSheetOpen(true)} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Seleziona dispositivi
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
