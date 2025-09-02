"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet"
import { Search, TagIcon, X } from "lucide-react"
import { useTodolist } from "./context"
import { Device } from "./types"
import { cn } from "@/lib/utils"

export function DeviceSelectionSheet() {
  const {
    isDeviceSheetOpen,
    setIsDeviceSheetOpen,
    deviceSearchTerm,
    setDeviceSearchTerm,
    selectedTags,
    availableTags,
    tagCounts,
    handleTagClick,
    clearAllTags,
    filteredDevices,
    selectedDevices,
    tagFilterMode,
    setTagFilterMode,
    manualSelectedDevices,
    setManualSelectedDevices,
    allRowsSelected,
    someRowsSelected,
    handleToggleAllDevices
  } = useTodolist()

  const handleReset = () => {
    setManualSelectedDevices(new Set())
    setDeviceSearchTerm("")
    clearAllTags()
  }

  return (
    <Sheet open={isDeviceSheetOpen} onOpenChange={setIsDeviceSheetOpen}>
      <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader className="mb-4">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle>Seleziona Punti di controllo</SheetTitle>
              <SheetDescription>
                Seleziona i Punti di controllo per la tua todolist
              </SheetDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleReset}
              className="h-8"
              disabled={manualSelectedDevices.size === 0 && selectedTags.size === 0}
            >
              <X className="h-4 w-4 mr-1" /> Reset
            </Button>
          </div>
        </SheetHeader>

        <div className="space-y-4">
          {/* Tag Chips */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium">Tags</label>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{tagFilterMode === "and" ? "Intersezione" : "Aggregazione"}</span>
                  <Switch
                    checked={tagFilterMode === "or"}
                    onCheckedChange={(checked) => setTagFilterMode(checked ? "or" : "and")}
                    aria-label="Cambia modalità filtro tag"
                  />
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className={cn("h-6 px-2 text-xs", selectedTags.size === 0 && "invisible")}
                onClick={clearAllTags}
              >
                Cancella tutti
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {availableTags.map(tag => (
                <Badge 
                  key={tag} 
                  variant={selectedTags.has(tag) ? "default" : "outline"}
                  className="cursor-pointer gap-1"
                  onClick={() => handleTagClick(tag)}
                >
                  {tag}
                  <span className="ml-1 opacity-70">({tagCounts[tag] || 0})</span>
                </Badge>
              ))}
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              type="search"
              placeholder="Cerca Punti di controllo..."
              className="pl-8"
              value={deviceSearchTerm}
              onChange={(e) => setDeviceSearchTerm(e.target.value)}
            />
          </div>

          {/* Count shown/selected */}
          <div className="flex justify-end gap-3">
            <span className="text-xs text-muted-foreground">Mostrati {filteredDevices.length}</span>
            <span className="text-xs text-muted-foreground">Selezionati {selectedDevices.size}</span>
          </div>

          {/* Device Table */}
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allRowsSelected ? true : (someRowsSelected ? "indeterminate" : false)}
                      onCheckedChange={handleToggleAllDevices}
                      aria-label="Seleziona tutti i visibili"
                    />
                  </TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead className="hidden md:table-cell">Posizione</TableHead>
                  <TableHead className="hidden lg:table-cell">Tag</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDevices.map((device) => {
                  const isChecked = manualSelectedDevices.has(device.id)

                  return (
                    <TableRow key={device.id}>
                      <TableCell className="p-2">
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => {
                            const newSet = new Set(manualSelectedDevices)
                            if (newSet.has(device.id)) {
                              newSet.delete(device.id)
                            } else {
                              newSet.add(device.id)
                            }
                            setManualSelectedDevices(newSet)
                          }}
                          aria-label={`Select ${device.name}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{device.name}</TableCell>
                      <TableCell className="hidden md:table-cell">{device.location || "-"}</TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {device.tags && device.tags.length > 0 ? (
                            device.tags.map((tag, i) => (
                              <Badge key={i} variant="secondary" className="text-xs py-0 px-1">
                                {tag}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-gray-400 text-xs">Nessun tag</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}