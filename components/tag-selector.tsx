"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Filter, Tag, X, CheckCircle2 } from "lucide-react"

interface TagSelectorProps {
  availableTags: string[]
  selectedTags: string[]
  onTagsChange: (tags: string[]) => void
  onSelectDevicesWithTags?: () => void
  className?: string
}

export function TagSelector({
  availableTags,
  selectedTags,
  onTagsChange,
  onSelectDevicesWithTags,
  className = "",
}: TagSelectorProps) {
  // Local state for tag filter mode - this doesn't need to be in the parent component
  const [tagFilterMode, setTagFilterMode] = useState<"OR" | "AND">("OR")

  // Calculate tag counts - moved from parent to this component
  const [tagCounts, setTagCounts] = useState<Record<string, number>>({})

  // Effect to update tag counts when available tags change
  useEffect(() => {
    // This is a one-time calculation when availableTags changes, not on every render
    const counts: Record<string, number> = {}
    availableTags.forEach((tag) => {
      counts[tag] = (counts[tag] || 0) + 1
    })
    setTagCounts(counts)
  }, [availableTags])

  // Handle tag selection - completely isolated from device selection
  const handleTagClick = (tag: string) => {
    // Create a new array instead of mutating the existing one
    const newSelectedTags = selectedTags.includes(tag) ? selectedTags.filter((t) => t !== tag) : [...selectedTags, tag]

    // Call the parent's callback with the new array
    onTagsChange(newSelectedTags)
  }

  // Clear all tags
  const clearAllTags = () => {
    onTagsChange([])
  }

  // Toggle tag filter mode
  const toggleTagFilterMode = () => {
    setTagFilterMode((prev) => (prev === "OR" ? "AND" : "OR"))
  }

  return (
    <Card className={`overflow-hidden ${className}`}>
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Tag className="h-4 w-4" />
              <h3 className="text-sm font-medium">Filtro per Tag</h3>
            </div>

            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={toggleTagFilterMode} className="h-7 px-2 text-xs">
                <Filter className="h-3 w-3 mr-1" />
                {tagFilterMode === "OR" ? "Qualsiasi tag (OR)" : "Tutti i tag (AND)"}
              </Button>

              {selectedTags.length > 0 && (
                <>
                  {onSelectDevicesWithTags && (
                    <Button variant="outline" size="sm" onClick={onSelectDevicesWithTags} className="h-7 px-2 text-xs">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Seleziona dispositivi
                    </Button>
                  )}

                  <Button variant="outline" size="sm" onClick={clearAllTags} className="h-7 px-2 text-xs">
                    <X className="h-3 w-3 mr-1" />
                    Rimuovi tutti
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-md min-h-[60px]">
            {availableTags.length === 0 ? (
              <div className="w-full text-center text-sm text-gray-500 py-1">Nessun tag disponibile</div>
            ) : (
              availableTags.map((tag) => {
                const isSelected = selectedTags.includes(tag)
                const count = tagCounts[tag] || 0

                return (
                  <Badge
                    key={tag}
                    variant={isSelected ? "default" : "outline"}
                    className={`
                      cursor-pointer transition-all duration-200 
                      ${isSelected ? "bg-black hover:bg-gray-800" : "hover:bg-gray-100"}
                    `}
                    onClick={() => handleTagClick(tag)}
                  >
                    <Tag className="h-3 w-3 mr-1" />
                    {tag}
                    <span className="ml-1 text-xs opacity-70">({count})</span>
                  </Badge>
                )
              })
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
