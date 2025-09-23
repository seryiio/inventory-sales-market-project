import { Suspense } from "react"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { StatsCards } from "@/components/dashboard/stats-cards"
import { SalesChart } from "@/components/dashboard/sales-chart"
import { LowStockAlerts } from "@/components/dashboard/low-stock-alerts"
import { RecentSales } from "@/components/dashboard/recent-sales"
import { StoreOverview } from "@/components/dashboard/store-overview"
import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-4 sm:gap-6 p-4 sm:p-6">
      <DashboardHeader />

      <Suspense
        fallback={
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        }
      >
        <StatsCards />
      </Suspense>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
        <div className="xl:col-span-2">
          <Suspense fallback={<Skeleton className="h-96" />}>
            <SalesChart />
          </Suspense>
        </div>
        <div>
          <Suspense fallback={<Skeleton className="h-96" />}>
            <LowStockAlerts />
          </Suspense>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Suspense fallback={<Skeleton className="h-96" />}>
          <RecentSales />
        </Suspense>
        <Suspense fallback={<Skeleton className="h-96" />}>
          <StoreOverview />
        </Suspense>
      </div>
    </div>
  )
}
