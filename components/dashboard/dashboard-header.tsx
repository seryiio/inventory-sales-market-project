"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar, Download } from "lucide-react";
import * as XLSX from "xlsx";
import { Sale } from "@/lib/types";

interface DashboardHeaderProps {
  timeRange: string;
  setTimeRange: (range: string) => void;
  ventas: Sale[];
}

export function DashboardHeader({ timeRange, setTimeRange, ventas }: DashboardHeaderProps) {

  const handleExport = () => {
    if (!ventas || ventas.length === 0) return;

    const data = ventas.map((v) => ({
      ID: v.id,
      "Número de venta": v.sale_number,
      Cliente: v.customer_name ?? "",
      Total: v.total_amount,
      Estado: v.status,
      Fecha: v.created_at,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ventas");
    XLSX.writeFile(wb, "ventas.xlsx");
  };

  return (
    <div className="flex flex-col md:flex-row items-center justify-between mb-4">
      <div className="text-center md:text-left">
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Resumen general de ventas e inventario</p>
      </div>

      <div className="flex items-center gap-3 mt-3 md:mt-0">
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-40">
            <Calendar className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Hoy</SelectItem>
            <SelectItem value="week">Esta semana</SelectItem>
            <SelectItem value="month">Este mes</SelectItem>
            <SelectItem value="quarter">Este trimestre</SelectItem>
            <SelectItem value="year">Este año</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Exportar
        </Button>
      </div>
    </div>
  );
}
