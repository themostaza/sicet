"use client"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import type { Kpi } from "@/app/actions/actions-kpi"
import { useState, useEffect } from "react"
import { X, Plus, Trash2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"

interface Props {
  kpi?: Kpi | null
  mode: "create" | "edit"
  action: (formData: FormData) => void
  disabled?: boolean
}

// Tipi di campo disponibili
const tipiCampo = [
  { value: "text", label: "Testo breve" },
  { value: "textarea", label: "Testo lungo" },
  { value: "number", label: "Numero intero" },
  { value: "decimal", label: "Numero decimale" },
  { value: "date", label: "Data" },
  { value: "checkbox", label: "Checkbox" },
  { value: "select", label: "Selezione" },
]

// Interfaccia per un campo
interface Campo {
  id: string
  nome: string
  tipo: string
  descrizione: string
  obbligatorio: boolean
  min?: string | number
  max?: string | number
}

// Genera un ID univoco per i campi
const generateId = () => `campo_${Date.now()}_${Math.floor(Math.random() * 1000)}`

// Campo vuoto per inizializzare un nuovo campo
const emptyField = (): Campo => ({
  id: generateId(),
  nome: "",
  tipo: "text",
  descrizione: "",
  obbligatorio: false,
})

export default function KpiForm({ kpi, mode, action, disabled }: Props) {
  // Inizializza i campi da kpi.value se esiste, altrimenti array vuoto
  const [fields, setFields] = useState<Campo[]>(
    Array.isArray(kpi?.value)
      ? kpi.value.map((campo: any) => ({ ...campo, id: generateId() }))
      : [emptyField()]
  )
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // Gestisce il cambiamento di un campo
  const handleFieldChange = (id: string, field: keyof Campo, value: any) => {
    setFields((prevFields) => {
      const updatedFields = prevFields.map((campo) =>
        campo.id === id ? { ...campo, [field]: value } : campo
      )
      return updatedFields
    })
    // Rimuovi eventuali errori per questo campo
    if (fieldErrors[id]) {
      setFieldErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[id]
        return newErrors
      })
    }
  }

  // Rimuove un campo
  const handleRemoveField = (id: string) => {
    setFields((prevFields) => {
      if (prevFields.length === 1 && prevFields[0].nome === "") return prevFields
      const filteredFields = prevFields.filter((campo) => campo.id !== id)
      if (filteredFields.length === 0) return [emptyField()]
      const lastField = filteredFields[filteredFields.length - 1]
      if (lastField && lastField.nome.trim() !== "" && !filteredFields.some((campo) => campo.nome === "")) {
        return [...filteredFields, emptyField()]
      }
      return filteredFields
    })
    if (fieldErrors[id]) {
      setFieldErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[id]
        return newErrors
      })
    }
  }

  // Validazione dei campi prima dell'invio
  const validateFields = () => {
    const errors: Record<string, string> = {}
    const fieldNames = new Set<string>()
    const nonEmptyFields = fields.filter((campo) => campo.nome.trim() !== "")
    for (const campo of nonEmptyFields) {
      if (campo.nome.trim() === "") {
        errors[campo.id] = "Il nome del campo è obbligatorio"
      } else if (fieldNames.has(campo.nome)) {
        errors[campo.id] = "Esiste già un campo con questo nome"
      } else {
        fieldNames.add(campo.nome)
      }
      if ((campo.tipo === "number" || campo.tipo === "decimal") && campo.min && campo.max) {
        const min = Number.parseFloat(campo.min.toString())
        const max = Number.parseFloat(campo.max.toString())
        if (!isNaN(min) && !isNaN(max) && min >= max) {
          errors[campo.id] = "Il valore minimo deve essere inferiore al valore massimo"
        }
      }
    }
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Verifica se un campo è di tipo numerico
  const isNumericField = (tipo: string) => tipo === "number" || tipo === "decimal"

  // Serializza i campi in JSON per il submit (solo quelli con nome)
  const serializedFields = JSON.stringify(fields.filter((campo) => campo.nome.trim() !== "").map(({ id, ...rest }) => rest))

  // AGGIUNGI questa funzione per aggiungere un nuovo campo vuoto
  const handleAddField = () => {
    setFields((prevFields) => [...prevFields, emptyField()])
  }

  return (
    <form action={action} className="space-y-6" autoComplete="off" onSubmit={e => {
      if (!validateFields()) {
        e.preventDefault()
      }
    }}>
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
        <label className="text-sm font-medium">Campi del KPI</label>
        <div className="space-y-4">
          {fields.map((campo, index) => (
            <div
              key={campo.id}
              className={`p-4 border ${
                fieldErrors[campo.id]
                  ? "border-red-500 bg-red-50"
                  : "bg-gray-50 border-gray-200"
              } rounded-md`}
            >
              {fieldErrors[campo.id] && <div className="text-red-500 text-sm mb-2">{fieldErrors[campo.id]}</div>}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Nome Campo {index === 0 && <span className="text-red-500">*</span>}
                  </label>
                  <Input
                    placeholder="Inserisci nome campo"
                    value={campo.nome}
                    onChange={e => handleFieldChange(campo.id, "nome", e.target.value)}
                    className={fieldErrors[campo.id] ? "border-red-500" : ""}
                    disabled={disabled}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Tipo</label>
                  <Select
                    value={campo.tipo}
                    onValueChange={value => handleFieldChange(campo.id, "tipo", value)}
                    disabled={disabled}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {tipiCampo.map((tipo) => (
                        <SelectItem key={`${campo.id}-${tipo.value}`} value={tipo.value}>
                          {tipo.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {isNumericField(campo.tipo) && (
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Valore minimo</label>
                    <Input
                      type="number"
                      placeholder="Valore minimo"
                      value={campo.min || ""}
                      onChange={e => handleFieldChange(campo.id, "min", e.target.value)}
                      step={campo.tipo === "decimal" ? "0.01" : "1"}
                      disabled={disabled}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Valore massimo</label>
                    <Input
                      type="number"
                      placeholder="Valore massimo"
                      value={campo.max || ""}
                      onChange={e => handleFieldChange(campo.id, "max", e.target.value)}
                      step={campo.tipo === "decimal" ? "0.01" : "1"}
                      disabled={disabled}
                    />
                  </div>
                </div>
              )}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Descrizione</label>
                <Textarea
                  placeholder="Inserisci una descrizione per questo campo"
                  value={campo.descrizione}
                  onChange={e => handleFieldChange(campo.id, "descrizione", e.target.value)}
                  disabled={disabled}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={campo.obbligatorio}
                    onCheckedChange={checked => handleFieldChange(campo.id, "obbligatorio", checked === true)}
                    disabled={disabled}
                  />
                  <label className="text-sm font-medium leading-none">Campo obbligatorio</label>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveField(campo.id)}
                  className="text-red-500 h-8 p-0"
                  disabled={disabled}
                >
                  <Trash2 className="h-4 w-4 mr-1" /> Rimuovi
                </Button>
              </div>
            </div>
          ))}
        </div>
        {/* Pulsante per aggiungere un nuovo campo */}
        <Button
          type="button"
          variant="outline"
          onClick={handleAddField}
          className="mt-2"
          disabled={disabled}
        >
          <Plus className="h-4 w-4 mr-2" /> Aggiungi campo
        </Button>
        {/* Campo hidden per serializzare i campi */}
        <input type="hidden" name="value" value={serializedFields} />
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={disabled || !!Object.keys(fieldErrors).length} className="bg-black hover:bg-gray-800">
          {mode === "create" ? "Crea" : "Salva"}
        </Button>
      </div>
    </form>
  )
}
