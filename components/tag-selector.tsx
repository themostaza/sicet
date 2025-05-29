"use client"

import { useMemo, useCallback } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tag, X } from "lucide-react"

interface TagSelectorProps {
  availableTags: string[]
  selectedTags: string[]
  onTagsChange: (tags: string[]) => void
  className?: string
}

export function TagSelector({
  availableTags,
  selectedTags,
  onTagsChange,
  className = "",
}: TagSelectorProps) {
  /* conteggio tag memo-izzato: ricalcolato solo quando cambia availableTags */
  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    availableTags.forEach((tag) => {
      counts[tag] = (counts[tag] || 0) + 1
    })
    return counts
  }, [availableTags])

  /* seleziona / deseleziona */
  const handleTagClick = useCallback(
    (tag: string) => {
      const next =
        selectedTags.includes(tag)
          ? selectedTags.filter((t) => t !== tag)
          : [...selectedTags, tag]
      onTagsChange(next)
    },
    [selectedTags, onTagsChange],
  )

  const clearAllTags = () => onTagsChange([])

  return (
    <Card className={`overflow-hidden ${className}`}>
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* titolo */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Tag className="h-4 w-4" />
              <h3 className="text-sm font-medium">Filtro per Tag</h3>
            </div>

            {selectedTags.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllTags}
                className="h-7 px-2 text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                Rimuovi tutti
              </Button>
            )}
          </div>

          {/* elenco tag */}
          <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-md min-h-[60px]">
            {availableTags.length === 0 ? (
              <div className="w-full text-center text-sm text-gray-500 py-1">
                Nessun tag disponibile
              </div>
            ) : (
              availableTags.map((tag) => {
                const isSelected = selectedTags.includes(tag)
                const count = tagCounts[tag] || 0

                return (
                  <Badge
                    key={tag}
                    variant={isSelected ? "default" : "outline"}
                    className={`cursor-pointer transition-all duration-200 ${
                      isSelected ? "bg-black hover:bg-gray-800" : "hover:bg-gray-100"
                    }`}
                    onClick={() => handleTagClick(tag)}
                  >
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
