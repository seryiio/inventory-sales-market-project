"use client";

import { useState, Suspense } from "react";
import { SalesHeader } from "@/components/sales/sales-header";
import { SalesTable } from "@/components/sales/sales-table";
import { SalesFilters } from "@/components/sales/sales-filters";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function SalesPage() {
  const [filters, setFilters] = useState({
    searchTerm: "",
    selectedStore: "all",
    statusFilter: "all",
    dateRange: "today",
  });

  return (
    <div className="flex flex-col gap-6 p-6">
      <SalesHeader />

      <Card className="p-6">
        <Suspense fallback={<Skeleton className="h-20 w-full" />}>
          <SalesFilters onFilterChange={setFilters} />
        </Suspense>

        <div className="mt-6">
          <Suspense fallback={<Skeleton className="h-96 w-full" />}>
            <SalesTable filters={filters} />
          </Suspense>
        </div>
      </Card>
    </div>
  );
}
