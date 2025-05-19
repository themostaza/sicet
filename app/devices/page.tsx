import { getDevices } from "@/app/actions/actions-device"
import DeviceList from "@/components/devices/client"
import { Suspense } from "react"

export default async function Page() {
  const { devices } = await getDevices({ offset: 0, limit: 20 })
  return (
    <Suspense fallback={<div className="p-6">Caricamento...</div>}>
      <DeviceList initialDevices={devices} />
    </Suspense>
  )
}