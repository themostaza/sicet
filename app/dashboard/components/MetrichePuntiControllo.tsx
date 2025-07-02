import React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, Layers } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatDateForDisplay } from "@/lib/utils"
import DeviceKpiDialog from "./DeviceKpiDialog"
import { useState } from "react"

type DeviceMetrics = {
  totalDevices: number
  activeDevices: number
  disabledDevices: number
  devices: any[]
  hasMore: boolean
}

type Props = {
  deviceMetrics: DeviceMetrics | null
  deviceMetricsLoading: boolean
  handleShowMoreDevices: () => void
}

export default function MetrichePuntiControllo({
  deviceMetrics,
  deviceMetricsLoading,
  handleShowMoreDevices
}: Props) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedDevice, setSelectedDevice] = useState<{ id: string, name: string } | null>(null)

  const handleRowClick = (device: any) => {
    setSelectedDevice({ id: device.id, name: device.name })
    setDialogOpen(true)
  }

  return (
    <>
      <Card className="bg-gradient-to-r from-gray-50 to-zinc-50 border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center text-gray-700">
            <Layers className="h-6 w-6 mr-2" />
            Metriche Punti di Controllo
          </CardTitle>
          <CardDescription>
            <div className="flex flex-wrap gap-4 items-center mt-2">
              <span className="text-base font-semibold text-gray-900">Totale: {deviceMetrics?.totalDevices ?? "..."}</span>
              <span className="text-base text-gray-700">Attivi: {deviceMetrics?.activeDevices ?? "..."}</span>
              <span className="text-base text-gray-500 flex items-center gap-1">
                Disabilitati: {deviceMetrics?.disabledDevices ?? "..."}
                <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200 ml-1">Disabilitato</Badge>
              </span>
            </div>
            <span className="block mt-1 text-sm text-gray-500">Ultimi punti di controllo creati e relative metriche di esecuzione</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {deviceMetricsLoading && (!deviceMetrics || deviceMetrics.devices.length === 0) ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2 text-gray-400" />
              <span className="text-gray-600">Caricamento metriche punti di controllo...</span>
            </div>
          ) : deviceMetrics && deviceMetrics.devices.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Creato il</TableHead>
                    <TableHead className="text-center">Todolist Totali</TableHead>
                    <TableHead className="text-center">Completate</TableHead>
                    <TableHead className="text-center">Pendenti</TableHead>
                    <TableHead className="text-center">Scadute</TableHead>
                    <TableHead className="text-center">Stato</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deviceMetrics.devices.map(device => {
                    const isDisabled = device.deleted
                    const metrics = device.todolistMetrics || {}
                    return (
                      <TableRow key={device.id} className={isDisabled ? "bg-gray-50 text-gray-400 cursor-pointer hover:bg-gray-100" : "cursor-pointer hover:bg-gray-100"} onClick={() => handleRowClick(device)}>
                        <TableCell className={isDisabled ? "text-gray-400" : "font-medium text-gray-900"}>{device.name}</TableCell>
                        <TableCell className={isDisabled ? "text-gray-400" : undefined}>{device.created_at ? formatDateForDisplay(device.created_at) : '-'}</TableCell>
                        <TableCell className={"text-center " + (isDisabled ? "text-gray-400" : "font-semibold")}>{metrics.total > 0 ? metrics.total : <span className="text-muted-foreground">-</span>}</TableCell>
                        <TableCell className={"text-center " + (isDisabled ? "text-gray-400" : "")}>{metrics.completed > 0 ? metrics.completed : <span className="text-muted-foreground">-</span>}</TableCell>
                        <TableCell className={"text-center " + (isDisabled ? "text-gray-400" : "")}>{metrics.pending > 0 ? metrics.pending : <span className="text-muted-foreground">-</span>}</TableCell>
                        <TableCell className={"text-center " + (isDisabled ? "text-gray-400" : "")}>{metrics.overdue > 0 ? metrics.overdue : <span className="text-muted-foreground">-</span>}</TableCell>
                        <TableCell className="text-center">
                          {isDisabled ? (
                            <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200">Disabilitato</Badge>
                          ) : (
                            <span className="text-gray-700">Attivo</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
              {deviceMetrics.hasMore && (
                <div className="flex justify-center mt-4">
                  <Button onClick={handleShowMoreDevices} disabled={deviceMetricsLoading} variant="outline" className="bg-gray-100 text-gray-700 border-gray-300">
                    {deviceMetricsLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Mostra altri
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              Nessun punto di controllo trovato.
            </div>
          )}
        </CardContent>
      </Card>
      <DeviceKpiDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        deviceId={selectedDevice?.id || ""}
        deviceName={selectedDevice?.name || ""}
        isDisabled={!!deviceMetrics?.devices.find(d => d.id === selectedDevice?.id)?.deleted}
      />
    </>
  )
} 