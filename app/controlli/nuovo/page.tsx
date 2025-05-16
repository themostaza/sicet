"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import Link from "next/link"
import { ArrowLeft, Trash2, Plus } from "lucide-react"
import { createControllo } from "@/lib/actions-kpi"
import { TooltipProvider } from "@/components/ui/tooltip"
import { FormContainer } from "@/components/form/form-container"
import { FormField } from "@/components/form/form-field"
import { useFormValidation } from "@/hooks/use-form-validation"
import { validationRules } from "@/lib/validation"

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

export default function NuovoControllo() {
  const router = useRouter()
  const { toast } = useToast()
  const [campi, setCampi] = useState<Campo[]>([emptyField()])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // Form validation setup
  const { formState, handleChange, handleBlur, handleSubmit } = useFormValidation({
    initialValues: {
      nome: "",
      descrizione: "",
    },
    validationSchema: {
      nome: [validationRules.required("Il nome è obbligatorio")],
    },
  })

  // Gestisce il cambiamento di un campo
  const handleFieldChange = (id: string, field: keyof Campo, value: any) => {
    setCampi((prevCampi) => {
      const updatedCampi = prevCampi.map((campo) => {
        if (campo.id === id) {
          return { ...campo, [field]: value }
        }
        return campo
      })

      // Se l'ultimo campo ha un nome, aggiungi un nuovo campo vuoto
      const lastField = updatedCampi[updatedCampi.length - 1]
      if (lastField && lastField.nome.trim() !== "" && field === "nome") {
        return [...updatedCampi, emptyField()]
      }

      return updatedCampi
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
    setCampi((prevCampi) => {
      // Non rimuovere se è l'unico campo vuoto
      if (prevCampi.length === 1 && prevCampi[0].nome === "") {
        return prevCampi
      }

      const filteredCampi = prevCampi.filter((campo) => campo.id !== id)

      // Se abbiamo rimosso tutti i campi, aggiungi un campo vuoto
      if (filteredCampi.length === 0) {
        return [emptyField()]
      }

      // Se abbiamo rimosso l'ultimo campo con nome e non c'è già un campo vuoto, aggiungi un campo vuoto
      const lastField = filteredCampi[filteredCampi.length - 1]
      if (lastField && lastField.nome.trim() !== "" && !filteredCampi.some((campo) => campo.nome === "")) {
        return [...filteredCampi, emptyField()]
      }

      return filteredCampi
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

  // Validazione dei campi prima dell'invio
  const validateFields = () => {
    const errors: Record<string, string> = {}
    const fieldNames = new Set<string>()

    // Filtra i campi vuoti
    const nonEmptyFields = campi.filter((campo) => campo.nome.trim() !== "")

    for (const campo of nonEmptyFields) {
      if (campo.nome.trim() === "") {
        errors[campo.id] = "Il nome del campo è obbligatorio"
      } else if (fieldNames.has(campo.nome)) {
        errors[campo.id] = "Esiste già un campo con questo nome"
      } else {
        fieldNames.add(campo.nome)
      }
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Form submission
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate form
    const isValid = await handleSubmit(e)
    if (!isValid) return

    // Validate fields
    if (!validateFields()) {
      toast({
        title: "Errore",
        description: "Ci sono errori nei campi del controllo. Controlla e riprova.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      // Filtra i campi vuoti prima di inviare
      const nonEmptyFields = campi.filter((campo) => campo.nome.trim() !== "")

      await createControllo({
        nome: formState.values.nome,
        descrizione: formState.values.descrizione || "",
        campi: nonEmptyFields.map(({ id, ...rest }) => rest), // Rimuovi l'id prima di inviare
      })

      toast({
        title: "Controllo creato",
        description: "Il controllo è stato creato con successo.",
        variant: "default",
      })

      // Reindirizzamento immediato alla pagina dei controlli
      router.push("/controlli")
    } catch (error) {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante la creazione del controllo.",
        variant: "destructive",
      })
      setIsSubmitting(false)
    }
  }

  return (
    <TooltipProvider>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href="/controlli" className="inline-flex items-center text-sm font-medium">
            <ArrowLeft className="mr-2 h-4 w-4" /> Torna ai Controlli
          </Link>
        </div>

        <div className="bg-white p-6 rounded-lg border">
          <h1 className="text-2xl font-bold mb-1">Aggiungi Nuovo Controllo</h1>
          <p className="text-gray-500 mb-6">Definisci un nuovo controllo con una struttura personalizzata.</p>

          <FormContainer
            onSubmit={onSubmit}
            isSubmitting={isSubmitting}
            submitLabel="Crea Controllo"
            submittingLabel="Creazione in corso..."
            onCancel={() => router.push("/controlli")}
          >
            <FormField
              id="nome"
              name="nome"
              label="Nome"
              value={formState.values.nome}
              onChange={(value) => handleChange("nome", value)}
              onBlur={() => handleBlur("nome")}
              error={formState.touched.nome ? formState.errors.nome : null}
              required
              placeholder="Inserisci nome controllo"
            />

            <FormField
              id="descrizione"
              name="descrizione"
              label="Descrizione"
              type="textarea"
              value={formState.values.descrizione}
              onChange={(value) => handleChange("descrizione", value)}
              placeholder="Inserisci descrizione"
            />

            <div className="pt-4 border-t">
              <div className="mb-4">
                <h2 className="text-lg font-medium">Campi</h2>
              </div>

              <div className="space-y-4">
                {campi.map((campo, index) => (
                  <div
                    key={campo.id}
                    className={`p-4 border ${
                      campo.nome === "" && index === campi.length - 1
                        ? "border-dashed border-gray-300 bg-gray-50/50"
                        : fieldErrors[campo.id]
                          ? "border-red-500 bg-red-50"
                          : "bg-gray-50 border-gray-200"
                    } rounded-md`}
                  >
                    {fieldErrors[campo.id] && <div className="text-red-500 text-sm mb-2">{fieldErrors[campo.id]}</div>}

                    {campo.nome === "" && index === campi.length - 1 && (
                      <div className="text-gray-500 text-sm mb-3 flex items-center">
                        <Plus className="h-4 w-4 mr-2" />
                        Aggiungi un nuovo campo
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label htmlFor={`nome-${campo.id}`} className="block text-sm font-medium mb-1">
                          Nome Campo {index === 0 && <span className="text-red-500">*</span>}
                        </label>
                        <Input
                          id={`nome-${campo.id}`}
                          placeholder="Inserisci nome campo"
                          value={campo.nome}
                          onChange={(e) => handleFieldChange(campo.id, "nome", e.target.value)}
                          className={fieldErrors[campo.id] ? "border-red-500" : ""}
                        />
                      </div>
                      <div>
                        <label htmlFor={`tipo-${campo.id}`} className="block text-sm font-medium mb-1">
                          Tipo
                        </label>
                        <Select
                          value={campo.tipo}
                          onValueChange={(value) => handleFieldChange(campo.id, "tipo", value)}
                        >
                          <SelectTrigger id={`tipo-${campo.id}`}>
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

                    <div className="mb-4">
                      <label htmlFor={`descrizione-${campo.id}`} className="block text-sm font-medium mb-1">
                        Descrizione
                      </label>
                      <Textarea
                        id={`descrizione-${campo.id}`}
                        placeholder="Inserisci una descrizione per questo campo"
                        value={campo.descrizione}
                        onChange={(e) => handleFieldChange(campo.id, "descrizione", e.target.value)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`obbligatorio-${campo.id}`}
                          checked={campo.obbligatorio}
                          onCheckedChange={(checked) => handleFieldChange(campo.id, "obbligatorio", checked === true)}
                        />
                        <label
                          htmlFor={`obbligatorio-${campo.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Campo obbligatorio
                        </label>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveField(campo.id)}
                        className="text-red-500 h-8 p-0"
                      >
                        <Trash2 className="h-4 w-4 mr-1" /> Rimuovi
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </FormContainer>
        </div>
      </div>
    </TooltipProvider>
  )
}
