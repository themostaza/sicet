"use client"

import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { deleteAlert } from "@/app/actions/actions-alerts"
import { useRouter } from "next/navigation"
import { Database } from "@/supabase/database.types"

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
  alert: Alert
}

export function AlertDelete({ alert }: AlertDeleteProps) {
  const { toast } = useToast()
  const router = useRouter()

  const handleDelete = async () => {
    if (!confirm('Sei sicuro di voler eliminare questo alert?')) {
      return
    }

    try {
      await deleteAlert(alert.id)
      toast({
        title: "Alert eliminato",
        description: `L'alert "${alert.kpis?.name}" è stato eliminato.`,
      })
      router.refresh()
    } catch (error) {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'eliminazione dell'alert.",
        variant: "destructive",
      })
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="text-destructive hover:text-destructive/90"
      onClick={handleDelete}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  )
} 