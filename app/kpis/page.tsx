import { getKpis } from "@/app/actions/actions-kpi"
import KpiList from "@/components/kpis/client"
import { Suspense } from "react"

export default async function Page() {
  const { kpis } = await getKpis({ offset: 0, limit: 20 })
  return (
    <Suspense fallback={<div className="p-6">Caricamento...</div>}>
      <KpiList initialKpis={kpis} />
    </Suspense>
  )
}