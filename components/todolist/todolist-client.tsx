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
import { Check, AlertCircle, Info, Save, Loader2, Upload, X, Eye, Calendar as CalendarIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { createClientSupabaseClient } from "@/lib/supabase-client"
import Image from "next/image"
import { isTodolistExpired, isCustomTimeSlotString, parseCustomTimeSlotString } from "@/lib/validation/todolist-schemas"
import { formatDateEuropean } from "@/lib/utils"

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
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { it } from "date-fns/locale"

interface Props {
  initialData: { tasks: Task[]; hasMore: boolean }
  todolistId: string
  deviceId: string
  date: string
  timeSlot: string
  initialKpis?: Kpi[]
  deviceInfo?: { name: string; location: string } | null
  todolistData?: {
    id: string
    device_id: string
    scheduled_execution: string
    status: "pending" | "in_progress" | "completed"
    time_slot_type: "standard" | "custom"
    time_slot_start: number | null
    time_slot_end: number | null
    created_at: string | null
    updated_at: string | null
    completion_date?: string | null
  } | null
  completionUserEmail?: string | null
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
  options?: string[];
}

/* --------------------------------------------------------------
 * Helpers
 * ----------------------------------------------------------- */


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
      
    case "image":
      // For image type, value should be a valid URL string
      if (typeof value !== "string" || value.trim() === "") {
        return { valid: false, message: "Caricare un'immagine" }
      }
      return { valid: true }
      
    case "select":
      // Check if the value is one of the available options
      if (field.options && !field.options.includes(value)) {
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
  todolistData,
  completionUserEmail,
}: Props) {
  const router = useRouter()
  const supabase = createClientSupabaseClient()
  const [tasks, setTasks] = useState<Task[]>(initialData.tasks)
  const [hasMore, setHasMore] = useState(initialData.hasMore)
  const [offset, setOffset] = useState(initialData.tasks.length)
  const [isPending, startTransition] = useTransition()
  const [savingTaskId, setSavingTaskId] = useState<string | null>(null)
  const [isSavingAll, setIsSavingAll] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)
  const [uploadingImages, setUploadingImages] = useState<Record<string, boolean>>({})
  const [showValidation, setShowValidation] = useState(false)
  const [imageModalOpen, setImageModalOpen] = useState<string | null>(null)

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
    setShowValidation(true)
    // Validazione: controlla se ci sono errori
    let hasError = false
    tasks.filter(task => task.status !== "completed").forEach(task => {
      const kpi = kpis.find((k) => k.id === task.kpi_id)
      const fields = kpi && kpi.value ? (Array.isArray(kpi.value) ? kpi.value : [kpi.value]) : [];
      fields.forEach((field, idx) => {
        const fieldKey = `${task.id}-${field.id || idx}`
        const val = localValues[fieldKey] ?? (Array.isArray(task.value) ? task.value[idx]?.value : task.value?.value ?? task.value)
        if (field.required && (val === undefined || val === null || val === "")) {
          hasError = true
        } else {
          const validation = validateFieldValue(val, field);
          if (!validation.valid) {
            hasError = true
          }
        }
      })
    })
    if (hasError) {
      toast({
        title: "Compilazione incompleta",
        description: "Correggi tutti gli errori prima di completare la todolist.",
        variant: "destructive"
      })
      return
    }
    setIsCompleting(true)
    try {
      // Salva tutti i valori locali per ogni task
      const savePromises = tasks.filter(task => task.status !== "completed").map(async (task) => {
        const kpi = kpis.find((k) => k.id === task.kpi_id)
        const fields = kpi && kpi.value ? (Array.isArray(kpi.value) ? kpi.value : [kpi.value]) : [];
        
        if (fields.length === 0) {
          // Se non ci sono campi specifici, salva il valore diretto
          const value = localValues[task.id]
          if (value !== undefined && value !== null) {
            await updateTaskValue(task.id, value)
          }
        } else {
          // Costruisci l'oggetto valore basato sui campi
          let taskValue
          if (fields.length === 1) {
            const fieldKey = `${task.id}-${fields[0].id || 0}`
            const fieldValue = localValues[fieldKey]
            if (fieldValue !== undefined && fieldValue !== null) {
              taskValue = {
                id: fields[0].id || `${task.kpi_id}-${fields[0].name.toLowerCase().replace(/\s+/g, '_')}`,
                value: fieldValue
              }
            }
          } else {
            taskValue = fields.map((field, idx) => {
              const fieldKey = `${task.id}-${field.id || idx}`
              const fieldValue = localValues[fieldKey]
              return {
                id: field.id || `${task.kpi_id}-${field.name.toLowerCase().replace(/\s+/g, '_')}`,
                value: fieldValue
              }
            })
          }
          
          if (taskValue !== undefined) {
            await updateTaskValue(task.id, taskValue)
          }
        }
      })
      
      await Promise.all(savePromises)

      // Poi completa la todolist
      await completeTodolist(todolistId)
      
      // Aggiorna lo stato locale delle tasks con i valori salvati
      setTasks(tasks.map(task => {
        const kpi = kpis.find((k) => k.id === task.kpi_id)
        const fields = kpi && kpi.value ? (Array.isArray(kpi.value) ? kpi.value : [kpi.value]) : [];
        
        let updatedValue = task.value
        
        if (fields.length === 0) {
          // Se non ci sono campi specifici, usa il valore diretto
          const value = localValues[task.id]
          if (value !== undefined && value !== null) {
            updatedValue = value
          }
        } else {
          // Costruisci l'oggetto valore basato sui campi
          if (fields.length === 1) {
            const fieldKey = `${task.id}-${fields[0].id || 0}`
            const fieldValue = localValues[fieldKey]
            if (fieldValue !== undefined && fieldValue !== null) {
              updatedValue = {
                id: fields[0].id || `${task.kpi_id}-${fields[0].name.toLowerCase().replace(/\s+/g, '_')}`,
                value: fieldValue
              }
            }
          } else {
            updatedValue = fields.map((field, idx) => {
              const fieldKey = `${task.id}-${field.id || idx}`
              const fieldValue = localValues[fieldKey]
              return {
                id: field.id || `${task.kpi_id}-${field.name.toLowerCase().replace(/\s+/g, '_')}`,
                value: fieldValue
              }
            })
          }
        }
        
        return { 
          ...task, 
          status: "completed",
          value: updatedValue
        }
      }))
      
      clearDirty()
      
      toast({
        title: "Todolist completata",
        description: "Tutte le attività sono state completate con successo.",
      })
    } catch (error) {
      console.error("Error completing todolist:", error)
      
      // Gestione specifica per todolist scadute
      if (error instanceof Error && error.message === "Non è possibile completare una todolist scaduta") {
        toast({
          title: "Todolist scaduta",
          description: "Non è possibile completare una todolist dopo la scadenza.",
          variant: "destructive"
        })
      } else {
        toast({
          title: "Errore",
          description: "Impossibile completare la todolist. Riprova più tardi.",
          variant: "destructive"
        })
      }
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

      // For image fields, save the URL directly
      const fieldKey = `${taskId}-${field.id || idx}`
      setLocalValue(fieldKey, publicUrl)
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
  const renderInput = (task: Task, kpi?: Kpi, isReadOnly: boolean = false, idx: number = 0, fieldKey: string = "") => {
    const current = dirtyFields.has(task.id) ? localValues[task.id] : task.value

    // Default simple input for when we don't have KPI field type info
    const simpleInput = (
      <div className="space-y-2">
        <Input
          value={localValues[fieldKey] ?? (Array.isArray(current) ? current[idx]?.value : current?.value ?? current) ?? ""}
          onChange={(e) => setLocalValue(fieldKey, e.target.value)}
          disabled={isPending || isReadOnly}
          placeholder="Inserisci il valore"
        />
      </div>
    )
    if (!kpi || !kpi.value) return simpleInput

    const fields = Array.isArray(kpi.value) ? kpi.value : [kpi.value]
    const field = fields[idx] || fields[0]

    const allNames = fields.map(f => (f.name || '').trim());
    const uniqueNames = Array.from(new Set(allNames));
    const allDescriptions = fields.map(f => (f.description || '').trim());
    const uniqueDescriptions = Array.from(new Set(allDescriptions));
    const showSingleLabel = uniqueNames.length === 1 && uniqueDescriptions.length === 1 && fields.length > 1;

    // Get current value for this specific field
    const currentValue = localValues[fieldKey] ?? (Array.isArray(current) ? current[idx]?.value : current?.value ?? current) ?? ""

    // Helper function to validate image URL
    const isValidImageUrl = (url: string): boolean => {
      if (!url || typeof url !== 'string') return false
      try {
        const urlObj = new URL(url)
        return urlObj.protocol === 'http:' || urlObj.protocol === 'https:'
      } catch {
        return false
      }
    }

    // Restituisci solo l'input (e la label, se serve) per il campo richiesto
    switch (field.type) {
      case "number":
        return (
          <Input
            type="number"
            step="1"
            value={currentValue}
            onChange={(e) => {
              const value = e.target.value
              // Ensure only integers
              if (value === '' || /^-?\d+$/.test(value)) {
                setLocalValue(fieldKey, value === '' ? '' : parseInt(value))
              }
            }}
            disabled={isPending || isReadOnly}
            placeholder="Inserisci un numero intero"
            min={field.min}
            max={field.max}
          />
        )
      case "decimal":
        return (
          <Input
            type="number"
            step="0.01"
            value={currentValue}
            onChange={(e) => {
              const value = e.target.value
              // Allow decimals
              if (value === '' || /^-?\d*\.?\d*$/.test(value)) {
                setLocalValue(fieldKey, value === '' ? '' : parseFloat(value))
              }
            }}
            disabled={isPending || isReadOnly}
            placeholder="Inserisci un numero decimale"
            min={field.min}
            max={field.max}
          />
        )
      case "text":
        return (
          <Input
            type="text"
            value={currentValue}
            onChange={(e) => setLocalValue(fieldKey, e.target.value)}
            disabled={isPending || isReadOnly}
            placeholder="Inserisci il testo"
          />
        )
      case "textarea":
        return (
          <Textarea
            value={currentValue}
            onChange={(e) => setLocalValue(fieldKey, e.target.value)}
            disabled={isPending || isReadOnly}
            placeholder="Inserisci il testo"
            rows={3}
          />
        )
      case "date":
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal"
                disabled={isPending || isReadOnly}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {currentValue ? (
                  format(new Date(currentValue), "dd/MM/yyyy", { locale: it })
                ) : (
                  <span className="text-muted-foreground">Seleziona una data</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={currentValue ? new Date(currentValue) : undefined}
                onSelect={(date) => setLocalValue(fieldKey, date ? format(date, "yyyy-MM-dd") : "")}
                disabled={isPending || isReadOnly}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        )
      case "boolean":
        return (
          <div className="flex gap-2">
            <Button
              type="button"
              variant={currentValue === true ? "default" : "outline"}
              onClick={() => setLocalValue(fieldKey, true)}
              disabled={isPending || isReadOnly}
              className="flex-1"
            >
              Sì
            </Button>
            <Button
              type="button"
              variant={currentValue === false ? "default" : "outline"}
              onClick={() => setLocalValue(fieldKey, false)}
              disabled={isPending || isReadOnly}
              className="flex-1"
            >
              No
            </Button>
          </div>
        )
      case "image":
        return (
          <div className="space-y-2">
            {currentValue && isValidImageUrl(currentValue) ? (
              <div className="relative">
                <div 
                  className="relative w-full h-[150px] border rounded-md overflow-hidden cursor-pointer"
                  onClick={() => setImageModalOpen(fieldKey)}
                >
                  <Image
                    src={currentValue}
                    alt="Immagine caricata"
                    fill
                    className="object-contain"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-10 transition-all flex items-center justify-center">
                    <Eye className="text-white opacity-0 hover:opacity-100 transition-opacity" size={24} />
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setLocalValue(fieldKey, '')}
                  disabled={isPending || isReadOnly}
                  className="mt-2"
                >
                  <X className="h-4 w-4 mr-1" />
                  Rimuovi
                </Button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-md p-4 text-center">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      handleImageUpload(file, task.id, field, idx)
                    }
                  }}
                  disabled={isPending || isReadOnly || uploadingImages[task.id]}
                  className="hidden"
                  id={`image-upload-${fieldKey}`}
                />
                <label
                  htmlFor={`image-upload-${fieldKey}`}
                  className="cursor-pointer flex flex-col items-center"
                >
                  {uploadingImages[task.id] ? (
                    <>
                      <Loader2 className="h-8 w-8 animate-spin text-gray-400 mb-2" />
                      <span className="text-sm text-gray-500">Caricamento...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-500">Clicca per caricare un'immagine</span>
                    </>
                  )}
                </label>
              </div>
            )}
          </div>
        )
      case "select":
        return (
          <Select
            value={currentValue}
            onValueChange={(value) => setLocalValue(fieldKey, value)}
            disabled={isPending || isReadOnly}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleziona un'opzione" />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option: string) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      default:
        return simpleInput
    }
  }

  // Funzione helper per label tipo campo
  const fieldTypeLabel = (type: string) => {
    switch (type) {
      case 'text': return 'Testo';
      case 'textarea': return 'Testo lungo';
      case 'number': return 'Numero intero';
      case 'decimal': return 'Numero decimale';
      case 'date': return 'Data';
      case 'boolean': return 'Sì/No';
      case 'select': return 'Selezione';
      case 'image': return 'Immagine';
      default: return '';
    }
  };

  // Calcolo descrizione globale per ogni task (helper)
  function getGlobalDescription(fields: any[]): string | null {
    const allDescriptions = fields.map(f => (f.description || '').trim());
    const uniqueDescriptions = Array.from(new Set(allDescriptions));
    return uniqueDescriptions.length === 1 && uniqueDescriptions[0] !== '' ? uniqueDescriptions[0] : null;
  }

  // Determina se la todolist è completata
  const isReadOnly = tasks.length > 0 && tasks.every(task => task.status === "completed");

  // Determina se la todolist è scaduta
  const isExpired = Boolean(todolistData && todolistData.status !== "completed" && isTodolistExpired(
    todolistData.scheduled_execution,
    todolistData.time_slot_type,
    todolistData.time_slot_end,
    todolistData.time_slot_start
  ));

  // Funzione helper per formattare l'orario (anche custom)
  function formatTimeSlotLabel(timeSlot: string) {
    // Standard
    const slotLabels: Record<string, string> = {
      mattina: "Mattina (6-14)",
      pomeriggio: "Pomeriggio (14-22)",
      notte: "Notte (22-6)",
      giornata: "Giornata (7-17)"
    }
    if (slotLabels[timeSlot]) return slotLabels[timeSlot]
    // Custom
    if (isCustomTimeSlotString(timeSlot)) {
      const custom = parseCustomTimeSlotString(timeSlot)
      if (custom) {
        const start = `${custom.startHour.toString().padStart(2, '0')}:${(custom.startMinute||0).toString().padStart(2, '0')}`
        const end = `${custom.endHour.toString().padStart(2, '0')}:${(custom.endMinute||0).toString().padStart(2, '0')}`
        return `Personalizzato (${start}-${end})`
      }
    }
    return timeSlot
  }

  // Calcolo stato todolist
  let stato: "completata" | "futuro" | "scaduta" | "in_corso" = "in_corso";
  if (todolistData?.completion_date || todolistData?.status === "completed") {
    stato = "completata";
  } else if (todolistData?.scheduled_execution && isTodolistExpired(todolistData.scheduled_execution, todolistData.time_slot_type, todolistData.time_slot_end, todolistData.time_slot_start)) {
    stato = "scaduta";
  } else if (todolistData?.scheduled_execution && new Date(todolistData.scheduled_execution) > new Date()) {
    stato = "futuro";
  }

  /* ---------------- JSX ----------------------- */
  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between gap-2">
            <div>
              <CardTitle>Todolist</CardTitle>
              <p className="text-gray-600 font-medium">
                {deviceId} – {deviceInfo && typeof deviceInfo === 'object' && 'name' in deviceInfo && deviceInfo.name ? deviceInfo.name : "Dispositivo sconosciuto"}
              </p>
              <p className="text-sm text-muted-foreground">
                {formatDateEuropean(date)} – {formatTimeSlotLabel(timeSlot)}
              </p>
              {isExpired && (
                <p className="text-sm text-red-600 font-medium mt-1">
                  ⚠️ Todolist scaduta
                </p>
              )}
            </div>

            <div className="flex flex-col items-end gap-2 min-w-[120px]">
              <div className="flex items-center gap-2">
                <Badge variant={
                  stato === "completata"
                    ? "default"
                    : stato === "scaduta"
                    ? "destructive"
                    : stato === "futuro"
                    ? "secondary"
                    : "outline"
                }>
                  {stato.charAt(0).toUpperCase() + stato.slice(1)}
                </Badge>
                {stato === "completata" && completionUserEmail && (
                  <span className="text-xs text-muted-foreground">Completata da: {completionUserEmail}</span>
                )}
              </div>
              {tasks.some(task => task.status !== "completed") && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        onClick={handleCompleteTodolist}
                        disabled={isPending || isCompleting || isExpired}
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
                    </TooltipTrigger>
                    {isExpired && (
                      <TooltipContent>
                        <p>Non è possibile completare una todolist scaduta</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
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
              <div className="flex flex-col gap-6">
                {tasks.map((task) => {
                  const kpi = kpis.find((k) => k.id === task.kpi_id)
                  const fields = kpi && kpi.value ? (Array.isArray(kpi.value) ? kpi.value : [kpi.value]) : [];
                  const current = dirtyFields.has(task.id) ? localValues[task.id] : task.value;
                  const globalDescription = getGlobalDescription(fields);
                  const allNames = fields.map(f => (f.name || '').trim());
                  const uniqueNames = Array.from(new Set(allNames));
                  const allDescriptions = fields.map(f => (f.description || '').trim());
                  const uniqueDescriptions = Array.from(new Set(allDescriptions));
                  const showSingleLabel = uniqueNames.length === 1 && uniqueDescriptions.length === 1 && fields.length > 1;
                  return (
                    <div key={task.id} className="border rounded-lg bg-white p-4 flex flex-col gap-2">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-base">{kpi?.name ?? "Controllo sconosciuto"}</span>
                      </div>
                      {/* Descrizione globale se unica */}
                      <div className="flex flex-col gap-1 text-xs text-muted-foreground mb-1">
                        <span className="font-semibold">Descrizione</span>
                        <span>{typeof globalDescription === 'string' && globalDescription.trim() !== '' ? globalDescription : '/'}</span>
                      </div>
                      <div className="flex flex-col gap-4 mt-1">
                        {showSingleLabel && (
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-medium mb-1">{fields[0].name}{fields[0].required && <span className="text-red-500 ml-1">*</span>}</label>
                            <span className="text-xs text-muted-foreground">{fieldTypeLabel(fields[0].type)}</span>
                          </div>
                        )}
                        {fields.length > 0 ? fields.map((field, idx) => {
                          const fieldKey = `${task.id}-${field.id || idx}`;
                          let val = localValues[fieldKey] ?? (Array.isArray(current) ? current[idx]?.value : current?.value ?? current);
                          let errorMsg = "";
                          if (showValidation && !isReadOnly) {
                            if (field.required && (val === undefined || val === null || val === "")) {
                              errorMsg = "Campo obbligatorio";
                            } else {
                              const validation = validateFieldValue(val, field);
                              if (!validation.valid && validation.message) {
                                errorMsg = validation.message;
                              }
                            }
                          }
                          return (
                            <div key={field.id || idx} className="flex flex-col gap-1">
                              {(field.name && field.name.toLowerCase() !== 'valore') && (
                                <div className="flex items-center justify-between">
                                  <label className="text-sm font-medium mb-1">
                                    {field.name}
                                    {field.required && <span className="text-red-500 ml-1">*</span>}
                                  </label>
                                  <span className="text-xs text-muted-foreground">{fieldTypeLabel(field.type)}</span>
                                </div>
                              )}
                              {renderInput(task, kpi, isReadOnly, idx, fieldKey)}
                              {(field.type === 'number' || field.type === 'decimal') && field.min !== undefined && field.max !== undefined && (
                                <span className="text-xs text-muted-foreground">Range: {field.min} - {field.max}</span>
                              )}
                              {field.description && (
                                <span className="text-xs text-muted-foreground mt-1">
                                  <span className="font-semibold">Descrizione:</span> {field.type === 'textarea' ? 'Testo lungo' : field.description}
                                </span>
                              )}
                              {errorMsg && <span className="text-xs text-red-500 mt-1">{errorMsg}</span>}
                            </div>
                          )
                        }) : (
                          <div className="flex flex-col gap-1">
                            {renderInput(task, kpi, isReadOnly)}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
              
              {hasMore && (
                <Button variant="outline" onClick={loadMore} disabled={isPending} className="mt-4 w-full">
                  {isPending ? "Caricamento..." : "Carica altri"}
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Image Modal */}
      <Dialog open={!!imageModalOpen} onOpenChange={(open) => !open && setImageModalOpen(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Visualizza Immagine</DialogTitle>
          </DialogHeader>
          <div className="relative w-full h-[70vh] overflow-hidden">
            {imageModalOpen && typeof localValues[imageModalOpen] === 'string' && localValues[imageModalOpen] && (() => {
              const imageUrl = localValues[imageModalOpen] as string
              try {
                new URL(imageUrl)
                return (
                  <Image
                    src={imageUrl}
                    alt="Immagine a schermo intero"
                    fill
                    className="object-contain"
                  />
                )
              } catch {
                return (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500">URL immagine non valido</p>
                  </div>
                )
              }
            })()}
          </div>
        </DialogContent>
      </Dialog>
    </>
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
