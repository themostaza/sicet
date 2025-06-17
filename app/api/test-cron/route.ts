import { NextRequest, NextResponse } from "next/server"
import { processOverdueTodolists } from "@/app/actions/actions-todolist-alerts"

export async function POST(request: NextRequest) {
  try {
    console.log("[TEST-CRON] Starting manual cron job simulation...")
    
    // Process overdue todolist alerts
    const result = await processOverdueTodolists()
    
    console.log("[TEST-CRON] Cron job simulation completed:", result)
    
    return NextResponse.json({
      success: true,
      message: `Cron job simulation completed. Processed ${result.processed} todolists with ${result.errors} errors.`,
      result: {
        processedCount: result.processed,
        sentEmails: result.processed,
        errors: result.errors,
        details: result.details
      }
    })
  } catch (error) {
    console.error("[TEST-CRON] Error during cron job simulation:", error)
    
    return NextResponse.json({
      success: false,
      message: "Error during cron job simulation",
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Test cron endpoint - use POST to trigger the simulation",
    usage: "POST /api/test-cron to simulate the cron job"
  })
} 