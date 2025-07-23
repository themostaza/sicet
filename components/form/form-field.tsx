"use client"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { FieldError } from "./field-error"

type FieldType = "text" | "textarea" | "number" | "date" | "checkbox" | "select" | "email" | "password"

interface FormFieldProps {
  id: string
  name: string
  label?: string
  type?: FieldType
  placeholder?: string
  value: any
  onChange: (value: any) => void
  onBlur?: () => void
  error?: string | null
  required?: boolean
  disabled?: boolean
  className?: string
  options?: { value: string; label: string }[]
  showInlineError?: boolean
  showTooltipError?: boolean
  min?: number | string // Add min value for number inputs
  max?: number | string // Add max value for number inputs
  pattern?: string // Add pattern for validation
  step?: number | string // Add step for number inputs
  dataType?: "integer" | "decimal" | "text" | "date" | "email" // Specific data type for validation
  endAdornment?: React.ReactNode // Nuova prop opzionale per icona/bottone a destra
}

// Validate input based on data type
const validateInput = (value: string, dataType?: string, type?: FieldType): string => {
  if (!value) return value

  // For number type inputs
  if (type === "number") {
    // For integer data type
    if (dataType === "integer") {
      // Remove any non-digit characters
      return value.replace(/[^\d-]/g, "")
    }

    // For decimal data type
    if (dataType === "decimal") {
      // Allow only digits, minus sign, and one decimal separator (dot or comma)
      const hasDecimal = value.includes(".") || value.includes(",")
      if (hasDecimal) {
        // Convert comma to dot for validation
        const normalizedValue = value.replace(',', '.')
        const [whole, decimal] = normalizedValue.split(".")
        // Keep only one decimal point and digits
        return `${whole.replace(/[^\d-]/g, "")}.${decimal.replace(/\D/g, "")}`
      }
      return value.replace(/[^\d.,-]/g, "")
    }

    // Default number handling
    return value
  }

  // For email type
  if (type === "email") {
    // Basic email format validation happens via HTML5 input type
    return value
  }

  // For date type
  if (type === "date") {
    // Date validation happens via HTML5 input type
    return value
  }

  // For text and other types, return as is
  return value
}

export function FormField({
  id,
  name,
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  onBlur,
  error,
  required = false,
  disabled = false,
  className = "",
  options = [],
  showInlineError = true,
  showTooltipError = true,
  min,
  max,
  pattern,
  step,
  dataType,
  endAdornment,
}: FormFieldProps) {
  const hasError = !!error
  const errorId = `${id}-error`

  const commonProps = {
    id,
    name,
    disabled,
    onBlur,
    "aria-invalid": hasError,
    "aria-describedby": hasError ? errorId : undefined,
  }

  const renderField = () => {
    switch (type) {
      case "textarea":
        return (
          <Textarea
            {...commonProps}
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={`${hasError ? "border-red-500" : ""} ${className}`}
          />
        )

      case "number":
        // For decimal data type, use text input to support comma
        if (dataType === "decimal") {
          return (
            <Input
              {...commonProps}
              type="text"
              value={value || ""}
              onChange={(e) => {
                const validatedValue = validateInput(e.target.value, dataType, "number")
                onChange(validatedValue)
              }}
              min={min}
              max={max}
              placeholder={placeholder || "Inserisci un numero decimale (es. 3,14 o 3.14)"}
              className={`${hasError ? "border-red-500" : ""} ${className}`}
            />
          )
        }
        // For integer data type, use number input
        return (
          <Input
            {...commonProps}
            type="number"
            value={value || ""}
            onChange={(e) => {
              const validatedValue = validateInput(e.target.value, dataType, "number")
              onChange(validatedValue)
            }}
            min={min}
            max={max}
            step={step || "1"}
            placeholder={placeholder}
            className={`${hasError ? "border-red-500" : ""} ${className}`}
          />
        )

      case "date":
        return (
          <Input
            {...commonProps}
            type="date"
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            className={`${hasError ? "border-red-500" : ""} ${className}`}
          />
        )

      case "checkbox":
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              {...commonProps}
              checked={!!value}
              onCheckedChange={onChange}
              className={hasError ? "border-red-500" : ""}
            />
            {label && (
              <label
                htmlFor={id}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {label}
                {required && <span className="text-red-500 ml-1">*</span>}
              </label>
            )}
          </div>
        )

      case "select":
        return (
          <Select value={value || ""} onValueChange={onChange} disabled={disabled}>
            <SelectTrigger id={id} className={`${hasError ? "border-red-500" : ""} ${className}`}>
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case "email":
        return (
          <Input
            {...commonProps}
            type="email"
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={`${hasError ? "border-red-500" : ""} ${className}`}
          />
        )

      case "password":
      case "text":
        return (
          <div className="relative">
            <Input
              {...commonProps}
              type={type}
              value={value || ""}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              className={`${hasError ? "border-red-500" : ""} ${className} pr-10`}
            />
            {endAdornment && (
              <span className="absolute inset-y-0 right-2 flex items-center cursor-pointer">
                {endAdornment}
              </span>
            )}
          </div>
        )

      default:
        return (
          <Input
            {...commonProps}
            type={type}
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={`${hasError ? "border-red-500" : ""} ${className}`}
          />
        )
    }
  }

  return (
    <div className="space-y-2">
      {label && type !== "checkbox" && (
        <div className="flex items-center">
          <Label htmlFor={id} className="block text-sm font-medium">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </Label>
          {hasError && showTooltipError && <FieldError message={error} showInline={false} />}
        </div>
      )}

      {renderField()}

      {hasError && showInlineError && <FieldError message={error} showInline={true} showTooltip={false} id={errorId} />}
    </div>
  )
}
