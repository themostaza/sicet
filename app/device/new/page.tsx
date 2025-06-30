import { redirect } from "next/navigation"
import { createDevice } from "@/app/actions/actions-device"
import DeviceForm from "@/components/device/form"
import { useMemo } from "react"
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card"
import { generateDeviceId } from "@/lib/utils"

export default function Page() {
  // Genera un ID automatico solo una volta per render
  const defaultId = useMemo(() => generateDeviceId(), [])

  async function onSubmit(formData: FormData) {
    "use server"
    await createDevice({
      id: formData.get("id")!.toString(),
      name: formData.get("name")!.toString(),
      location: formData.get("location")?.toString() ?? "",
      description: formData.get("description")?.toString() ?? "",
      tags: JSON.parse(formData.get("tags")!.toString()),
    })
    redirect("/device")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nuovo Device</CardTitle>
      </CardHeader>
      <CardContent>
        <DeviceForm mode="create" action={onSubmit} defaultId={defaultId} />
      </CardContent>
    </Card>
  )
} 