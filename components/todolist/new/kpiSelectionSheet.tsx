"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
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
import { Search, X } from "lucide-react"
import { useTodolist } from "./context"
import { KPI } from "./types"

export function KpiSelectionSheet() {
  const {
    isKpiSheetOpen,
    setIsKpiSheetOpen,
    kpiSearchTerm,
    setKpiSearchTerm,
    filteredKpis,
    selectedKpis,
    setSelectedKpis,
    allKpiSelected,
    someKpiSelected,
    handleToggleAllKpis,
  } = useTodolist()

  const handleReset = () => {
    setSelectedKpis(new Set())
    setKpiSearchTerm("")
  }

  return (
    <Sheet open={isKpiSheetOpen} onOpenChange={setIsKpiSheetOpen}>
      <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader className="mb-4">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle>Seleziona Controlli</SheetTitle>
              <SheetDescription>
                Seleziona i Controlli da misurare per questi Punti di controllo
              </SheetDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleReset}
              className="h-8"
              disabled={selectedKpis.size === 0}
            >
              <X className="h-4 w-4 mr-1" /> Reset
            </Button>
          </div>
        </SheetHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              type="search"
              placeholder="Cerca Controlli..."
              className="pl-8"
              value={kpiSearchTerm}
              onChange={(e) => setKpiSearchTerm(e.target.value)}
            />
          </div>

          {/* KPI Table */}
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allKpiSelected}
                      onCheckedChange={handleToggleAllKpis}
                      aria-label="Select all Controlli"
                    />
                  </TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead className="hidden md:table-cell">ID</TableHead>
                  <TableHead className="hidden lg:table-cell">Descrizione</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredKpis.map((kpi) => {
                  const isChecked = selectedKpis.has(kpi.id)

                  return (
                    <TableRow key={kpi.id}>
                      <TableCell className="p-2">
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => {
                            const newSet = new Set(selectedKpis)
                            if (newSet.has(kpi.id)) {
                              newSet.delete(kpi.id)
                            } else {
                              newSet.add(kpi.id)
                            }
                            setSelectedKpis(newSet)
                          }}
                          aria-label={`Select ${kpi.name}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{kpi.name}</TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-gray-500">
                        {kpi.id}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {kpi.description || "-"}
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

export function KpiSelectionSheetContent({ onSelectKpi }: { onSelectKpi: (kpiId: string) => void }) {
  const { kpis, selectedKpis, kpiSearchTerm, setKpiSearchTerm } = useTodolist()

  const filteredKpis = kpis.filter(kpi =>
    kpi.name.toLowerCase().includes(kpiSearchTerm.toLowerCase()) ||
    kpi.description?.toLowerCase().includes(kpiSearchTerm.toLowerCase())
  )

  return (
    <div className="py-4">
      <Input
        placeholder="Cerca controlli..."
        value={kpiSearchTerm}
        onChange={(e) => setKpiSearchTerm(e.target.value)}
        className="mb-4"
      />
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">Sel.</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Descrizione</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredKpis.map((kpi) => (
              <TableRow key={kpi.id}>
                <TableCell>
                  <Checkbox
                    checked={selectedKpis.has(kpi.id)}
                    onCheckedChange={() => onSelectKpi(kpi.id)}
                  />
                </TableCell>
                <TableCell>{kpi.name}</TableCell>
                <TableCell>{kpi.description}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}