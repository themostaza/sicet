"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AlertCircle, TestTube, CheckCircle, XCircle, Mail } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

export default function TestKpiAlertsPage() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  
  const [formData, setFormData] = useState({
    kpiId: "",
    deviceId: "",
    value: ""
  })

  const handleTest = async () => {
    if (!formData.kpiId || !formData.deviceId) {
      toast({
        title: "Errore",
        description: "Inserisci KPI ID e Device ID",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)
    setResult(null)

    try {
      // Parse the value as JSON if it looks like JSON, otherwise use as string
      let parsedValue
      try {
        parsedValue = JSON.parse(formData.value)
      } catch {
        parsedValue = formData.value
      }

      const response = await fetch('/api/test-kpi-alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          kpiId: formData.kpiId,
          deviceId: formData.deviceId,
          value: parsedValue
        }),
      })

      const data = await response.json()
      setResult(data)

      if (response.ok) {
        toast({
          title: "Test completato",
          description: "Controlla i log per i dettagli",
        })
      } else {
        toast({
          title: "Errore nel test",
          description: data.error || "Errore sconosciuto",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Test error:', error)
      toast({
        title: "Errore",
        description: "Errore durante il test",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleTestResend = async () => {
    if (!formData.deviceId) {
      toast({
        title: "Errore",
        description: "Inserisci almeno il Device ID per il test Resend",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/test-resend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'desalvadorfrancesco@gmail.com' // Email di test
        }),
      })

      const data = await response.json()
      setResult(data)

      if (response.ok) {
        toast({
          title: "Test Resend completato",
          description: "Controlla la tua email",
        })
      } else {
        toast({
          title: "Errore nel test Resend",
          description: data.error || "Errore sconosciuto",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Resend test error:', error)
      toast({
        title: "Errore",
        description: "Errore durante il test Resend",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <div className="flex items-center gap-2 mb-6">
        <TestTube className="h-6 w-6 text-blue-600" />
        <h1 className="text-2xl font-bold">Test Alert KPI</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Simula Completamento Todolist
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="kpiId">KPI ID</Label>
              <Input
                id="kpiId"
                value={formData.kpiId}
                onChange={(e) => setFormData(prev => ({ ...prev, kpiId: e.target.value }))}
                placeholder="ID del KPI da testare"
              />
            </div>

            <div>
              <Label htmlFor="deviceId">Device ID</Label>
              <Input
                id="deviceId"
                value={formData.deviceId}
                onChange={(e) => setFormData(prev => ({ ...prev, deviceId: e.target.value }))}
                placeholder="ID del dispositivo"
              />
            </div>

            <div>
              <Label htmlFor="value">Valore KPI (JSON o stringa)</Label>
              <Textarea
                id="value"
                value={formData.value}
                onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
                placeholder='Es: {"id": "field1", "value": 150} oppure "testo"'
                rows={4}
              />
            </div>

            <Button 
              onClick={handleTest} 
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Test in corso...
                </>
              ) : (
                <>
                  <TestTube className="h-4 w-4 mr-2" />
                  Esegui Test
                </>
              )}
            </Button>

            <Button 
              onClick={handleTestResend} 
              disabled={isLoading}
              variant="outline"
              className="w-full mt-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2" />
                  Test Resend...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Test Resend
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardHeader>
            <CardTitle>Risultati del Test</CardTitle>
          </CardHeader>
          <CardContent>
            {result ? (
              <div className="space-y-4">
                {result.success ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">Test completato con successo</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-red-600">
                    <XCircle className="h-5 w-5" />
                    <span className="font-medium">Test fallito</span>
                  </div>
                )}

                <div className="bg-gray-50 p-4 rounded-md">
                  <h4 className="font-medium mb-2">Dettagli:</h4>
                  <pre className="text-sm overflow-auto">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <TestTube className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Esegui un test per vedere i risultati</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Instructions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Istruzioni</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Come usare questo test:</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Inserisci l'ID del KPI che vuoi testare</li>
              <li>Inserisci l'ID del dispositivo</li>
              <li>Inserisci il valore che dovrebbe triggerare l'alert</li>
              <li>Clicca "Esegui Test"</li>
            </ol>
          </div>

          <div>
            <h4 className="font-medium mb-2">Formati valore supportati:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li><strong>Stringa semplice:</strong> <code>"testo"</code></li>
              <li><strong>Numero:</strong> <code>150</code></li>
              <li><strong>Oggetto singolo:</strong> <code>{"{id: \"field1\", value: 150}"}</code></li>
              <li><strong>Array di oggetti:</strong> <code>[{"{id: \"field1\", value: 150}"}, {"{id: \"field2\", value: \"testo\"}"}]</code></li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium mb-2">Cosa succede:</h4>
            <p className="text-sm">
              Il test simula il completamento di una todolist con il valore specificato. 
              Se ci sono alert configurati per quel KPI e dispositivo, verranno controllati 
              e le email verranno inviate se le condizioni sono soddisfatte.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 