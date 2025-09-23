import { Suspense } from "react"
import { SalesHeader } from "@/components/sales/sales-header"
import { SalesTable } from "@/components/sales/sales-table"
import { SalesFilters } from "@/components/sales/sales-filters"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function SalesPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <SalesHeader />

      <Card className="p-6">
        <Suspense fallback={<Skeleton className="h-20 w-full" />}>
          <SalesFilters />
        </Suspense>

        <div className="mt-6">
          <Suspense fallback={<Skeleton className="h-96 w-full" />}>
            <SalesTable />
          </Suspense>
        </div>
      </Card>
    </div>
  )
}
