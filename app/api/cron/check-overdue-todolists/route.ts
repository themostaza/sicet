import { NextRequest, NextResponse } from 'next/server'
import { processOverdueTodolists } from '@/app/actions/actions-todolist-alerts'

export async function POST(request: NextRequest) {
  try {
    // Verify the request is from a legitimate cron job
    const authHeader = request.headers.get('authorization')
    const expectedToken = process.env.CRON_SECRET_TOKEN
    
    if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Process overdue todolists
    const result = await processOverdueTodolists()
    
    return NextResponse.json({
      success: true,
      message: `Processed ${result.processed} overdue todolists with ${result.errors} errors`,
      processed: result.processed,
      errors: result.errors
    })

  } catch (error) {
    console.error('Error processing overdue todolists:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Also allow GET requests for manual testing
export async function GET() {
  try {
    const result = await processOverdueTodolists()
    
    return NextResponse.json({
      success: true,
      message: `Processed ${result.processed} overdue todolists with ${result.errors} errors`,
      processed: result.processed,
      errors: result.errors
    })

  } catch (error) {
    console.error('Error processing overdue todolists:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 