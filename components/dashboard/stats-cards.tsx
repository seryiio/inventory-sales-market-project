"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Package,
  AlertTriangle,
} from "lucide-react";
import { Sale } from "@/lib/types";

interface StatsCardsProps {
  ventas: Sale[];
  totalProducts?: number; // opcional, puede calcularse internamente si quieres
  lowStockProducts?: number; // opcional
}

export function StatsCards({ ventas, totalProducts = 0, lowStockProducts = 0 }: StatsCardsProps) {
  const totalSales = ventas.length;
  const totalRevenue = ventas.reduce((sum, v) => sum + v.total_amount, 0);

  // Para crecimiento podemos usar un valor ficticio o comparativo si quieres
  const salesGrowth = 0; 
  const revenueGrowth = 0;

  const formatGrowth = (growth: number) => {
    const isPositive = growth >= 0;
    const Icon = isPositive ? TrendingUp : TrendingDown;
    const color = isPositive ? "text-green-600" : "text-red-600";

    return (
      <div className={`flex items-center gap-1 text-xs sm:text-sm ${color}`}>
        <Icon className="h-3 w-3 sm:h-4 sm:w-4" />
        {Math.abs(growth).toFixed(1)}%
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs sm:text-sm font-medium">Ventas Hoy</CardTitle>
          <ShoppingCart className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-xl sm:text-2xl font-bold">{totalSales}</div>
          {formatGrowth(salesGrowth)}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs sm:text-sm font-medium">Ingresos Hoy</CardTitle>
          <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-xl sm:text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
          {formatGrowth(revenueGrowth)}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs sm:text-sm font-medium">Total Productos</CardTitle>
          <Package className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-xl sm:text-2xl font-bold">{totalProducts}</div>
          <p className="text-xs text-muted-foreground">Productos activos</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs sm:text-sm font-medium">Stock Bajo</CardTitle>
          <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 text-amber-500" />
        </CardHeader>
        <CardContent>
          <div className="text-xl sm:text-2xl font-bold text-amber-600">{lowStockProducts}</div>
          <p className="text-xs text-muted-foreground">Requieren atención</p>
        </CardContent>
      </Card>
    </div>
  );
}
