"use client"

import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { toggleAlertActive } from "@/app/actions/actions-alerts"
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

interface AlertActionsProps {
  alert: Alert
}

export function AlertActions({ alert }: AlertActionsProps) {
  const { toast } = useToast()
  const router = useRouter()

  const handleToggle = async (checked: boolean) => {
    try {
      await toggleAlertActive(alert.id, checked)
      toast({
        title: checked ? "Alert attivato" : "Alert disattivato",
        description: `L'alert "${alert.kpis?.name}" è stato ${checked ? "attivato" : "disattivato"}.`,
      })
      router.refresh()
    } catch (error) {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'aggiornamento dell'alert.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="flex items-center space-x-2">
      <Switch
        id={`alert-${alert.id}`}
        checked={alert.is_active}
        onCheckedChange={handleToggle}
      />
      <Label htmlFor={`alert-${alert.id}`} className="text-sm">
        {alert.is_active ? "Attivo" : "Disattivo"}
      </Label>
    </div>
  )
} 