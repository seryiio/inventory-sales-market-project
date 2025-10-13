"use client";

import { Button } from "@/components/ui/button";
import { Plus, Download, TrendingUp } from "lucide-react";
import Link from "next/link";

export function SalesHeader() {
  return (
    <div className="flex flex-col md:flex-row items-center justify-between">
      <div className="text-center md:text-left">
        <h1 className="text-3xl font-bold text-foreground">
          Gestión de Ventas
        </h1>
        <p className="text-muted-foreground mt-1">
          Registra y administra las ventas de todas las tiendas
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Link href="/reports">
          <Button className="cursor-pointer" variant="outline" size="sm">
            <TrendingUp className="h-4 w-4 mr-2" />
            Reportes
          </Button>
        </Link>
        <Button className="cursor-pointer" variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Exportar
        </Button>
        <Link href="/sales/new">
          <Button className="bg-primary text-primary-foreground cursor-pointer">
            <Plus className="h-4 w-4 mr-2" />
            Nueva Venta
          </Button>
        </Link>
      </div>
    </div>
  );
}