"use client"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import type { Kpi } from "@/app/actions/actions-kpi"
import { useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Props {
  kpi?: Kpi | null
  mode: "create" | "edit"
  action: (formData: FormData) => void
  disabled?: boolean
}

const fieldTypes = [
  { value: "text", label: "Testo breve" },
  { value: "textarea", label: "Testo lungo" },
  { value: "number", label: "Numero intero" },
  { value: "decimal", label: "Numero decimale" },
  { value: "date", label: "Data" },
  { value: "boolean", label: "Sì/No" },
  { value: "select", label: "Selezione" },
]

// Interface for a field
interface Field {
  id: string
  name: string
  type: string
  description: string
  required: boolean
  min?: string | number
  max?: string | number
}

// Generate a unique ID for fields
const generateId = () => `field_${Date.now()}_${Math.floor(Math.random() * 1000)}`

// Empty field template
const emptyField = (): Field => ({
  id: generateId(),
  name: "",
  type: "text",
  description: "",
  required: false,
})

export default function KpiForm({ kpi, mode, action, disabled }: Props) {
  // Initialize fields from kpi.value if exists, otherwise with an empty array
  const [fields, setFields] = useState<Field[]>(
    Array.isArray(kpi?.value)
      ? kpi.value.map((field: any) => ({
          id: generateId(),
          name: field.name ?? "",
          type: field.type ?? "text",
          description: field.description ?? "",
          required: field.required ?? false,
          min: field.min,
          max: field.max,
        }))
      : [emptyField()]
  )
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // Handle field change
  const handleFieldChange = (id: string, field: keyof Field, value: any) => {
    setFields((prevFields) => {
      const updatedFields = prevFields.map((f) =>
        f.id === id ? { ...f, [field]: value } : f
      )
      return updatedFields
    })
    // Remove any errors for this field
    if (fieldErrors[id]) {
      setFieldErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[id]
        return newErrors
      })
    }
  }

  // Remove a field
  const handleRemoveField = (id: string) => {
    setFields((prevFields) => {
      if (prevFields.length === 1 && prevFields[0].name === "") return prevFields
      const filteredFields = prevFields.filter((f) => f.id !== id)
      if (filteredFields.length === 0) return [emptyField()]
      const lastField = filteredFields[filteredFields.length - 1]
      if (lastField && lastField.name.trim() !== "" && !filteredFields.some((f) => f.name === "")) {
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

  // Validate fields before submit
  const validateFields = () => {
    const errors: Record<string, string> = {}
    const fieldNames = new Set<string>()
    const nonEmptyFields = fields.filter((f) => f.name.trim() !== "")
    for (const f of nonEmptyFields) {
      if (f.name.trim() === "") {
        errors[f.id] = "Il nome del campo è obbligatorio"
      } else if (fieldNames.has(f.name)) {
        errors[f.id] = "Esiste già un campo con questo nome"
      } else {
        fieldNames.add(f.name)
      }
      if ((f.type === "number" || f.type === "decimal") && f.min && f.max) {
        const min = Number.parseFloat(f.min.toString())
        const max = Number.parseFloat(f.max.toString())
        if (!isNaN(min) && !isNaN(max) && min >= max) {
          errors[f.id] = "Il valore minimo deve essere inferiore al valore massimo"
        }
      }
    }
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Check if a field is numeric
  const isNumericField = (type: string) => type === "number" || type === "decimal"

  // Serialize fields to JSON for submit (only those with a name)
  const serializedFields = JSON.stringify(
    fields
      .filter((f) => f.name.trim() !== "")
      .map(({ id, ...rest }) => ({
        ...rest
      }))
  )

  // Add a new empty field
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
          {fields.map((field, index) => (
            <div
              key={field.id}
              className={`p-4 border ${
                fieldErrors[field.id]
                  ? "border-red-500 bg-red-50"
                  : "bg-gray-50 border-gray-200"
              } rounded-md`}
            >
              {fieldErrors[field.id] && <div className="text-red-500 text-sm mb-2">{fieldErrors[field.id]}</div>}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Nome Campo {index === 0 && <span className="text-red-500">*</span>}
                  </label>
                  <Input
                    placeholder="Inserisci nome campo"
                    value={field.name}
                    onChange={e => handleFieldChange(field.id, "name", e.target.value)}
                    className={fieldErrors[field.id] ? "border-red-500" : ""}
                    disabled={disabled}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Tipo</label>
                  <Select
                    value={field.type}
                    onValueChange={value => handleFieldChange(field.id, "type", value)}
                    disabled={disabled}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {fieldTypes.map((type) => (
                        <SelectItem key={`${field.id}-${type.value}`} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {isNumericField(field.type) && (
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Valore minimo</label>
                    <Input
                      type="number"
                      placeholder="Valore minimo"
                      value={field.min || ""}
                      onChange={e => handleFieldChange(field.id, "min", e.target.value)}
                      step={field.type === "decimal" ? "0.01" : "1"}
                      disabled={disabled}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Valore massimo</label>
                    <Input
                      type="number"
                      placeholder="Valore massimo"
                      value={field.max || ""}
                      onChange={e => handleFieldChange(field.id, "max", e.target.value)}
                      step={field.type === "decimal" ? "0.01" : "1"}
                      disabled={disabled}
                    />
                  </div>
                </div>
              )}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Descrizione</label>
                <Textarea
                  placeholder="Inserisci una descrizione per questo campo"
                  value={field.description}
                  onChange={e => handleFieldChange(field.id, "description", e.target.value)}
                  disabled={disabled}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Select
                    value={field.required ? "si" : "no"}
                    onValueChange={value => handleFieldChange(field.id, "required", value === "si")}
                    disabled={disabled}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="si">Sì</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                  <label className="text-sm font-medium leading-none">Campo obbligatorio</label>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveField(field.id)}
                  className="text-red-500 h-8 p-0"
                  disabled={disabled}
                >
                  <Trash2 className="h-4 w-4 mr-1" /> Rimuovi
                </Button>
              </div>
            </div>
          ))}
        </div>
        {/* Button to add a new field */}
        <Button
          type="button"
          variant="outline"
          onClick={handleAddField}
          className="mt-2"
          disabled={disabled}
        >
          <Plus className="h-4 w-4 mr-2" /> Aggiungi campo
        </Button>
        {/* Hidden input to serialize fields */}
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
