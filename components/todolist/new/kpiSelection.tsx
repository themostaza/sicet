"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { AlertCircle, Plus, Settings } from "lucide-react"
import { useTodolist } from "./context"

export function KpiSelection() {
  const { 
    selectedKpisArray, 
    selectedKpis, 
    isKpiSheetOpen, 
    setIsKpiSheetOpen,
    errors 
  } = useTodolist()

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center">
            Controlli
            {errors.kpis && (
              <div className="ml-2 text-red-500 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                <span className="text-xs font-normal">{errors.kpis}</span>
              </div>
            )}
          </CardTitle>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{selectedKpis.size} selezionati</span>
            <Button type="button" variant="outline" size="sm" className="flex items-center"
              onClick={() => setIsKpiSheetOpen(true)}>
              <Settings className="h-4 w-4 mr-2" />
              Seleziona
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {selectedKpisArray.length > 0 ? (
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead className="hidden md:table-cell">Descrizione</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedKpisArray.map((kpi) => (
                  <TableRow key={kpi.id}>
                    <TableCell className="font-medium">{kpi.id}</TableCell>
                    <TableCell>{kpi.nome}</TableCell>
                    <TableCell className="hidden md:table-cell">{kpi.descrizione || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center border rounded-md p-8 text-center">
            <Settings className="h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium mb-2">Nessun Controllo selezionato</h3>
            <p className="text-sm text-gray-500 mb-4">
              Clicca sul pulsante "Seleziona" per aggiungere Controlli alla todolist
            </p>
            <Button type="button" onClick={() => setIsKpiSheetOpen(true)} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Seleziona Controlli
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}