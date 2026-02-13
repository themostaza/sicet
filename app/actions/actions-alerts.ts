'use server'

import { createServerSupabaseClient } from "@/lib/supabase-server"
import type { Database } from "@/supabase/database.types"
import type { SupabaseClient, PostgrestError } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { sendAlertEmail } from '../lib/email'

// Helper function to handle Postgrest errors
const handlePostgrestError = (error: PostgrestError) => {
  console.error('Database error:', error)
  throw new Error(error.message)
}

// Get typed supabase client
const supabase = async (): Promise<SupabaseClient<Database>> =>
  await createServerSupabaseClient()

// Schema for alert validation
const AlertConditionSchema = z.object({
  field_id: z.string(),
  type: z.enum(['number', 'decimal', 'text', 'boolean', 'select']),
  min: z.number().optional(),
  max: z.number().optional(),
  match_text: z.string().optional(),
  boolean_value: z.boolean().optional(),
  match_values: z.array(z.string()).optional() // Per i campi select: valori che fanno scattare l'alert
})

const AlertSchema = z.object({
  id: z.string(),
  kpi_id: z.string(),
  todolist_id: z.string(),
  is_active: z.boolean(),
  email: z.string().email(),
  conditions: z.array(AlertConditionSchema)
})

type Alert = z.infer<typeof AlertSchema>
export type AlertCondition = z.infer<typeof AlertConditionSchema>

// Helper to parse database alert to Alert type
const parseAlert = (dbAlert: Database['public']['Tables']['kpi_alerts']['Row']): Alert => {
  return {
    ...dbAlert,
    conditions: dbAlert.conditions as AlertCondition[]
  }
}

// Create a new alert
export async function createAlert(
  kpiId: string,
  todolistId: string,
  email: string,
  conditions: AlertCondition[],
  isActive: boolean = true
): Promise<Alert> {
  const alert: Database['public']['Tables']['kpi_alerts']['Insert'] = {
    kpi_id: kpiId,
    todolist_id: todolistId,
    email,
    conditions,
    is_active: isActive
  }

  const { data, error } = await (await supabase())
    .from('kpi_alerts')
    .insert(alert)
    .select()
    .single()

  if (error) handlePostgrestError(error)
  if (!data) throw new Error('Failed to create alert')

  return parseAlert(data)
}

// Get alerts for a KPI
export async function getKpiAlerts(kpiId: string): Promise<Alert[]> {
  const { data, error } = await (await supabase())
    .from('kpi_alerts')
    .select('*')
    .eq('kpi_id', kpiId)
    .eq('is_active', true)

  if (error) {
    console.error('Error getting alerts:', error)
    handlePostgrestError(error)
  }
  
  const alerts = (data ?? []).map(parseAlert)
  return alerts
}

// Log an alert trigger and send email
async function logAlertTrigger(
  alert: Alert,
  kpiId: string,
  todolistId: string,
  triggeredConditions: { condition: AlertCondition; fieldValue: any }[],
  errorMessage?: string
): Promise<void> {
  const supabaseClient = await supabase()
  // First get the KPI and device details for the email
  const { data: kpiData, error: kpiError } = await supabaseClient
    .from('kpis')
    .select('name, description, value') // Fetch value for field definitions
    .eq('id', kpiId)
    .single()

  if (kpiError) {
    console.error('Error getting KPI details:', kpiError)
    throw kpiError
  }

  // Recupera la todolist per ottenere il device_id
  const { data: todolistData, error: todolistError } = await supabaseClient
    .from('todolist')
    .select('device_id')
    .eq('id', todolistId)
    .single()
  if (todolistError) {
    console.error('Error getting todolist for device_id:', todolistError)
    throw todolistError
  }

  // Ora recupera il device
  const { data: deviceData, error: deviceError } = await supabaseClient
    .from('devices')
    .select('name, location')
    .eq('id', todolistData.device_id)
    .single()

  if (deviceError) {
    console.error('Error getting device details:', deviceError)
    throw deviceError
  }

  // Create the log entry
  const log: Database['public']['Tables']['kpi_alert_logs']['Insert'] = {
    alert_id: alert.id,
    triggered_value: triggeredConditions as any, // Storing the array of triggered conditions
    error_message: errorMessage,
    email_sent: false // Will be updated after sending email
  }

  const { data: logData, error: logError } = await supabaseClient
    .from('kpi_alert_logs')
    .insert(log)
    .select()
    .single()

  if (logError) {
    console.error('Error logging alert trigger:', logError)
    throw logError
  }

  // Send the email
  try {
    await sendAlertEmail(alert.email, {
      kpiName: kpiData.name,
      kpiDescription: kpiData.description,
      deviceName: deviceData.name,
      deviceLocation: deviceData.location,
      triggeredConditions: triggeredConditions,
      kpiValue: kpiData.value
    })

    // Update the log to mark email as sent
    const { error: updateError } = await supabaseClient
      .from('kpi_alert_logs')
      .update({
        email_sent: true,
        email_sent_at: new Date().toISOString()
      })
      .eq('id', logData.id)

    if (updateError) {
      console.error('Error updating email sent status:', updateError)
    }
  } catch (emailError) {
    console.error('Error sending alert email:', emailError)
    // Update the log with the email error
    const { error: updateError } = await supabaseClient
      .from('kpi_alert_logs')
      .update({
        error_message: emailError instanceof Error ? emailError.message : 'Failed to send email'
      })
      .eq('id', logData.id)

    if (updateError) {
      console.error('Error updating email error status:', updateError)
    }
    throw emailError
  }
}

// Get alert logs
export async function getAlertLogs(
  params: {
    alertId?: string;
    kpiId?: string;
    todolistId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  } = {}
): Promise<Database['public']['Tables']['kpi_alert_logs']['Row'][]> {
  let query = (await supabase())
    .from('kpi_alert_logs')
    .select(`
      *,
      kpi_alerts (
        email,
        conditions
      ),
      kpis (
        name,
        description
      ),
      devices (
        name,
        location
      )
    `)
    .order('triggered_at', { ascending: false })

  if (params.alertId) {
    query = query.eq('alert_id', params.alertId)
  }
  if (params.kpiId) {
    query = query.eq('kpi_id', params.kpiId)
  }
  if (params.todolistId) {
    query = query.eq('todolist_id', params.todolistId)
  }
  if (params.startDate) {
    query = query.gte('triggered_at', params.startDate)
  }
  if (params.endDate) {
    query = query.lte('triggered_at', params.endDate)
  }
  if (params.limit) {
    query = query.limit(params.limit)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error getting alert logs:', error)
    handlePostgrestError(error)
  }

  return data ?? []
}

// Check if a KPI value triggers any alerts
export async function checkKpiAlerts(
  kpiId: string,
  todolistId: string,
  value: any
): Promise<void> {
  
  // Get active alerts for this KPI
  const alerts = await getKpiAlerts(kpiId)
  
  for (const alert of alerts) {
    // Skip if alert is for a different todolist
    if (alert.todolist_id !== todolistId) {
      continue
    }

    const triggeredConditions: { condition: AlertCondition; fieldValue: any }[] = []

    // Check each condition
    for (const condition of alert.conditions) {
      
      // Extract field value based on the value structure
      let fieldValue: any = undefined

      if (value === null || value === undefined) {
        continue
      }

      // Handle different value structures
      if (Array.isArray(value)) {
        // If value is an array, find the field with matching ID
        const field = value.find(v => v && typeof v === 'object' && v.id === condition.field_id)
        if (field) {
          fieldValue = field.value
        } else {
          // Try to find by field name if ID doesn't match
          const fieldName = condition.field_id.split('-').pop()?.toLowerCase()
          if (fieldName) {
            const fieldByName = value.find(v => v && typeof v === 'object' && 
              (v.name?.toLowerCase() === fieldName || 
               v.id?.toLowerCase().endsWith(fieldName)))
            if (fieldByName) {
              fieldValue = fieldByName.value
            }
          }
        }
      } else if (typeof value === 'object') {
        // Handle object value structure
        if ('id' in value && value.id === condition.field_id) {
          fieldValue = value.value
        } else if ('value' in value) {
          fieldValue = value.value
        } else {
          // If it's a simple object, use it directly
          fieldValue = value
        }
      } else {
        // Handle primitive values
        fieldValue = value
      }

      if (fieldValue === undefined || fieldValue === null) {
        continue
      }


      let conditionTriggered = false
      switch (condition.type) {
        case 'number':
        case 'decimal':
          const numValue = Number(fieldValue)
          if (!isNaN(numValue)) {
            if (
              (condition.min !== undefined && numValue < condition.min) ||
              (condition.max !== undefined && numValue > condition.max)
            ) {
              conditionTriggered = true
            }
          } else {
          }
          break

        case 'text':
          const textValue = String(fieldValue).trim()
          if (condition.match_text) {
            // Wildcard: "*" significa "qualsiasi testo non vuoto"
            if (condition.match_text === '*') {
              if (textValue.length > 0) {
                conditionTriggered = true
              }
            } else {
              // Logica esistente: cerca testo specifico
              if (textValue.toLowerCase().includes(condition.match_text.toLowerCase())) {
                conditionTriggered = true
              }
            }
          }
          break

        case 'boolean':
          if (condition.boolean_value !== undefined) {
            let boolValue: boolean
            
            if (typeof fieldValue === 'string') {
              const lowerValue = fieldValue.toLowerCase().trim()
              boolValue = lowerValue === 'true' || 
                         lowerValue === 'si' || 
                         lowerValue === 'sì' || 
                         lowerValue === 'yes' || 
                         lowerValue === '1' ||
                         lowerValue === 'on'
            } else if (typeof fieldValue === 'number') {
              boolValue = fieldValue !== 0
            } else {
              boolValue = Boolean(fieldValue)
            }
            
            if (boolValue === condition.boolean_value) {
              conditionTriggered = true
            }
          }
          break

        case 'select':
          // Per i campi select, verifica se il valore inserito è tra quelli configurati per scattare l'alert
          if (condition.match_values && condition.match_values.length > 0) {
            const selectValue = String(fieldValue).toLowerCase().trim()
            const matchValuesLower = condition.match_values.map(v => v.toLowerCase().trim())
            if (matchValuesLower.includes(selectValue)) {
              conditionTriggered = true
            }
          }
          break
      }

      if (conditionTriggered) {
        triggeredConditions.push({ condition, fieldValue })
      }
    }

    if (triggeredConditions.length > 0) {
      try {
        await logAlertTrigger(alert, kpiId, todolistId, triggeredConditions)
      } catch (error) {
        console.error('Error logging alert trigger:', error)
      }
    }
  }
}

// Toggle alert active status
export async function toggleAlertActive(alertId: string, isActive: boolean): Promise<void> {
  const { error } = await (await supabase())
    .from('kpi_alerts')
    .update({ is_active: isActive })
    .eq('id', alertId)

  if (error) {
    console.error('Error toggling alert status:', error)
    handlePostgrestError(error)
  }
}

// Delete an alert
export async function deleteAlert(alertId: string): Promise<void> {
  const { error } = await (await supabase())
    .from('kpi_alerts')
    .delete()
    .eq('id', alertId)

  if (error) {
    console.error('Error deleting alert:', error)
    handlePostgrestError(error)
  }
} 