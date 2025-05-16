"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { QrCode, Edit, Plus, MapPin, Info } from "lucide-react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { getPuntiControllo } from "@/lib/actions"
import { QRCodeModal } from "@/components/qr-code-modal"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

export default function PuntiDiControllo() {
  const router = useRouter()
  const { toast } = useToast()
  const [puntiControllo, setPuntiControllo] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [qrModalOpen, setQrModalOpen] = useState(false)
  const [selectedDevice, setSelectedDevice] = useState<{ id: string; nome: string } | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        const data = await getPuntiControllo()
        setPuntiControllo(data)
        setIsLoading(false)
      } catch (error) {
        toast({
          title: "Errore",
          description: "Impossibile caricare i punti di controllo.",
          variant: "destructive",
        })
        setIsLoading(false)
      }
    }

    fetchData()
  }, [toast])

  const openQrModal = (device: { id: string; nome: string }) => {
    setSelectedDevice(device)
    setQrModalOpen(true)
  }

  const filteredPunti = puntiControllo.filter(
    (punto) =>
      punto.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      punto.posizione.toLowerCase().includes(searchTerm.toLowerCase()) ||
      punto.tags?.some((tag: string) => tag.toLowerCase().includes(searchTerm.toLowerCase())),
  )

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Punti di Controllo</h1>
        <Button className="bg-black hover:bg-gray-800" onClick={() => router.push("/punti-di-controllo/nuovo")}>
          <Plus className="mr-2 h-4 w-4" /> Nuovo Punto di Controllo
        </Button>
      </div>

      <div className="relative">
        <Input
          className="pl-10"
          placeholder="Cerca punti di controllo..."
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
      ) : filteredPunti.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed">
          <Info className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">Nessun punto di controllo trovato</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm ? "Nessun risultato per la ricerca corrente." : "Inizia creando un nuovo punto di controllo."}
          </p>
          {searchTerm ? (
            <Button variant="outline" className="mt-4" onClick={() => setSearchTerm("")}>
              Cancella ricerca
            </Button>
          ) : (
            <Button
              className="mt-4 bg-black hover:bg-gray-800"
              onClick={() => router.push("/punti-di-controllo/nuovo")}
            >
              <Plus className="mr-2 h-4 w-4" /> Nuovo Punto di Controllo
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg border">
          <Accordion type="single" collapsible className="w-full">
            {filteredPunti.map((punto) => (
              <AccordionItem key={punto.id} value={punto.id} className="border-b">
                <AccordionTrigger className="px-4 py-3 hover:bg-gray-50 group">
                  <div className="flex flex-1 items-center justify-between pr-4">
                    <div className="text-left">
                      <h3 className="text-base font-medium">{punto.nome}</h3>
                      <p className="text-sm text-gray-500 mt-1">{punto.id}</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 pt-2">
                  <div className="space-y-4">
                    {/* Description */}
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">Descrizione</div>
                      <div className="text-sm">{punto.descrizione || "Nessuna descrizione disponibile"}</div>
                    </div>

                    {/* Position */}
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">Posizione</div>
                      <div className="text-sm flex items-center">
                        <MapPin className="w-4 h-4 mr-2 text-gray-500" />
                        {punto.posizione}
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">Tag</div>
                      <div className="flex flex-wrap gap-1">
                        {punto.tags && punto.tags.length > 0 ? (
                          punto.tags.map((tag: string, index: number) => (
                            <span
                              key={index}
                              className="inline-block bg-gray-100 rounded-full px-2 py-0.5 text-xs text-gray-800"
                            >
                              {tag}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm">Nessun tag disponibile</span>
                        )}
                      </div>
                    </div>

                    <div className="flex space-x-3 pt-2">
                      <Button
                        className="bg-black hover:bg-gray-800"
                        size="sm"
                        onClick={() => router.push(`/punti-di-controllo/modifica/${punto.id}`)}
                      >
                        <Edit className="w-4 h-4 mr-2" /> Modifica
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openQrModal({ id: punto.id, nome: punto.nome })}
                      >
                        <QrCode className="w-4 h-4 mr-2" /> QR Code
                      </Button>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      )}

      {selectedDevice && (
        <QRCodeModal
          isOpen={qrModalOpen}
          onClose={() => setQrModalOpen(false)}
          deviceId={selectedDevice.id}
          deviceName={selectedDevice.nome}
        />
      )}
    </div>
  )
}
