"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { formatCurrency } from "@/lib/utils"
import { TrendingUp, DollarSign, ShoppingCart, Users } from "lucide-react"

interface SalesData {
  date: string
  sales: number
  revenue: number
  customers: number
}

interface SalesSummary {
  totalSales: number
  totalRevenue: number
  averageTicket: number
  uniqueCustomers: number
  growth: number
}

export function SalesReport() {
  const [salesData, setSalesData] = useState<SalesData[]>([])
  const [summary, setSummary] = useState<SalesSummary>({
    totalSales: 0,
    totalRevenue: 0,
    averageTicket: 0,
    uniqueCustomers: 0,
    growth: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSalesReport()
  }, [])

  const loadSalesReport = async () => {
    const supabase = createClient()

    try {
      // Get last 30 days of sales data
      const endDate = new Date()
      const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000)

      const { data: salesData } = await supabase
        .from("sales")
        .select("created_at, total_amount, customer_name")
        .eq("status", "completed")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString())
        .order("created_at", { ascending: true })

      // Group by date
      const groupedData: Record<string, { sales: number; revenue: number; customers: Set<string> }> = {}

      // Initialize all 30 days
      for (let i = 29; i >= 0; i--) {
        const date = new Date(endDate.getTime() - i * 24 * 60 * 60 * 1000)
        const dateKey = date.toISOString().split("T")[0]
        groupedData[dateKey] = { sales: 0, revenue: 0, customers: new Set() }
      }

      // Populate with actual data
      salesData?.forEach((sale) => {
        const dateKey = sale.created_at.split("T")[0]
        if (groupedData[dateKey]) {
          groupedData[dateKey].sales += 1
          groupedData[dateKey].revenue += sale.total_amount
          if (sale.customer_name) {
            groupedData[dateKey].customers.add(sale.customer_name)
          }
        }
      })

      // Convert to chart format
      const chartData = Object.entries(groupedData).map(([date, data]) => ({
        date: new Date(date).toLocaleDateString("es-CO", {
          month: "short",
          day: "numeric",
        }),
        sales: data.sales,
        revenue: data.revenue,
        customers: data.customers.size,
      }))

      // Calculate summary
      const totalSales = salesData?.length || 0
      const totalRevenue = salesData?.reduce((sum, sale) => sum + sale.total_amount, 0) || 0
      const averageTicket = totalSales > 0 ? totalRevenue / totalSales : 0
      const uniqueCustomers = new Set(salesData?.map((sale) => sale.customer_name).filter(Boolean)).size

      // Calculate growth (compare with previous 30 days)
      const previousStartDate = new Date(startDate.getTime() - 30 * 24 * 60 * 60 * 1000)
      const { data: previousSalesData } = await supabase
        .from("sales")
        .select("total_amount")
        .eq("status", "completed")
        .gte("created_at", previousStartDate.toISOString())
        .lt("created_at", startDate.toISOString())

      const previousRevenue = previousSalesData?.reduce((sum, sale) => sum + sale.total_amount, 0) || 0
      const growth = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0

      setSalesData(chartData)
      setSummary({
        totalSales,
        totalRevenue,
        averageTicket,
        uniqueCustomers,
        growth,
      })
    } catch (error) {
      console.error("Error loading sales report:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Reporte de Ventas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96 flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Cargando reporte...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Reporte de Ventas (Últimos 30 días)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-3 border rounded-lg">
            <ShoppingCart className="h-8 w-8 text-primary" />
            <div>
              <div className="text-2xl font-bold">{summary.totalSales}</div>
              <div className="text-xs text-muted-foreground">Total Ventas</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 border rounded-lg">
            <DollarSign className="h-8 w-8 text-green-600" />
            <div>
              <div className="text-2xl font-bold">{formatCurrency(summary.totalRevenue)}</div>
              <div className="text-xs text-muted-foreground">Ingresos Totales</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 border rounded-lg">
            <TrendingUp className="h-8 w-8 text-blue-600" />
            <div>
              <div className="text-2xl font-bold">{formatCurrency(summary.averageTicket)}</div>
              <div className="text-xs text-muted-foreground">Ticket Promedio</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 border rounded-lg">
            <Users className="h-8 w-8 text-purple-600" />
            <div>
              <div className="text-2xl font-bold">{summary.uniqueCustomers}</div>
              <div className="text-xs text-muted-foreground">Clientes Únicos</div>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip
                formatter={(value, name) => [
                  name === "revenue" ? formatCurrency(value as number) : value,
                  name === "revenue" ? "Ingresos" : name === "sales" ? "Ventas" : "Clientes",
                ]}
              />
              <Line type="monotone" dataKey="sales" stroke="hsl(var(--primary))" strokeWidth={2} />
              <Line type="monotone" dataKey="revenue" stroke="hsl(var(--chart-2))" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Growth Indicator */}
        <div className="flex items-center justify-center gap-2 p-3 bg-muted rounded-lg">
          <TrendingUp className={`h-4 w-4 ${summary.growth >= 0 ? "text-green-600" : "text-red-600"}`} />
          <span className="text-sm">
            Crecimiento vs período anterior:{" "}
            <span className={`font-medium ${summary.growth >= 0 ? "text-green-600" : "text-red-600"}`}>
              {summary.growth >= 0 ? "+" : ""}
              {summary.growth.toFixed(1)}%
            </span>
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
