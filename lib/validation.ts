// Common validation rules
export type ValidationRule = {
  validate: (value: any) => boolean
  message: string
}

export type FieldValidation = {
  [key: string]: ValidationRule[]
}

// Common validation rules
export const validationRules = {
  required: (message = "Campo obbligatorio"): ValidationRule => ({
    validate: (value) => {
      if (value === undefined || value === null) return false
      if (typeof value === "string") return value.trim() !== ""
      if (Array.isArray(value)) return value.length > 0
      return true
    },
    message,
  }),

  minLength: (length: number, message = `Deve contenere almeno ${length} caratteri`): ValidationRule => ({
    validate: (value) => {
      if (typeof value !== "string") return false
      return value.length >= length
    },
    message,
  }),

  maxLength: (length: number, message = `Deve contenere al massimo ${length} caratteri`): ValidationRule => ({
    validate: (value) => {
      if (typeof value !== "string") return false
      return value.length <= length
    },
    message,
  }),

  pattern: (regex: RegExp, message = "Formato non valido"): ValidationRule => ({
    validate: (value) => {
      if (typeof value !== "string") return false
      return regex.test(value)
    },
    message,
  }),

  email: (message = "Email non valida"): ValidationRule => ({
    validate: (value) => {
      if (value === "" || value === null || value === undefined) return true // Allow empty values (use required if needed)
      if (typeof value !== "string") return false
      // More comprehensive email validation regex
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
      return emailRegex.test(value)
    },
    message,
  }),

  numeric: (message = "Deve essere un numero"): ValidationRule => ({
    validate: (value) => {
      if (value === "" || value === null || value === undefined) return true // Allow empty values (use required if needed)
      return !isNaN(Number(value))
    },
    message,
  }),

  integer: (message = "Deve essere un numero intero"): ValidationRule => ({
    validate: (value) => {
      if (value === "" || value === null || value === undefined) return true // Allow empty values (use required if needed)
      return /^-?\d+$/.test(String(value))
    },
    message,
  }),

  decimal: (message = "Deve essere un numero decimale valido"): ValidationRule => ({
    validate: (value) => {
      if (value === "" || value === null || value === undefined) return true // Allow empty values (use required if needed)
      return /^-?\d+(\.\d+)?$/.test(String(value))
    },
    message,
  }),

  date: (message = "Deve essere una data valida"): ValidationRule => ({
    validate: (value) => {
      if (value === "" || value === null || value === undefined) return true // Allow empty values (use required if needed)
      const date = new Date(value)
      return !isNaN(date.getTime())
    },
    message,
  }),

  custom: (validateFn: (value: any) => boolean, message: string): ValidationRule => ({
    validate: validateFn,
    message,
  }),
}

// Validate a single field against its rules
export const validateField = (value: any, rules: ValidationRule[]): string | null => {
  for (const rule of rules) {
    if (!rule.validate(value)) {
      return rule.message
    }
  }
  return null
}

// Validate all form data against validation schema
export const validateForm = (
  formData: Record<string, any>,
  validationSchema: FieldValidation,
): Record<string, string | null> => {
  const errors: Record<string, string | null> = {}

  for (const field in validationSchema) {
    const value = formData[field]
    const fieldRules = validationSchema[field]
    const error = validateField(value, fieldRules)
    errors[field] = error
  }

  return errors
}

// Check if form has any errors
export const hasErrors = (errors: Record<string, string | null>): boolean => {
  return Object.values(errors).some((error) => error !== null)
}
