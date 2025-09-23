"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Store } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { formatCurrency } from "@/lib/utils"
import { StoreIcon } from "lucide-react"

interface StoreStats {
  store: Store
  todaySales: number
  todayRevenue: number
  totalProducts: number
  lowStockCount: number
}

export function StoreOverview() {
  const [storeStats, setStoreStats] = useState<StoreStats[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStoreStats()
  }, [])

  const loadStoreStats = async () => {
    const supabase = createClient()

    try {
      // Get all stores
      const { data: stores } = await supabase.from("stores").select("*").order("name")

      if (!stores) return

      // Get today's date range
      const today = new Date()
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)

      const storeStatsPromises = stores.map(async (store) => {
        // Today's sales for this store
        const { data: todaySales } = await supabase
          .from("sales")
          .select("total_amount")
          .eq("store_id", store.id)
          .eq("status", "completed")
          .gte("created_at", startOfDay.toISOString())
          .lt("created_at", endOfDay.toISOString())

        // Total products for this store
        const { count: totalProducts } = await supabase
          .from("products")
          .select("*", { count: "exact", head: true })
          .eq("store_id", store.id)
          .eq("is_active", true)

        // Low stock products for this store
        const { data: lowStockData } = await supabase
          .from("products")
          .select("stock_quantity, min_stock")
          .eq("store_id", store.id)
          .eq("is_active", true)

        const lowStockCount = lowStockData?.filter((product) => product.stock_quantity <= product.min_stock).length || 0

        const todayRevenue = todaySales?.reduce((sum, sale) => sum + sale.total_amount, 0) || 0
        const todaySalesCount = todaySales?.length || 0

        return {
          store,
          todaySales: todaySalesCount,
          todayRevenue,
          totalProducts: totalProducts || 0,
          lowStockCount,
        }
      })

      const stats = await Promise.all(storeStatsPromises)
      setStoreStats(stats)
    } catch (error) {
      console.error("Error loading store stats:", error)
    } finally {
      setLoading(false)
    }
  }

  const getStoreTypeColor = (type: string) => {
    switch (type) {
      case "ferreteria":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      case "cosmeticos":
        return "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200"
      case "animales":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
    }
  }

  const getStoreTypeLabel = (type: string) => {
    switch (type) {
      case "ferreteria":
        return "Ferretería"
      case "cosmeticos":
        return "Cosméticos"
      case "animales":
        return "Mascotas"
      default:
        return type
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <StoreIcon className="h-5 w-5" />
            Resumen por Tienda
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-20 bg-muted rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const maxRevenue = Math.max(...storeStats.map((s) => s.todayRevenue), 1)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <StoreIcon className="h-5 w-5" />
          Resumen por Tienda
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {storeStats.map((stats) => (
            <div key={stats.store.id} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{stats.store.name}</span>
                  <Badge variant="outline" className={`text-xs ${getStoreTypeColor(stats.store.type)}`}>
                    {getStoreTypeLabel(stats.store.type)}
                  </Badge>
                </div>
                <div className="text-right">
                  <div className="font-medium text-sm">{formatCurrency(stats.todayRevenue)}</div>
                  <div className="text-xs text-muted-foreground">{stats.todaySales} ventas</div>
                </div>
              </div>

              <Progress value={(stats.todayRevenue / maxRevenue) * 100} className="h-2" />

              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{stats.totalProducts} productos</span>
                {stats.lowStockCount > 0 && (
                  <span className="text-amber-600">{stats.lowStockCount} con stock bajo</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
