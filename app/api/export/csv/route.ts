import { NextRequest, NextResponse } from 'next/server'
import { exportTodolistData } from '@/lib/export-utils'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Extract query parameters
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const deviceIds = searchParams.get('deviceIds')?.split(',').filter(Boolean) || undefined
    const kpiIds = searchParams.get('kpiIds')?.split(',').filter(Boolean) || undefined
    const filename = searchParams.get('filename') || 'todolist-export'
    
    // Validate required parameters
    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate are required parameters' },
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
    
    // Call the export function
    const blob = await exportTodolistData({
      startDate,
      endDate,
      deviceIds,
      kpiIds
    })
    
    // Convert blob to array buffer
    const arrayBuffer = await blob.arrayBuffer()
    
    // Generate filename with date range
    const safeFilename = filename.replace(/[^a-zA-Z0-9-_]/g, '_')
    const finalFilename = `${safeFilename}-${startDate}-to-${endDate}.csv`
    
    // Return CSV file
    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${finalFilename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
    
  } catch (error) {
    console.error('CSV Export API error:', error)
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 