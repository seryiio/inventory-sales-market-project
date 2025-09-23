"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Package, AlertTriangle } from "lucide-react"

interface DashboardStats {
  totalSales: number
  totalRevenue: number
  totalProducts: number
  lowStockProducts: number
  salesGrowth: number
  revenueGrowth: number
}

export function StatsCards() {
  const [stats, setStats] = useState<DashboardStats>({
    totalSales: 0,
    totalRevenue: 0,
    totalProducts: 0,
    lowStockProducts: 0,
    salesGrowth: 0,
    revenueGrowth: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    const supabase = createClient()

    try {
      // Get today's date range
      const today = new Date()
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)

      // Get yesterday's date range for comparison
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
      const startOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate())
      const endOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate() + 1)

      // Today's sales
      const { data: todaySales } = await supabase
        .from("sales")
        .select("total_amount")
        .eq("status", "completed")
        .gte("created_at", startOfDay.toISOString())
        .lt("created_at", endOfDay.toISOString())

      // Yesterday's sales for comparison
      const { data: yesterdaySales } = await supabase
        .from("sales")
        .select("total_amount")
        .eq("status", "completed")
        .gte("created_at", startOfYesterday.toISOString())
        .lt("created_at", endOfYesterday.toISOString())

      // Total products
      const { count: totalProducts } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true)

      // Low stock products
      const { data: lowStockData } = await supabase
        .from("products")
        .select("stock_quantity, min_stock")
        .eq("is_active", true)

      const lowStockCount = lowStockData?.filter((product) => product.stock_quantity <= product.min_stock).length || 0

      // Calculate stats
      const todayRevenue = todaySales?.reduce((sum, sale) => sum + sale.total_amount, 0) || 0
      const yesterdayRevenue = yesterdaySales?.reduce((sum, sale) => sum + sale.total_amount, 0) || 0
      const todaySalesCount = todaySales?.length || 0
      const yesterdaySalesCount = yesterdaySales?.length || 0

      // Calculate growth percentages
      const revenueGrowth =
        yesterdayRevenue > 0 ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 : todayRevenue > 0 ? 100 : 0

      const salesGrowth =
        yesterdaySalesCount > 0
          ? ((todaySalesCount - yesterdaySalesCount) / yesterdaySalesCount) * 100
          : todaySalesCount > 0
            ? 100
            : 0

      setStats({
        totalSales: todaySalesCount,
        totalRevenue: todayRevenue,
        totalProducts: totalProducts || 0,
        lowStockProducts: lowStockCount,
        salesGrowth,
        revenueGrowth,
      })
    } catch (error) {
      console.error("Error loading stats:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatGrowth = (growth: number) => {
    const isPositive = growth >= 0
    const Icon = isPositive ? TrendingUp : TrendingDown
    const color = isPositive ? "text-green-600" : "text-red-600"

    return (
      <div className={`flex items-center gap-1 text-xs sm:text-sm ${color}`}>
        <Icon className="h-3 w-3 sm:h-4 sm:w-4" />
        {Math.abs(growth).toFixed(1)}%
      </div>
    )
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4 sm:p-6">
              <div className="h-16 sm:h-20 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs sm:text-sm font-medium">Ventas Hoy</CardTitle>
          <ShoppingCart className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-xl sm:text-2xl font-bold">{stats.totalSales}</div>
          {formatGrowth(stats.salesGrowth)}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs sm:text-sm font-medium">Ingresos Hoy</CardTitle>
          <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-xl sm:text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
          {formatGrowth(stats.revenueGrowth)}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs sm:text-sm font-medium">Total Productos</CardTitle>
          <Package className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-xl sm:text-2xl font-bold">{stats.totalProducts}</div>
          <p className="text-xs text-muted-foreground">Productos activos</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs sm:text-sm font-medium">Stock Bajo</CardTitle>
          <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 text-amber-500" />
        </CardHeader>
        <CardContent>
          <div className="text-xl sm:text-2xl font-bold text-amber-600">{stats.lowStockProducts}</div>
          <p className="text-xs text-muted-foreground">Requieren atención</p>
        </CardContent>
      </Card>
    </div>
  )
}
