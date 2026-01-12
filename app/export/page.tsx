"use client"

import React from "react"
import { useState } from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileDown, Loader2, Database, Layers, FileText, ClipboardList, Activity, Users, FileSpreadsheet, Bell, BellRing, AlertTriangle, Mail, CheckSquare, List } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

export default function ExportPage() {
  const [isExporting, setIsExporting] = useState<Record<string, boolean>>({})
  
  // Funzione helper per gestire l'export
  const handleExport = async (endpoint: string, filename: string) => {
    if (isExporting[endpoint]) return
    
    setIsExporting(prev => ({ ...prev, [endpoint]: true }))
    
    try {
      const response = await fetch(`/api/export/${endpoint}`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const blob = await response.blob()
      
      // Download the file
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      toast({
        title: "Esportazione completata",
        description: `Il file ${filename} è stato scaricato con successo`
      })
    } catch (error) {
      console.error(`Errore durante l'esportazione di ${endpoint}:`, error)
      toast({
        title: "Errore",
        description: `Si è verificato un problema durante l'esportazione di ${filename}`,
        variant: "destructive"
      })
    } finally {
      setIsExporting(prev => ({ ...prev, [endpoint]: false }))
    }
  }
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Esportazione Dati
          </CardTitle>
          <CardDescription>
            Esporta tutte le tabelle del sistema in formato CSV. I dati vengono esportati con paginazione automatica per gestire grandi quantità di record. Sono disponibili 12 tabelle complete.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Export Punti di Controllo */}
            <Card className="border-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  Punti di Controllo
                </CardTitle>
                <CardDescription className="text-sm">
                  Esporta tutti i punti di controllo con informazioni complete
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button 
                  onClick={() => handleExport('devices', 'punti_di_controllo.csv')}
                  disabled={isExporting.devices}
                  className="w-full"
                >
                  {isExporting.devices ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Esportazione...
                    </>
                  ) : (
                    <>
                      <FileDown className="mr-2 h-4 w-4" />
                      Esporta Punti di Controllo
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Export Controlli */}
            <Card className="border-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Controlli
                </CardTitle>
                <CardDescription className="text-sm">
                  Esporta tutti i controlli con struttura valori
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button 
                  onClick={() => handleExport('kpis', 'controlli.csv')}
                  disabled={isExporting.kpis}
                  className="w-full"
                >
                  {isExporting.kpis ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Esportazione...
                    </>
                  ) : (
                    <>
                      <FileDown className="mr-2 h-4 w-4" />
                      Esporta Controlli
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Export Todolist Completa */}
            <Card className="border-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ClipboardList className="h-4 w-4" />
                  Todolist Completa
                </CardTitle>
                <CardDescription className="text-sm">
                  Esporta todolist complete con task e dati utenti
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button 
                  onClick={() => handleExport('todolist-complete', 'todolist_completa.csv')}
                  disabled={isExporting['todolist-complete']}
                  className="w-full"
                >
                  {isExporting['todolist-complete'] ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Esportazione...
                    </>
                  ) : (
                    <>
                      <FileDown className="mr-2 h-4 w-4" />
                      Esporta Todolist
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Export Todolist */}
            <Card className="border-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <List className="h-4 w-4" />
                  Todolist
                </CardTitle>
                <CardDescription className="text-sm">
                  Esporta solo le todolist (senza i task associati)
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button 
                  onClick={() => handleExport('todolists', 'todolists.csv')}
                  disabled={isExporting.todolists}
                  className="w-full"
                >
                  {isExporting.todolists ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Esportazione...
                    </>
                  ) : (
                    <>
                      <FileDown className="mr-2 h-4 w-4" />
                      Esporta Todolist
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Export Task */}
            <Card className="border-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckSquare className="h-4 w-4" />
                  Task
                </CardTitle>
                <CardDescription className="text-sm">
                  Esporta solo i task (senza dati todolist)
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button 
                  onClick={() => handleExport('tasks', 'tasks.csv')}
                  disabled={isExporting.tasks}
                  className="w-full"
                >
                  {isExporting.tasks ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Esportazione...
                    </>
                  ) : (
                    <>
                      <FileDown className="mr-2 h-4 w-4" />
                      Esporta Task
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Export Attività Utenti */}
            <Card className="border-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Attività Utenti
                </CardTitle>
                <CardDescription className="text-sm">
                  Esporta log completo delle attività degli utenti
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button 
                  onClick={() => handleExport('user-activities', 'attivita_utenti.csv')}
                  disabled={isExporting['user-activities']}
                  className="w-full"
                >
                  {isExporting['user-activities'] ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Esportazione...
                    </>
                  ) : (
                    <>
                      <FileDown className="mr-2 h-4 w-4" />
                      Esporta Attività
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Export Profili Utenti */}
            <Card className="border-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Profili Utenti
                </CardTitle>
                <CardDescription className="text-sm">
                  Esporta tutti i profili utenti con ruoli e stato
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button 
                  onClick={() => handleExport('profiles', 'profili_utenti.csv')}
                  disabled={isExporting.profiles}
                  className="w-full"
                >
                  {isExporting.profiles ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Esportazione...
                    </>
                  ) : (
                    <>
                      <FileDown className="mr-2 h-4 w-4" />
                      Esporta Profili
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Export Template */}
            <Card className="border-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  Template
                </CardTitle>
                <CardDescription className="text-sm">
                  Esporta configurazioni template esportazione
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button 
                  onClick={() => handleExport('export-templates', 'template_export.csv')}
                  disabled={isExporting['export-templates']}
                  className="w-full"
                >
                  {isExporting['export-templates'] ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Esportazione...
                    </>
                  ) : (
                    <>
                      <FileDown className="mr-2 h-4 w-4" />
                      Esporta Template
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Export Report */}
            <Card className="border-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  Report
                </CardTitle>
                <CardDescription className="text-sm">
                  Esporta configurazioni report Excel
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button 
                  onClick={() => handleExport('report-to-excel', 'report_to_excel.csv')}
                  disabled={isExporting['report-to-excel']}
                  className="w-full"
                >
                  {isExporting['report-to-excel'] ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Esportazione...
                    </>
                  ) : (
                    <>
                      <FileDown className="mr-2 h-4 w-4" />
                      Esporta Report
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Export Alert Controlli */}
            <Card className="border-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  Alert Controlli
                </CardTitle>
                <CardDescription className="text-sm">
                  Esporta configurazioni alert per i controlli
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button 
                  onClick={() => handleExport('kpi-alerts', 'kpi_alerts.csv')}
                  disabled={isExporting['kpi-alerts']}
                  className="w-full"
                >
                  {isExporting['kpi-alerts'] ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Esportazione...
                    </>
                  ) : (
                    <>
                      <FileDown className="mr-2 h-4 w-4" />
                      Esporta Alert Controlli
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Export Log Alert Controlli */}
            <Card className="border-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Log Alert Controlli
                </CardTitle>
                <CardDescription className="text-sm">
                  Esporta storico attivazioni alert controlli
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button 
                  onClick={() => handleExport('kpi-alert-logs', 'kpi_alert_logs.csv')}
                  disabled={isExporting['kpi-alert-logs']}
                  className="w-full"
                >
                  {isExporting['kpi-alert-logs'] ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Esportazione...
                    </>
                  ) : (
                    <>
                      <FileDown className="mr-2 h-4 w-4" />
                      Esporta Log Alert Controlli
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Export Alert Todolist */}
            <Card className="border-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BellRing className="h-4 w-4" />
                  Alert Todolist
                </CardTitle>
                <CardDescription className="text-sm">
                  Esporta configurazioni alert per le todolist
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button 
                  onClick={() => handleExport('todolist-alerts', 'todolist_alerts.csv')}
                  disabled={isExporting['todolist-alerts']}
                  className="w-full"
                >
                  {isExporting['todolist-alerts'] ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Esportazione...
                    </>
                  ) : (
                    <>
                      <FileDown className="mr-2 h-4 w-4" />
                      Esporta Alert Todolist
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Export Log Alert Todolist */}
            <Card className="border-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Log Alert Todolist
                </CardTitle>
                <CardDescription className="text-sm">
                  Esporta storico invii email alert todolist
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button 
                  onClick={() => handleExport('todolist-alert-logs', 'todolist_alert_logs.csv')}
                  disabled={isExporting['todolist-alert-logs']}
                  className="w-full"
                >
                  {isExporting['todolist-alert-logs'] ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Esportazione...
                    </>
                  ) : (
                    <>
                      <FileDown className="mr-2 h-4 w-4" />
                      Esporta Log Alert Todolist
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

          </div>
        </CardContent>
      </Card>
    </div>
  )
}
