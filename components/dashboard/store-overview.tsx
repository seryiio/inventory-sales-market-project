"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Sale, Store } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { formatCurrency } from "@/lib/utils"
import { StoreIcon } from "lucide-react"

interface StoreStats {
  store: Store
  salesCount: number
  revenue: number
  totalProducts: number
  lowStockCount: number
}

interface StoreOverviewProps {
  ventas: Sale[]
  timeRange: string
}

export function StoreOverview({ ventas, timeRange }: StoreOverviewProps) {
  const [storeStats, setStoreStats] = useState<StoreStats[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStoreStats()
  }, [ventas, timeRange]) // recalcula cada vez que cambian ventas o timeRange

  const loadStoreStats = async () => {
    const supabase = createClient()
    setLoading(true)

    try {
      // Traer todas las tiendas
      const { data: stores } = await supabase.from("stores").select("*").order("name")
      if (!stores) return

      // Para cada tienda, calcular estadísticas usando las ventas filtradas
      const stats = stores.map((store) => {
        // Filtrar ventas por store y rango de tiempo
        const storeVentas = ventas.filter((v) => v.store_id === store.id)

        // Calcular ingresos y cantidad de ventas
        const revenue = storeVentas.reduce((sum, v) => sum + v.total_amount, 0)
        const salesCount = storeVentas.length

        // Total productos activos
        const totalProducts = 0 // opcional: podrías traer desde supabase si quieres exacto

        // Stock bajo
        const lowStockCount = 0 // opcional: podrías traer desde supabase si quieres exacto

        return {
          store,
          salesCount,
          revenue,
          totalProducts,
          lowStockCount,
        }
      })

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

  const maxRevenue = Math.max(...storeStats.map((s) => s.revenue), 1)

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
                  <div className="font-medium text-sm">{formatCurrency(stats.revenue)}</div>
                  <div className="text-xs text-muted-foreground">{stats.salesCount} ventas</div>
                </div>
              </div>

              <Progress value={(stats.revenue / maxRevenue) * 100} className="h-2" />

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
