"use client";

import { useState, useEffect } from "react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { RecentSales } from "@/components/dashboard/recent-sales";
import { SalesChart } from "@/components/dashboard/sales-chart";
import { LowStockAlerts } from "@/components/dashboard/low-stock-alerts";
import { StoreOverview } from "@/components/dashboard/store-overview";
import { Skeleton } from "@/components/ui/skeleton";
import { Suspense } from "react";
import { Sale } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

export default function DashboardPage() {
  const [ventas, setVentas] = useState<Sale[]>([]);
  const [timeRange, setTimeRange] = useState("today");
  const [loading, setLoading] = useState(true);

  // Traer todas las ventas al montar
  const fetchVentas = async () => {
    try {
      setLoading(true);
      const { data: allSales } = (await supabase
        .from("sales")
        .select("*")
        .order("created_at", { ascending: false })) as {
        data: Sale[] | null;
        error: any;
      };
      setVentas(allSales || []);
    } catch (error) {
      console.error("Error al cargar ventas:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVentas();
  }, []);

  // Función robusta para filtrar ventas según el timeRange
  const getFilteredVentas = (): Sale[] => {
    const hoy = new Date();

    const isSameDay = (dateStr: string) => {
      const date = new Date(dateStr);
      return (
        date.getFullYear() === hoy.getFullYear() &&
        date.getMonth() === hoy.getMonth() &&
        date.getDate() === hoy.getDate()
      );
    };

    switch (timeRange) {
      case "today":
        return ventas.filter((v) => isSameDay(v.created_at));
      case "week": {
        const startWeek = new Date();
        startWeek.setDate(hoy.getDate() - hoy.getDay());
        return ventas.filter((v) => new Date(v.created_at) >= startWeek);
      }
      case "month": {
        const startMonth = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        return ventas.filter((v) => new Date(v.created_at) >= startMonth);
      }
      case "quarter": {
        const quarter = Math.floor(hoy.getMonth() / 3);
        const startQuarter = new Date(hoy.getFullYear(), quarter * 3, 1);
        return ventas.filter((v) => new Date(v.created_at) >= startQuarter);
      }
      case "year": {
        const startYear = new Date(hoy.getFullYear(), 0, 1);
        return ventas.filter((v) => new Date(v.created_at) >= startYear);
      }
      default:
        return ventas;
    }
  };

  const filteredVentas = getFilteredVentas();

  return (
    <div className="flex flex-col gap-4 sm:gap-6 p-4 sm:p-6">
      <DashboardHeader
        timeRange={timeRange}
        setTimeRange={setTimeRange}
        ventas={filteredVentas} // pasamos ventas filtradas al header
      />

      {/* Estadísticas */}
      <Suspense fallback={<Skeleton className="h-32" />}>
        <StatsCards ventas={filteredVentas} />
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
          <StoreOverview ventas={filteredVentas} />
        </Suspense>
      </div>
    </div>
  );
}
