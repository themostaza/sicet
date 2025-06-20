"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function TestExportPage() {
  const [kpiId, setKpiId] = useState("")
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const handleTest = async () => {
    if (!kpiId.trim()) return

    setLoading(true)
    try {
      const response = await fetch("/api/test-export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ kpiId: kpiId.trim() }),
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error("Error testing export:", error)
      setResult({ error: "Failed to test export" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Test Export Debug</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Test Export Functionality</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="kpiId">KPI ID</Label>
            <Input
              id="kpiId"
              value={kpiId}
              onChange={(e) => setKpiId(e.target.value)}
              placeholder="Enter KPI ID to test"
            />
          </div>
          
          <Button onClick={handleTest} disabled={loading || !kpiId.trim()}>
            {loading ? "Testing..." : "Test Export"}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
              {JSON.stringify(result, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 