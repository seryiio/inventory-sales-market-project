"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Icons } from "@/components/icons"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Store, Category } from "@/lib/types"
import { Search } from "lucide-react"

export function InventoryFilters() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedStore, setSelectedStore] = useState<string>("all")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [stockFilter, setStockFilter] = useState<string>("all")
  const [stores, setStores] = useState<Store[]>([])
  const [categories, setCategories] = useState<Category[]>([])

  useEffect(() => {
    loadStoresAndCategories()
  }, [])

  const loadStoresAndCategories = async () => {
    const supabase = createClient()

    const { data: storesData } = await supabase.from("stores").select("*").order("name")

    const { data: categoriesData } = await supabase.from("categories").select("*").order("name")

    if (storesData) setStores(storesData)
    if (categoriesData) setCategories(categoriesData)
  }

  const clearFilters = () => {
    setSearchTerm("")
    setSelectedStore("all")
    setSelectedCategory("all")
    setStockFilter("all")
  }

  const activeFiltersCount = [
    searchTerm,
    selectedStore !== "all" ? selectedStore : null,
    selectedCategory !== "all" ? selectedCategory : null,
    stockFilter !== "all" ? stockFilter : null,
  ].filter(Boolean).length

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar productos por nombre, código de barras o SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Select value={selectedStore} onValueChange={setSelectedStore}>
            <SelectTrigger>
              <SelectValue placeholder="Todas las tiendas" />
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

          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Todas las categorías" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {categories
                .filter((cat) => selectedStore === "all" || cat.store_id === selectedStore)
                .map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>

          <Select value={stockFilter} onValueChange={setStockFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Estado de stock" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo el stock</SelectItem>
              <SelectItem value="low">Stock bajo</SelectItem>
              <SelectItem value="out">Sin stock</SelectItem>
              <SelectItem value="normal">Stock normal</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {activeFiltersCount > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="flex items-center gap-2">
            <Icons.Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Filtros activos:</span>
            <Badge variant="secondary">{activeFiltersCount}</Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 px-3 text-xs self-start sm:self-auto">
            <Icons.X className="h-3 w-3 mr-1" />
            Limpiar filtros
          </Button>
        </div>
      )}
    </div>
  )
}
