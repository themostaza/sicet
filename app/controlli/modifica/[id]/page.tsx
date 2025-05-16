"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import Link from "next/link"
import { ArrowLeft, Trash2, Plus } from "lucide-react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { getControllo, updateControllo, deleteControllo } from "@/lib/actions-kpi"
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

// Import the FieldErrorTooltip component at the top of the file
import { TooltipProvider } from "@/components/ui/tooltip"
import { FieldErrorTooltip } from "@/components/field-error-tooltip"

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

export default function ModificaControllo({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { toast } = useToast()
  const [controllo, setControllo] = useState<any>(null)
  const [campi, setCampi] = useState<Campo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // Add state for validation errors
  const [errors, setErrors] = useState<{
    nome?: string
  }>({})

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getControllo(params.id)
        setControllo(data)

        // Converti i campi esistenti aggiungendo un ID univoco
        const campiConId =
          data?.campi?.map((campo: any) => ({
            ...campo,
            id: generateId(),
          })) || []

        // Aggiungi un campo vuoto alla fine se non ce ne sono
        if (campiConId.length === 0) {
          campiConId.push(emptyField())
        }
        // Altrimenti, aggiungi un campo vuoto solo se l'ultimo campo ha un nome
        else if (campiConId[campiConId.length - 1].nome.trim() !== "") {
          campiConId.push(emptyField())
        }

        setCampi(campiConId)
      } catch (error) {
        toast({
          title: "Errore",
          description: "Impossibile caricare i dati del controllo.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [params.id, toast])

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

  // Add validation function
  const validateForm = (formData: FormData): boolean => {
    const newErrors: {
      nome?: string
    } = {}

    let isValid = true

    // Validate name
    const nome = formData.get("nome") as string
    if (!nome || nome.trim() === "") {
      newErrors.nome = "Il nome è obbligatorio"
      isValid = false
    }

    setErrors(newErrors)
    return isValid
  }

  // Update the handleSubmit function to use validation
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    // Validate the form
    if (!validateForm(formData)) {
      return
    }

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

      await updateControllo({
        id: params.id,
        nome: formData.get("nome") as string,
        descrizione: (formData.get("descrizione") as string) || "",
        campi: nonEmptyFields.map(({ id, ...rest }) => rest), // Rimuovi l'id prima di inviare
      })

      toast({
        title: "Controllo aggiornato",
        description: "Il controllo è stato aggiornato con successo.",
        variant: "default",
      })

      // Reindirizzamento immediato alla pagina dei controlli
      router.push("/controlli")
    } catch (error) {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'aggiornamento del controllo.",
        variant: "destructive",
      })
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await deleteControllo(params.id)

      // Mostra il toast con nome e ID, come per i punti di controllo
      toast({
        title: "Controllo eliminato",
        description: `"${controllo.nome}" (ID: ${params.id}) è stato eliminato con successo.`,
        variant: "default",
      })

      // Assicuriamoci che il reindirizzamento avvenga dopo che il toast è stato mostrato
      // e che non ci siano problemi con l'ordine delle operazioni
      setTimeout(() => {
        router.push("/controlli")
      }, 100)
    } catch (error) {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'eliminazione del controllo.",
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

  if (!controllo) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href="/controlli" className="inline-flex items-center text-sm font-medium">
            <ArrowLeft className="mr-2 h-4 w-4" /> Torna ai Controlli
          </Link>
        </div>
        <div className="bg-white p-6 rounded-lg border">
          <h1 className="text-2xl font-bold mb-1">Controllo non trovato</h1>
          <p className="text-gray-500">Il controllo richiesto non esiste o è stato rimosso.</p>
        </div>
      </div>
    )
  }

  // Wrap the entire component return with TooltipProvider
  return (
    <TooltipProvider>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href="/controlli" className="inline-flex items-center text-sm font-medium">
            <ArrowLeft className="mr-2 h-4 w-4" /> Torna ai Controlli
          </Link>
        </div>

        <div className="bg-white p-6 rounded-lg border">
          <h1 className="text-2xl font-bold mb-1">Modifica Controllo</h1>
          <p className="text-gray-500 mb-6">Aggiorna i dettagli di questo controllo.</p>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Update the form field for name */}
            <div className="space-y-2">
              <div className="flex items-center">
                <label htmlFor="nome" className="block text-sm font-medium">
                  Nome <span className="text-red-500">*</span>
                </label>
                {errors.nome && <FieldErrorTooltip message={errors.nome} />}
              </div>
              <Input
                id="nome"
                name="nome"
                defaultValue={controllo.nome}
                className={errors.nome ? "border-red-500" : ""}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="descrizione" className="block text-sm font-medium">
                Descrizione
              </label>
              <Textarea id="descrizione" name="descrizione" defaultValue={controllo.descrizione} />
            </div>

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
                <Button type="button" variant="outline" onClick={() => router.push("/controlli")}>
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
              <AlertDialogTitle>Sei sicuro di voler eliminare questo controllo?</AlertDialogTitle>
              <AlertDialogDescription>
                Questa azione non può essere annullata. Il controllo "{controllo?.nome}" (ID: {params.id}) verrà
                eliminato permanentemente.
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
