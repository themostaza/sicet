"use client"

import { useState, useDeferredValue, useMemo, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { QrCode, Edit, Plus, MapPin, Info } from "lucide-react"
import { useRouter } from "next/navigation"
import { QRCodeModal } from "@/components/qr-code-modal"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import type { Device } from "@/lib/actions"
import { getDevices } from "@/lib/actions"

interface Props {
  initialDevices: Device[]
}

export default function DeviceList({ initialDevices }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const deferred = useDeferredValue(search)
  const [qr, setQr] = useState<{ open: boolean; device?: Device }>({ open: false })
  const [devices, setDevices] = useState<Device[]>(initialDevices)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const loaderRef = useRef<HTMLDivElement | null>(null)

  const list = useMemo(() => {
    const term = deferred.toLowerCase()
    return devices.filter(
      (d) =>
        d.name.toLowerCase().includes(term) ||
        (d.location ?? "").toLowerCase().includes(term) ||
        d.tags?.some((t) => t.toLowerCase().includes(term)),
    )
  }, [devices, deferred])

  const openQr = (device: Device) => setQr({ open: true, device })

  const loadMore = async () => {
    if (loading || !hasMore) return
    setLoading(true)
    const res = await getDevices({ offset: devices.length, limit: 20 })
    setDevices((prev) => {
      const all = [...prev, ...res.devices]
      const unique = Array.from(new Map(all.map(d => [d.id, d])).values())
      return unique
    })
    setHasMore(res.hasMore)
    setLoading(false)
    setPage((p) => p + 1)
  }

  useEffect(() => {
    if (!loaderRef.current) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMore()
        }
      },
      { threshold: 1 }
    )
    observer.observe(loaderRef.current)
    return () => observer.disconnect()
  }, [loaderRef.current, hasMore, loading])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Dispositivi</h1>
        <Button className="bg-black hover:bg-gray-800" onClick={() => router.push("/device/new")}>        
          <Plus className="mr-2 h-4 w-4" /> Nuovo Device
        </Button>
      </div>

      <div className="relative">
        <Input
          className="pl-10"
          placeholder="Cerca device..."
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
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

      {list.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed">
          <Info className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">Nessun device trovato</h3>
          <p className="mt-1 text-sm text-gray-500">
            {search ? "Nessun risultato per la ricerca corrente." : "Inizia creando un nuovo device."}
          </p>
          {search ? (
            <Button variant="outline" className="mt-4" onClick={() => setSearch("")}>Cancella ricerca</Button>
          ) : (
            <Button className="mt-4 bg-black hover:bg-gray-800" onClick={() => router.push("/device/new")}>              
              <Plus className="mr-2 h-4 w-4" /> Nuovo Device
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg border">
          <Accordion type="single" collapsible className="w-full">
            {list.map((d) => (
              <AccordionItem key={d.id} value={d.id} className="border-b">
                <AccordionTrigger className="px-4 py-3 hover:bg-gray-50 group">
                  <div className="flex flex-1 items-center justify-between pr-4">
                    <div className="text-left">
                      <h3 className="text-base font-medium">{d.name}</h3>
                      <p className="text-sm text-gray-500 mt-1">{d.id}</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 pt-2">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">Descrizione</div>
                      <div className="text-sm">{d.description || "Nessuna descrizione disponibile"}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">Posizione</div>
                      <div className="text-sm flex items-center">
                        <MapPin className="w-4 h-4 mr-2 text-gray-500" />
                        {d.location}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">Tag</div>
                      <div className="flex flex-wrap gap-1">
                        {d.tags && d.tags.length > 0 ? (
                          d.tags.map((tag) => (
                            <span key={tag} className="inline-block bg-gray-100 rounded-full px-2 py-0.5 text-xs text-gray-800">{tag}</span>
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
                        onClick={() => router.push(`/device/${d.id}/edit`)}
                      >
                        <Edit className="w-4 h-4 mr-2" /> Modifica
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => openQr(d)}>
                        <QrCode className="w-4 h-4 mr-2" /> QR Code
                      </Button>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          {hasMore && (
            <div ref={loaderRef} className="py-4 text-center text-gray-400">
              {loading ? "Caricamento altri device..." : "Scorri per caricare altri"}
            </div>
          )}
        </div>
      )}

      {qr.open && qr.device && (
        <QRCodeModal
          isOpen={qr.open}
          onClose={() => setQr({ open: false })}
          deviceId={qr.device.id}
          deviceName={qr.device.name}
        />
      )}
    </div>
  )
}