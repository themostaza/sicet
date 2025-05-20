import { getTodolistsGroupedWithFilters } from "@/app/actions/actions-todolist"
import TodolistListClient from "@/components/todolists/client"

type TimeSlot = "mattina" | "pomeriggio" | "sera" | "notte";

const timeSlotOrder: Record<TimeSlot, number> = {
  mattina: 1,
  pomeriggio: 2,
  sera: 3,
  notte: 4,
};

export default async function TodolistPage() {
  const { filtered, counts } = await getTodolistsGroupedWithFilters();

  return (
    <TodolistListClient
      todolistsByFilter={filtered}
      counts={counts}
      initialFilter="all"
    />
  )
}
