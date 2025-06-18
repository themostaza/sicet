"use client"

import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { deleteAlert } from "@/app/actions/actions-alerts"
import { useRouter } from "next/navigation"
import { Database } from "@/supabase/database.types"
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog"
import React from "react"

type Alert = Database['public']['Tables']['kpi_alerts']['Row'] & {
  kpis: {
    name: string
    description: string | null
  } | null
  devices: {
    name: string
    location: string | null
  } | null
}

interface AlertDeleteProps {
  alert: any // Può essere KPI o Todolist alert
  onDelete: (id: string) => Promise<void>
  confirmMessage?: string
  description?: string
  disabled?: boolean
}

export function AlertDelete({ alert, onDelete, confirmMessage = 'Sei sicuro di voler eliminare questo alert?', description, disabled }: AlertDeleteProps) {
  const { toast } = useToast()
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [isPending, setIsPending] = React.useState(false)

  const handleDelete = async () => {
    setIsPending(true)
    try {
      await onDelete(alert.id)
      toast({
        title: "Alert eliminato",
        description: description || `L'alert è stato eliminato.`,
      })
      setOpen(false)
      router.refresh()
    } catch (error) {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'eliminazione dell'alert.",
        variant: "destructive",
      })
    } finally {
      setIsPending(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive/90"
          disabled={disabled}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{confirmMessage}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Annulla</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {isPending ? "Eliminazione..." : "Elimina"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
} 