"use client"

import { useState, useDeferredValue, useMemo, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { QrCode, Edit, Plus, MapPin, Info, Trash2, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { QRCodeModal } from "@/components/qr-code-modal"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import type { Device } from "@/lib/validation/device-schemas"
import { getDevices } from "@/app/actions/actions-device"
import { DeviceDeleteDialog } from "@/components/device/device-delete-dialog"
import { createBrowserClient } from "@supabase/ssr"

interface Props {
  initialDevices: Device[]
}

export default function DeviceList({ initialDevices }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const deferred = useDeferredValue(search)
  const [qr, setQr] = useState<{ open: boolean; device?: Device }>({ open: false })
  const [devices, setDevices] = useState<Device[]>(initialDevices)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const loaderRef = useRef<HTMLDivElement | null>(null)
  const [role, setRole] = useState<string | null>(null)

  // Extract all unique tags from devices
  const allTags = useMemo(() => {
    const tagSet = new Set<string>()
    devices.forEach(device => {
      device.tags?.forEach(tag => tagSet.add(tag))
    })
    return Array.from(tagSet).sort()
  }, [devices])

  const list = useMemo(() => {
    const term = deferred.toLowerCase()
    return devices.filter((d) => {
      // Text search filter
      const matchesSearch = 
        d.name.toLowerCase().includes(term) ||
        (d.location ?? "").toLowerCase().includes(term) ||
        d.tags?.some((t) => t.toLowerCase().includes(term))
      
      // Tag filter - show devices that have ANY of the selected tags
      const matchesTags = selectedTags.length === 0 || 
        selectedTags.some(selectedTag => d.tags?.includes(selectedTag))
      
      return matchesSearch && matchesTags
    })
  }, [devices, deferred, selectedTags])

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }

  const clearAllTags = () => {
    setSelectedTags([])
  }

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

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return setRole(null)
      supabase
        .from("profiles")
        .select("role")
        .eq("email", user.email)
        .single()
        .then(({ data: profile }) => setRole(profile?.role ?? null))
    })
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Punti di Controllo</h1>
        <div className="flex gap-2">
          <Button className="bg-black hover:bg-gray-800" onClick={() => router.push("/device/new")}>        
            <Plus className="mr-2 h-4 w-4" /> Nuovo Punto di Controllo
          </Button>
          <Button
            variant="outline"
            className="border-gray-400"
            onClick={async () => {
              const res = await fetch("/api/device/qrcodes-pdf")
              if (!res.ok) {
                alert("Errore durante la generazione del PDF")
                return
              }
              const blob = await res.blob()
              const url = window.URL.createObjectURL(blob)
              const a = document.createElement("a")
              a.href = url
              // Prova a recuperare il nome file dal header
              const disposition = res.headers.get("content-disposition")
              let filename = "qrcodes-dispositivi.pdf"
              if (disposition && disposition.includes("filename=")) {
                filename = disposition.split("filename=")[1].replaceAll('"', '')
              }
              a.download = filename
              document.body.appendChild(a)
              a.click()
              a.remove()
              window.URL.revokeObjectURL(url)
            }}
          >
            <QrCode className="mr-2 h-4 w-4" /> Scarica tutti i QRcode
          </Button>
        </div>
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

      {/* Tag Filter Section */}
      {allTags.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-700">Filtra per tag</h3>
            {selectedTags.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllTags}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                <X className="w-3 h-3 mr-1" />
                Cancella tutti
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {allTags.map((tag) => (
              <Badge
                key={tag}
                variant={selectedTags.includes(tag) ? "default" : "outline"}
                className={`cursor-pointer transition-colors ${
                  selectedTags.includes(tag)
                    ? "bg-black text-white hover:bg-gray-800"
                    : "hover:bg-gray-100"
                }`}
                onClick={() => toggleTag(tag)}
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Filter Summary */}
      {(search || selectedTags.length > 0) && (
        <div className="flex items-center justify-between text-sm text-gray-600 bg-gray-50 px-4 py-2 rounded-lg">
          <div>
            Mostrando {list.length} di {devices.length} dispositivi
            {(search || selectedTags.length > 0) && (
              <span className="ml-2">
                {search && <span className="inline-block bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs mr-2">Ricerca: "{search}"</span>}
                {selectedTags.length > 0 && (
                  <span className="inline-block bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs">
                    Tag: {selectedTags.join(", ")}
                  </span>
                )}
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("")
              clearAllTags()
            }}
            className="text-xs"
          >
            <X className="w-3 h-3 mr-1" />
            Cancella filtri
          </Button>
        </div>
      )}

      {list.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed">
          <Info className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">Nessun device trovato</h3>
          <p className="mt-1 text-sm text-gray-500">
            {search || selectedTags.length > 0 
              ? "Nessun risultato per i filtri applicati." 
              : "Inizia creando un nuovo punto di controllo."
            }
          </p>
          {(search || selectedTags.length > 0) ? (
            <div className="mt-4 space-x-2">
              {search && (
                <Button variant="outline" onClick={() => setSearch("")}>
                  Cancella ricerca
                </Button>
              )}
              {selectedTags.length > 0 && (
                <Button variant="outline" onClick={clearAllTags}>
                  Cancella filtri tag
                </Button>
              )}
            </div>
          ) : (
            <Button className="mt-4 bg-black hover:bg-gray-800" onClick={() => router.push("/device/new")}>              
              <Plus className="mr-2 h-4 w-4" /> Nuovo Punto di Controllo
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
                      {role === "admin" && (
                        <DeviceDeleteDialog
                          onDelete={async () => {
                            await fetch(`/api/device/delete?id=${d.id}`, { method: "POST" })
                            setDevices((prev) => prev.filter((dev) => dev.id !== d.id))
                          }}
                        >
                          <Button variant="destructive" size="sm">
                            <Trash2 className="w-4 h-4 mr-2" /> Elimina
                          </Button>
                        </DeviceDeleteDialog>
                      )}
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