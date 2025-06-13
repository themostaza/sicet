import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Generate a UUID v4
export function generateUUID(): string {
  return crypto.randomUUID();
}

// Helper function to escape CSV values
export function escapeCSV(value: any): string {
  if (value === null || value === undefined) return ''
  
  // Convert booleans to Italian
  if (typeof value === 'boolean') {
    return value ? 'Sì' : 'No'
  }
  
  const stringValue = String(value)
  
  // If contains commas, quotes or newlines, wrap in quotes and escape internal quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }
  
  return stringValue
}
