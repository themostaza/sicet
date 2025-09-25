"use client"

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, Check } from "lucide-react"
import { useReport } from "./context"
import { useState, useMemo } from "react"

export function KpiSelectionSheet() {
  const {
    kpis,
    selectedKpis,
    setSelectedKpis,
    isKpiSheetOpen,
    setIsKpiSheetOpen
  } = useReport()
  
  const [searchTerm, setSearchTerm] = useState("")
  
  const filteredKpis = useMemo(() => {
    if (!searchTerm.trim()) return kpis
    
    const search = searchTerm.toLowerCase()
    return kpis.filter(kpi => 
      kpi.name.toLowerCase().includes(search) ||
      kpi.id.toLowerCase().includes(search) ||
      (kpi.description && kpi.description.toLowerCase().includes(search))
    )
  }, [kpis, searchTerm])
  
  const handleToggleKpi = (kpiId: string) => {
    const newSelection = new Set(selectedKpis)
    if (newSelection.has(kpiId)) {
      newSelection.delete(kpiId)
    } else {
      newSelection.add(kpiId)
    }
    setSelectedKpis(newSelection)
  }
  
  const handleSelectAll = () => {
    const allIds = new Set(filteredKpis.map(k => k.id))
    setSelectedKpis(allIds)
  }
  
  const handleDeselectAll = () => {
    setSelectedKpis(new Set())
  }

  return (
    <Sheet open={isKpiSheetOpen} onOpenChange={setIsKpiSheetOpen}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Seleziona Controlli</SheetTitle>
        </SheetHeader>
        
        <div className="space-y-4 py-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Cerca controlli..."
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
              disabled={filteredKpis.length === 0}
            >
              Seleziona tutti ({filteredKpis.length})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeselectAll}
              disabled={selectedKpis.size === 0}
            >
              Deseleziona tutti
            </Button>
          </div>
          
          {/* Selection summary */}
          {selectedKpis.size > 0 && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <div className="text-sm text-blue-800">
                <Badge variant="secondary" className="mr-2">
                  {selectedKpis.size}
                </Badge>
                controlli selezionati
              </div>
            </div>
          )}
          
          {/* KPI list */}
          <div className="space-y-2">
            {filteredKpis.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {searchTerm ? "Nessun controllo trovato" : "Nessun controllo disponibile"}
              </div>
            ) : (
              filteredKpis.map((kpi) => {
                const isSelected = selectedKpis.has(kpi.id)
                return (
                  <div
                    key={kpi.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-all ${
                      isSelected
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                    onClick={() => handleToggleKpi(kpi.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium">{kpi.name}</div>
                        {kpi.description && (
                          <div className="text-sm text-gray-500 mt-1">
                            {kpi.description}
                          </div>
                        )}
                        <div className="text-xs text-gray-400 mt-1">
                          ID: {kpi.id}
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
