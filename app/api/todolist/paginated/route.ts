import { NextRequest, NextResponse } from "next/server"
import { getTodolistsWithPagination } from "@/app/actions/actions-todolist"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const filter = searchParams.get("filter") as "all" | "today" | "overdue" | "future" | "completed"
    const offset = parseInt(searchParams.get("offset") || "0")
    const limit = parseInt(searchParams.get("limit") || "20")
    const selectedDate = searchParams.get("selectedDate") || undefined
    const selectedDevice = searchParams.get("selectedDevice") || undefined
    const selectedTags = searchParams.get("selectedTags") ? searchParams.get("selectedTags")!.split(",") : undefined
    const sortColumn = searchParams.get("sortColumn") || undefined
    const sortDirection = searchParams.get("sortDirection") || undefined

    if (!filter) {
      return NextResponse.json(
        { error: "Filter parameter is required" },
        { status: 400 }
      )
    }

    const result = await getTodolistsWithPagination({
      filter,
      offset,
      limit,
      selectedDate,
      selectedDevice,
      selectedTags,
      sortColumn,
      sortDirection
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error in todolist paginated API:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 