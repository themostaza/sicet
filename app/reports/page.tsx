"use client"

import React, { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Calendar as CalendarIcon, Download, Loader2, Plus, Settings, Trash2, Edit } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { toast } from "@/components/ui/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface Report {
  id: string
  name: string
  description?: string
  todolist_params_linked: any
  mapping_excel: any
  created_at: string
  hasDataAvailable?: boolean
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [reportToDelete, setReportToDelete] = useState<Report | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  
  // Data per export
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const d = new Date()
    d.setDate(d.getDate() - 1) // giorno precedente
    return d
  })
  const [endDate, setEndDate] = useState<Date | null>(null)
  const [showCalendar, setShowCalendar] = useState(false)
  const [showEndCalendar, setShowEndCalendar] = useState(false)
  const [exportingReports, setExportingReports] = useState<Set<string>>(new Set())

  const loadReports = async () => {
    setIsLoading(true)
    try {
      const dateParam = format(selectedDate, 'yyyy-MM-dd')
      const endDateParam = endDate ? format(endDate, 'yyyy-MM-dd') : null
      const url = endDateParam 
        ? `/api/reports?date=${dateParam}&endDate=${endDateParam}`
        : `/api/reports?date=${dateParam}`
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error('Failed to fetch reports')
      }
      const data = await response.json()
      setReports(data.reports || [])
    } catch (error) {
      console.error('Error loading reports:', error)
      toast({
        title: "Errore",
        description: "Impossibile caricare i report. Riprova più tardi.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadReports()
  }, [selectedDate, endDate])

  const handleCreateReport = () => {
    // Redirect to the new report creation page
    window.location.href = '/reports/new'
  }

  const handleEditReport = (report: Report) => {
    // Redirect to the edit page with same UI as new
    window.location.href = `/reports/${report.id}/edit`
  }

  const handleDeleteReport = (report: Report) => {
    setReportToDelete(report)
    setDeleteDialogOpen(true)
  }

  const confirmDeleteReport = async () => {
    if (!reportToDelete) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/reports/${reportToDelete.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete report')
      }

      toast({
        title: "Report eliminato",
        description: `Il report "${reportToDelete.name}" è stato eliminato con successo.`,
      })

      await loadReports()
    } catch (error) {
      console.error("Error deleting report:", error)
      toast({
        title: "Errore",
        description: error instanceof Error ? error.message : "Impossibile eliminare il report. Riprova più tardi.",
        variant: "destructive"
      })
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
      setReportToDelete(null)
    }
  }

  const handleExportReport = async (report: Report) => {
    const reportId = report.id
    setExportingReports(prev => new Set(prev).add(reportId))
    
    try {
      const startDateStr = format(selectedDate, 'yyyy-MM-dd')
      const endDateStr = endDate ? format(endDate, 'yyyy-MM-dd') : null
      
      const response = await fetch(`/api/reports/${reportId}/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: startDateStr,
          endDate: endDateStr,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to export report')
      }

      // Download del file
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      const filename = endDateStr 
        ? `${report.name}_${format(selectedDate, 'dd-MM-yyyy')}_${format(endDate, 'dd-MM-yyyy')}.xlsx`
        : `${report.name}_${format(selectedDate, 'dd-MM-yyyy')}.xlsx`
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: "Export completato",
        description: `Il report "${report.name}" è stato esportato con successo.`,
      })
    } catch (error) {
      console.error("Error exporting report:", error)
      toast({
        title: "Errore Export",
        description: error instanceof Error ? error.message : "Impossibile esportare il report. Riprova più tardi.",
        variant: "destructive"
      })
    } finally {
      setExportingReports(prev => {
        const newSet = new Set(prev)
        newSet.delete(reportId)
        return newSet
      })
    }
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return format(date, "dd/MM/yyyy HH:mm")
  }

  return (
    <>
      <style jsx>{`
        .reports-table-container::-webkit-scrollbar {
          height: 12px;
          width: 12px;
        }
        
        .reports-table-container::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 6px;
        }
        
        .reports-table-container::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 6px;
          border: 2px solid #f1f5f9;
        }
        
        .reports-table-container::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        
        .reports-table-container::-webkit-scrollbar-corner {
          background: #f1f5f9;
        }
        
        /* Per Firefox */
        .reports-table-container {
          scrollbar-width: thin;
          scrollbar-color: #cbd5e1 #f1f5f9;
        }
      `}</style>
      <div className="w-full">
        <div className="flex gap-2 mb-4 items-center flex-wrap">
          {/* Filtro data per export */}
          <div className="flex gap-2 items-center">
            <Popover open={showCalendar} onOpenChange={setShowCalendar}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("w-fit min-w-[120px] justify-start text-left font-normal max-w-[180px]")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(selectedDate, "dd/MM/yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(d) => { 
                    if (d) {
                      setSelectedDate(d)
                      // Se endDate è prima della nuova startDate, resettala
                      if (endDate && d > endDate) {
                        setEndDate(null)
                      }
                    }
                    setShowCalendar(false) 
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <span className="text-sm text-gray-500">-</span>

            <Popover open={showEndCalendar} onOpenChange={setShowEndCalendar}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("w-fit min-w-[120px] justify-start text-left font-normal max-w-[180px]")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, "dd/MM/yyyy") : "Data fine (opzionale)"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={endDate || undefined}
                  onSelect={(d) => { 
                    if (d) {
                      // Verifica che endDate non sia prima di startDate
                      if (d >= selectedDate) {
                        setEndDate(d)
                      } else {
                        toast({
                          title: "Errore",
                          description: "La data fine deve essere successiva o uguale alla data inizio.",
                          variant: "destructive"
                        })
                      }
                    } else {
                      setEndDate(null)
                    }
                    setShowEndCalendar(false) 
                  }}
                  disabled={(date) => date < selectedDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            {endDate && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setEndDate(null)}
                className="h-8 px-2"
                title="Rimuovi data fine"
              >
                ×
              </Button>
            )}
          </div>

          <Button variant="outline" size="sm" onClick={loadReports} disabled={isLoading} className="gap-2">
            {isLoading ? (<><Loader2 className="h-4 w-4 animate-spin" /> Caricamento...</>) : ("Ricarica")}
          </Button>

          <Button variant="outline" size="sm" onClick={handleCreateReport} className="gap-2 ml-auto">
            <Plus className="h-4 w-4" /> Nuovo Report
          </Button>
        </div>

        {/* Legenda */}
        <div className="flex items-center gap-6 mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-sm text-gray-700">
              Dati disponibili {endDate 
                ? `dal ${format(selectedDate, 'dd/MM/yyyy')} al ${format(endDate, 'dd/MM/yyyy')}`
                : `per il ${format(selectedDate, 'dd/MM/yyyy')}`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-400"></div>
            <span className="text-sm text-gray-700">
              Nessun dato disponibile {endDate 
                ? `dal ${format(selectedDate, 'dd/MM/yyyy')} al ${format(endDate, 'dd/MM/yyyy')}`
                : `per il ${format(selectedDate, 'dd/MM/yyyy')}`}
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Caricamento report...</span>
          </div>
        ) : reports.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-gray-500">
            <div className="text-center">
              <p className="mb-4">Nessun report trovato</p>
              <Button onClick={handleCreateReport} className="gap-2">
                <Plus className="h-4 w-4" /> Crea il primo report
              </Button>
            </div>
          </div>
        ) : (
          <div 
            className="overflow-x-auto overflow-y-auto border rounded-md reports-table-container"
            style={{ 
              scrollbarWidth: "thin",
              scrollbarColor: "rgb(156 163 175) transparent"
            }}
          >
            <Table className="w-auto border-separate border-spacing-0" style={{ minWidth: "600px" }}>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[250px] border-r border-b">Nome Report</TableHead>
                  <TableHead className="min-w-[150px] border-r border-b">Creato il</TableHead>
                  <TableHead className="min-w-[200px] border-b">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => (
                  <TableRow 
                    key={report.id}
                    className={report.hasDataAvailable ? "bg-green-50 hover:bg-green-100" : "bg-gray-50 hover:bg-gray-100"}
                  >
                    <TableCell className="border-r border-b font-medium">
                      <div className="flex items-center gap-2">
                        <div 
                          className={`w-3 h-3 rounded-full ${
                            report.hasDataAvailable ? 'bg-green-500' : 'bg-gray-400'
                          }`} 
                        />
                        {report.name}
                      </div>
                    </TableCell>
                    <TableCell className="border-r border-b">
                      {formatDate(report.created_at)}
                    </TableCell>
                    <TableCell className="border-b">
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleExportReport(report)}
                          disabled={exportingReports.has(report.id) || !report.hasDataAvailable}
                          className={`h-8 px-2 ${
                            !report.hasDataAvailable 
                              ? 'opacity-50 cursor-not-allowed' 
                              : ''
                          }`}
                          title={
                            !report.hasDataAvailable 
                              ? `Nessun dato disponibile ${endDate 
                                  ? `dal ${format(selectedDate, 'dd/MM/yyyy')} al ${format(endDate, 'dd/MM/yyyy')}`
                                  : `per il ${format(selectedDate, 'dd/MM/yyyy')}`}`
                              : 'Scarica report'
                          }
                        >
                          {exportingReports.has(report.id) ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className={`h-4 w-4 ${!report.hasDataAvailable ? 'text-gray-400' : ''}`} />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditReport(report)}
                          className="h-8 px-2"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteReport(report)}
                          disabled={isDeleting}
                          className="h-8 px-2"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        
        {/* Dialog conferma eliminazione */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Conferma eliminazione report</AlertDialogTitle>
              <AlertDialogDescription>
                {reportToDelete && (
                  <>
                    Sei sicuro di voler eliminare il report <strong>"{reportToDelete.name}"</strong>?
                    <br />
                    <span className="text-red-600 font-medium">Questa azione non può essere annullata.</span>
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Annulla</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteReport}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Eliminazione...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Elimina report
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  )
}
