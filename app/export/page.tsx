"use client"

import React from "react"
import { useState } from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileDown, Loader2, Database, Layers, FileText, ClipboardList, Activity } from "lucide-react"
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
            Export Database
          </CardTitle>
          <CardDescription>
            Esporta le tabelle del database in formato CSV. I dati vengono esportati con paginazione automatica per gestire grandi quantità di record.
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
                  Esporta tutti i dispositivi (devices) con informazioni complete
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
                      Esporta Devices
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
                  Esporta tutti i KPI (controlli) con struttura valori
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
                      Esporta KPIs
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
                  Esporta todolist + tasks + profili utenti con dati completi
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

          </div>
        </CardContent>
      </Card>
    </div>
  )
}
