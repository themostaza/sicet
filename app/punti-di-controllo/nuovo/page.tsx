"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { ArrowLeft, Plus } from "lucide-react"
import { createPuntoControllo } from "@/lib/actions"
import { TooltipProvider } from "@/components/ui/tooltip"
import { FormContainer } from "@/components/form/form-container"
import { FormField } from "@/components/form/form-field"
import { useFormValidation } from "@/hooks/use-form-validation"
import { validationRules } from "@/lib/validation"

export default function NuovoPuntoDiControllo() {
  const router = useRouter()
  const { toast } = useToast()
  const [tags, setTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form validation setup
  const { formState, handleChange, handleBlur, handleSubmit, setFieldValue } = useFormValidation({
    initialValues: {
      id: "",
      nome: "",
      descrizione: "",
      posizione: "",
    },
    validationSchema: {
      id: [validationRules.required("L'ID è obbligatorio")],
      nome: [validationRules.required("Il nome è obbligatorio")],
      // Posizione non è più obbligatoria
    },
  })

  // Generate default ID when component mounts - now a 9-digit number
  useEffect(() => {
    // Genera un numero casuale di 9 cifre
    const generateRandomDigits = (length: number) => {
      let result = ""
      for (let i = 0; i < length; i++) {
        result += Math.floor(Math.random() * 10).toString()
      }
      return result
    }

    const defaultId = generateRandomDigits(9)
    setFieldValue("id", defaultId)
  }, [setFieldValue])

  // Handle tag input
  const handleAddTag = () => {
    if (newTag.trim() === "") return

    // Split by commas and add each part as a tag
    const tagsToAdd = newTag
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag !== "" && !tags.includes(tag))

    if (tagsToAdd.length > 0) {
      setTags([...tags, ...tagsToAdd])
      setNewTag("")
    }
  }

  // Handle tag input change
  const handleTagInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value

    // If user entered a comma
    if (value.includes(",")) {
      // Split by commas
      const parts = value.split(",")

      // Last part becomes the new input value
      const lastPart = parts.pop() || ""

      // Other parts become tags
      const newTags = parts.map((part) => part.trim()).filter((part) => part !== "" && !tags.includes(part))

      if (newTags.length > 0) {
        setTags([...tags, ...newTags])
      }

      setNewTag(lastPart)
    } else {
      setNewTag(value)
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove))
  }

  // Form submission
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate form
    const isValid = await handleSubmit(e)
    if (!isValid) return

    setIsSubmitting(true)

    try {
      await createPuntoControllo({
        id: formState.values.id,
        nome: formState.values.nome,
        posizione: formState.values.posizione || "",
        descrizione: formState.values.descrizione || "",
        urlImmagine: "",
        icona: "",
        tags: tags,
      })

      toast({
        title: "Punto di controllo creato",
        description: "Il punto di controllo è stato creato con successo.",
        variant: "default",
      })

      // Reindirizzamento immediato alla pagina dei punti di controllo
      router.push("/punti-di-controllo")
    } catch (error) {
      let errorMessage = "Si è verificato un errore durante la creazione del punto di controllo."

      if (error instanceof Error) {
        if (error.message.includes("ID già in uso")) {
          errorMessage = "ID già in uso. Scegli un ID diverso."
        }
      }

      toast({
        title: "Errore",
        description: errorMessage,
        variant: "destructive",
      })
      setIsSubmitting(false)
    }
  }

  return (
    <TooltipProvider>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href="/punti-di-controllo" className="inline-flex items-center text-sm font-medium">
            <ArrowLeft className="mr-2 h-4 w-4" /> Torna ai Punti di Controllo
          </Link>
        </div>

        <div className="bg-white p-6 rounded-lg border">
          <h1 className="text-2xl font-bold mb-1">Nuovo Punto di Controllo</h1>
          <p className="text-gray-500 mb-6">Inserisci i dettagli per creare un nuovo punto di controllo.</p>

          <FormContainer
            onSubmit={onSubmit}
            isSubmitting={isSubmitting}
            submitLabel="Crea Punto di Controllo"
            submittingLabel="Creazione in corso..."
            onCancel={() => router.push("/punti-di-controllo")}
          >
            <FormField
              id="id"
              name="id"
              label="ID Pubblico"
              value={formState.values.id}
              onChange={(value) => handleChange("id", value)}
              onBlur={() => handleBlur("id")}
              error={formState.touched.id ? formState.errors.id : null}
              required
            />

            <FormField
              id="nome"
              name="nome"
              label="Nome"
              value={formState.values.nome}
              onChange={(value) => handleChange("nome", value)}
              onBlur={() => handleBlur("nome")}
              error={formState.touched.nome ? formState.errors.nome : null}
              required
            />

            <FormField
              id="descrizione"
              name="descrizione"
              label="Descrizione"
              type="textarea"
              value={formState.values.descrizione}
              onChange={(value) => handleChange("descrizione", value)}
              placeholder="Inserisci una descrizione"
            />

            <FormField
              id="posizione"
              name="posizione"
              label="Posizione"
              value={formState.values.posizione}
              onChange={(value) => handleChange("posizione", value)}
              onBlur={() => handleBlur("posizione")}
              error={formState.touched.posizione ? formState.errors.posizione : null}
            />

            <div className="space-y-2">
              <label className="block text-sm font-medium">Tag</label>
              <div className="flex">
                <Input
                  placeholder="Aggiungi tag separati da virgole"
                  className="rounded-r-none mr-2" // Aggiunto mr-2 per il padding
                  value={newTag}
                  onChange={handleTagInputChange}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      handleAddTag()
                    }
                  }}
                />
                <Button type="button" variant="outline" className="rounded-l-none" onClick={handleAddTag}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {tags.map((tag, index) => (
                    <div key={index} className="bg-gray-100 px-3 py-1 rounded-full text-sm flex items-center">
                      {tag}
                      <button
                        type="button"
                        className="ml-2 text-gray-500 hover:text-gray-700"
                        onClick={() => handleRemoveTag(tag)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-xs text-gray-500">
                Aggiungi tag separati da virgole per categorizzare questo punto di controllo
              </p>
            </div>
          </FormContainer>
        </div>
      </div>
    </TooltipProvider>
  )
}
