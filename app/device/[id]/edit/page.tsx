import { getDevice, updateDevice, deleteDevice } from "@/lib/actions"
import { redirect } from "next/navigation"
import DeviceForm from "@/components/device/form"
import { Button } from "@/components/ui/button"
import { DeviceDeleteDialog } from "@/components/device/device-delete-dialog"
import { Card, CardHeader, CardContent, CardFooter, CardTitle } from "@/components/ui/card"
export default async function Page(props: { params: { id: string } }) {
  const params = await props.params
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
    <Card>
      <CardHeader>
        <CardTitle>Modifica Device</CardTitle>
      </CardHeader>
      <CardContent>
        <DeviceForm device={device} mode="edit" action={onSubmit} />
      </CardContent>
      <CardFooter>
      <DeviceDeleteDialog onDelete={onDelete}>
          <div className="flex items-center gap-2 w-full justify-between bg-destructive/10 p-2 rounded-md">
            <p className="text-sm text-destructive">Elimina il device</p>
            <Button type="button" variant="destructive">
              Elimina
            </Button>
          </div>
        </DeviceDeleteDialog>
      </CardFooter>
    </Card>
  )
} 