"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, Plus, Minus, X } from "lucide-react";
import { BarcodeScanner } from "@/components/barcode-scanner";
import type { Product } from "@/lib/types";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";

type SaleItemForm = {
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  total: number;
  store_id: string;
};

export function NewSaleForm() {
  const supabase = createClient();
  const { toast } = useToast();

  const [barcodeInput, setBarcodeInput] = useState("");
  const [saleItems, setSaleItems] = useState<SaleItemForm[]>([]);
  const [showScanner, setShowScanner] = useState(false);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [storeName, setStoreName] = useState<string | null>(null); // ✅ nuevo estado

  const [paymentMethod, setPaymentMethod] = useState("efectivo");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  // 🔍 Buscar productos
  const searchProducts = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("is_active", true)
      .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
      .limit(10);

    if (error) {
      console.error("Error al buscar productos:", error);
      return;
    }

    setSearchResults(data || []);
    setShowResults(true);
  };

  // 🧾 Agregar producto
  const addProductToSale = async (identifier: string) => {
    if (!identifier.trim()) return;

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .or(
        `barcode.eq.${identifier},sku.eq.${identifier},name.ilike.%${identifier}%`
      )
      .limit(1)
      .single();

    if (error || !data) {
      toast({
        title: "Producto no encontrado",
        description: `No existe producto con: ${identifier}`,
        variant: "destructive",
      });
      return;
    }

    // ⚙️ Detectar tienda automáticamente
    if (!storeId) {
      setStoreId(data.store_id);

      // 🔍 Obtener nombre del store
      const { data: storeData } = await supabase
        .from("stores")
        .select("name")
        .eq("id", data.store_id)
        .single();

      setStoreName(storeData?.name || "Tienda desconocida");
    } else if (storeId !== data.store_id) {
      toast({
        title: "Error de tienda",
        description:
          "No puedes agregar productos de diferentes tiendas en una misma venta.",
        variant: "destructive",
      });
      return;
    }

    setSaleItems((prev) => {
      const existing = prev.find((i) => i.product_id === data.id);
      if (existing) {
        return prev.map((i) =>
          i.product_id === data.id
            ? {
                ...i,
                quantity: i.quantity + 1,
                total: (i.quantity + 1) * i.price,
              }
            : i
        );
      }
      return [
        ...prev,
        {
          product_id: data.id,
          name: data.name,
          price: data.unit_price,
          quantity: 1,
          total: data.unit_price,
          store_id: data.store_id,
        },
      ];
    });

    setBarcodeInput("");
    setShowResults(false);
    setSearchResults([]);
  };

  // ➕ Aumentar cantidad
  const increaseQty = (id: string) => {
    setSaleItems((prev) =>
      prev.map((i) =>
        i.product_id === id
          ? {
              ...i,
              quantity: i.quantity + 1,
              total: (i.quantity + 1) * i.price,
            }
          : i
      )
    );
  };

  // ➖ Reducir cantidad
  const decreaseQty = (id: string) => {
    setSaleItems((prev) =>
      prev
        .map((i) =>
          i.product_id === id && i.quantity > 1
            ? {
                ...i,
                quantity: i.quantity - 1,
                total: (i.quantity - 1) * i.price,
              }
            : i
        )
        .filter((i) => i.quantity > 0)
    );
  };

  // ❌ Eliminar producto
  const removeItem = (id: string) => {
    const newItems = saleItems.filter((i) => i.product_id !== id);
    setSaleItems(newItems);
    if (newItems.length === 0) {
      setStoreId(null);
      setStoreName(null); // ✅ limpiar nombre también
    }
  };

  // 🧮 Subtotal y total
  const subtotal = saleItems.reduce((sum, i) => sum + i.total, 0);
  const total = Math.max(0, subtotal - (discountAmount || 0));

  // 📷 Handler del escáner de código de barras
  const handleBarcodeScanned = async (barcode: string) => {
    if (!barcode) return;
    await addProductToSale(barcode);
    setShowScanner(false);
  };

  // 💾 Guardar venta
  const handleSaveSale = async () => {
    if (!storeId) {
      toast({
        title: "Error",
        description: "No se pudo determinar la tienda de los productos.",
        variant: "destructive",
      });
      return;
    }

    if (saleItems.length === 0) {
      toast({
        title: "Sin productos",
        description: "Agrega al menos un producto a la venta.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const saleNumber = `V-${Date.now()}`;
      const { data: sale, error: saleError } = await supabase
        .from("sales")
        .insert([
          {
            store_id: storeId,
            sale_number: saleNumber,
            customer_name: customerName || null,
            customer_phone: customerPhone || null,
            total_amount: total,
            discount_amount: discountAmount || 0,
            payment_method: paymentMethod,
            status: "completed",
          },
        ])
        .select()
        .single();

      if (saleError || !sale)
        throw saleError || new Error("No se creó la venta");

      const saleItemsData = saleItems.map((item) => ({
        sale_id: sale.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.total,
      }));

      const { error: itemsError } = await supabase
        .from("sale_items")
        .insert(saleItemsData);
      if (itemsError) throw itemsError;

      // Actualizar stock y registrar movimiento
      for (const item of saleItems) {
        const { data: prod, error: prodErr } = await supabase
          .from("products")
          .select("stock_quantity")
          .eq("id", item.product_id)
          .single();

        if (prodErr || !prod) continue;
        const newStock = Math.max(0, prod.stock_quantity - item.quantity);

        await supabase
          .from("products")
          .update({ stock_quantity: newStock })
          .eq("id", item.product_id);

        await supabase.from("stock_movements").insert({
          product_id: item.product_id,
          movement_type: "salida",
          quantity: -item.quantity,
          previous_stock: prod.stock_quantity,
          new_stock: newStock,
          reference_id: sale.id,
          reference_type: "sale",
          notes: `Venta ${saleNumber}`,
        });
      }

      toast({
        title: "Venta registrada",
        description: `Venta ${saleNumber} registrada con éxito.`,
      });

      // 🔄 Reset formulario
      setCustomerName("");
      setCustomerPhone("");
      setSaleItems([]);
      setDiscountAmount(0);
      setBarcodeInput("");
      setStoreId(null);
      setStoreName(null); // ✅ limpiar nombre también
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: "No se pudo registrar la venta.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const completeSale = handleSaveSale;

  return (
    <div className="flex flex-col gap-6">
      {/* Info del cliente */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div className="space-y-2">
          <Label>Método de Pago</Label>
          <Select value={paymentMethod} onValueChange={setPaymentMethod}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="efectivo">Efectivo</SelectItem>
              <SelectItem value="yape">Yape</SelectItem>
              <SelectItem value="plin">Plin</SelectItem>
              <SelectItem value="transferencia">Transferencia</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Cliente</Label>
          <Input
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Nombre (opcional)"
          />
        </div>
        <div className="space-y-2">
          <Label>Teléfono</Label>
          <Input
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            placeholder="Teléfono (opcional)"
          />
        </div>
      </div>

      {/* Mostrar tienda detectada */}
      {storeName && (
        <p className="text-sm text-gray-500">
          Tienda: <span className="font-medium">{storeName}</span>
        </p>
      )}

      {/* Buscador */}
      <div className="flex flex-col gap-2 relative">
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            value={barcodeInput}
            onChange={(e) => {
              const val = e.target.value;
              setBarcodeInput(val);
              searchProducts(val);
            }}
            placeholder="Escanea o escribe código o nombre"
            onKeyDown={(e) =>
              e.key === "Enter" && addProductToSale(barcodeInput)
            }
          />
          <Button
            onClick={() => addProductToSale(barcodeInput)}
            disabled={!barcodeInput.trim()}
          >
            <Plus className="h-4 w-4 mr-2" /> Agregar
          </Button>
          <Button variant="outline" onClick={() => setShowScanner(true)}>
            <Camera className="h-4 w-4 mr-2" />
            Escanear
          </Button>
        </div>

        {showResults && searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 bg-white dark:bg-neutral-900 border rounded-md mt-1 max-h-60 overflow-auto shadow-md z-50">
            {searchResults.map((prod) => (
              <div
                key={prod.id}
                className="p-2 hover:bg-gray-100 dark:hover:bg-neutral-800 cursor-pointer text-sm"
                onClick={() => addProductToSale(prod.barcode || prod.name)}
              >
                <div className="font-medium">{prod.name}</div>
                <div className="text-xs text-gray-500 truncate">
                  {prod.description || "Sin descripción"}
                </div>
                <div className="text-xs text-gray-600">
                  S/ {prod.unit_price.toFixed(2)} — Stock: {prod.stock_quantity}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Escáner */}
      {showScanner && (
        <BarcodeScanner
          isOpen={showScanner}
          onClose={() => setShowScanner(false)}
          onScan={handleBarcodeScanned}
        />
      )}

      {/* Productos */}
      {saleItems.length > 0 && (
        <>
          <div className="border rounded-lg p-3 bg-neutral-50 dark:bg-neutral-900">
            {saleItems.map((item) => (
              <div
                key={item.product_id}
                className="flex justify-between items-center py-2 border-b border-neutral-200 dark:border-neutral-800 last:border-0"
              >
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-xs text-gray-500">
                    S/ {item.price.toFixed(2)} × {item.quantity}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => decreaseQty(item.product_id)}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-6 text-center">{item.quantity}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => increaseQty(item.product_id)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <p className="font-semibold w-20 text-right">
                    S/ {item.total.toFixed(2)}
                  </p>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => removeItem(item.product_id)}
                  >
                    <X className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Totales */}
          <Card>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Descuento:</span>
                    <span>-{formatCurrency(discountAmount)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between sm:flex-row sm:items-center gap-8">
                  <Label>Descuento</Label>
                  <Input
                    type="number"
                    min={0}
                    max={subtotal}
                    value={discountAmount}
                    onChange={(e) =>
                      setDiscountAmount(Number(e.target.value) || 0)
                    }
                    className="w-full sm:w-32"
                  />
                </div>
                <div className="flex justify-between font-bold text-lg sm:text-xl">
                  <span>Total:</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>
              <Button
                className="w-full"
                size="lg"
                onClick={completeSale}
                disabled={loading || saleItems.length === 0}
              >
                {loading ? "Procesando..." : "Completar Venta"}
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
