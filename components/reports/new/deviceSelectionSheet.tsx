"use client"

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, Check } from "lucide-react"
import { useReport } from "./context"
import { useState, useMemo } from "react"

export function DeviceSelectionSheet() {
  const {
    devices,
    selectedDevices,
    setSelectedDevices,
    isDeviceSheetOpen,
    setIsDeviceSheetOpen
  } = useReport()
  
  const [searchTerm, setSearchTerm] = useState("")
  
  const filteredDevices = useMemo(() => {
    if (!searchTerm.trim()) return devices
    
    const search = searchTerm.toLowerCase()
    return devices.filter(device => 
      device.name.toLowerCase().includes(search) ||
      device.id.toLowerCase().includes(search) ||
      (device.location && device.location.toLowerCase().includes(search))
    )
  }, [devices, searchTerm])
  
  const handleToggleDevice = (deviceId: string) => {
    const newSelection = new Set(selectedDevices)
    if (newSelection.has(deviceId)) {
      newSelection.delete(deviceId)
    } else {
      newSelection.add(deviceId)
    }
    setSelectedDevices(newSelection)
  }
  
  const handleSelectAll = () => {
    const allIds = new Set(filteredDevices.map(d => d.id))
    setSelectedDevices(allIds)
  }
  
  const handleDeselectAll = () => {
    setSelectedDevices(new Set())
  }

  return (
    <Sheet open={isDeviceSheetOpen} onOpenChange={setIsDeviceSheetOpen}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Seleziona Dispositivi</SheetTitle>
        </SheetHeader>
        
        <div className="space-y-4 py-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Cerca dispositivi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              disabled={filteredDevices.length === 0}
            >
              Seleziona tutti ({filteredDevices.length})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeselectAll}
              disabled={selectedDevices.size === 0}
            >
              Deseleziona tutti
            </Button>
          </div>
          
          {/* Selection summary */}
          {selectedDevices.size > 0 && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <div className="text-sm text-blue-800">
                <Badge variant="secondary" className="mr-2">
                  {selectedDevices.size}
                </Badge>
                dispositivi selezionati
              </div>
            </div>
          )}
          
          {/* Device list */}
          <div className="space-y-2">
            {filteredDevices.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {searchTerm ? "Nessun dispositivo trovato" : "Nessun dispositivo disponibile"}
              </div>
            ) : (
              filteredDevices.map((device) => {
                const isSelected = selectedDevices.has(device.id)
                return (
                  <div
                    key={device.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-all ${
                      isSelected
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                    onClick={() => handleToggleDevice(device.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium">{device.name}</div>
                        <div className="text-sm text-gray-500">
                          ID: {device.id}
                          {device.location && ` • ${device.location}`}
                        </div>
                      </div>
                      {isSelected && (
                        <Check className="h-5 w-5 text-blue-600" />
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
