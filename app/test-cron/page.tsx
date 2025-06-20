"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, Mail, AlertTriangle, CheckCircle, XCircle } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { formatDateForDisplay } from "@/lib/utils"

interface CronJobResult {
  success: boolean
  message: string
  result?: {
    processedCount: number
    sentEmails: number
    errors: number
    details: Array<{
      todolistId: string
      deviceName: string
      email: string
      status: "sent" | "error"
      errorMessage?: string
    }>
  }
  error?: string
}

export default function TestCronPage() {
  const [isRunning, setIsRunning] = useState(false)
  const [lastResult, setLastResult] = useState<CronJobResult | null>(null)
  const [lastRunTime, setLastRunTime] = useState<Date | null>(null)

  const runCronJob = async () => {
    setIsRunning(true)
    setLastResult(null)
    
    try {
      const response = await fetch("/api/test-cron", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const result: CronJobResult = await response.json()
      setLastResult(result)
      setLastRunTime(new Date())

      if (result.success) {
        toast({
          title: "Cron job completato",
          description: result.message,
        })
      } else {
        toast({
          title: "Errore nel cron job",
          description: result.error || "Errore sconosciuto",
          variant: "destructive",
        })
      }
    } catch (error) {
      const errorResult: CronJobResult = {
        success: false,
        message: "Errore di rete",
        error: error instanceof Error ? error.message : "Errore sconosciuto"
      }
      setLastResult(errorResult)
      setLastRunTime(new Date())
      
      toast({
        title: "Errore di rete",
        description: "Impossibile contattare il server",
        variant: "destructive",
      })
    } finally {
      setIsRunning(false)
    }
  }

  const getStatusIcon = (status: "sent" | "error") => {
    return status === "sent" ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Test Cron Job - Todolist Alerts</h1>
          <p className="text-muted-foreground mt-2">
            Simula l'esecuzione del cron job per gli alert delle todolist scadute
          </p>
        </div>
        <Button 
          onClick={runCronJob} 
          disabled={isRunning}
          size="lg"
        >
          {isRunning ? (
            <>
              <Clock className="mr-2 h-4 w-4 animate-spin" />
              Esecuzione in corso...
            </>
          ) : (
            <>
              <AlertTriangle className="mr-2 h-4 w-4" />
              Esegui Cron Job
            </>
          )}
        </Button>
      </div>

      {lastRunTime && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Ultima esecuzione
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {formatDateForDisplay(lastRunTime.toString())}
            </p>
          </CardContent>
        </Card>
      )}

      {lastResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {lastResult.success ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              Risultato Esecuzione
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant={lastResult.success ? "default" : "destructive"}>
                {lastResult.success ? "Successo" : "Errore"}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {lastResult.message}
              </span>
            </div>

            {lastResult.error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-700 font-medium">Errore:</p>
                <p className="text-sm text-red-600">{lastResult.error}</p>
              </div>
            )}

            {lastResult.result && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-blue-500" />
                      <span className="font-medium">Processate</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-700">
                      {lastResult.result.processedCount}
                    </p>
                  </div>
                  
                  <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-green-500" />
                      <span className="font-medium">Email Inviate</span>
                    </div>
                    <p className="text-2xl font-bold text-green-700">
                      {lastResult.result.sentEmails}
                    </p>
                  </div>
                  
                  <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-500" />
                      <span className="font-medium">Errori</span>
                    </div>
                    <p className="text-2xl font-bold text-red-700">
                      {lastResult.result.errors}
                    </p>
                  </div>
                </div>

                {lastResult.result.details.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-2">Dettagli:</h3>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {lastResult.result.details.map((detail, index) => (
                        <div 
                          key={index} 
                          className="flex items-center justify-between p-3 bg-gray-50 border rounded-md"
                        >
                          <div className="flex items-center gap-3">
                            {getStatusIcon(detail.status)}
                            <div>
                              <p className="text-sm font-medium">
                                {detail.deviceName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {detail.email}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant={detail.status === "sent" ? "default" : "destructive"}>
                              {detail.status === "sent" ? "Inviata" : "Errore"}
                            </Badge>
                            {detail.errorMessage && (
                              <p className="text-xs text-red-600 mt-1">
                                {detail.errorMessage}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Informazioni</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-medium mb-2">Cosa fa questo test:</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Cerca tutte le todolist scadute con alert abilitati</li>
              <li>• Calcola le scadenze precise al minuto per i timeslot custom</li>
              <li>• Invia email di notifica agli utenti registrati</li>
              <li>• Registra i log delle operazioni</li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-medium mb-2">Come usarlo:</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Crea alcune todolist con alert abilitati</li>
              <li>• Aspetta che scadano (o modifica le date nel database)</li>
              <li>• Clicca "Esegui Cron Job" per simulare l'invio degli alert</li>
              <li>• Controlla i risultati e i log</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 