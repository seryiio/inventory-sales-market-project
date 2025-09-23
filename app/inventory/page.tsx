import { Suspense } from "react"
import { InventoryHeader } from "@/components/inventory/inventory-header"
import { InventoryTable } from "@/components/inventory/inventory-table"
import { InventoryFilters } from "@/components/inventory/inventory-filters"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function InventoryPage() {
  return (
    <div className="flex flex-col gap-4 sm:gap-6 p-4 sm:p-6">
      <InventoryHeader />

      <Card className="p-4 sm:p-6">
        <Suspense fallback={<Skeleton className="h-20 w-full" />}>
          <InventoryFilters />
        </Suspense>

        <div className="mt-4 sm:mt-6">
          <Suspense fallback={<Skeleton className="h-96 w-full" />}>
            <InventoryTable />
          </Suspense>
        </div>
      </Card>
    </div>
  )
}
