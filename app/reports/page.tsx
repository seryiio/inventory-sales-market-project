import { Suspense } from "react"
import { ReportsHeader } from "@/components/reports/reports-header"
import { ReportsFilters } from "@/components/reports/reports-filters"
import { SalesReport } from "@/components/reports/sales-report"
import { InventoryReport } from "@/components/reports/inventory-report"
import { ProfitabilityReport } from "@/components/reports/profitability-report"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function ReportsPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <ReportsHeader />

      <Card className="p-6">
        <Suspense fallback={<Skeleton className="h-20 w-full" />}>
          <ReportsFilters />
        </Suspense>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Suspense fallback={<Skeleton className="h-96" />}>
          <SalesReport />
        </Suspense>
        <Suspense fallback={<Skeleton className="h-96" />}>
          <InventoryReport />
        </Suspense>
      </div>

      <Suspense fallback={<Skeleton className="h-96" />}>
        <ProfitabilityReport />
      </Suspense>
    </div>
  )
}
