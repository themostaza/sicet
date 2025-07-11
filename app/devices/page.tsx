import { getDevices, getDeviceTags } from "@/app/actions/actions-device"
import DeviceList from "@/components/devices/client"
import { Suspense } from "react"

export default async function Page() {
  const { devices } = await getDevices({ offset: 0, limit: 20 })
  const allTags = await getDeviceTags()
  return (
    <Suspense fallback={<div className="p-6">Caricamento...</div>}>
      <DeviceList initialDevices={devices} allTags={allTags} />
    </Suspense>
  )
}