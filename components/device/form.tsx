"use client"
import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Plus, Loader2 } from "lucide-react"
import type { Device } from "@/lib/validation/device-schemas"
import { DeviceFormSchema } from "@/lib/validation/device-schemas"
import { Textarea } from "../ui/textarea"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { FormField, FormItem, FormLabel, FormControl, FormMessage, Form } from "@/components/ui/form"

// Utilizziamo lo schema condiviso dal server
type DeviceFormValues = z.infer<typeof DeviceFormSchema>

interface Props {
  device?: Device | null
  mode: "create" | "edit"
  action: (formData: FormData) => void
  disabled?: boolean
  defaultId?: string
}

export default function DeviceForm({ device, mode, action, disabled, defaultId }: Props) {
  const [tags, setTags] = useState<string[]>(device?.tags ?? [])
  const [tagInput, setTagInput] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<DeviceFormValues>({
    resolver: zodResolver(DeviceFormSchema),
    defaultValues: {
      id: device?.id || defaultId || "",
      name: device?.name || "",
      location: device?.location || "",
      description: device?.description || "",
      tags: device?.tags || []
    },
  })

  const addTag = () => {
    if (!tagInput.trim()) return
    const newTags = tagInput.split(",").map((t) => t.trim()).filter((t) => t && !tags.includes(t))
    const updatedTags = [...tags, ...newTags]
    setTags(updatedTags)
    form.setValue("tags", updatedTags)
    setTagInput("")
  }

  const removeTag = (tagToRemove: string) => {
    const updatedTags = tags.filter((t) => t !== tagToRemove)
    setTags(updatedTags)
    form.setValue("tags", updatedTags)
  }

  const onSubmit = async (data: DeviceFormValues) => {
    setIsSubmitting(true)
    try {
      const formData = new FormData()
      formData.append("id", data.id)
      formData.append("name", data.name)
      formData.append("location", data.location)
      formData.append("description", data.description || "")
      formData.append("tags", JSON.stringify(data.tags))
      await action(formData)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" autoComplete="off">
        <FormField
          control={form.control}
          name="id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>ID</FormLabel>
              <FormControl>
                <Input 
                  {...field} 
                  disabled={mode === "edit" || disabled} 
                  className={mode === "edit" ? "bg-gray-50" : ""} 
                  autoComplete="off"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome</FormLabel>
              <FormControl>
                <Input {...field} autoComplete="off" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrizione</FormLabel>
              <FormControl>
                <Textarea {...field} autoComplete="off" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Posizione</FormLabel>
              <FormControl>
                <Input {...field} autoComplete="off" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="tags"
          render={() => (
            <FormItem>
              <FormLabel>Tag</FormLabel>
              <div className="flex">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") {
                      e.preventDefault()
                      addTag()
                    }
                  }}
                  placeholder="Aggiungi tag"
                  className="rounded-r-none mr-2"
                  autoComplete="off"
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
                      <button type="button" className="ml-2" onClick={() => removeTag(tag)}>×</button>
                    </span>
                  ))}
                </div>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end">
          <Button 
            type="submit" 
            disabled={disabled || isSubmitting} 
            className="bg-black hover:bg-gray-800"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {mode === "create" ? "Creazione..." : "Salvataggio..."}
              </>
            ) : (
              mode === "create" ? "Crea" : "Salva"
            )}
          </Button>
        </div>
      </form>
    </Form>
  )
} 