"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, AlertTriangle, CheckCircle, Clock } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { formatDateForDisplay } from "@/lib/utils"

export default function TodolistAlertsPage() {
  const { toast } = useToast()
  const [isProcessing, setIsProcessing] = useState(false)
  const [lastResult, setLastResult] = useState<{
    processed: number
    errors: number
    timestamp: string
  } | null>(null)

  const handleCheckOverdueTodolists = async () => {
    setIsProcessing(true)
    try {
      const response = await fetch('/api/cron/check-overdue-todolists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const result = await response.json()

      if (response.ok) {
        setLastResult({
          processed: result.processed,
          errors: result.errors,
          timestamp: new Date().toISOString()
        })
        
        toast({
          title: "Controllo completato",
          description: result.message,
        })
      } else {
        throw new Error(result.message || 'Errore durante il controllo')
      }
    } catch (error) {
      console.error('Error checking overdue todolists:', error)
      toast({
        title: "Errore",
        description: error instanceof Error ? error.message : "Errore durante il controllo",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gestione Alert Todolist</h1>
          <p className="text-muted-foreground">
            Controlla e gestisci le notifiche per le todolist scadute
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Control Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Controllo Todolist Scadute
            </CardTitle>
            <CardDescription>
              Esegui un controllo manuale per identificare e notificare le todolist scadute
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={handleCheckOverdueTodolists}
              disabled={isProcessing}
              className="w-full sm:w-auto"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Controllo in corso...
                </>
              ) : (
                <>
                  <Clock className="mr-2 h-4 w-4" />
                  Controlla Todolist Scadute
                </>
              )}
            </Button>

            {lastResult && (
              <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Ultimo controllo:</span>
                  <span className="text-sm text-muted-foreground">
                    {formatDateForDisplay(lastResult.timestamp)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-green-600">
                    {lastResult.processed} processate
                  </Badge>
                  {lastResult.errors > 0 && (
                    <Badge variant="destructive">
                      {lastResult.errors} errori
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Information */}
        <Card>
          <CardHeader>
            <CardTitle>Informazioni</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 text-sm">
              <div>
                <h4 className="font-medium mb-2">Come funziona:</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Il sistema controlla tutte le todolist con status "pending"</li>
                  <li>Verifica se sono scadute considerando la fascia oraria e la tolleranza</li>
                  <li>Invia email di notifica per le todolist con alert configurati</li>
                  <li>Registra tutti i tentativi di invio nel log</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Fasce orarie standard:</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li><strong>Mattina:</strong> 06:00-14:00 (scade alle 17:00)</li>
                  <li><strong>Pomeriggio:</strong> 14:00-22:00 (scade alle 01:00)</li>
                  <li><strong>Notte:</strong> 22:00-06:00 (scade alle 09:00)</li>
                  <li><strong>Giornata:</strong> 07:00-17:00 (scade alle 20:00)</li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium mb-2">Tolleranza:</h4>
                <p className="text-muted-foreground">
                  Ogni fascia oraria ha una tolleranza di 3 ore dopo la fine della fascia.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 