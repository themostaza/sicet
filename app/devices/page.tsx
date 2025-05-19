import { getDevices } from "@/lib/actions"
import DeviceList from "@/components/devices/client"
import { Suspense } from "react"

export const dynamic = "force-dynamic"
export const revalidate = 60

export default async function Page() {
  const { devices } = await getDevices({ offset: 0, limit: 20 })
  return (
    <Suspense fallback={<div className="p-6">Caricamento...</div>}>
      <DeviceList initialDevices={devices} />
    </Suspense>
  )
}