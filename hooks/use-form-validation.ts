"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { type FieldValidation, validateForm, hasErrors } from "@/lib/validation"

export type FormState<T> = {
  values: T
  errors: Record<keyof T, string | null>
  touched: Record<keyof T, boolean>
  isValid: boolean
  isDirty: boolean
}

export type FormOptions<T> = {
  initialValues: T
  validationSchema: FieldValidation
  onSubmit?: (values: T) => void | Promise<void>
}

export function useFormValidation<T extends Record<string, any>>({
  initialValues,
  validationSchema,
  onSubmit,
}: FormOptions<T>) {
  const [values, setValues] = useState<T>(initialValues)
  const [errors, setErrors] = useState<Record<keyof T, string | null>>(() => {
    const initialErrors = {} as Record<keyof T, string | null>
    Object.keys(initialValues).forEach((key) => {
      initialErrors[key as keyof T] = null
    })
    return initialErrors
  })
  const [touched, setTouched] = useState<Record<keyof T, boolean>>(() => {
    const initialTouched = {} as Record<keyof T, boolean>
    Object.keys(initialValues).forEach((key) => {
      initialTouched[key as keyof T] = false
    })
    return initialTouched
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Validate all fields
  const validateFields = useCallback(() => {
    const validationErrors = validateForm(values, validationSchema)
    const typedErrors = {} as Record<keyof T, string | null>

    Object.keys(validationErrors).forEach((key) => {
      typedErrors[key as keyof T] = validationErrors[key]
    })

    setErrors(typedErrors)
    return !hasErrors(validationErrors)
  }, [values, validationSchema])

  // Handle field change
  const handleChange = useCallback(
    (field: keyof T, value: any) => {
      setValues((prev) => ({ ...prev, [field]: value }))

      // Mark field as touched
      if (!touched[field]) {
        setTouched((prev) => ({ ...prev, [field]: true }))
      }
    },
    [touched],
  )

  // Handle field blur
  const handleBlur = useCallback(
    (field: keyof T) => {
      if (!touched[field]) {
        setTouched((prev) => ({ ...prev, [field]: true }))

        // Validate the field on blur
        if (validationSchema[field as string]) {
          const fieldErrors = validateForm(
            { [field]: values[field] },
            {
              [field as string]: validationSchema[field as string],
            },
          )

          setErrors((prev) => ({ ...prev, [field]: fieldErrors[field as string] }))
        }
      }
    },
    [touched, validationSchema, values],
  )

  // Handle form submission
  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      if (e) {
        e.preventDefault()
      }

      // Mark all fields as touched
      const allTouched = {} as Record<keyof T, boolean>
      Object.keys(values).forEach((key) => {
        allTouched[key as keyof T] = true
      })
      setTouched(allTouched)

      // Validate all fields
      const isValid = validateFields()

      if (isValid && onSubmit) {
        setIsSubmitting(true)
        try {
          await onSubmit(values)
        } finally {
          setIsSubmitting(false)
        }
      }

      return isValid
    },
    [values, validateFields, onSubmit],
  )

  // Reset form to initial values
  const resetForm = useCallback(() => {
    setValues(initialValues)

    const resetErrors = {} as Record<keyof T, string | null>
    const resetTouched = {} as Record<keyof T, boolean>

    Object.keys(initialValues).forEach((key) => {
      resetErrors[key as keyof T] = null
      resetTouched[key as keyof T] = false
    })

    setErrors(resetErrors)
    setTouched(resetTouched)
  }, [initialValues])

  // Set a specific field value
  const setFieldValue = useCallback((field: keyof T, value: any) => {
    setValues((prev) => ({ ...prev, [field]: value }))
  }, [])

  // Set multiple field values
  const setFieldValues = useCallback((newValues: Partial<T>) => {
    setValues((prev) => ({ ...prev, ...newValues }))
  }, [])

  // Set a specific field error
  const setFieldError = useCallback((field: keyof T, error: string | null) => {
    setErrors((prev) => ({ ...prev, [field]: error }))
  }, [])

  const formState: FormState<T> = {
    values,
    errors,
    touched,
    isValid: !hasErrors(errors),
    isDirty: Object.values(touched).some(Boolean),
  }

  return {
    formState,
    handleChange,
    handleBlur,
    handleSubmit,
    resetForm,
    setFieldValue,
    setFieldValues,
    setFieldError,
    isSubmitting,
    validateFields,
  }
}
