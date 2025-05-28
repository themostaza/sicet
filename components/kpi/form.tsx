"use client"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import type { Kpi } from "@/lib/validation/kpi-schemas"
import { KpiFormSchema } from "@/lib/validation/kpi-schemas"
import { useState, useEffect, useId } from "react"
import { Plus, Trash2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { FormField, FormItem, FormLabel, FormControl, FormMessage, Form } from "@/components/ui/form"

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

// Empty field template
const emptyField = (index: number): Field => ({
  id: `field_${index}`,
  name: "",
  type: "text",
  description: "",
  required: false,
})

export default function KpiForm({ kpi, mode, action, disabled }: Props) {
  // Usa React useId per generare prefissi stabili
  const idPrefix = useId();
  
  // Initialize fields from kpi.value if exists, otherwise with an empty array
  const [fields, setFields] = useState<Field[]>(() => {
    if (Array.isArray(kpi?.value)) {
      return kpi.value.map((field: any, index) => ({
        id: `${idPrefix}field_${index}`,
        name: field.name ?? "",
        type: field.type ?? "text",
        description: field.description ?? "",
        required: field.required ?? false,
        min: field.min,
        max: field.max,
      }));
    }
    return [emptyField(0)];
  });
  
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const form = useForm<z.infer<typeof KpiFormSchema>>({
    resolver: zodResolver(KpiFormSchema),
    defaultValues: {
      id: kpi?.id || crypto.randomUUID(),
      name: kpi?.name || "",
      description: kpi?.description || "",
      value: [] // Inizializzato vuoto e aggiornato nel useEffect
    },
  })

  // Aggiorna il campo value nel form quando i campi cambiano
  useEffect(() => {
    const validFields = fields
      .filter(f => f.name.trim() !== "")
      .map(({ id, ...rest }) => rest);
    
    form.setValue("value", validFields);
  }, [fields, form]);

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
      if (filteredFields.length === 0) return [emptyField(0)]
      const lastField = filteredFields[filteredFields.length - 1]
      if (lastField && lastField.name.trim() !== "" && !filteredFields.some((f) => f.name === "")) {
        return [...filteredFields, emptyField(filteredFields.length)]
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
    
    if (nonEmptyFields.length === 0) {
      errors["general"] = "Aggiungi almeno un campo"
      setFieldErrors(errors)
      return false
    }
    
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

  // Add a new empty field
  const handleAddField = () => {
    setFields((prevFields) => [...prevFields, emptyField(prevFields.length)])
  }

  const onSubmit = (data: z.infer<typeof KpiFormSchema>) => {
    if (!validateFields()) {
      return;
    }

    // Prepara i campi da inviare al server
    const validFields = fields
      .filter(f => f.name.trim() !== "")
      .map(({ id, ...rest }) => rest);

    const formData = new FormData();
    formData.append("id", data.id);
    formData.append("name", data.name);
    formData.append("description", data.description || "");
    formData.append("value", JSON.stringify(validFields));
    
    action(formData);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" autoComplete="off">
        {fieldErrors["general"] && (
          <div className="p-3 bg-red-50 border border-red-500 rounded text-red-600 mb-4">
            {fieldErrors["general"]}
          </div>
        )}
        
        {mode === "edit" && (
          <FormField
            control={form.control}
            name="id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>ID</FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    disabled 
                    className="bg-gray-50" 
                    autoComplete="off" 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome</FormLabel>
              <FormControl>
                <Input {...field} autoComplete="off" disabled={disabled} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrizione</FormLabel>
              <FormControl>
                <Textarea {...field} autoComplete="off" disabled={disabled} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-2">
          <FormLabel>Campi del Controllo</FormLabel>
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
                    <input
                      type="checkbox"
                      id={`${idPrefix}required-${field.id}`}
                      checked={field.required}
                      onChange={e => handleFieldChange(field.id, "required", e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded"
                      disabled={disabled}
                    />
                    <label htmlFor={`${idPrefix}required-${field.id}`} className="text-sm">Campo obbligatorio</label>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => handleRemoveField(field.id)}
                    disabled={disabled || (fields.length === 1 && field.name === "")}
                    className="p-2 hover:bg-red-100 text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={handleAddField}
              disabled={disabled || fields.some((f) => f.name === "")}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" /> Aggiungi campo
            </Button>
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={disabled} className="bg-black hover:bg-gray-800">
            {mode === "create" ? "Crea" : "Salva"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
