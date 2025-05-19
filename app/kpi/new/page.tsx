import { redirect } from "next/navigation"
import { createKpi } from "@/app/actions/actions-kpi"
import KpiForm from "@/components/kpi/form"
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card"

export default function Page() {
  async function onSubmit(formData: FormData) {
    "use server"
    await createKpi({
      id: crypto.randomUUID(),
      name: formData.get("name")!.toString(),
      description: formData.get("description")?.toString() ?? "",
      value: JSON.parse(formData.get("value")!.toString()),
    })
    redirect("/kpis")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nuovo KPI</CardTitle>
      </CardHeader>
      <CardContent>
        <KpiForm mode="create" action={onSubmit} />
      </CardContent>
    </Card>
  )
}
