"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { formatCurrency } from "@/lib/utils"

interface ChartData {
  date: string
  sales: number
  revenue: number
}

export function SalesChart() {
  const [chartData, setChartData] = useState<ChartData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadChartData()
  }, [])

  const loadChartData = async () => {
    const supabase = createClient()

    try {
      // Get last 7 days of sales data
      const endDate = new Date()
      const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000)

      const { data: salesData } = await supabase
        .from("sales")
        .select("created_at, total_amount")
        .eq("status", "completed")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString())
        .order("created_at", { ascending: true })

      // Group by date
      const groupedData: Record<string, { sales: number; revenue: number }> = {}

      // Initialize all 7 days
      for (let i = 6; i >= 0; i--) {
        const date = new Date(endDate.getTime() - i * 24 * 60 * 60 * 1000)
        const dateKey = date.toISOString().split("T")[0]
        groupedData[dateKey] = { sales: 0, revenue: 0 }
      }

      // Populate with actual data
      salesData?.forEach((sale) => {
        const dateKey = sale.created_at.split("T")[0]
        if (groupedData[dateKey]) {
          groupedData[dateKey].sales += 1
          groupedData[dateKey].revenue += sale.total_amount
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
      }))

      setChartData(chartData)
    } catch (error) {
      console.error("Error loading chart data:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ventas de los Últimos 7 Días</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Cargando gráfico...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ventas de los Últimos 7 Días</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip
              formatter={(value, name) => [
                name === "revenue" ? formatCurrency(value as number) : value,
                name === "revenue" ? "Ingresos" : "Ventas",
              ]}
            />
            <Bar dataKey="sales" fill="hsl(var(--primary))" name="sales" />
            <Bar dataKey="revenue" fill="hsl(var(--chart-2))" name="revenue" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
