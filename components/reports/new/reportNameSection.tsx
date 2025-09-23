"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, FileText } from "lucide-react"
import { useReport } from "./context"

export function ReportNameSection() {
  const { 
    reportName,
    setReportName,
    errors 
  } = useReport()

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center">
          <FileText className="h-5 w-5 mr-2" />
          Nome Report
          {errors.name && (
            <div className="ml-2 text-red-500 flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              <span className="text-xs font-normal">{errors.name}</span>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Label htmlFor="report-name">Nome del report *</Label>
          <Input
            id="report-name"
            type="text"
            placeholder="Inserisci il nome del report"
            value={reportName}
            onChange={(e) => setReportName(e.target.value)}
            className={errors.name ? "border-red-500" : ""}
          />
        </div>
      </CardContent>
    </Card>
  )
}
