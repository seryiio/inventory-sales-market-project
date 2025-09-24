"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, X, Calendar } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Store } from "@/lib/types";

interface SalesFiltersProps {
  onFilterChange?: (filters: {
    searchTerm: string;
    selectedStore: string;
    statusFilter: string;
    dateRange: string;
  }) => void;
}

export function SalesFilters({ onFilterChange }: SalesFiltersProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStore, setSelectedStore] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("today");
  const [stores, setStores] = useState<Store[]>([]);

  // Cargar tiendas
  useEffect(() => {
    const loadStores = async () => {
      const supabase = createClient();
      const { data: storesData } = await supabase
        .from("stores")
        .select("*")
        .order("name");
      if (storesData) setStores(storesData);
    };
    loadStores();
  }, []);

  // Notificar cambios al componente padre
  useEffect(() => {
    if (onFilterChange) {
      onFilterChange({ searchTerm, selectedStore, statusFilter, dateRange });
    }
  }, [searchTerm, selectedStore, statusFilter, dateRange, onFilterChange]);

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedStore("all");
    setStatusFilter("all");
    setDateRange("today");
  };

  const activeFiltersCount = [
    searchTerm,
    selectedStore !== "all" ? selectedStore : null,
    statusFilter !== "all" ? statusFilter : null,
    dateRange !== "today" ? dateRange : null,
  ].filter(Boolean).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por número de venta, cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={selectedStore} onValueChange={setSelectedStore}>
          <SelectTrigger className="w-full sm:w-48">
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

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="completed">Completadas</SelectItem>
            <SelectItem value="pending">Pendientes</SelectItem>
            <SelectItem value="cancelled">Canceladas</SelectItem>
          </SelectContent>
        </Select>

        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-full sm:w-40">
            <Calendar className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Hoy</SelectItem>
            <SelectItem value="week">Esta semana</SelectItem>
            <SelectItem value="month">Este mes</SelectItem>
            <SelectItem value="quarter">Este trimestre</SelectItem>
            <SelectItem value="year">Este año</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {activeFiltersCount > 0 && (
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Filtros activos:</span>
          <Badge variant="secondary">{activeFiltersCount}</Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-6 px-2 text-xs"
          >
            <X className="h-3 w-3 mr-1" />
            Limpiar
          </Button>
        </div>
      )}
    </div>
  );
}
