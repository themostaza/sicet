"use client"
import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import type { Device } from "@/lib/actions"

interface Props {
  device?: Device | null
  mode: "create" | "edit"
  action: (formData: FormData) => void
  disabled?: boolean
}

export default function DeviceForm({ device, mode, action, disabled }: Props) {
  const [tags, setTags] = useState<string[]>(device?.tags ?? [])
  const [tagInput, setTagInput] = useState("")

  const addTag = () => {
    if (!tagInput.trim()) return
    const newTags = tagInput.split(",").map((t) => t.trim()).filter((t) => t && !tags.includes(t))
    setTags([...tags, ...newTags])
    setTagInput("")
  }

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="tags" value={JSON.stringify(tags)} />
      {mode === "edit" && (
        <div className="space-y-2">
          <label className="text-sm font-medium">ID</label>
          <Input name="id" defaultValue={device?.id} disabled className="bg-gray-50" />
        </div>
      )}
      {mode === "create" && (
        <div className="space-y-2">
          <label className="text-sm font-medium">ID</label>
          <Input name="id" required />
        </div>
      )}
      <div className="space-y-2">
        <label className="text-sm font-medium">Nome</label>
        <Input name="name" defaultValue={device?.name} required />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Descrizione</label>
        <Input name="description" defaultValue={device?.description ?? ""} />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Posizione</label>
        <Input name="location" defaultValue={device?.location ?? ""} />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Tag</label>
        <div className="flex">
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            placeholder="Aggiungi tag"
            className="rounded-r-none mr-2"
          />
          <Button type="button" variant="outline" onClick={addTag} className="rounded-l-none">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {tags.map((tag) => (
              <span key={tag} className="bg-gray-100 px-3 py-1 rounded-full text-sm flex items-center">
                {tag}
                <button type="button" className="ml-2" onClick={() => setTags(tags.filter((t) => t !== tag))}>×</button>
              </span>
            ))}
          </div>
        )}
      </div>
      <Button type="submit" disabled={disabled} className="bg-black hover:bg-gray-800">
        {mode === "create" ? "Crea" : "Salva"}
      </Button>
    </form>
  )
} 