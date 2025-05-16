"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Edit, Plus, Info } from "lucide-react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { getControlli } from "@/lib/actions-kpi"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

export default function Controlli() {
  const router = useRouter()
  const { toast } = useToast()
  const [controlli, setControlli] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getControlli()
        setControlli(data)
      } catch (error) {
        toast({
          title: "Errore",
          description: "Impossibile caricare i controlli.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [toast])

  const filteredControlli = controlli.filter(
    (controllo) =>
      controllo.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      controllo.descrizione?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  // Update the getTipoLabel function to include the decimal type
  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case "text":
        return "Testo breve"
      case "textarea":
        return "Testo lungo"
      case "number":
        return "Numero"
      case "decimal":
        return "Numero decimale"
      case "date":
        return "Data"
      case "checkbox":
        return "Checkbox"
      case "select":
        return "Selezione"
      default:
        return tipo
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Controlli</h1>
        <Button className="bg-black hover:bg-gray-800" onClick={() => router.push("/controlli/nuovo")}>
          <Plus className="mr-2 h-4 w-4" /> Nuovo Controllo
        </Button>
      </div>

      <div className="relative">
        <Input
          className="pl-10"
          placeholder="Cerca controlli..."
          type="search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <svg
            className="w-4 h-4 text-gray-500"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 20 20"
          >
            <path
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"
            />
          </svg>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      ) : filteredControlli.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed">
          <Info className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">Nessun controllo trovato</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm ? "Nessun risultato per la ricerca corrente." : "Inizia creando un nuovo controllo."}
          </p>
          {searchTerm ? (
            <Button variant="outline" className="mt-4" onClick={() => setSearchTerm("")}>
              Cancella ricerca
            </Button>
          ) : (
            <Button className="mt-4 bg-black hover:bg-gray-800" onClick={() => router.push("/controlli/nuovo")}>
              <Plus className="mr-2 h-4 w-4" /> Nuovo Controllo
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg border">
          <Accordion type="single" collapsible className="w-full">
            {filteredControlli.map((controllo) => (
              <AccordionItem key={controllo.id} value={controllo.id} className="border-b">
                <AccordionTrigger className="px-4 py-3 hover:bg-gray-50 group">
                  <div className="flex flex-1 items-center justify-between pr-4">
                    <div className="text-left">
                      <h3 className="text-base font-medium">{controllo.nome}</h3>
                      <p className="text-sm text-gray-500 mt-1">{controllo.id}</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 pt-2">
                  <div className="space-y-4">
                    {/* Description */}
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">Descrizione</div>
                      <div className="text-sm">{controllo.descrizione || "Nessuna descrizione disponibile"}</div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">Campi del controllo</div>
                      {controllo.campi && controllo.campi.length > 0 ? (
                        <div className="border rounded-md overflow-hidden">
                          <div className="bg-gray-50 px-4 py-2 border-b">
                            <div className="grid grid-cols-9 gap-2 text-xs font-medium text-gray-600">
                              <div className="col-span-4">Nome</div>
                              <div className="col-span-3">Tipo</div>
                              <div className="col-span-2">Stato</div>
                            </div>
                          </div>
                          <div className="divide-y">
                            {controllo.campi.map((campo: any, index: number) => (
                              <div key={index} className="px-4 py-3">
                                <div className="grid grid-cols-9 gap-2 text-sm">
                                  <div className="col-span-4">
                                    <div className="font-medium">{campo.nome}</div>
                                  </div>
                                  <div className="col-span-3">{getTipoLabel(campo.tipo)}</div>
                                  <div className="col-span-2">{campo.obbligatorio ? "Obbligatorio" : "Opzionale"}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm">Nessun campo definito per questo controllo.</div>
                      )}
                    </div>

                    <div className="flex space-x-3 pt-2">
                      <Button
                        className="bg-black hover:bg-gray-800"
                        size="sm"
                        onClick={() => router.push(`/controlli/modifica/${controllo.id}`)}
                      >
                        <Edit className="w-4 h-4 mr-2" /> Modifica Controllo
                      </Button>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      )}
    </div>
  )
}
