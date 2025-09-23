"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Store } from "@/lib/types"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar, Filter, RefreshCw } from "lucide-react"

export function ReportsFilters() {
  const [stores, setStores] = useState<Store[]>([])
  const [selectedStore, setSelectedStore] = useState<string>("all")
  const [dateRange, setDateRange] = useState<string>("month")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  useEffect(() => {
    loadStores()
    setDefaultDates()
  }, [])

  const loadStores = async () => {
    const supabase = createClient()
    const { data: storesData } = await supabase.from("stores").select("*").order("name")
    if (storesData) setStores(storesData)
  }

  const setDefaultDates = () => {
    const today = new Date()
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

    setStartDate(firstDayOfMonth.toISOString().split("T")[0])
    setEndDate(today.toISOString().split("T")[0])
  }

  const handleDateRangeChange = (range: string) => {
    setDateRange(range)
    const today = new Date()
    let start: Date

    switch (range) {
      case "today":
        start = new Date(today)
        break
      case "week":
        start = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case "month":
        start = new Date(today.getFullYear(), today.getMonth(), 1)
        break
      case "quarter":
        const quarterStart = Math.floor(today.getMonth() / 3) * 3
        start = new Date(today.getFullYear(), quarterStart, 1)
        break
      case "year":
        start = new Date(today.getFullYear(), 0, 1)
        break
      default:
        return
    }

    setStartDate(start.toISOString().split("T")[0])
    setEndDate(today.toISOString().split("T")[0])
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="h-5 w-5 text-muted-foreground" />
        <h3 className="font-medium">Filtros de Reporte</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label htmlFor="store">Tienda</Label>
          <Select value={selectedStore} onValueChange={setSelectedStore}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar tienda" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las tiendas</SelectItem>
              {stores.map((store) => (
                <SelectItem key={store.id} value={store.id}>
                  {store.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="dateRange">Período</Label>
          <Select value={dateRange} onValueChange={handleDateRangeChange}>
            <SelectTrigger>
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hoy</SelectItem>
              <SelectItem value="week">Esta semana</SelectItem>
              <SelectItem value="month">Este mes</SelectItem>
              <SelectItem value="quarter">Este trimestre</SelectItem>
              <SelectItem value="year">Este año</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="startDate">Fecha inicio</Label>
          <Input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="endDate">Fecha fin</Label>
          <Input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
      </div>

      <div className="flex justify-end">
        <Button variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizar Reportes
        </Button>
      </div>
    </div>
  )
}
