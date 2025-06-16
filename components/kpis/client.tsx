"use client"

import { useState, useDeferredValue, useMemo, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Edit, Plus, Info, Hash, HashIcon, Type, Minus, Plus as PlusIcon, CheckCircle2, XCircle, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import type { Kpi } from "@/app/actions/actions-kpi"
import { getKpis } from "@/app/actions/actions-kpi"
import { KpiDeleteDialog } from "@/components/kpi/kpi-delete-dialog"
import { createBrowserClient } from "@supabase/ssr"

interface Props {
  initialKpis: Kpi[]
}

export default function KpiList({ initialKpis }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const deferred = useDeferredValue(search)
  const [kpis, setKpis] = useState<Kpi[]>(initialKpis)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const loaderRef = useRef<HTMLDivElement | null>(null)
  const [role, setRole] = useState<string | null>(null)

  const list = useMemo(() => {
    const term = deferred.toLowerCase()
    return kpis.filter(
      (k) =>
        k.name.toLowerCase().includes(term) ||
        (k.description ?? "").toLowerCase().includes(term)
    )
  }, [kpis, deferred])

  const loadMore = async () => {
    if (loading || !hasMore) return
    setLoading(true)
    const res = await getKpis({ offset: kpis.length, limit: 20 })
    setKpis((prev) => {
      const all = [...prev, ...res.kpis]
      const unique = Array.from(new Map(all.map(k => [k.id, k])).values())
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
        <h1 className="text-2xl font-bold">Controlli</h1>
        <Button className="bg-black hover:bg-gray-800" onClick={() => router.push("/kpi/new")}>
          <Plus className="mr-2 h-4 w-4" /> Nuovo Controllo
        </Button>
      </div>

      <div className="relative">
        <Input
          className="pl-10"
          placeholder="Cerca Controllo..."
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
          <h3 className="mt-2 text-lg font-medium text-gray-900">Nessun Controllo trovato</h3>
          <p className="mt-1 text-sm text-gray-500">
            {search ? "Nessun risultato per la ricerca corrente." : "Inizia creando un nuovo Controllo."}
          </p>
          {search ? (
            <Button variant="outline" className="mt-4" onClick={() => setSearch("")}>Cancella ricerca</Button>
          ) : (
            <Button className="mt-4 bg-black hover:bg-gray-800" onClick={() => router.push("/kpi/new")}>
              <Plus className="mr-2 h-4 w-4" /> Nuovo Controllo
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg border">
          <Accordion type="single" collapsible className="w-full">
            {list.map((k) => (
              <AccordionItem key={k.id} value={k.id} className="border-b">
                <AccordionTrigger className="px-4 py-3 hover:bg-gray-50 group">
                  <div className="flex flex-1 items-center justify-between pr-4">
                    <div className="text-left">
                      <h3 className="text-base font-medium">{k.name}</h3>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 pt-2">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">Descrizione</div>
                      <div className="text-sm">{k.description || "Nessuna descrizione disponibile"}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">Valore</div>
                      <div className="space-y-4">
                        {Array.isArray(k.value) ? (
                          k.value.map((item: any, idx: number) => (
                            <div
                              key={idx}
                              className="bg-white border rounded-lg p-4 shadow-sm"
                            >
                              <div>
                                <div className="text-lg font-semibold text-gray-900">{item.name}</div>
                                <div className="text-sm italic text-gray-500 mb-2">{item.description || "Nessuna descrizione"}</div>
                              </div>
                              <div className="flex items-center text-sm text-gray-700 mb-2">
                                <span className="font-medium mr-2">Tipo:</span>
                                <span className="capitalize mr-2">{item.type}</span>
                                {item.type === "number" && (
                                  <span className="text-xs text-gray-500 ml-2">
                                    (min: <span className="font-semibold">{item.min}</span>, max: <span className="font-semibold">{item.max}</span>)
                                  </span>
                                )}
                              </div>
                              <div>
                                <span className="font-medium text-sm mr-2">Obbligatorio:</span>
                                {item.required ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-800">
                                    <CheckCircle2 className="w-3 h-3 mr-1" /> Sì
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-600">
                                    <XCircle className="w-3 h-3 mr-1" /> No
                                  </span>
                                )}
                              </div>
                            </div>
                          ))
                        ) : typeof k.value === "object" && k.value !== null ? (
                          <div className="bg-white border rounded-lg p-4 shadow-sm">
                            <div>
                              <div className="text-lg font-semibold text-gray-900">{k.value.name}</div>
                              <div className="text-sm italic text-gray-500 mb-2">{k.value.description || "Nessuna descrizione"}</div>
                            </div>
                            <div className="flex items-center text-sm text-gray-700 mb-2">
                              <span className="font-medium mr-2">Tipo:</span>
                              <span className="capitalize mr-2">{k.value.type}</span>
                              {k.value.type === "number" && (
                                <span className="text-xs text-gray-500 ml-2">
                                  (min: <span className="font-semibold">{k.value.min}</span>, max: <span className="font-semibold">{k.value.max}</span>)
                                </span>
                              )}
                            </div>
                            <div>
                              <span className="font-medium text-sm mr-2">Obbligatorio:</span>
                              {k.value.required ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-800">
                                  <CheckCircle2 className="w-3 h-3 mr-1" /> Sì
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-600">
                                  <XCircle className="w-3 h-3 mr-1" /> No
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="block text-base">{String(k.value)}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-3 pt-2">
                      <Button
                        className="bg-black hover:bg-gray-800"
                        size="sm"
                        onClick={() => router.push(`/kpi/${k.id}/edit`)}
                      >
                        <Edit className="w-4 h-4 mr-2" /> Modifica
                      </Button>
                      {role === "admin" && (
                        <KpiDeleteDialog
                          onDelete={async () => {
                            await fetch(`/api/kpi/delete?id=${k.id}`, { method: "POST" })
                            setKpis((prev) => prev.filter((kpi) => kpi.id !== k.id))
                          }}
                        >
                          <Button variant="destructive" size="sm">
                            <Trash2 className="w-4 h-4 mr-2" /> Elimina
                          </Button>
                        </KpiDeleteDialog>
                      )}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          {hasMore && (
            <div ref={loaderRef} className="py-4 text-center text-gray-400">
              {loading ? "Caricamento altri Controlli..." : "Scorri per caricare altri"}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
