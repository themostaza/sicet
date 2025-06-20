"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/components/ui/use-toast"

export default function TestKpiAlertsPage() {
  const [kpiId, setKpiId] = useState("")
  const [todolistId, setTodolistId] = useState("")
  const [testValue, setTestValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  // Test values for different field types
  const testValues = {
    text: "testo breve",
    textarea: "testo lungo con più righe",
    number: 3,
    decimal: 2.5,
    boolean: true,
    image: "https://example.com/image.jpg"
  }

  const handleTestAlert = async (fieldType: string, value: any) => {
    if (!kpiId || !todolistId) {
      toast({
        title: "Errore",
        description: "Inserisci KPI ID e Todolist ID",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)
    try {
      // Create test value structure based on field type
      let testValueStructure: any
      
      if (fieldType === 'text' || fieldType === 'textarea') {
        testValueStructure = {
          id: `${kpiId}-${fieldType}`,
          value: value
        }
      } else if (fieldType === 'number' || fieldType === 'decimal') {
        testValueStructure = {
          id: `${kpiId}-${fieldType}`,
          value: value
        }
      } else if (fieldType === 'boolean') {
        testValueStructure = {
          id: `${kpiId}-${fieldType}`,
          value: value
        }
      } else {
        testValueStructure = value
      }

      const response = await fetch('/api/test-kpi-alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          kpiId,
          todolistId,
          value: testValueStructure
        }),
      })

      const result = await response.json()

      if (response.ok) {
        toast({
          title: "Test completato",
          description: `Alert test per ${fieldType} completato con successo`,
        })
        console.log('Test result:', result)
      } else {
        toast({
          title: "Errore nel test",
          description: result.error || "Errore sconosciuto",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Test error:', error)
      toast({
        title: "Errore nel test",
        description: "Errore durante l'esecuzione del test",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCustomTest = async () => {
    if (!kpiId || !todolistId || !testValue) {
      toast({
        title: "Errore",
        description: "Inserisci tutti i campi richiesti",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/test-kpi-alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          kpiId,
          todolistId,
          value: testValue
        }),
      })

      const result = await response.json()

      if (response.ok) {
        toast({
          title: "Test completato",
          description: "Test personalizzato completato con successo",
        })
        console.log('Custom test result:', result)
      } else {
        toast({
          title: "Errore nel test",
          description: result.error || "Errore sconosciuto",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Custom test error:', error)
      toast({
        title: "Errore nel test",
        description: "Errore durante l'esecuzione del test personalizzato",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Test KPI Alerts</h1>
        <p className="text-muted-foreground">
          Testa gli alert KPI per tutti i tipi di campo
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configurazione Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="kpiId">KPI ID</Label>
              <Input
                id="kpiId"
                value={kpiId}
                onChange={(e) => setKpiId(e.target.value)}
                placeholder="Inserisci KPI ID"
              />
            </div>
            <div>
              <Label htmlFor="todolistId">Todolist ID</Label>
              <Input
                id="todolistId"
                value={todolistId}
                onChange={(e) => setTodolistId(e.target.value)}
                placeholder="Inserisci Todolist ID"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Test per Tipo di Campo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Button
              onClick={() => handleTestAlert('text', testValues.text)}
              disabled={isLoading}
              variant="outline"
            >
              Test Text: "{testValues.text}"
            </Button>
            
            <Button
              onClick={() => handleTestAlert('textarea', testValues.textarea)}
              disabled={isLoading}
              variant="outline"
            >
              Test Textarea: "{testValues.textarea}"
            </Button>
            
            <Button
              onClick={() => handleTestAlert('number', testValues.number)}
              disabled={isLoading}
              variant="outline"
            >
              Test Number: {testValues.number}
            </Button>
            
            <Button
              onClick={() => handleTestAlert('decimal', testValues.decimal)}
              disabled={isLoading}
              variant="outline"
            >
              Test Decimal: {testValues.decimal}
            </Button>
            
            <Button
              onClick={() => handleTestAlert('boolean', testValues.boolean)}
              disabled={isLoading}
              variant="outline"
            >
              Test Boolean: {testValues.boolean ? 'Sì' : 'No'}
            </Button>
            
            <Button
              onClick={() => handleTestAlert('image', testValues.image)}
              disabled={isLoading}
              variant="outline"
            >
              Test Image: "{testValues.image}"
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Test Personalizzato</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="testValue">Valore di Test (JSON)</Label>
            <Textarea
              id="testValue"
              value={testValue}
              onChange={(e) => setTestValue(e.target.value)}
              placeholder='{"id": "field-id", "value": "test value"}'
              rows={4}
            />
          </div>
          <Button
            onClick={handleCustomTest}
            disabled={isLoading}
          >
            {isLoading ? "Testando..." : "Esegui Test Personalizzato"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Esempi di Valori di Test</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p><strong>Testo semplice:</strong> <code>"testo breve"</code></p>
            <p><strong>Testo lungo:</strong> <code>"testo lungo con più righe"</code></p>
            <p><strong>Numero:</strong> <code>3</code></p>
            <p><strong>Decimale:</strong> <code>2.5</code></p>
            <p><strong>Booleano:</strong> <code>true</code> o <code>false</code></p>
            <p><strong>Struttura complessa:</strong> <code>[{"{id: \"A\", value: \"testo\"}"}, {"{id: \"C\", value: 5}"}]</code></p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 