"use client"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import type { Kpi } from "@/app/actions/actions-kpi"
import { useState } from "react"

interface Props {
  kpi?: Kpi | null
  mode: "create" | "edit"
  action: (formData: FormData) => void
  disabled?: boolean
}

export default function KpiForm({ kpi, mode, action, disabled }: Props) {
  const [valueInput, setValueInput] = useState(
    kpi?.value ? JSON.stringify(kpi.value, null, 2) : ""
  )
  const [valueError, setValueError] = useState<string | null>(null)

  // Validazione JSON lato client (opzionale)
  const handleValueChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValueInput(e.target.value)
    try {
      JSON.parse(e.target.value)
      setValueError(null)
    } catch {
      setValueError("Valore non è un JSON valido")
    }
  }

  return (
    <form action={action} className="space-y-6" autoComplete="off">
      {mode === "edit" && (
        <div className="space-y-2">
          <label className="text-sm font-medium">ID</label>
          <Input name="id" defaultValue={kpi?.id} disabled className="bg-gray-50" autoComplete="off" />
        </div>
      )}
      <div className="space-y-2">
        <label className="text-sm font-medium">Nome</label>
        <Input name="name" defaultValue={kpi?.name} required autoComplete="off" />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Descrizione</label>
        <Textarea name="description" defaultValue={kpi?.description ?? ""} autoComplete="off" />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Valore (JSON)</label>
        <Textarea
          name="value"
          value={valueInput}
          onChange={handleValueChange}
          required
          autoComplete="off"
          className={valueError ? "border-red-500" : ""}
          placeholder='Esempio: {"foo": 123}'
        />
        {valueError && <div className="text-red-500 text-sm">{valueError}</div>}
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={disabled || !!valueError} className="bg-black hover:bg-gray-800">
          {mode === "create" ? "Crea" : "Salva"}
        </Button>
      </div>
    </form>
  )
}
