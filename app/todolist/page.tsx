import { getTodolistsGroupedWithFilters } from "@/app/actions/actions-todolist"
import TodolistListClient from "@/components/todolists/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"

type TimeSlot = "mattina" | "pomeriggio" | "sera" | "notte";

const timeSlotOrder: Record<TimeSlot, number> = {
  mattina: 1,
  pomeriggio: 2,
  sera: 3,
  notte: 4,
};

export default async function TodolistPage() {
  try {
    const { filtered, counts } = await getTodolistsGroupedWithFilters();

    return (
      <TodolistListClient
        todolistsByFilter={filtered}
        counts={counts}
        initialFilter="all"
      />
    )
  } catch (error) {
    console.error("Error in TodolistPage:", error);
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            Errore nel caricamento delle todolist
          </CardTitle>
          <CardDescription>
            {error instanceof Error ? error.message : "Si è verificato un errore inatteso. Riprova più tardi."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Se il problema persiste, contatta l&apos;amministratore del sistema.
          </p>
        </CardContent>
      </Card>
    )
  }
}
