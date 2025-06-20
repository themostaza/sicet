import { NextRequest, NextResponse } from 'next/server'
import { checkKpiAlerts } from '@/app/actions/actions-alerts'

export async function POST(request: NextRequest) {
  try {
    console.log('[TEST-KPI-ALERTS] Starting KPI alert test...')
    
    const body = await request.json()
    const { kpiId, todolistId, value } = body
    
    if (!kpiId || !todolistId) {
      return NextResponse.json(
        { error: 'Missing required parameters: kpiId, todolistId' },
        { status: 400 }
      )
    }
    
    console.log('[TEST-KPI-ALERTS] Testing with:', { kpiId, todolistId, value })
    
    // Check for alerts
    await checkKpiAlerts(kpiId, todolistId, value)
    
    console.log('[TEST-KPI-ALERTS] KPI alert check completed successfully')
    
    return NextResponse.json({
      success: true,
      message: 'KPI alert check completed',
      tested: { kpiId, todolistId, value }
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