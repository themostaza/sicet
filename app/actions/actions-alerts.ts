'use server'

import { createServerSupabaseClient } from "@/lib/supabase"
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
const supabase = (): SupabaseClient<Database> =>
  createServerSupabaseClient() as SupabaseClient<Database>

// Schema for alert validation
const AlertConditionSchema = z.object({
  field_id: z.string(),
  type: z.enum(['numeric', 'text', 'boolean']),
  min: z.number().optional(),
  max: z.number().optional(),
  match_text: z.string().optional(),
  boolean_value: z.boolean().optional()
})

const AlertSchema = z.object({
  id: z.string(),
  kpi_id: z.string(),
  device_id: z.string(),
  is_active: z.boolean(),
  email: z.string().email(),
  conditions: z.array(AlertConditionSchema)
})

type Alert = z.infer<typeof AlertSchema>
type AlertCondition = z.infer<typeof AlertConditionSchema>

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
  deviceId: string,
  email: string,
  conditions: AlertCondition[],
  isActive: boolean = true
): Promise<Alert> {
  const alert: Database['public']['Tables']['kpi_alerts']['Insert'] = {
    kpi_id: kpiId,
    device_id: deviceId,
    email,
    conditions,
    is_active: isActive
  }

  const { data, error } = await supabase()
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
  console.log('Getting alerts for KPI:', kpiId)
  const { data, error } = await supabase()
    .from('kpi_alerts')
    .select('*')
    .eq('kpi_id', kpiId)
    .eq('is_active', true)

  if (error) {
    console.error('Error getting alerts:', error)
    handlePostgrestError(error)
  }
  
  const alerts = (data ?? []).map(parseAlert)
  console.log('Found alerts:', alerts)
  return alerts
}

// Log an alert trigger and send email
async function logAlertTrigger(
  alert: Alert,
  kpiId: string,
  deviceId: string,
  triggeredValue: any,
  errorMessage?: string
): Promise<void> {
  // First get the KPI and device details for the email
  const { data: kpiData, error: kpiError } = await supabase()
    .from('kpis')
    .select('name, description')
    .eq('id', kpiId)
    .single()

  if (kpiError) {
    console.error('Error getting KPI details:', kpiError)
    throw kpiError
  }

  const { data: deviceData, error: deviceError } = await supabase()
    .from('devices')
    .select('name, location')
    .eq('id', deviceId)
    .single()

  if (deviceError) {
    console.error('Error getting device details:', deviceError)
    throw deviceError
  }

  // Create the log entry
  const log: Database['public']['Tables']['kpi_alert_logs']['Insert'] = {
    alert_id: alert.id,
    kpi_id: kpiId,
    device_id: deviceId,
    triggered_value: triggeredValue,
    error_message: errorMessage,
    email_sent: false // Will be updated after sending email
  }

  const { data: logData, error: logError } = await supabase()
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
      triggeredValue,
      conditions: alert.conditions
    })

    // Update the log to mark email as sent
    const { error: updateError } = await supabase()
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
    const { error: updateError } = await supabase()
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
    deviceId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  } = {}
): Promise<Database['public']['Tables']['kpi_alert_logs']['Row'][]> {
  let query = supabase()
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
  if (params.deviceId) {
    query = query.eq('device_id', params.deviceId)
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
  deviceId: string,
  value: any
): Promise<void> {
  console.log('Checking alerts for:', { kpiId, deviceId, value })
  
  // Get active alerts for this KPI
  const alerts = await getKpiAlerts(kpiId)
  console.log('Active alerts:', alerts)
  
  for (const alert of alerts) {
    // Skip if alert is for a different device
    if (alert.device_id !== deviceId) {
      console.log('Skipping alert for different device:', alert.device_id)
      continue
    }

    console.log('Checking alert:', alert)
    let shouldTrigger = false
    let triggeredValue: any = null

    // Check each condition
    for (const condition of alert.conditions) {
      console.log('Checking condition:', condition)
      
      // Estrai il valore del campo in base alla struttura del valore
      let fieldValue: any = undefined

      if (value === null || value === undefined) {
        console.log('Value is null or undefined, skipping condition')
        continue
      }

      if (Array.isArray(value)) {
        // Se il valore è un array, cerca il campo con l'ID corrispondente
        // Prima prova a cercare per ID esatto
        let field = value.find(v => v && typeof v === 'object' && v.id === condition.field_id)
        
        // Se non lo trova, prova a cercare per nome del campo (per retrocompatibilità)
        if (!field) {
          const fieldName = condition.field_id.split('-').pop()?.toLowerCase()
          if (fieldName) {
            field = value.find(v => v && typeof v === 'object' && 
              (v.name?.toLowerCase() === fieldName || 
               v.id?.toLowerCase().endsWith(fieldName)))
          }
        }
        
        fieldValue = field?.value
        console.log('Array value, found field:', { field, fieldValue, condition_field_id: condition.field_id })
      } else if (typeof value === 'object') {
        // Se il valore è un oggetto singolo
        if ('id' in value && value.id === condition.field_id) {
          fieldValue = value.value
          console.log('Object with matching id, fieldValue:', fieldValue)
        } else if ('value' in value) {
          // Se è un oggetto con una proprietà value, usa quello
          fieldValue = value.value
          console.log('Object with value property, fieldValue:', fieldValue)
        } else {
          // Altrimenti usa l'oggetto stesso come valore
          fieldValue = value
          console.log('Using object as value:', fieldValue)
        }
      } else {
        // Se è un valore primitivo, usalo direttamente
        fieldValue = value
        console.log('Using primitive value:', fieldValue)
      }

      if (fieldValue === undefined || fieldValue === null) {
        console.log('Field value is undefined or null, skipping condition')
        continue
      }

      console.log('Evaluating condition with value:', { type: condition.type, fieldValue })

      switch (condition.type) {
        case 'numeric':
          const numValue = Number(fieldValue)
          if (!isNaN(numValue)) {
            if (condition.min !== undefined && numValue < condition.min) {
              console.log('Numeric condition triggered (min):', { numValue, min: condition.min })
              shouldTrigger = true
              triggeredValue = numValue
            }
            if (condition.max !== undefined && numValue > condition.max) {
              console.log('Numeric condition triggered (max):', { numValue, max: condition.max })
              shouldTrigger = true
              triggeredValue = numValue
            }
          } else {
            console.log('Invalid numeric value:', fieldValue)
          }
          break

        case 'text':
          if (condition.match_text && String(fieldValue).includes(condition.match_text)) {
            console.log('Text condition triggered:', { fieldValue, match: condition.match_text })
            shouldTrigger = true
          }
          break

        case 'boolean':
          if (condition.boolean_value !== undefined) {
            const boolValue = typeof fieldValue === 'string' 
              ? fieldValue.toLowerCase() === 'true' || fieldValue.toLowerCase() === 'si' || fieldValue.toLowerCase() === 'sì'
              : Boolean(fieldValue)
            if (boolValue === condition.boolean_value) {
              console.log('Boolean condition triggered:', { boolValue, expected: condition.boolean_value })
              shouldTrigger = true
            }
          }
          break
      }

      if (shouldTrigger) {
        console.log(`ALERT TRIGGERED: KPI ${kpiId} triggered alert for device ${deviceId}`)
        console.log(`Would send email to ${alert.email} with value:`, triggeredValue)
        
        // Log the alert trigger
        try {
          await logAlertTrigger(alert, kpiId, deviceId, triggeredValue)
        } catch (error) {
          console.error('Error logging alert trigger:', error)
          // Non chiamiamo nuovamente logAlertTrigger per evitare il doppio log
          // L'errore verrà comunque registrato nel log dell'applicazione
        }
        
        break
      }
    }
  }
} 