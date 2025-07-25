import { redirect } from "next/navigation"
import { createKpi } from "@/app/actions/actions-kpi"
import KpiForm from "@/components/kpi/form"
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card"
import { generateKpiId } from "@/lib/utils"

export default function Page() {
  async function onSubmit(formData: FormData) {
    "use server"
    await createKpi({
      id: generateKpiId(),
      name: formData.get("name")!.toString(),
      description: formData.get("description")?.toString() ?? "",
      value: JSON.parse(formData.get("value")!.toString()),
    })
    redirect("/kpis")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nuovo controllo</CardTitle>
      </CardHeader>
      <CardContent>
        <KpiForm mode="create" action={onSubmit} />
      </CardContent>
    </Card>
  )
}
