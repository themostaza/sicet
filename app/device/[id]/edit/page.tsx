import { getDevice, updateDevice, deleteDevice } from "@/lib/actions"
import { redirect } from "next/navigation"
import DeviceForm from "@/components/device/form"
import { Button } from "@/components/ui/button"

export default async function Page({ params }: { params: { id: string } }) {
  const device = await getDevice(params.id)
  if (!device) redirect("/device")

  async function onSubmit(formData: FormData) {
    "use server"
    await updateDevice({
      id: params.id,
      name: formData.get("name")!.toString(),
      location: formData.get("location")?.toString() ?? "",
      description: formData.get("description")?.toString() ?? "",
      tags: JSON.parse(formData.get("tags")!.toString()),
    })
    redirect("/device")
  }

  async function onDelete() {
    "use server"
    await deleteDevice(params.id)
    redirect("/device")
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white border rounded-lg">
      <h1 className="text-2xl font-bold mb-6">Modifica Device</h1>
      <DeviceForm device={device} mode="edit" action={onSubmit} />
      <form action={onDelete} className="mt-6">
        <Button type="submit" variant="destructive">Elimina</Button>
      </form>
    </div>
  )
} 