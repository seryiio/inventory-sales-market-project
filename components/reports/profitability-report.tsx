"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { formatCurrency } from "@/lib/utils"
import { DollarSign, TrendingUp, Percent, Target } from "lucide-react"

interface ProfitabilityData {
  store: string
  revenue: number
  cost: number
  profit: number
  margin: number
}

interface ProfitabilitySummary {
  totalRevenue: number
  totalCost: number
  totalProfit: number
  averageMargin: number
}

export function ProfitabilityReport() {
  const [profitabilityData, setProfitabilityData] = useState<ProfitabilityData[]>([])
  const [summary, setSummary] = useState<ProfitabilitySummary>({
    totalRevenue: 0,
    totalCost: 0,
    totalProfit: 0,
    averageMargin: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProfitabilityReport()
  }, [])

  const loadProfitabilityReport = async () => {
    const supabase = createClient()

    try {
      // Get last 30 days of sales with items and products
      const endDate = new Date()
      const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000)

      const { data: salesData } = await supabase
        .from("sales")
        .select(`
          *,
          store:stores(name),
          sale_items(
            quantity,
            unit_price,
            product:products(cost_price)
          )
        `)
        .eq("status", "completed")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString())

      if (!salesData) return

      // Group by store and calculate profitability
      const storeData: Record<string, ProfitabilityData> = {}

      salesData.forEach((sale) => {
        const storeName = (sale as any).store?.name || "Tienda desconocida"

        if (!storeData[storeName]) {
          storeData[storeName] = {
            store: storeName,
            revenue: 0,
            cost: 0,
            profit: 0,
            margin: 0,
          }
        }

        // Calculate revenue and cost for this sale
        let saleRevenue = 0
        let saleCost = 0
        ;(sale as any).sale_items?.forEach((item: any) => {
          const itemRevenue = item.quantity * item.unit_price
          const itemCost = item.quantity * (item.product?.cost_price || 0)

          saleRevenue += itemRevenue
          saleCost += itemCost
        })

        storeData[storeName].revenue += saleRevenue
        storeData[storeName].cost += saleCost
      })

      // Calculate profit and margin for each store
      Object.values(storeData).forEach((store) => {
        store.profit = store.revenue - store.cost
        store.margin = store.revenue > 0 ? (store.profit / store.revenue) * 100 : 0
      })

      // Calculate summary
      const totalRevenue = Object.values(storeData).reduce((sum, store) => sum + store.revenue, 0)
      const totalCost = Object.values(storeData).reduce((sum, store) => sum + store.cost, 0)
      const totalProfit = totalRevenue - totalCost
      const averageMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0

      setProfitabilityData(Object.values(storeData))
      setSummary({
        totalRevenue,
        totalCost,
        totalProfit,
        averageMargin,
      })
    } catch (error) {
      console.error("Error loading profitability report:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Reporte de Rentabilidad</CardTitle>
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
          <DollarSign className="h-5 w-5" />
          Reporte de Rentabilidad (Últimos 30 días)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-3 p-4 border rounded-lg">
            <TrendingUp className="h-8 w-8 text-green-600" />
            <div>
              <div className="text-2xl font-bold">{formatCurrency(summary.totalRevenue)}</div>
              <div className="text-xs text-muted-foreground">Ingresos Totales</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 border rounded-lg">
            <Target className="h-8 w-8 text-red-600" />
            <div>
              <div className="text-2xl font-bold">{formatCurrency(summary.totalCost)}</div>
              <div className="text-xs text-muted-foreground">Costos Totales</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 border rounded-lg">
            <DollarSign className="h-8 w-8 text-blue-600" />
            <div>
              <div className="text-2xl font-bold">{formatCurrency(summary.totalProfit)}</div>
              <div className="text-xs text-muted-foreground">Ganancia Total</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 border rounded-lg">
            <Percent className="h-8 w-8 text-purple-600" />
            <div>
              <div className="text-2xl font-bold">{summary.averageMargin.toFixed(1)}%</div>
              <div className="text-xs text-muted-foreground">Margen Promedio</div>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div>
          <h4 className="font-medium mb-3">Rentabilidad por Tienda</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={profitabilityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="store" />
              <YAxis />
              <Tooltip
                formatter={(value, name) => [
                  name === "margin" ? `${(value as number).toFixed(1)}%` : formatCurrency(value as number),
                  name === "revenue"
                    ? "Ingresos"
                    : name === "cost"
                      ? "Costos"
                      : name === "profit"
                        ? "Ganancia"
                        : "Margen",
                ]}
              />
              <Bar dataKey="revenue" fill="hsl(var(--chart-1))" name="revenue" />
              <Bar dataKey="cost" fill="hsl(var(--chart-2))" name="cost" />
              <Bar dataKey="profit" fill="hsl(var(--chart-3))" name="profit" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Detailed Table */}
        <div>
          <h4 className="font-medium mb-3">Detalle por Tienda</h4>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 text-sm font-medium">Tienda</th>
                  <th className="text-right p-3 text-sm font-medium">Ingresos</th>
                  <th className="text-right p-3 text-sm font-medium">Costos</th>
                  <th className="text-right p-3 text-sm font-medium">Ganancia</th>
                  <th className="text-right p-3 text-sm font-medium">Margen</th>
                </tr>
              </thead>
              <tbody>
                {profitabilityData.map((item, index) => (
                  <tr key={item.store} className={index % 2 === 0 ? "bg-background" : "bg-muted/50"}>
                    <td className="p-3 text-sm font-medium">{item.store}</td>
                    <td className="p-3 text-sm text-right">{formatCurrency(item.revenue)}</td>
                    <td className="p-3 text-sm text-right">{formatCurrency(item.cost)}</td>
                    <td className="p-3 text-sm text-right">
                      <span className={item.profit >= 0 ? "text-green-600" : "text-red-600"}>
                        {formatCurrency(item.profit)}
                      </span>
                    </td>
                    <td className="p-3 text-sm text-right">
                      <span
                        className={
                          item.margin >= 20 ? "text-green-600" : item.margin >= 10 ? "text-amber-600" : "text-red-600"
                        }
                      >
                        {item.margin.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Performance Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {profitabilityData.filter((store) => store.margin >= 20).length}
            </div>
            <div className="text-xs text-muted-foreground">Tiendas con margen alto (≥20%)</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-600">
              {profitabilityData.filter((store) => store.margin >= 10 && store.margin < 20).length}
            </div>
            <div className="text-xs text-muted-foreground">Tiendas con margen medio (10-20%)</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {profitabilityData.filter((store) => store.margin < 10).length}
            </div>
            <div className="text-xs text-muted-foreground">Tiendas con margen bajo (&lt;10%)</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
