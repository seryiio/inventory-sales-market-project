"use client"

import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Store, Category } from "@/lib/types"
import { Search } from "lucide-react"

interface InventoryFiltersProps {
  onFilterChange: (filters: {
    searchTerm: string
    selectedStore: string
    selectedCategory: string
    stockFilter: string
  }) => void
}

export function InventoryFilters({ onFilterChange }: InventoryFiltersProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedStore, setSelectedStore] = useState<string>("all")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [stockFilter, setStockFilter] = useState<string>("all")
  const [stores, setStores] = useState<Store[]>([])
  const [categories, setCategories] = useState<Category[]>([])

  useEffect(() => {
    loadStoresAndCategories()
  }, [])

  useEffect(() => {
    // Cada vez que cambie un filtro, avisamos al componente padre
    onFilterChange({ searchTerm, selectedStore, selectedCategory, stockFilter })
  }, [searchTerm, selectedStore, selectedCategory, stockFilter])

  const loadStoresAndCategories = async () => {
    const supabase = createClient()

    const { data: storesData } = await supabase.from("stores").select("*").order("name")
    const { data: categoriesData } = await supabase.from("categories").select("*").order("name")

    if (storesData) setStores(storesData)
    if (categoriesData) setCategories(categoriesData)
  }

  return (
    <div className="space-y-4">
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
              <SelectItem key={store.id} value={store.id}>{store.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger>
            <SelectValue placeholder="Todas las categorías" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
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
  )
}
