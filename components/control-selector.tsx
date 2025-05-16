"use client"

import type React from "react"

import { useState, useCallback, useMemo, memo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

interface Controllo {
  id: string
  nome: string
  descrizione?: string
}

interface ControlSelectorProps {
  controlli: Controllo[]
  selectedControlli: string[]
  onControlliChange: (controlliIds: string[]) => void
  className?: string
}

// Componente singolo controllo memorizzato per evitare re-render inutili
const ControlItem = memo(
  ({
    controllo,
    isSelected,
    onToggle,
  }: {
    controllo: Controllo
    isSelected: boolean
    onToggle: (id: string, event: React.MouseEvent) => void
  }) => {
    // Gestore di eventi per il click sulla checkbox che ferma la propagazione
    const handleCheckboxClick = useCallback(
      (event: React.MouseEvent) => {
        event.stopPropagation()
        onToggle(controllo.id, event)
      },
      [controllo.id, onToggle],
    )

    // Gestore di eventi per il click sulla card
    const handleCardClick = useCallback(
      (event: React.MouseEvent) => {
        onToggle(controllo.id, event)
      },
      [controllo.id, onToggle],
    )

    return (
      <Card
        className={`overflow-hidden cursor-pointer transition-colors duration-150 ${isSelected ? "border-black" : ""}`}
        onClick={handleCardClick}
      >
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <div onClick={handleCheckboxClick}>
              <Checkbox
                checked={isSelected}
                // Importante: non usare onCheckedChange qui per evitare doppi eventi
                // Usiamo solo il gestore di eventi del div padre
              />
            </div>
            <div>
              <div className="text-sm font-medium cursor-pointer">{controllo.nome}</div>
              {controllo.descrizione && <p className="text-xs text-gray-500 mt-1">{controllo.descrizione}</p>}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  },
)
ControlItem.displayName = "ControlItem"

// Componente principale ottimizzato
export function ControlSelector({
  controlli,
  selectedControlli,
  onControlliChange,
  className = "",
}: ControlSelectorProps) {
  // Local state for search
  const [searchTerm, setSearchTerm] = useState("")

  // Gestore di ricerca memorizzato
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
  }, [])

  // Filter controlli based on search term - memoized
  const filteredControlli = useMemo(() => {
    return controlli.filter(
      (controllo) =>
        controllo.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (controllo.descrizione && controllo.descrizione.toLowerCase().includes(searchTerm.toLowerCase())),
    )
  }, [controlli, searchTerm])

  // Handle controllo selection - completely isolated and memoized
  const handleControlloToggle = useCallback(
    (id: string, event: React.MouseEvent) => {
      // Previene qualsiasi comportamento predefinito
      event.preventDefault()

      // Crea un nuovo array invece di modificare quello esistente
      const newSelectedControlli = selectedControlli.includes(id)
        ? selectedControlli.filter((controlloId) => controlloId !== id)
        : [...selectedControlli, id]

      // Chiama il callback del genitore con il nuovo array
      onControlliChange(newSelectedControlli)
    },
    [selectedControlli, onControlliChange],
  )

  return (
    <div className={className}>
      <div className="space-y-4">
        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input placeholder="Cerca controlli..." className="pl-9" value={searchTerm} onChange={handleSearchChange} />
        </div>

        {/* Controls grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {filteredControlli.length === 0 ? (
            <p className="text-gray-500 col-span-2">
              {controlli.length === 0
                ? "Nessun controllo disponibile. Crea prima un controllo."
                : "Nessun controllo corrisponde alla ricerca."}
            </p>
          ) : (
            filteredControlli.map((controllo) => (
              <ControlItem
                key={controllo.id}
                controllo={controllo}
                isSelected={selectedControlli.includes(controllo.id)}
                onToggle={handleControlloToggle}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
