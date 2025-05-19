import { getKpi, updateKpi, deleteKpi } from "@/app/actions/actions-kpi"
import { redirect } from "next/navigation"
import KpiForm from "@/components/kpi/form"
import { Button } from "@/components/ui/button"
import { KpiDeleteDialog } from "@/components/kpi/kpi-delete-dialog"
import { Card, CardHeader, CardContent, CardFooter, CardTitle } from "@/components/ui/card"

export default async function Page(props: { params: { id: string } }) {
  const params = await props.params
  const kpi = await getKpi(params.id)
  if (!kpi) redirect("/kpis")

  async function onSubmit(formData: FormData) {
    "use server"
    await updateKpi({
      id: params.id,
      name: formData.get("name")!.toString(),
      description: formData.get("description")?.toString() ?? "",
      value: JSON.parse(formData.get("value")!.toString()),
    })
    redirect("/kpis")
  }

  async function onDelete() {
    "use server"
    await deleteKpi(params.id)
    redirect("/kpis")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Modifica KPI</CardTitle>
      </CardHeader>
      <CardContent>
        <KpiForm kpi={kpi} mode="edit" action={onSubmit} />
      </CardContent>
      <CardFooter>
        <KpiDeleteDialog onDelete={onDelete}>
          <div className="flex items-center gap-2 w-full justify-between bg-destructive/10 p-2 rounded-md">
            <p className="text-sm text-destructive">Elimina il KPI</p>
            <Button type="button" variant="destructive">
              Elimina
            </Button>
          </div>
        </KpiDeleteDialog>
      </CardFooter>
    </Card>
  )
}
