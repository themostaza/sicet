import { NextRequest, NextResponse } from 'next/server'
import { getKpisByDevice } from '@/lib/export-utils'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Extract query parameters
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const deviceId = searchParams.get('deviceId')
    
    // Validate required parameters
    if (!startDate || !endDate || !deviceId) {
      return NextResponse.json(
        { error: 'startDate, endDate, and deviceId are required parameters' },
        { status: 400 }
      )
    }
    
    // Validate date format (basic validation)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return NextResponse.json(
        { error: 'Date format must be YYYY-MM-DD' },
        { status: 400 }
      )
    }
    
    // Validate date range
    if (new Date(startDate) > new Date(endDate)) {
      return NextResponse.json(
        { error: 'startDate must be before or equal to endDate' },
        { status: 400 }
      )
    }
    
    // Validate deviceId is not empty
    if (!deviceId.trim()) {
      return NextResponse.json(
        { error: 'deviceId cannot be empty' },
        { status: 400 }
      )
    }
    
    // Call the function
    const kpis = await getKpisByDevice({
      startDate,
      endDate,
      deviceId
    })
    
    // Return JSON response
    return NextResponse.json({
      success: true,
      data: kpis,
      count: kpis.length
    })
    
  } catch (error) {
    console.error('Get KPIs by device API error:', error)
    
    if (error instanceof Error) {
      return NextResponse.json(
        { 
          success: false,
          error: error.message 
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error' 
      },
      { status: 500 }
    )
  }
} 