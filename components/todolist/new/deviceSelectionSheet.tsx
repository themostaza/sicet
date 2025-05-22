"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
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
    manualSelectedDevices,
    setManualSelectedDevices,
    allRowsSelected,
    someRowsSelected,
    handleToggleAllDevices
  } = useTodolist()

  return (
    <Sheet open={isDeviceSheetOpen} onOpenChange={setIsDeviceSheetOpen}>
      <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle>Seleziona Punti di controllo</SheetTitle>
          <SheetDescription>
            Seleziona i Punti di controllo per la tua todolist
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4">
          {/* Tag Chips */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Tags</label>
              {selectedTags.size > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 px-2 text-xs"
                  onClick={clearAllTags}
                >
                  Cancella tutti
                </Button>
              )}
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

          {/* Device Table */}
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allRowsSelected}
                      onCheckedChange={handleToggleAllDevices}
                      aria-label="Select all Punti di controllo"
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
                          aria-label={`Select ${device.nome}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{device.nome}</TableCell>
                      <TableCell className="hidden md:table-cell">{device.posizione || "-"}</TableCell>
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