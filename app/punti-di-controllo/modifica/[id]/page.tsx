"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { ArrowLeft, Plus, Trash2 } from "lucide-react"
import { getPuntoControllo, updatePuntoControllo, deletePuntoControllo } from "@/lib/actions"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { TooltipProvider } from "@/components/ui/tooltip"
import { FormField } from "@/components/form/form-field"
import { useFormValidation } from "@/hooks/use-form-validation"
import { validationRules } from "@/lib/validation"

export default function ModificaPuntoDiControllo({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { toast } = useToast()
  const [puntoControllo, setPuntoControllo] = useState<any>(null)
  const [tags, setTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  // Form validation setup
  const { formState, handleChange, handleBlur, handleSubmit, setFieldValues } = useFormValidation({
    initialValues: {
      nome: "",
      descrizione: "",
      posizione: "",
    },
    validationSchema: {
      nome: [validationRules.required("Il nome è obbligatorio")],
      // Posizione non è più obbligatoria
    },
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getPuntoControllo(params.id)
        setPuntoControllo(data)
        setTags(data?.tags || [])

        // Set form values from fetched data
        setFieldValues({
          nome: data.nome || "",
          descrizione: data.descrizione || "",
          posizione: data.posizione || "",
        })
      } catch (error) {
        toast({
          title: "Errore",
          description: "Impossibile caricare i dati del punto di controllo.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [params.id, toast, setFieldValues])

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
      await updatePuntoControllo({
        id: params.id,
        nome: formState.values.nome,
        posizione: formState.values.posizione || "",
        descrizione: formState.values.descrizione || "",
        urlImmagine: puntoControllo.urlImmagine || "",
        icona: puntoControllo.icona || "",
        tags: tags,
      })

      toast({
        title: "Punto di controllo aggiornato",
        description: "Il punto di controllo è stato aggiornato con successo.",
        variant: "default",
      })

      // Reindirizzamento immediato alla pagina dei punti di controllo
      router.push("/punti-di-controllo")
    } catch (error) {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'aggiornamento del punto di controllo.",
        variant: "destructive",
      })
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await deletePuntoControllo(params.id)

      // Mostra il toast con nome e ID
      toast({
        title: "Punto di controllo eliminato",
        description: `"${puntoControllo.nome}" (ID: ${params.id}) è stato eliminato con successo.`,
        variant: "default",
      })

      // Reindirizza alla pagina dei punti di controllo
      router.push("/punti-di-controllo")
    } catch (error) {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'eliminazione del punto di controllo.",
        variant: "destructive",
      })
      setIsDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!puntoControllo) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href="/punti-di-controllo" className="inline-flex items-center text-sm font-medium">
            <ArrowLeft className="mr-2 h-4 w-4" /> Torna ai Punti di Controllo
          </Link>
        </div>
        <div className="bg-white p-6 rounded-lg border">
          <h1 className="text-2xl font-bold mb-1">Punto di controllo non trovato</h1>
          <p className="text-gray-500">Il punto di controllo richiesto non esiste o è stato rimosso.</p>
        </div>
      </div>
    )
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
          <h1 className="text-2xl font-bold mb-1">Modifica Punto di Controllo</h1>
          <p className="text-gray-500 mb-6">Aggiorna i dettagli di questo punto di controllo.</p>

          <form className="space-y-6" onSubmit={onSubmit}>
            <div className="space-y-2">
              <label className="block text-sm font-medium">
                ID Pubblico <span className="text-red-500">*</span>
              </label>
              <Input defaultValue={puntoControllo.id} disabled className="bg-gray-50" />
            </div>

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
                  className="rounded-r-none mr-2"
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

              <p className="text-xs text-gray-500">Aggiungi tag per categorizzare questo punto di controllo</p>
            </div>

            <div className="flex justify-between pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                className="text-red-500 border-red-200 hover:bg-red-50"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" /> Elimina
              </Button>

              <div className="flex space-x-4">
                <Button type="button" variant="outline" onClick={() => router.push("/punti-di-controllo")}>
                  Annulla
                </Button>
                <Button type="submit" className="bg-black hover:bg-gray-800" disabled={isSubmitting}>
                  {isSubmitting ? "Aggiornamento in corso..." : "Aggiorna"}
                </Button>
              </div>
            </div>
          </form>
        </div>

        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Sei sicuro di voler eliminare questo punto di controllo?</AlertDialogTitle>
              <AlertDialogDescription>
                Questa azione non può essere annullata. Il punto di controllo "{puntoControllo?.nome}" (ID: {params.id})
                verrà eliminato permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Annulla</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-500 hover:bg-red-600 text-white"
                onClick={(e) => {
                  e.preventDefault()
                  handleDelete()
                }}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <span className="mr-2">
                      <svg
                        className="animate-spin h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                    </span>
                    Eliminazione...
                  </>
                ) : (
                  "Elimina"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  )
}
