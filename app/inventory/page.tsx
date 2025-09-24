"use client"; // ← IMPORTANTE: marca este archivo como Client Component

import { useState } from "react";
import { InventoryHeader } from "@/components/inventory/inventory-header";
import { InventoryTable } from "@/components/inventory/inventory-table";
import { InventoryFilters } from "@/components/inventory/inventory-filters";
import { Card } from "@/components/ui/card";

export default function InventoryPage() {
  const [filters, setFilters] = useState({
    searchTerm: "",
    selectedStore: "all",
    selectedCategory: "all",
    stockFilter: "all",
  });

  return (
    <div className="flex flex-col gap-4 sm:gap-6 p-4 sm:p-6">
      <InventoryHeader />

      <Card className="p-4 sm:p-6">
        <InventoryFilters onFilterChange={setFilters} />

        <div className="mt-4 sm:mt-6">
          <InventoryTable filters={filters} />
        </div>
      </Card>
    </div>
  );
}
