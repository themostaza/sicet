"use client"

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Search, Check, X } from "lucide-react"
import { useReport } from "./context"
import { useState, useMemo } from "react"

export function DeviceSelectionSheet() {
  const {
    devices,
    selectedDevices,
    setSelectedDevices,
    isDeviceSheetOpen,
    setIsDeviceSheetOpen,
    allTags,
    selectedTags,
    setSelectedTags,
    tagFilterMode,
    setTagFilterMode,
    filteredDevices,
    tagLoading
  } = useReport()
  
  const [searchTerm, setSearchTerm] = useState("")
  
  // Decide which devices to use based on whether tags are selected
  const currentDevices = selectedTags.length > 0 ? filteredDevices : devices
  
  const searchFilteredDevices = useMemo(() => {
    if (!searchTerm.trim()) return currentDevices
    
    const search = searchTerm.toLowerCase()
    return currentDevices.filter(device => 
      device.name.toLowerCase().includes(search) ||
      device.id.toLowerCase().includes(search) ||
      (device.location && device.location.toLowerCase().includes(search)) ||
      (device.tags && device.tags.some(tag => tag.toLowerCase().includes(search)))
    )
  }, [currentDevices, searchTerm])

  const toggleTag = (tag: string) => {
    const newTags = selectedTags.includes(tag) 
      ? selectedTags.filter((t: string) => t !== tag)
      : [...selectedTags, tag]
    setSelectedTags(newTags)
  }

  const clearAllTags = () => {
    setSelectedTags([])
  }
  
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
    const allIds = new Set(searchFilteredDevices.map(d => d.id))
    setSelectedDevices(allIds)
  }
  
  const handleDeselectAll = () => {
    setSelectedDevices(new Set())
  }

  return (
    <Sheet open={isDeviceSheetOpen} onOpenChange={setIsDeviceSheetOpen}>
      <SheetContent className="sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Seleziona Punti di Controllo</SheetTitle>
        </SheetHeader>
        
        <div className="space-y-4 py-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Cerca punti di controllo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Tag Filter Section */}
          {allTags.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-700">Filtra per tag</h3>
                {selectedTags.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllTags}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-3 h-3 mr-1" />
                    Cancella tutti
                  </Button>
                )}
              </div>
              
              {/* Toggle OR/AND Mode */}
              {selectedTags.length > 1 && (
                <div className="flex items-center space-x-2 text-sm">
                  <Label htmlFor="tag-mode-toggle" className="text-gray-600">
                    Modalità: {tagFilterMode === 'OR' ? 'Almeno uno' : 'Tutti i tag'}
                  </Label>
                  <Switch
                    id="tag-mode-toggle"
                    checked={tagFilterMode === 'AND'}
                    onCheckedChange={(checked) => setTagFilterMode(checked ? 'AND' : 'OR')}
                  />
                  <span className="text-xs text-gray-500">
                    {tagFilterMode === 'OR' ? 'OR' : 'AND'}
                  </span>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {allTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant={selectedTags.includes(tag) ? "default" : "outline"}
                    className={`cursor-pointer transition-colors ${
                      selectedTags.includes(tag)
                        ? "bg-black text-white hover:bg-gray-800"
                        : "hover:bg-gray-100"
                    }`}
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              disabled={searchFilteredDevices.length === 0}
            >
              Seleziona tutti ({searchFilteredDevices.length})
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
          
          {/* Filter Summary */}
          {(searchTerm || selectedTags.length > 0) && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-sm text-gray-600 bg-gray-50 px-4 py-2 rounded-lg gap-2">
              <div className="flex flex-wrap gap-2">
                {tagLoading ? (
                  <span>Caricamento punti di controllo per tag...</span>
                ) : (
                  <>
                    Mostrando {searchFilteredDevices.length} di {currentDevices.length} punti di controllo
                    {selectedTags.length > 0 && (
                      <span className="ml-2 text-xs text-green-600">
                        ({tagFilterMode === 'OR' ? 'punti con almeno uno di questi tag' : 'punti con tutti questi tag'})
                      </span>
                    )}
                  </>
                )}
                {(searchTerm || selectedTags.length > 0) && (
                  <span className="ml-2">
                    {searchTerm && <span className="inline-block bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs mr-2">Ricerca: "{searchTerm}"</span>}
                    {selectedTags.length > 0 && (
                      <span className="inline-block bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs">
                        Tag ({tagFilterMode}): {selectedTags.join(", ")}
                      </span>
                    )}
                  </span>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm("")
                  clearAllTags()
                }}
                className="text-xs self-start sm:self-auto"
              >
                <X className="w-3 h-3 mr-1" />
                Cancella filtri
              </Button>
            </div>
          )}

          {/* Selection summary */}
          {selectedDevices.size > 0 && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <div className="text-sm text-blue-800">
                <Badge variant="secondary" className="mr-2">
                  {selectedDevices.size}
                </Badge>
                punti di controllo selezionati
              </div>
            </div>
          )}
          
          {/* Device list */}
          <div className="space-y-2">
            {searchFilteredDevices.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {searchTerm || selectedTags.length > 0 
                  ? "Nessun risultato per i filtri applicati" 
                  : "Nessun punto di controllo disponibile"
                }
                {(searchTerm || selectedTags.length > 0) && (
                  <div className="mt-4 space-x-2">
                    {searchTerm && (
                      <Button variant="outline" onClick={() => setSearchTerm("")}>
                        Cancella ricerca
                      </Button>
                    )}
                    {selectedTags.length > 0 && (
                      <Button variant="outline" onClick={clearAllTags}>
                        Cancella filtri tag
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              searchFilteredDevices.map((device) => {
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
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="font-medium">{device.name}</div>
                          {device.tags && device.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {device.tags.map(tag => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
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
