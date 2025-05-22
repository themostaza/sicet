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
} from "@/app/actions/actions-todolist"
import { getKpis } from "@/app/actions/actions-kpi"
import { getDevice } from "@/app/actions/actions-device"
import type { Task } from "@/app/actions/actions-todolist"
import type { Kpi } from "@/app/actions/actions-kpi"
import { Check, AlertCircle, Info, Save } from "lucide-react"

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
  deviceId: string
  date: string
  timeSlot: string
  initialKpis?: Kpi[]
  deviceInfo?: { name: string; location: string } | null
}

/* --------------------------------------------------------------
 * Helpers
 * ----------------------------------------------------------- */
const TIMESLOT_LABEL: Record<string, string> = {
  mattina: "Mattina (6-12)",
  pomeriggio: "Pomeriggio (12-18)",
  sera: "Sera (18-22)",
  notte: "Notte (22-6)",
}
const labelForSlot = (s: string) => TIMESLOT_LABEL[s] ?? s
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
  deviceId,
  date,
  timeSlot,
  initialKpis = [],
  deviceInfo: initialDeviceInfo = null,
}: Props) {
  const [tasks, setTasks] = useState<Task[]>(initialData.tasks)
  const [hasMore, setHasMore] = useState(initialData.hasMore)
  const [offset, setOffset] = useState(initialData.tasks.length)
  const [isPending, startTransition] = useTransition()

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
      })
    }
    if (!initialDeviceInfo) {
      getDevice(deviceId).then((d) => {
        if (d) setDeviceInfo({ name: d.name, location: d.location })
      })
    }
  }, [deviceId, initialKpis, initialDeviceInfo])

  /* ---------------- pagination ---------------- */
  const loadMore = () =>
    startTransition(async () => {
      const res = await getTodolistTasks({
        deviceId,
        date,
        timeSlot,
        offset,
        limit: 20,
      })
      setTasks((p) => [...p, ...res.tasks])
      setHasMore(res.hasMore)
      setOffset((o) => o + res.tasks.length)
    })

  /* ---------------- mutations ----------------- */
  const saveValue = async (taskId: string) => {
    if (!dirtyFields.has(taskId)) return
    const value = localValues[taskId]
    const updated = await updateTaskValue(taskId, value)
    setTasks((p) => p.map((t) => (t.id === taskId ? updated : t)))
    dirtyFields.delete(taskId)
    if (dirtyFields.size === 0) clearDirty()
    toast({ title: "Valore salvato", duration: 2000 })
  }

  const saveAll = async () => {
    if (!dirtyFields.size) return
    await Promise.all(
      Array.from(dirtyFields).map((id) => updateTaskValue(id, localValues[id])),
    )
    setTasks((p) =>
      p.map((t) =>
        dirtyFields.has(t.id) ? { ...t, value: localValues[t.id] } : t,
      ),
    )
    clearDirty()
    toast({ title: "Tutti i valori salvati", duration: 2000 })
  }

  const toggleStatus = async (task: Task) => {
    const newStatus = task.status === "completed" ? "pending" : "completed"
    
    // Validation before completing a task
    if (newStatus === "completed") {
      // Check for required fields
      const kpi = kpis.find((k) => k.id === task.kpi_id)
      if (kpi?.value) {
        const fields = Array.isArray(kpi.value) ? kpi.value : [kpi.value]
        const currentValue = dirtyFields.has(task.id) ? localValues[task.id] : task.value
        
        // Validation results
        const validationErrors: string[] = []
        
        fields.forEach((field, idx) => {
          const val = Array.isArray(currentValue)
            ? currentValue[idx]?.value
            : typeof currentValue === "object" && currentValue !== null
            ? (currentValue as any).value
            : currentValue
          
          // Required field validation
          if (field.required && (val === undefined || val === null || val === "")) {
            validationErrors.push(`Campo "${field.name || 'Campo ' + (idx + 1)}" obbligatorio`)
            return
          }
          
          // Type validation
          const typeValidation = validateFieldValue(val, field)
          if (!typeValidation.valid && typeValidation.message) {
            validationErrors.push(`${field.name || 'Campo ' + (idx + 1)}: ${typeValidation.message}`)
          }
        })
        
        if (validationErrors.length > 0) {
          toast({
            title: "Completamento non possibile",
            description: (
              <div className="space-y-1">
                <p>Correggi i seguenti errori:</p>
                <ul className="list-disc pl-4 text-sm">
                  {validationErrors.map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                </ul>
              </div>
            ),
            variant: "destructive"
          })
          return
        }
      }
      
      if (dirtyFields.has(task.id)) await saveValue(task.id)
    }
    
    const updated = await updateTaskStatus(task.id, newStatus)
    setTasks((p) => p.map((t) => (t.id === task.id ? updated : t)))
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
          const setVal = (val: any) => {
            let newValue
            if (fields.length === 1) {
              newValue = val
            } else {
              newValue = [...(Array.isArray(current) ? current : Array(fields.length).fill(null))]
              newValue[idx] = { ...(newValue[idx] || {}), value: val }
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
                    onChange={(e) => setVal(e.target.value)}
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
                    onChange={(e) => setVal(e.target.value)}
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
                      setVal(value);
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
                      setVal(value);
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
                      setVal(e.target.value);
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
                      onClick={() => setVal(true)}
                      disabled={isPending}
                      className={val === true ? "bg-green-600 hover:bg-green-700" : ""}
                    >
                      Sì
                    </Button>
                    <Button
                      type="button"
                      variant={val === false ? "default" : "outline"}
                      onClick={() => setVal(false)}
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
                      setVal(newVal);
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

          {dirtyFields.size > 0 && (
            <Button onClick={saveAll} disabled={isPending}>
              <Save size={16} className="mr-2" /> Salva tutto ({dirtyFields.size})
            </Button>
          )}
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
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant={task.status === "completed" ? "default" : "outline"}
                                  size="sm"
                                  disabled={isPending}
                                  onClick={() => startTransition(() => toggleStatus(task))}
                                  className={task.status === "completed" ? "bg-green-600 hover:bg-green-700" : ""}
                                >
                                  {task.status === "completed" ? <Check size={16} /> : <AlertCircle size={16} />}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {task.status === "completed" ? "Completata" : "Da completare"}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </CardHeader>
                      <Separator />
                      <CardContent className="pt-4">
                        {kpisLoading ? <ValueSkeleton /> : renderInput(task, kpi)}
                      </CardContent>
                      {dirty && (
                        <CardFooter className="pt-0 flex justify-end">
                          <Button
                            size="sm"
                            onClick={() => startTransition(() => saveValue(task.id))}
                            disabled={isPending}
                          >
                            <Save size={16} className="mr-1" /> Salva
                          </Button>
                        </CardFooter>
                      )}
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
                                      {task.value.map((item, idx) => {
                                        const fieldDef = Array.isArray(kpi?.value) ? kpi.value[idx] : null;
                                        return (
                                          <div key={idx}>
                                            <div>
                                              <span className="font-medium text-xs">{fieldDef?.name || `Campo ${idx + 1}`}: </span>
                                              <span>{item?.value !== undefined ? String(item.value) : "N/A"}</span>
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
                                  {!Array.isArray(task.value) && typeof task.value === 'object' && task.value !== null && (
                                    <div>
                                      <div>
                                        <span className="font-medium text-xs">
                                          {typeof kpi?.value === 'object' && kpi?.value !== null && 'name' in kpi?.value 
                                            ? kpi.value.name as string 
                                            : "Valore"}: 
                                        </span>
                                        <span>
                                          {task.value && 'value' in task.value ? String(task.value.value ?? "N/A") : "N/A"}
                                        </span>
                                      </div>
                                      {typeof kpi?.value === 'object' && kpi?.value !== null && 'description' in kpi?.value && (
                                        <p className="text-xs text-muted-foreground">{kpi.value.description as string}</p>
                                      )}
                                    </div>
                                  )}
                                  
                                  {/* For primitive values (string, number, boolean) */}
                                  {!Array.isArray(task.value) && typeof task.value !== 'object' && (
                                    <div>
                                      <div>
                                        <span className="font-medium text-xs">
                                          {typeof kpi?.value === 'object' && kpi?.value !== null && 'name' in kpi?.value 
                                            ? kpi.value.name as string 
                                            : "Valore"}: 
                                        </span>
                                        <span>
                                          {typeof task.value === 'boolean' 
                                            ? (task.value ? "Sì" : "No") 
                                            : task.value !== undefined ? String(task.value) : "N/A"}
                                        </span>
                                      </div>
                                      {kpi?.description && (
                                        <p className="text-xs text-muted-foreground">{kpi.description}</p>
                                      )}
                                      {typeof kpi?.value === 'object' && kpi?.value !== null && 'description' in kpi?.value && (
                                        <p className="text-xs text-muted-foreground">{kpi.value.description as string}</p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              {/* Reopen task button */}
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      disabled={isPending}
                                      onClick={() => startTransition(() => toggleStatus(task))}
                                    >
                                      <Check size={16} className="text-green-600" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Riapri attività</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
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
