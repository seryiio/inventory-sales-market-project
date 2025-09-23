"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Product } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Package } from "lucide-react"

export function LowStockAlerts() {
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadLowStockProducts()
  }, [])

  const loadLowStockProducts = async () => {
    const supabase = createClient()

    try {
      const { data } = await supabase
        .from("products")
        .select(`
          *,
          category:categories(name),
          store:stores(name, type)
        `)
        .eq("is_active", true)
        .order("stock_quantity", { ascending: true })
        .limit(10)

      const lowStock = data?.filter((product) => product.stock_quantity <= product.min_stock) || []

      setLowStockProducts(lowStock)
    } catch (error) {
      console.error("Error loading low stock products:", error)
    } finally {
      setLoading(false)
    }
  }

  const getStockStatus = (product: Product) => {
    if (product.stock_quantity === 0) {
      return { label: "Sin stock", variant: "destructive" as const, color: "text-red-600" }
    } else if (product.stock_quantity <= product.min_stock) {
      return { label: "Stock bajo", variant: "secondary" as const, color: "text-amber-600" }
    }
    return { label: "Normal", variant: "default" as const, color: "text-green-600" }
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

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Alertas de Stock
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-muted rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          Alertas de Stock
        </CardTitle>
      </CardHeader>
      <CardContent>
        {lowStockProducts.length === 0 ? (
          <div className="text-center py-8">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No hay productos con stock bajo</p>
          </div>
        ) : (
          <div className="space-y-4">
            {lowStockProducts.map((product) => {
              const status = getStockStatus(product)
              return (
                <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{product.name}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className={`text-xs ${getStoreTypeColor((product as any).store?.type)}`}>
                        {(product as any).store?.name}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{(product as any).category?.name}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-medium ${status.color}`}>{product.stock_quantity} unidades</div>
                    <div className="text-xs text-muted-foreground">Min: {product.min_stock}</div>
                  </div>
                </div>
              )
            })}
            <Button variant="outline" className="w-full bg-transparent" size="sm">
              Ver todos los productos
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
