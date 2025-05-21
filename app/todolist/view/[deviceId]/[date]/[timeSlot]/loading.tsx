import { Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function TodolistLoading() {
  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle className="animate-pulse bg-gray-200 h-8 w-1/3 rounded-md" />
        <div className="animate-pulse bg-gray-200 h-4 w-2/3 rounded-md mt-2" />
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <h3 className="font-medium text-lg">Caricamento todolist e KPI in corso...</h3>
          <p className="text-muted-foreground mt-2 text-center max-w-md">
            Stiamo recuperando tutti i dati necessari per mostrare la tua todolist.
            Questo potrebbe richiedere qualche istante.
          </p>
        </div>
      </CardContent>
    </Card>
  )
} 