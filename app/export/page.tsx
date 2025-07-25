"use client"

import React from "react"
import { useState, useEffect, useCallback } from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { FileDown, Loader2, CalendarIcon } from "lucide-react"
import { format, subDays } from "date-fns"
import { cn } from "@/lib/utils"
import { exportTodolistData } from "@/app/actions/actions-export"
import { getDevices } from "@/app/actions/actions-device"
import { toast } from "@/components/ui/use-toast"
import { getKpisByDevice } from "@/app/actions/actions-export"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import ExportCsvTab from "@/components/ExportCsvTab"
import MatriceTodolist from "@/components/MatriceTodolist"

export default function ExportPage() {
  const [showMatriceDialog, setShowMatriceDialog] = useState(false)
  
  return (
    <div className="space-y-6">
      <ExportCsvTab />
    </div>
  )
}
