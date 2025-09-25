"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Sale, SaleItem, Product } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function SaleDetailPage() {
  const params = useParams();
  const saleId = params.id; // Debe coincidir con la carpeta [id]
  const router = useRouter();

  const [sale, setSale] = useState<Sale | null>(null);
  const [saleItems, setSaleItems] = useState<(SaleItem & { product?: Product })[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!saleId) return;

    async function loadSale() {
      setLoading(true);
      setErrorMsg(null);

      const supabase = createClient();

      try {
        // 1️⃣ Traer la venta
        const { data: saleData, error: saleError } = await supabase
          .from("sales")
          .select("*")
          .eq("id", saleId)
          .single();

        if (saleError || !saleData) {
          console.error("Error cargando venta:", saleError);
          setErrorMsg("Venta no encontrada");
          setSale(null);
          setLoading(false);
          return;
        }

        setSale(saleData);

        // 2️⃣ Traer los items de la venta
        const { data: itemsData, error: itemsError } = await supabase
          .from("sale_items")
          .select("*")
          .eq("sale_id", saleId);

        if (itemsError) {
          console.error("Error cargando items:", itemsError);
          setSaleItems([]);
          return;
        }

        if (!itemsData || itemsData.length === 0) {
          setSaleItems([]);
          return;
        }

        // 3️⃣ Traer los productos de esos items
        const productIds = itemsData.map((i) => i.product_id);
        const { data: products } = await supabase
          .from("products")
          .select("*")
          .in("id", productIds);

        // 4️⃣ Vincular productos con los items
        const itemsWithProduct = itemsData.map((item) => ({
          ...item,
          product: products?.find((p) => p.id === item.product_id),
        }));

        setSaleItems(itemsWithProduct);
      } catch (err: any) {
        console.error("Error inesperado:", err);
        setErrorMsg(err.message || "Error desconocido");
      } finally {
        setLoading(false);
      }
    }

    loadSale();
  }, [saleId]);

  if (loading) return <div className="text-center py-8">Cargando venta...</div>;
  if (errorMsg) return <div className="text-center py-8 text-red-500">{errorMsg}</div>;
  if (!sale) return <div className="text-center py-8">Venta no encontrada</div>;

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold">Venta {sale.sale_number}</h1>
        <Button size="sm" onClick={() => router.back()}>
          Volver
        </Button>
      </div>

      {/* Información principal */}
      <Card>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-muted-foreground">Cliente</p>
              <p>{sale.customer_name || "Cliente general"}</p>
              {sale.customer_phone && (
                <p className="text-xs text-muted-foreground">{sale.customer_phone}</p>
              )}
            </div>
            <div>
              <p className="text-muted-foreground">Tienda ID</p>
              <p>{sale.store_id}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Estado</p>
              <p>{sale.status}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Método de pago</p>
              <p>{sale.payment_method}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Total</p>
              <p>{formatCurrency(sale.total_amount)}</p>
            </div>
            {sale.discount_amount > 0 && (
              <div>
                <p className="text-muted-foreground">Descuento</p>
                <p>{formatCurrency(sale.discount_amount)}</p>
              </div>
            )}
          </div>

          {/* Productos */}
          <div className="mt-4">
            <h2 className="font-semibold mb-2">Productos</h2>
            {saleItems.length > 0 ? (
              <ul className="space-y-1">
                {saleItems.map((item) => (
                  <li key={item.id} className="flex justify-between">
                    <span>{item.product?.name || "Producto desconocido"}</span>
                    <span>
                      {item.quantity} × {formatCurrency(item.unit_price)} ={" "}
                      {formatCurrency(item.total_price)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">No hay productos en esta venta</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
