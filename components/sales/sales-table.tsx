"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Sale } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MoreHorizontal, Eye, Printer, RefreshCw } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Icons } from "../icons";
import { useToast } from "../ui/use-toast";

interface Props {
  filters: {
    searchTerm: string;
    selectedStore: string;
    statusFilter: string;
    dateRange: string;
  };
}

export function SalesTable({ filters }: Props) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadSales();
  }, []);

  const loadSales = async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("sales")
      .select(
        `
        *,
        store:stores(id, name, type),
        sale_items(
          id,
          quantity,
          unit_price,
          total_price,
          product:products(name)
        )
      `
      )
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) console.error("Error loading sales:", error);
    else setSales(data || []);
    setLoading(false);
  };

  if (loading) return <div className="text-center py-8">Cargando ventas...</div>;

  // FILTRO DINÁMICO
  const filteredSales = sales.filter((sale) => {
    const term = filters.searchTerm.toLowerCase();
    const matchSearch =
      sale.sale_number.toLowerCase().includes(term) ||
      (sale.customer_name?.toLowerCase().includes(term) ?? false);

    const matchStore =
      filters.selectedStore === "all" || sale.store?.id === filters.selectedStore;

    const matchStatus =
      filters.statusFilter === "all" || sale.status === filters.statusFilter;

    const today = new Date();
    let matchDate = true;
    if (filters.dateRange !== "today") {
      const saleDate = new Date(sale.created_at);
      switch (filters.dateRange) {
        case "week":
          const weekStart = new Date(today);
          weekStart.setDate(today.getDate() - today.getDay());
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          matchDate = saleDate >= weekStart && saleDate <= weekEnd;
          break;
        case "month":
          matchDate =
            saleDate.getMonth() === today.getMonth() &&
            saleDate.getFullYear() === today.getFullYear();
          break;
        case "quarter":
          const currentQuarter = Math.floor(today.getMonth() / 3);
          const saleQuarter = Math.floor(saleDate.getMonth() / 3);
          matchDate =
            saleQuarter === currentQuarter && saleDate.getFullYear() === today.getFullYear();
          break;
        case "year":
          matchDate = saleDate.getFullYear() === today.getFullYear();
          break;
      }
    }

    return matchSearch && matchStore && matchStatus && matchDate;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            Completada
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
            Pendiente
          </Badge>
        );
      case "cancelled":
        return <Badge variant="destructive">Cancelada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPaymentMethodBadge = (method: string) => {
    const methods: Record<string, string> = {
      efectivo: "Efectivo",
      tarjeta: "Tarjeta",
      transferencia: "Transferencia",
      credito: "Crédito",
    };
    return methods[method] || method;
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Seguro que quieres eliminar este producto?")) return;
    const supabase = createClient();
    const { error } = await supabase.from("sales").delete().eq("id", id);
    if (error)
      toast({
        title: "Error al eliminar",
        description: error.message,
        variant: "destructive",
      });
    else setSales((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <>
      {/* Desktop Table */}
      <div className="hidden lg:block rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Tienda</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Pago</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSales.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  No hay ventas registradas
                </TableCell>
              </TableRow>
            ) : (
              filteredSales.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell>{sale.sale_number}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">{sale.customer_name || "Cliente general"}</div>
                      {sale.customer_phone && (
                        <div className="text-xs text-muted-foreground">{sale.customer_phone}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{sale.store?.name}</Badge>
                  </TableCell>
                  <TableCell>{sale.sale_items?.length || 0} productos</TableCell>
                  <TableCell>
                    <div className="font-medium">{formatCurrency(sale.total_amount)}</div>
                    {sale.discount_amount > 0 && (
                      <div className="text-xs text-muted-foreground">
                        Desc: {formatCurrency(sale.discount_amount)}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{getPaymentMethodBadge(sale.payment_method)}</Badge>
                  </TableCell>
                  <TableCell>{getStatusBadge(sale.status)}</TableCell>
                  <TableCell>{formatDate(sale.created_at)}</TableCell>
                  <TableCell>
                    <Button
                      style={{ color: "red" }}
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(sale.id)}
                    >
                      <Icons.Trash2 />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden space-y-4">
        {filteredSales.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8 text-muted-foreground">
              No hay ventas registradas
            </CardContent>
          </Card>
        ) : (
          filteredSales.map((sale) => (
            <Card key={sale.id}>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h3 className="font-medium text-sm">{sale.sale_number}</h3>
                      <p className="text-xs text-muted-foreground">{formatDate(sale.created_at)}</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="h-4 w-4 mr-2" />
                          Ver detalles
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Printer className="h-4 w-4 mr-2" />
                          Imprimir
                        </DropdownMenuItem>
                        {sale.status === "pending" && (
                          <DropdownMenuItem>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Completar
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs">{sale.store?.name}</Badge>
                    {getStatusBadge(sale.status)}
                    <Badge variant="outline" className="text-xs">{getPaymentMethodBadge(sale.payment_method)}</Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Cliente</p>
                      <p className="font-medium">{sale.customer_name || "Cliente general"}</p>
                      {sale.customer_phone && <p className="text-xs text-muted-foreground">{sale.customer_phone}</p>}
                    </div>
                    <div>
                      <p className="text-muted-foreground">Items</p>
                      <p className="font-medium">{sale.sale_items?.length || 0} productos</p>
                    </div>
                  </div>

                  <div className="pt-2 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Total:</span>
                      <span className="font-bold text-lg">{formatCurrency(sale.total_amount)}</span>
                    </div>
                    {sale.discount_amount > 0 && (
                      <div className="flex justify-between items-center text-xs text-muted-foreground">
                        <span>Descuento:</span>
                        <span>-{formatCurrency(sale.discount_amount)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </>
  );
}
