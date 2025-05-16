"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, CheckCircle, Clock, Calendar, Layers, Edit, AlertCircle } from "lucide-react"
import Link from "next/link"
import { getTodolistTasks, updateTaskStatus, updateTaskValue } from "@/lib/actions-todolist"
import { getPuntoControllo } from "@/lib/actions"
import { format } from "date-fns"
import { it } from "date-fns/locale"
import { getControllo } from "@/lib/actions-kpi"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface FieldErrorTooltipProps {
  message: string
}

const FieldErrorTooltip: React.FC<FieldErrorTooltipProps> = ({ message }) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <AlertCircle className="h-4 w-4 ml-1 text-red-500" />
        </TooltipTrigger>
        <TooltipContent className="bg-red-500 text-white">
          <p>{message}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export default function TodolistCompilazione({
  params,
}: {
  params: { deviceId: string; date: string; timeSlot: string }
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [tasks, setTasks] = useState<any[]>([])
  const [device, setDevice] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [taskValues, setTaskValues] = useState<Record<string, any>>({})
  const [isSaving, setIsSaving] = useState<string | null>(null)
  const [kpiDetails, setKpiDetails] = useState<Record<string, any>>({})
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({})

  const { deviceId, date, timeSlot } = params

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tasksData, deviceData] = await Promise.all([
          getTodolistTasks(deviceId, date, timeSlot),
          getPuntoControllo(deviceId),
        ])
        setTasks(tasksData || [])
        setDevice(deviceData)

        // Initialize task values
        const initialValues: Record<string, any> = {}
        tasksData.forEach((task) => {
          initialValues[task.id] = task.value || {}
        })
        setTaskValues(initialValues)

        // Fetch detailed KPI information for each task
        const kpiIds = [...new Set(tasksData.map((task) => task.kpi_id))]
        const kpiDetailsMap: Record<string, any> = {}

        for (const kpiId of kpiIds) {
          try {
            const kpiData = await getControllo(kpiId)
            if (kpiData) {
              kpiDetailsMap[kpiId] = kpiData
            }
          } catch (error) {
            console.error(`Errore nel recupero dei dettagli del KPI ${kpiId}:`, error)
          }
        }

        setKpiDetails(kpiDetailsMap)
      } catch (error) {
        toast({
          title: "Errore",
          description: "Impossibile caricare i dati della todolist.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [deviceId, date, timeSlot, toast])

  // Funzione per formattare la fascia oraria
  const formatTimeSlot = (timeSlot: string) => {
    switch (timeSlot) {
      case "mattina":
        return "Mattina (fino alle 12:00)"
      case "pomeriggio":
        return "Pomeriggio (fino alle 18:00)"
      case "sera":
        return "Sera (fino alle 22:00)"
      case "notte":
        return "Notte (fino alle 06:00)"
      default:
        return timeSlot
    }
  }

  const handleValueChange = (taskId: string, fieldName: string, value: any) => {
    setTaskValues((prev) => ({
      ...prev,
      [taskId]: {
        ...prev[taskId],
        [fieldName]: value,
      },
    }))

    // Clear validation error for this field if it exists
    if (validationErrors[taskId]?.includes(fieldName)) {
      setValidationErrors((prev) => ({
        ...prev,
        [taskId]: prev[taskId].filter((field) => field !== fieldName),
      }))
    }
  }

  const validateTask = (taskId: string, kpiId: string) => {
    const taskValue = taskValues[taskId] || {}
    const kpiDetail = kpiDetails[kpiId]
    const errors: string[] = []

    if (kpiDetail?.campi) {
      kpiDetail.campi.forEach((field: any) => {
        if (
          field.obbligatorio &&
          (taskValue[field.nome] === undefined || taskValue[field.nome] === null || taskValue[field.nome] === "")
        ) {
          errors.push(field.nome)
        }
      })
    }

    return errors
  }

  // Update the handleCompleteTask function to redirect to the completed section when all tasks are completed
  const handleCompleteTask = async (taskId: string, kpiId: string) => {
    // Validate before completing
    const errors = validateTask(taskId, kpiId)
    if (errors.length > 0) {
      setValidationErrors((prev) => ({
        ...prev,
        [taskId]: errors,
      }))

      toast({
        title: "Errore di validazione",
        description: "Compila tutti i campi obbligatori prima di completare.",
        variant: "destructive",
      })
      return
    }

    setIsSaving(taskId)
    try {
      // First save the values
      await updateTaskValue(taskId, taskValues[taskId] || {})

      // Then update the status
      await updateTaskStatus(taskId, "completed")

      // Update local state
      setTasks(
        tasks.map((task) => {
          if (task.id === taskId) {
            return { ...task, status: "completed" }
          }
          return task
        }),
      )

      // Check if all tasks are now completed
      const updatedTasks = tasks.map((task) => (task.id === taskId ? { ...task, status: "completed" } : task))
      const allCompleted = updatedTasks.every((task) => task.status === "completed")

      if (allCompleted) {
        toast({
          title: "Todolist completata",
          description: "Tutte le attività sono state completate con successo!",
          variant: "default",
        })

        // Redirect to completed section after a short delay
        setTimeout(() => {
          router.push("/todolist/completed")
        }, 1500)
      } else {
        toast({
          title: "Controllo completato",
          description: "Il controllo è stato completato con successo.",
          variant: "default",
        })
      }
    } catch (error) {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante il completamento del controllo.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(null)
    }
  }

  const handleEditTask = async (taskId: string) => {
    setIsSaving(taskId)
    try {
      // Update the status back to pending
      await updateTaskStatus(taskId, "pending")

      // Update local state
      setTasks(
        tasks.map((task) => {
          if (task.id === taskId) {
            return { ...task, status: "pending" }
          }
          return task
        }),
      )

      toast({
        title: "Controllo in modifica",
        description: "Ora puoi modificare i dati del controllo.",
        variant: "default",
      })
    } catch (error) {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante la modifica del controllo.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(null)
    }
  }

  // Render field based on its type
  const renderField = (task: any, field: any) => {
    const taskId = task.id
    const fieldName = field.nome
    const value = taskValues[taskId]?.[fieldName] ?? ""
    const isRequired = field.obbligatorio
    const hasError = validationErrors[taskId]?.includes(fieldName)
    const isDisabled = task.status === "completed"

    const commonLabelProps = {
      htmlFor: `field-${taskId}-${fieldName}`,
      className: "text-sm font-medium flex items-center",
      children: (
        <>
          {fieldName}
          {isRequired && <span className="text-red-500 ml-1">*</span>}
        </>
      ),
    }

    const errorClass = hasError ? "border-red-500 focus:ring-red-500" : ""

    // Validate input based on field type
    const validateInput = (inputValue: string, fieldType: string): string => {
      if (!inputValue) return inputValue

      switch (fieldType) {
        case "number":
          // Allow only digits and minus sign
          return inputValue.replace(/[^\d-]/g, "")
        case "decimal":
          // Allow only digits, minus sign, and one decimal point
          if (inputValue.includes(".")) {
            const [whole, decimal] = inputValue.split(".")
            // Keep only one decimal point and digits
            return `${whole.replace(/[^\d-]/g, "")}.${decimal.replace(/\D/g, "")}`
          }
          return inputValue.replace(/[^\d.-]/g, "")
        default:
          return inputValue
      }
    }

    switch (field.tipo) {
      case "text":
        return (
          <div className="space-y-2">
            <div className="flex items-center">
              <Label {...commonLabelProps} />
              {hasError && <FieldErrorTooltip message="Campo obbligatorio" />}
            </div>
            <Input
              id={`field-${taskId}-${fieldName}`}
              type="text"
              placeholder={field.descrizione || `Inserisci ${fieldName}`}
              value={value}
              onChange={(e) => handleValueChange(taskId, fieldName, e.target.value)}
              disabled={isDisabled}
              className={errorClass}
            />
          </div>
        )

      case "textarea":
        return (
          <div className="space-y-2">
            <div className="flex items-center">
              <Label {...commonLabelProps} />
              {hasError && <FieldErrorTooltip message="Campo obbligatorio" />}
            </div>
            <Textarea
              id={`field-${taskId}-${fieldName}`}
              placeholder={field.descrizione || `Inserisci ${fieldName}`}
              value={value}
              onChange={(e) => handleValueChange(taskId, fieldName, e.target.value)}
              disabled={isDisabled}
              className={errorClass}
            />
          </div>
        )

      case "number":
        return (
          <div className="space-y-2">
            <div className="flex items-center">
              <Label {...commonLabelProps} />
              {hasError && <FieldErrorTooltip message="Campo obbligatorio" />}
            </div>
            <Input
              id={`field-${taskId}-${fieldName}`}
              type="text" // Changed from "number" to "text" for better control
              inputMode="numeric"
              placeholder={field.descrizione || `Inserisci ${fieldName}`}
              value={value}
              onChange={(e) => {
                const validatedValue = validateInput(e.target.value, "number")
                handleValueChange(taskId, fieldName, validatedValue)
              }}
              disabled={isDisabled}
              className={errorClass}
            />
          </div>
        )

      case "decimal":
        return (
          <div className="space-y-2">
            <div className="flex items-center">
              <Label {...commonLabelProps} />
              {hasError && <FieldErrorTooltip message="Campo obbligatorio" />}
            </div>
            <Input
              id={`field-${taskId}-${fieldName}`}
              type="text" // Changed from "number" to "text" for better control
              inputMode="decimal"
              placeholder={field.descrizione || `Inserisci ${fieldName}`}
              value={value}
              onChange={(e) => {
                const validatedValue = validateInput(e.target.value, "decimal")
                handleValueChange(taskId, fieldName, validatedValue)
              }}
              disabled={isDisabled}
              className={errorClass}
            />
          </div>
        )

      case "date":
        return (
          <div className="space-y-2">
            <div className="flex items-center">
              <Label {...commonLabelProps} />
              {hasError && <FieldErrorTooltip message="Campo obbligatorio" />}
            </div>
            <Input
              id={`field-${taskId}-${fieldName}`}
              type="date"
              value={value}
              onChange={(e) => handleValueChange(taskId, fieldName, e.target.value)}
              disabled={isDisabled}
              className={errorClass}
            />
          </div>
        )

      case "checkbox":
        return (
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id={`field-${taskId}-${fieldName}`}
                checked={!!value}
                onCheckedChange={(checked) => handleValueChange(taskId, fieldName, checked)}
                disabled={isDisabled}
              />
              <div className="flex items-center">
                <Label htmlFor={`field-${taskId}-${fieldName}`} className="text-sm font-medium">
                  {fieldName}
                  {isRequired && <span className="text-red-500 ml-1">*</span>}
                </Label>
                {hasError && <FieldErrorTooltip message="Campo obbligatorio" />}
              </div>
            </div>
            {field.descrizione && <p className="text-xs text-gray-500 ml-6">{field.descrizione}</p>}
          </div>
        )

      case "select":
        // Assuming options are provided in the field description as comma-separated values
        const options = field.descrizione?.split(",").map((opt: string) => opt.trim()) || []
        return (
          <div className="space-y-2">
            <div className="flex items-center">
              <Label {...commonLabelProps} />
              {hasError && <FieldErrorTooltip message="Campo obbligatorio" />}
            </div>
            <Select
              value={value}
              onValueChange={(val) => handleValueChange(taskId, fieldName, val)}
              disabled={isDisabled}
            >
              <SelectTrigger className={errorClass}>
                <SelectValue placeholder={`Seleziona ${fieldName}`} />
              </SelectTrigger>
              <SelectContent>
                {options.map((option: string) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )

      default:
        return (
          <div className="space-y-2">
            <div className="flex items-center">
              <Label {...commonLabelProps} />
              {hasError && <FieldErrorTooltip message="Campo obbligatorio" />}
            </div>
            <Input
              id={`field-${taskId}-${fieldName}`}
              type="text"
              placeholder={field.descrizione || `Inserisci ${fieldName}`}
              value={value}
              onChange={(e) => handleValueChange(taskId, fieldName, e.target.value)}
              disabled={isDisabled}
              className={errorClass}
            />
          </div>
        )
    }
  }

  // Render completed field value
  const renderCompletedFieldValue = (task: any, field: any) => {
    const taskId = task.id
    const fieldName = field.nome
    const value = taskValues[taskId]?.[fieldName]

    if (value === undefined || value === null || value === "") {
      return <p className="text-sm text-gray-500">Non compilato</p>
    }

    switch (field.tipo) {
      case "checkbox":
        return (
          <div className="flex items-center">
            <Checkbox checked={!!value} disabled />
            <span className="ml-2 text-sm">{value ? "Sì" : "No"}</span>
          </div>
        )
      default:
        return <p className="text-sm">{value}</p>
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <Link href="/todolist" className="inline-flex items-center text-sm font-medium">
          <ArrowLeft className="mr-2 h-4 w-4" /> Torna alle Todolist
        </Link>
      </div>

      <div className="bg-white p-6 rounded-lg border">
        <h1 className="text-2xl font-bold mb-1">Compilazione Controlli</h1>
        <p className="text-gray-500 mb-6">Compila i controlli per questa todolist</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Layers className="h-5 w-5 text-gray-500 mr-2" />
                <h3 className="font-medium">Punto di Controllo</h3>
              </div>
              <p className="mt-2 text-lg font-semibold">{device?.titolo || deviceId}</p>
              <p className="text-sm text-gray-500">{device?.posizione || "Posizione non disponibile"}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Calendar className="h-5 w-5 text-gray-500 mr-2" />
                <h3 className="font-medium">Data</h3>
              </div>
              <p className="mt-2 text-lg font-semibold">{format(new Date(date), "d MMMM yyyy", { locale: it })}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Clock className="h-5 w-5 text-gray-500 mr-2" />
                <h3 className="font-medium">Fascia Oraria</h3>
              </div>
              <p className="mt-2 text-lg font-semibold">{formatTimeSlot(timeSlot)}</p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {tasks.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed">
              <p className="text-gray-500">Nessuna attività trovata per questa todolist.</p>
            </div>
          ) : (
            tasks.map((task) => {
              const kpiDetail = kpiDetails[task.kpi_id]
              const fields = kpiDetail?.campi || []

              return (
                <Card key={task.id} className={task.status === "completed" ? "border-green-200 bg-green-50" : ""}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex justify-between items-center">
                      <span>{kpiDetail?.nome || task.kpis?.name || "Controllo"}</span>
                      {task.status === "completed" && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" /> Completato
                        </span>
                      )}
                    </CardTitle>
                    {kpiDetail?.descrizione && <p className="text-sm text-gray-500">{kpiDetail.descrizione}</p>}
                  </CardHeader>
                  <CardContent>
                    {task.status === "completed" ? (
                      <div className="space-y-4">
                        {fields.length > 0 ? (
                          fields.map((field: any, index: number) => (
                            <div key={index} className="space-y-1">
                              <h4 className="text-sm font-medium">{field.nome}</h4>
                              {renderCompletedFieldValue(task, field)}
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500">Nessun campo da compilare per questo controllo.</p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {fields.length > 0 ? (
                          fields.map((field: any, index: number) => <div key={index}>{renderField(task, field)}</div>)
                        ) : (
                          <p className="text-sm text-gray-500">Nessun campo da compilare per questo controllo.</p>
                        )}
                      </div>
                    )}
                  </CardContent>
                  {task.status !== "completed" ? (
                    <CardFooter className="flex justify-end pt-2 pb-4">
                      <Button
                        className="bg-black hover:bg-gray-800"
                        onClick={() => handleCompleteTask(task.id, task.kpi_id)}
                        disabled={isSaving === task.id}
                      >
                        {isSaving === task.id ? (
                          <span className="flex items-center">
                            <svg
                              className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                            Completamento...
                          </span>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" /> Completa
                          </>
                        )}
                      </Button>
                    </CardFooter>
                  ) : (
                    <CardFooter className="flex justify-end pt-2 pb-4">
                      <Button variant="outline" onClick={() => handleEditTask(task.id)} disabled={isSaving === task.id}>
                        {isSaving === task.id ? (
                          <span className="flex items-center">
                            <svg
                              className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-700"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                            Modifica in corso...
                          </span>
                        ) : (
                          <>
                            <Edit className="h-4 w-4 mr-2" /> Modifica
                          </>
                        )}
                      </Button>
                    </CardFooter>
                  )}
                </Card>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
