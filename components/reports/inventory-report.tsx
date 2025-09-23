"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts"
import { formatCurrency } from "@/lib/utils"
import { Package, AlertTriangle, TrendingDown, Warehouse } from "lucide-react"

interface InventoryData {
  category: string
  products: number
  value: number
  lowStock: number
}

interface InventorySummary {
  totalProducts: number
  totalValue: number
  lowStockProducts: number
  outOfStockProducts: number
}

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
]

export function InventoryReport() {
  const [inventoryData, setInventoryData] = useState<InventoryData[]>([])
  const [summary, setSummary] = useState<InventorySummary>({
    totalProducts: 0,
    totalValue: 0,
    lowStockProducts: 0,
    outOfStockProducts: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadInventoryReport()
  }, [])

  const loadInventoryReport = async () => {
    const supabase = createClient()

    try {
      // Get all products with categories
      const { data: products } = await supabase
        .from("products")
        .select(`
          *,
          category:categories(name)
        `)
        .eq("is_active", true)

      if (!products) return

      // Group by category
      const categoryData: Record<string, InventoryData> = {}

      products.forEach((product) => {
        const categoryName = (product as any).category?.name || "Sin categoría"

        if (!categoryData[categoryName]) {
          categoryData[categoryName] = {
            category: categoryName,
            products: 0,
            value: 0,
            lowStock: 0,
          }
        }

        categoryData[categoryName].products += 1
        categoryData[categoryName].value += product.stock_quantity * product.unit_price

        if (product.stock_quantity <= product.min_stock) {
          categoryData[categoryName].lowStock += 1
        }
      })

      // Calculate summary
      const totalProducts = products.length
      const totalValue = products.reduce((sum, product) => sum + product.stock_quantity * product.unit_price, 0)
      const lowStockProducts = products.filter((product) => product.stock_quantity <= product.min_stock).length
      const outOfStockProducts = products.filter((product) => product.stock_quantity === 0).length

      setInventoryData(Object.values(categoryData))
      setSummary({
        totalProducts,
        totalValue,
        lowStockProducts,
        outOfStockProducts,
      })
    } catch (error) {
      console.error("Error loading inventory report:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Reporte de Inventario</CardTitle>
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
          <Package className="h-5 w-5" />
          Reporte de Inventario
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-3 border rounded-lg">
            <Warehouse className="h-8 w-8 text-blue-600" />
            <div>
              <div className="text-2xl font-bold">{summary.totalProducts}</div>
              <div className="text-xs text-muted-foreground">Total Productos</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 border rounded-lg">
            <Package className="h-8 w-8 text-green-600" />
            <div>
              <div className="text-2xl font-bold">{formatCurrency(summary.totalValue)}</div>
              <div className="text-xs text-muted-foreground">Valor Inventario</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 border rounded-lg">
            <AlertTriangle className="h-8 w-8 text-amber-600" />
            <div>
              <div className="text-2xl font-bold">{summary.lowStockProducts}</div>
              <div className="text-xs text-muted-foreground">Stock Bajo</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 border rounded-lg">
            <TrendingDown className="h-8 w-8 text-red-600" />
            <div>
              <div className="text-2xl font-bold">{summary.outOfStockProducts}</div>
              <div className="text-xs text-muted-foreground">Sin Stock</div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie Chart - Distribution by Category */}
          <div>
            <h4 className="font-medium mb-3">Distribución por Categoría</h4>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={inventoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="products"
                >
                  {inventoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} productos`, "Cantidad"]} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Bar Chart - Value by Category */}
          <div>
            <h4 className="font-medium mb-3">Valor por Categoría</h4>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={inventoryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip formatter={(value) => [formatCurrency(value as number), "Valor"]} />
                <Bar dataKey="value" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Details Table */}
        <div>
          <h4 className="font-medium mb-3">Detalle por Categoría</h4>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 text-sm font-medium">Categoría</th>
                  <th className="text-right p-3 text-sm font-medium">Productos</th>
                  <th className="text-right p-3 text-sm font-medium">Valor</th>
                  <th className="text-right p-3 text-sm font-medium">Stock Bajo</th>
                </tr>
              </thead>
              <tbody>
                {inventoryData.map((item, index) => (
                  <tr key={item.category} className={index % 2 === 0 ? "bg-background" : "bg-muted/50"}>
                    <td className="p-3 text-sm">{item.category}</td>
                    <td className="p-3 text-sm text-right">{item.products}</td>
                    <td className="p-3 text-sm text-right">{formatCurrency(item.value)}</td>
                    <td className="p-3 text-sm text-right">
                      <span className={item.lowStock > 0 ? "text-amber-600 font-medium" : ""}>{item.lowStock}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
