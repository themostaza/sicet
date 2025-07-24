import { NextRequest, NextResponse } from 'next/server'
import { processOverdueTodolists } from '@/app/actions/actions-todolist-alerts'

export async function POST(request: NextRequest) {
  console.log('🚀 [CRON] Starting POST check-overdue-todolists at:', new Date().toISOString())
  
  try {
    // Verify the request is from a legitimate cron job (only in production)
    if (process.env.NODE_ENV === 'production') {
      console.log('🔒 [CRON] Production mode - checking authorization')
      const authHeader = request.headers.get('authorization')
      const expectedToken = process.env.CRON_SECRET_TOKEN
      
      if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
        console.log('❌ [CRON] Unauthorized request - invalid token')
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }
      console.log('✅ [CRON] Authorization successful')
    } else {
      console.log('🔓 [CRON] Development mode - skipping authorization')
    }

    console.log('📋 [CRON] Starting processOverdueTodolists...')
    // Process overdue todolists
    const result = await processOverdueTodolists()
    
    console.log('🎯 [CRON] Process completed:', {
      processed: result.processed,
      errors: result.errors,
      timestamp: new Date().toISOString()
    })
        
    return NextResponse.json({
      success: true,
      message: `Processed ${result.processed} overdue todolists with ${result.errors} errors`,
      processed: result.processed,
      errors: result.errors,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('💥 [CRON] Critical error processing overdue todolists:', error)
    console.error('💥 [CRON] Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    
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
  console.log('🧪 [CRON-TEST] Starting GET check-overdue-todolists at:', new Date().toISOString())
  
  try {
    console.log('📋 [CRON-TEST] Starting processOverdueTodolists...')
    const result = await processOverdueTodolists()
    
    console.log('🎯 [CRON-TEST] Process completed:', {
      processed: result.processed,
      errors: result.errors,
      timestamp: new Date().toISOString()
    })
    
    return NextResponse.json({
      success: true,
      message: `Processed ${result.processed} overdue todolists with ${result.errors} errors`,
      processed: result.processed,
      errors: result.errors,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('💥 [CRON-TEST] Critical error processing overdue todolists:', error)
    console.error('💥 [CRON-TEST] Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 