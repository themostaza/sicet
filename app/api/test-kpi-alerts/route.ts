import { NextRequest, NextResponse } from 'next/server'
import { checkKpiAlerts } from '@/app/actions/actions-alerts'

export async function POST(request: NextRequest) {
  try {
    console.log('[TEST-KPI-ALERTS] Starting KPI alert test...')
    
    const body = await request.json()
    const { kpiId, deviceId, value } = body
    
    if (!kpiId || !deviceId) {
      return NextResponse.json(
        { error: 'Missing required parameters: kpiId, deviceId' },
        { status: 400 }
      )
    }
    
    console.log('[TEST-KPI-ALERTS] Testing with:', { kpiId, deviceId, value })
    
    // Check for alerts
    await checkKpiAlerts(kpiId, deviceId, value)
    
    console.log('[TEST-KPI-ALERTS] KPI alert check completed successfully')
    
    return NextResponse.json({
      success: true,
      message: 'KPI alert check completed',
      tested: { kpiId, deviceId, value }
    })
    
  } catch (error) {
    console.error('[TEST-KPI-ALERTS] Error during KPI alert test:', error)
    return NextResponse.json(
      { 
        error: 'Error during KPI alert test',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 