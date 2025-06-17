"use client"

import {
  useState,
  useEffect,
  useTransition,
  useCallback,
} from "react"
import {
  updateTaskStatus,
  updateTaskValue,
  getTodolistTasks,
  completeTodolist,
  getTodolistTasksById,
} from "@/app/actions/actions-todolist"
import { getKpis } from "@/app/actions/actions-kpi"
import { getDevice } from "@/app/actions/actions-device"
import type { Task } from "@/lib/validation/todolist-schemas"
import type { Kpi } from "@/lib/validation/kpi-schemas"
import { Check, AlertCircle, Info, Save, Loader2, Upload, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import Image from "next/image"

import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { toast } from "@/components/ui/use-toast"

interface Props {
  initialData: { tasks: Task[]; hasMore: boolean }
  todolistId: string
  deviceId: string
  date: string
  timeSlot: string
  initialKpis?: Kpi[]
  deviceInfo?: { name: string; location: string } | null
}

// Define types for KPI field
interface KpiField {
  id?: string;
  name: string;
  description?: string;
  type: string;
  required?: boolean;
  min?: number;
  max?: number;
}

/* --------------------------------------------------------------
 * Helpers
 * ----------------------------------------------------------- */
const TIMESLOT_LABEL: Record<string, string> = {
  mattina: "Mattina (6-12)",
  pomeriggio: "Pomeriggio (12-18)",
  sera: "Sera (18-22)",
  notte: "Notte (22-6)",
  giornata: "Giornata (6-20)",
}

const labelForSlot = (s: string) => {
  // Check if it's a standard time slot
  if (s in TIMESLOT_LABEL) {
    return TIMESLOT_LABEL[s]
  }
  
  // Check if it's a custom time slot string (e.g., "custom:90-1020")
  if (s.startsWith('custom:')) {
    const parts = s.split(':')[1]?.split('-')
    if (parts && parts.length === 2) {
      const startMinutes = parseInt(parts[0])
      const endMinutes = parseInt(parts[1])
      
      if (!isNaN(startMinutes) && !isNaN(endMinutes)) {
        const startHours = Math.floor(startMinutes / 60)
        const startMins = startMinutes % 60
        const endHours = Math.floor(endMinutes / 60)
        const endMins = endMinutes % 60
        
        const startTime = `${startHours.toString().padStart(2, '0')}:${startMins.toString().padStart(2, '0')}`
        const endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`
        
        return `Personalizzato (${startTime}-${endTime})`
      }
    }
  }
  
  // Fallback to original string
  return s
}

const storageKey = (id: string, day: string, slot: string) =>
  `todolist-${id}-${day}-${slot}`

// Type validation helper
const validateFieldValue = (value: any, field: any): { valid: boolean; message?: string } => {
  // Skip validation if value is empty (required check is handled separately)
  if (value === undefined || value === null || value === "") {
    return { valid: true }
  }

  switch (field.type) {
    case "number":
      // For integer type, ensure it's a whole number
      if (!Number.isInteger(Number(value))) {
        return { valid: false, message: "Il valore deve essere un numero intero" }
      }
      // Check range constraints if defined
      if (field.min !== undefined && Number(value) < field.min) {
        return { valid: false, message: `Il valore deve essere maggiore o uguale a ${field.min}` }
      }
      if (field.max !== undefined && Number(value) > field.max) {
        return { valid: false, message: `Il valore deve essere minore o uguale a ${field.max}` }
      }
      return { valid: true }
      
    case "decimal":
      // For decimal type, ensure it's a valid number (can have decimal points)
      if (isNaN(Number(value))) {
        return { valid: false, message: "Il valore deve essere un numero decimale valido" }
      }
      // Check range constraints if defined
      if (field.min !== undefined && Number(value) < field.min) {
        return { valid: false, message: `Il valore deve essere maggiore o uguale a ${field.min}` }
      }
      if (field.max !== undefined && Number(value) > field.max) {
        return { valid: false, message: `Il valore deve essere minore o uguale a ${field.max}` }
      }
      return { valid: true }
      
    case "date":
      const date = new Date(value)
      if (isNaN(date.getTime())) {
        return { valid: false, message: "Data non valida" }
      }
      return { valid: true }
      
    case "boolean":
      // For boolean type, value should be explicitly true or false
      if (typeof value !== "boolean") {
        return { valid: false, message: "Selezionare Sì o No" }
      }
      return { valid: true }
      
    case "select":
      // Check if the value is one of the available options
      if (field.options && !field.options.some((o: any) => o.value === value)) {
        return { valid: false, message: "Selezionare un'opzione valida" }
      }
      return { valid: true }
      
    default:
      // For text and textarea, we don't need specific type validation
      return { valid: true }
  }
}

/* --------------------------------------------------------------
 * Hook: persist dirty values in localStorage
 * ----------------------------------------------------------- */
function usePersistedValues(key: string) {
  const [values, setValues] = useState<Record<string, unknown>>({})
  const [dirty, setDirty] = useState<Set<string>>(new Set())

  // initial load
  useEffect(() => {
    const raw = localStorage.getItem(key)
    if (!raw) return
    try {
      const { values: v, dirty: d } = JSON.parse(raw)
      setValues(v ?? {})
      setDirty(new Set(d ?? []))
    } catch (e) {
      console.error("localStorage parse error", e)
    }
  }, [key])

  // persist
  useEffect(() => {
    if (!dirty.size) return
    localStorage.setItem(
      key,
      JSON.stringify({ values, dirty: Array.from(dirty) }),
    )
  }, [key, values, dirty])

  const update = useCallback((id: string, value: unknown) => {
    setValues((p) => ({ ...p, [id]: value }))
    setDirty((p) => new Set(p).add(id))
  }, [])

  const clear = () => {
    setValues({})
    setDirty(new Set())
    localStorage.removeItem(key)
  }

  return { values, dirty, update, clear }
}

/* --------------------------------------------------------------
 * Component
 * ----------------------------------------------------------- */
export default function TodolistClient({
  initialData,
  todolistId,
  deviceId,
  date,
  timeSlot,
  initialKpis = [],
  deviceInfo: initialDeviceInfo = null,
}: Props) {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [tasks, setTasks] = useState<Task[]>(initialData.tasks)
  const [hasMore, setHasMore] = useState(initialData.hasMore)
  const [offset, setOffset] = useState(initialData.tasks.length)
  const [isPending, startTransition] = useTransition()
  const [savingTaskId, setSavingTaskId] = useState<string | null>(null)
  const [isSavingAll, setIsSavingAll] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)
  const [uploadingImages, setUploadingImages] = useState<Record<string, boolean>>({})

  const [kpis, setKpis] = useState<Kpi[]>(initialKpis)
  const [kpisLoading, setKpisLoading] = useState(initialKpis.length === 0)
  const [deviceInfo, setDeviceInfo] = useState(initialDeviceInfo)

  const {
    values: localValues,
    dirty: dirtyFields,
    update: setLocalValue,
    clear: clearDirty,
  } = usePersistedValues(storageKey(deviceId, date, timeSlot))

  /* ------- lazy fetch of KPI e device -------- */
  useEffect(() => {
    if (initialKpis.length === 0) {
      setKpisLoading(true)
      getKpis({ offset: 0, limit: 100 }).then(({ kpis }) => {
        setKpis(kpis)
        setKpisLoading(false)
      }).catch(error => {
        console.error("Error fetching KPIs:", error)
        toast({
          title: "Errore",
          description: "Impossibile caricare i controlli. Riprova più tardi.",
          variant: "destructive"
        })
        setKpisLoading(false)
      })
    }
    if (!initialDeviceInfo) {
      getDevice(deviceId).then((d) => {
        if (d) setDeviceInfo({ name: d.name, location: d.location })
      }).catch(error => {
        console.error("Error fetching device:", error)
        toast({
          title: "Errore",
          description: "Impossibile caricare le informazioni del dispositivo. Riprova più tardi.",
          variant: "destructive"
        })
      })
    }
  }, [deviceId, initialKpis, initialDeviceInfo])

  /* ---------------- pagination ---------------- */
  const loadMore = () =>
    startTransition(async () => {
      try {
        const res = await getTodolistTasksById({
          todolistId,
          offset,
          limit: 20,
        })
        setTasks((p) => [...p, ...res.tasks])
        setHasMore(res.hasMore)
        setOffset((o) => o + res.tasks.length)
      } catch (error) {
        console.error("Error loading more tasks:", error)
        toast({
          title: "Errore",
          description: "Impossibile caricare altre attività. Riprova più tardi.",
          variant: "destructive"
        })
      }
    })

  /* ---------------- mutations ----------------- */
  const handleCompleteTodolist = async () => {
    setIsCompleting(true)
    try {
      // Salva tutti i valori locali (inclusi quelli non dirty)
      const savePromises = Object.entries(localValues).map(async ([taskId, value]) => {
        if (value !== undefined && value !== null) {
          await updateTaskValue(taskId, value)
        }
      })
      await Promise.all(savePromises)

      // Poi completa la todolist
      await completeTodolist(todolistId)
      
      // Aggiorna lo stato locale
      setTasks(tasks.map(task => ({ 
        ...task, 
        status: "completed",
        value: localValues[task.id] !== undefined ? localValues[task.id] : task.value 
      })))
      clearDirty()
      
      toast({
        title: "Todolist completata",
        description: "Tutte le attività sono state completate con successo.",
      })
    } catch (error) {
      console.error("Error completing todolist:", error)
      toast({
        title: "Errore",
        description: "Impossibile completare la todolist. Riprova più tardi.",
        variant: "destructive"
      })
    } finally {
      setIsCompleting(false)
    }
  }

  /* ---------- unload protection --------------- */
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirtyFields.size) {
        const msg = "Ci sono modifiche non salvate. Sicuro di voler uscire?"
        e.preventDefault()
        e.returnValue = msg
        return msg
      }
    }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [dirtyFields])

  const handleImageUpload = async (file: File, taskId: string, field: KpiField, idx: number) => {
    try {
      setUploadingImages(prev => ({ ...prev, [taskId]: true }))
      
      // Find the task from the tasks array
      const currentTask = tasks.find(t => t.id === taskId)
      if (!currentTask) {
        throw new Error('Task not found')
      }
      
      // Generate a unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${taskId}-${Date.now()}.${fileExt}`
      const filePath = `${fileName}`

      // Upload to Supabase Storage
      const { error: uploadError, data } = await supabase.storage
        .from('images')
        .upload(filePath, file)

      if (uploadError) {
        throw uploadError
      }

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath)

      // Update the task value with the image URL
      const fields = Array.isArray(kpis.find(k => k.id === currentTask.kpi_id)?.value) 
        ? kpis.find(k => k.id === currentTask.kpi_id)?.value 
        : [kpis.find(k => k.id === currentTask.kpi_id)?.value]

      if (!fields) return

      let newValue
      if (fields.length === 1) {
        newValue = { 
          id: field.id || `${currentTask.kpi_id}-${field.name.toLowerCase().replace(/\s+/g, '_')}`,
          value: publicUrl 
        }
      } else {
        const current = localValues[taskId] || currentTask.value
        newValue = [...(Array.isArray(current) ? current : Array(fields.length).fill(null))]
        newValue[idx] = { 
          id: field.id || `${currentTask.kpi_id}-${field.name.toLowerCase().replace(/\s+/g, '_')}`,
          value: publicUrl 
        }
      }

      setLocalValue(taskId, newValue)
    } catch (error) {
      console.error('Error uploading image:', error)
      toast({
        title: "Errore",
        description: "Errore durante il caricamento dell'immagine",
        variant: "destructive"
      })
    } finally {
      setUploadingImages(prev => ({ ...prev, [taskId]: false }))
    }
  }

  /* ---------------- render utils -------------- */
  const renderInput = (task: Task, kpi?: Kpi) => {
    const current = dirtyFields.has(task.id) ? localValues[task.id] : task.value

    // Default simple input for when we don't have KPI field type info
    const simpleInput = (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">
            Valore
            <span className="text-red-500 ml-1">*</span>
          </label>
          <span className="text-xs text-muted-foreground">Testo</span>
        </div>
        <Input
          value={typeof current === "object" ? JSON.stringify(current) : current ?? ""}
          onChange={(e) => setLocalValue(task.id, e.target.value)}
          disabled={isPending}
          placeholder="Inserisci il valore"
        />
        {kpi?.description && (
          <p className="text-xs text-muted-foreground">{kpi.description}</p>
        )}
      </div>
    )
    if (!kpi || !kpi.value) return simpleInput

    const fields = Array.isArray(kpi.value) ? kpi.value : [kpi.value]

    return (
      <div className="space-y-4">
        {fields.map((field, idx) => {
          const setVal = (val: any, field: KpiField, idx: number) => {
            let newValue
            if (fields.length === 1) {
              newValue = { 
                id: field.id || `${kpi.id}-${field.name.toLowerCase().replace(/\s+/g, '_')}`,
                value: val 
              }
            } else {
              newValue = [...(Array.isArray(current) ? current : Array(fields.length).fill(null))]
              newValue[idx] = { 
                id: field.id || `${kpi.id}-${field.name.toLowerCase().replace(/\s+/g, '_')}`,
                value: val 
              }
            }
            setLocalValue(task.id, newValue)
          }

          const val = Array.isArray(current)
            ? current[idx]?.value
            : typeof current === "object" && current !== null
            ? (current as any).value
            : current

          switch (field.type) {
            case "text":
              return (
                <div key={idx} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">
                      {field.name || "Testo"}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    <span className="text-xs text-muted-foreground">Testo breve</span>
                  </div>
                  <Input
                    value={val ?? ""}
                    onChange={(e) => setVal(e.target.value, field, idx)}
                    disabled={isPending}
                    placeholder="Inserisci testo"
                    required={field.required}
                  />
                  {field.description && (
                    <p className="text-xs text-muted-foreground">{field.description}</p>
                  )}
                </div>
              )

            case "textarea":
              return (
                <div key={idx} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">
                      {field.name || "Descrizione"}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    <span className="text-xs text-muted-foreground">Testo lungo</span>
                  </div>
                  <Input
                    value={val ?? ""}
                    onChange={(e) => setVal(e.target.value, field, idx)}
                    disabled={isPending}
                    placeholder="Inserisci descrizione"
                    required={field.required}
                  />
                  {field.description && (
                    <p className="text-xs text-muted-foreground">{field.description}</p>
                  )}
                </div>
              )

            case "number":
              return (
                <div key={idx} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">
                      {field.name || "Numero intero"}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    <span className="text-xs text-muted-foreground">Numero intero</span>
                  </div>
                  <Input
                    type="number"
                    step="1"
                    min={field.min}
                    max={field.max}
                    value={val ?? ""}
                    onChange={(e) => {
                      const value = e.target.value === "" ? "" : parseInt(e.target.value, 10);
                      setVal(value, field, idx);
                    }}
                    onBlur={(e) => {
                      if (e.target.value !== "") {
                        const validation = validateFieldValue(parseInt(e.target.value, 10), field);
                        if (!validation.valid && validation.message) {
                          toast({
                            title: "Valore non valido",
                            description: validation.message,
                            variant: "destructive"
                          });
                        }
                      }
                    }}
                    disabled={isPending}
                    required={field.required}
                  />
                  {field.description && (
                    <p className="text-xs text-muted-foreground">{field.description}</p>
                  )}
                  {field.min !== undefined && field.max !== undefined && (
                    <p className="text-xs text-muted-foreground">
                      Range: {field.min} - {field.max}
                    </p>
                  )}
                </div>
              )

            case "decimal":
              return (
                <div key={idx} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">
                      {field.name || "Numero decimale"}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    <span className="text-xs text-muted-foreground">Numero decimale</span>
                  </div>
                  <Input
                    type="number"
                    step="0.01"
                    min={field.min}
                    max={field.max}
                    value={val ?? ""}
                    onChange={(e) => {
                      const value = e.target.value === "" ? "" : parseFloat(e.target.value);
                      setVal(value, field, idx);
                    }}
                    onBlur={(e) => {
                      if (e.target.value !== "") {
                        const validation = validateFieldValue(parseFloat(e.target.value), field);
                        if (!validation.valid && validation.message) {
                          toast({
                            title: "Valore non valido",
                            description: validation.message,
                            variant: "destructive"
                          });
                        }
                      }
                    }}
                    disabled={isPending}
                    required={field.required}
                  />
                  {field.description && (
                    <p className="text-xs text-muted-foreground">{field.description}</p>
                  )}
                  {field.min !== undefined && field.max !== undefined && (
                    <p className="text-xs text-muted-foreground">
                      Range: {field.min} - {field.max}
                    </p>
                  )}
                </div>
              )

            case "date":
              return (
                <div key={idx} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">
                      {field.name || "Data"}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    <span className="text-xs text-muted-foreground">Data</span>
                  </div>
                  <Input
                    type="date"
                    value={val ?? ""}
                    onChange={(e) => {
                      setVal(e.target.value, field, idx);
                    }}
                    onBlur={(e) => {
                      if (e.target.value) {
                        const validation = validateFieldValue(e.target.value, field);
                        if (!validation.valid && validation.message) {
                          toast({
                            title: "Data non valida",
                            description: validation.message,
                            variant: "destructive"
                          });
                        }
                      }
                    }}
                    disabled={isPending}
                    required={field.required}
                  />
                  {field.description && (
                    <p className="text-xs text-muted-foreground">{field.description}</p>
                  )}
                </div>
              )

            case "boolean":
              return (
                <div key={idx} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">
                      {field.name || "Sì/No"}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    <span className="text-xs text-muted-foreground">Sì/No</span>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      type="button"
                      variant={val === true ? "default" : "outline"}
                      onClick={() => setVal(true, field, idx)}
                      disabled={isPending}
                      className={val === true ? "bg-green-600 hover:bg-green-700" : ""}
                    >
                      Sì
                    </Button>
                    <Button
                      type="button"
                      variant={val === false ? "default" : "outline"}
                      onClick={() => setVal(false, field, idx)}
                      disabled={isPending}
                      className={val === false ? "bg-red-600 hover:bg-red-700" : ""}
                    >
                      No
                    </Button>
                  </div>
                  {field.description && (
                    <p className="text-xs text-muted-foreground">{field.description}</p>
                  )}
                </div>
              )

            case "select":
              return (
                <div key={idx} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">
                      {field.name || "Selezione"}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    <span className="text-xs text-muted-foreground">Selezione</span>
                  </div>
                  <Select 
                    value={val ?? ""} 
                    onValueChange={(newVal) => {
                      setVal(newVal, field, idx);
                    }} 
                    disabled={isPending}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Seleziona" />
                    </SelectTrigger>
                    <SelectContent>
                      {field.options?.map((o: any) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {field.description && (
                    <p className="text-xs text-muted-foreground">{field.description}</p>
                  )}
                </div>
              )

            case "image":
              return (
                <div key={idx} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">
                      {field.name || "Immagine"}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    <span className="text-xs text-muted-foreground">Immagine</span>
                  </div>
                  <div className="space-y-2">
                    {val && (
                      <div className="relative w-full aspect-video rounded-md overflow-hidden border">
                        <Image 
                          src={val} 
                          alt={field.name || "Immagine caricata"} 
                          fill
                          className="object-contain"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 h-6 w-6"
                          onClick={() => setVal("", field, idx)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            handleImageUpload(file, task.id, field, idx)
                          }
                        }}
                        disabled={isPending || uploadingImages[task.id]}
                        className="hidden"
                        id={`image-upload-${task.id}-${idx}`}
                      />
                      <label
                        htmlFor={`image-upload-${task.id}-${idx}`}
                        className={`flex items-center justify-center gap-2 px-4 py-2 rounded-md border cursor-pointer
                          ${isPending || uploadingImages[task.id] 
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                            : 'bg-white hover:bg-gray-50'}`}
                      >
                        {uploadingImages[task.id] ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Caricamento...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4" />
                            {val ? 'Cambia immagine' : 'Carica immagine'}
                          </>
                        )}
                      </label>
                    </div>
                  </div>
                  {field.description && (
                    <p className="text-xs text-muted-foreground">{field.description}</p>
                  )}
                </div>
              )

            default:
              return simpleInput
          }
        })}
      </div>
    )
  }

  /* ---------------- JSX ----------------------- */
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between gap-2">
          <div>
            <CardTitle>Todolist</CardTitle>
            {!deviceInfo ? (
              <>
                <Skeleton className="h-4 w-32 mt-1" />
                <Skeleton className="h-3 w-24 mt-1" />
              </>
            ) : (
              <>
                <p className="text-gray-600">
                  {deviceInfo.name} – {deviceInfo.location}
                </p>
                <p className="text-sm text-muted-foreground">
                  {date} – {labelForSlot(timeSlot)}
                </p>
              </>
            )}
          </div>

          <div className="flex gap-2">
            {tasks.some(task => task.status !== "completed") && (
              <Button 
                onClick={handleCompleteTodolist}
                disabled={isPending || isCompleting}
                className="relative bg-green-600 hover:bg-green-700"
              >
                {isCompleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Completamento...
                  </>
                ) : (
                  <>
                    <Check size={16} className="mr-2" />
                    Completa Todolist
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {tasks.length === 0 ? (
          isPending ? (
            <SkeletonList count={6} />
          ) : (
            <EmptyState />
          )
        ) : (
          <>
            {/* Pending tasks section */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {tasks
                .filter(task => task.status !== "completed")
                .map((task) => {
                  const kpi = kpis.find((k) => k.id === task.kpi_id)
                  const dirty = dirtyFields.has(task.id)
                  return (
                    <Card key={task.id} className={dirty ? "ring-1 ring-amber-500" : ""}>
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <CardTitle className="text-md flex items-center">
                              {kpi?.name ?? "Controllo sconosciuto"}
                              {dirty && (
                                <Badge variant="outline" className="ml-2 text-amber-600 border-amber-600">
                                  Modificato
                                </Badge>
                              )}
                            </CardTitle>
                            {kpi?.description && <CardDescription className="text-xs mt-1">{kpi.description}</CardDescription>}
                          </div>
                        </div>
                      </CardHeader>
                      <Separator />
                      <CardContent className="pt-4">
                        {kpisLoading ? <ValueSkeleton /> : renderInput(task, kpi)}
                      </CardContent>
                    </Card>
                  )
                })}
            </div>
            
            {/* Completed tasks section */}
            {tasks.some(task => task.status === "completed") && (
              <div className="mt-8">
                <h3 className="font-medium text-lg mb-3 flex items-center">
                  <Check size={18} className="text-green-600 mr-2" />
                  Attività completate
                </h3>
                <div className="space-y-2">
                  {tasks
                    .filter(task => task.status === "completed")
                    .map((task) => {
                      const kpi = kpis.find((k) => k.id === task.kpi_id)
                      return (
                        <Card key={task.id} className="bg-muted/20">
                          <CardContent className="p-3">
                            <div className="flex justify-between items-start">
                              <div className="w-full">
                                <h4 className="font-medium">{kpi?.name ?? "Controllo sconosciuto"}</h4>
                                
                                {/* Display task value based on its type */}
                                <div className="text-sm text-muted-foreground mt-1">
                                  {/* For array values */}
                                  {Array.isArray(task.value) && (
                                    <div className="space-y-2">
                                      {task.value.map((item: { id?: string; value: any }, idx: number) => {
                                        const fieldDef = Array.isArray(kpi?.value) ? kpi.value[idx] : null;
                                        const isImageField = fieldDef?.type === 'image';
                                        
                                        return (
                                          <div key={idx}>
                                            <div>
                                              <span className="font-medium text-xs">{fieldDef?.name || `Campo ${idx + 1}`}: </span>
                                              {isImageField && item?.value ? (
                                                <div className="mt-2 w-full rounded-md overflow-hidden border relative" style={{ height: 200 }}>
                                                  <Image
                                                    src={item.value}
                                                    alt={fieldDef?.name || "Immagine"}
                                                    fill
                                                    className="object-contain"
                                                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                                  />
                                                </div>
                                              ) : (
                                                <span>{item?.value !== undefined ? String(item.value) : "N/A"}</span>
                                              )}
                                            </div>
                                            {fieldDef?.description && (
                                              <p className="text-xs text-muted-foreground">{fieldDef.description}</p>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                  
                                  {/* For object value */}
                                  {!Array.isArray(task.value) && typeof task.value === 'object' && task.value !== null && kpi?.value?.[0]?.type === 'image' && task.value.value ? (
                                    <div className="mt-2 w-full rounded-md overflow-hidden border relative" style={{ height: 200 }}>
                                      <Image
                                        src={task.value.value}
                                        alt={kpi?.value?.[0]?.name || "Immagine"}
                                        fill
                                        className="object-contain"
                                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                      />
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                </div>
              </div>
            )}
            
            {hasMore && (
              <Button variant="outline" onClick={loadMore} disabled={isPending} className="mt-4 w-full">
                {isPending ? "Caricamento..." : "Carica altri"}
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

/* --------------------------------------------------------------
 * UI Helpers
 * ----------------------------------------------------------- */
function SkeletonList({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="overflow-hidden border shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-2/3" />
              </div>
              <Skeleton className="h-8 w-8 rounded" />
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="pt-4 space-y-3">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
      ))}
    </>
  )
}

function ValueSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  )
}

function EmptyState() {
  return (
    <div className="text-center py-8 border rounded-md bg-muted/20">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-2">
        <Info size={24} className="text-muted-foreground" />
      </div>
      <h3 className="font-medium">Nessuna task trovata</h3>
      <p className="text-sm text-muted-foreground mt-1">Non ci sono KPI da completare in questa todolist</p>
    </div>
  )
}
