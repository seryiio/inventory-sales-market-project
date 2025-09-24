"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Store, Product } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { Scan, Plus, Minus, Trash2, ShoppingCart, Camera } from "lucide-react";
import { BarcodeScanner } from "@/components/barcode-scanner";

interface SaleItem {
  product: Product;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export function NewSaleForm() {
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("efectivo");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const { toast } = useToast();

  const scannedCodesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    loadStores();
  }, []);

  const loadStores = async () => {
    const supabase = createClient();
    const { data: storesData } = await supabase
      .from("stores")
      .select("*")
      .order("name");
    if (storesData) setStores(storesData);
  };

  const addProductToSale = (barcodeOrProduct: string | Product) => {
    const supabase = createClient();

    if (typeof barcodeOrProduct === "string") {
      const barcode = barcodeOrProduct.trim();
      if (!barcode || !selectedStore) return;

      supabase
        .from("products")
        .select("*")
        .eq("store_id", selectedStore)
        .eq("is_active", true)
        .or(`barcode.eq.${barcode},sku.eq.${barcode},name.ilike.%${barcode}%`)
        .single()
        .then(({ data: product }) => {
          if (!product) return;

          setSaleItems((prevItems) => {
            const idx = prevItems.findIndex((i) => i.product.id === product.id);
            if (idx >= 0) {
              const currentQuantity = prevItems[idx].quantity;
              if (currentQuantity >= product.stock_quantity) return prevItems;
              const updated = [...prevItems];
              updated[idx] = {
                ...updated[idx],
                quantity: currentQuantity + 1,
                total_price: (currentQuantity + 1) * product.unit_price,
              };
              return updated;
            } else {
              return [
                ...prevItems,
                {
                  product,
                  quantity: 1,
                  unit_price: product.unit_price,
                  total_price: product.unit_price,
                },
              ];
            }
          });

          setBarcodeInput("");
        });
    } else {
      const product = barcodeOrProduct;
      setSaleItems((prevItems) => {
        const existingIndex = prevItems.findIndex(
          (item) => item.product.id === product.id
        );

        if (existingIndex >= 0) {
          const updatedItems = [...prevItems];
          const currentQuantity = updatedItems[existingIndex].quantity;

          if (currentQuantity >= product.stock_quantity) {
            toast({
              title: "Stock insuficiente",
              description: `Solo hay ${product.stock_quantity} unidades disponibles`,
              variant: "destructive",
            });
            return prevItems;
          }

          updatedItems[existingIndex] = {
            ...updatedItems[existingIndex],
            quantity: currentQuantity + 1,
            total_price: (currentQuantity + 1) * product.unit_price,
          };
          return updatedItems;
        } else {
          return [
            ...prevItems,
            {
              product,
              quantity: 1,
              unit_price: product.unit_price,
              total_price: product.unit_price,
            },
          ];
        }
      });

      setBarcodeInput("");
    }
  };

  const handleBarcodeScanned = (barcode: string) => {
    setSaleItems((prevItems) => {
      const existingIndex = prevItems.findIndex(
        (item) =>
          item.product.barcode === barcode || item.product.sku === barcode
      );

      if (existingIndex >= 0) {
        const updatedItems = [...prevItems];
        const item = updatedItems[existingIndex];

        if (item.quantity < item.product.stock_quantity) {
          item.quantity += 1;
          item.total_price = item.quantity * item.unit_price;
        }

        return updatedItems;
      }

      const supabase = createClient();
      supabase
        .from("products")
        .select("*")
        .eq("store_id", selectedStore)
        .eq("is_active", true)
        .or(`barcode.eq.${barcode},sku.eq.${barcode},name.ilike.%${barcode}%`)
        .single()
        .then(({ data: product }) => {
          if (product) {
            setSaleItems((prev) => [
              ...prev,
              {
                product,
                quantity: 1,
                unit_price: product.unit_price,
                total_price: product.unit_price,
              },
            ]);
          }
        });

      return prevItems;
    });
  };

  const handleManualInput = () => {
    const barcode = prompt("Ingresa el código de barras manualmente:");
    if (barcode && barcode.trim()) {
      handleBarcodeScanned(barcode.trim());
      setShowScanner(false);
    }
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(productId);
      return;
    }

    setSaleItems((prevItems) =>
      prevItems.map((item) => {
        if (item.product.id === productId) {
          if (newQuantity > item.product.stock_quantity) {
            toast({
              title: "Stock insuficiente",
              description: `Solo hay ${item.product.stock_quantity} unidades disponibles`,
              variant: "destructive",
            });
            return item;
          }
          return {
            ...item,
            quantity: newQuantity,
            total_price: newQuantity * item.unit_price,
          };
        }
        return item;
      })
    );
  };

  const removeItem = (productId: string) => {
    setSaleItems((prevItems) =>
      prevItems.filter((item) => item.product.id !== productId)
    );
  };

  const calculateTotals = () => {
    const subtotal = saleItems.reduce((sum, item) => sum + item.total_price, 0);
    const total = subtotal - discountAmount;
    return { subtotal, total };
  };

  const completeSale = async () => {
    if (!selectedStore || saleItems.length === 0) {
      toast({
        title: "Error",
        description: "Selecciona una tienda y agrega productos",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const supabase = createClient();

    try {
      const { subtotal, total } = calculateTotals();
      const saleNumber = `V-${Date.now()}`;

      const { data: sale, error: saleError } = await supabase
        .from("sales")
        .insert([
          {
            store_id: selectedStore,
            sale_number: saleNumber,
            customer_name: customerName || null,
            customer_phone: customerPhone || null,
            total_amount: total,
            discount_amount: discountAmount,
            payment_method: paymentMethod,
            status: "completed",
          },
        ])
        .select()
        .single();

      if (saleError) throw saleError;

      const saleItemsData = saleItems.map((item) => ({
        sale_id: sale.id,
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
      }));

      const { error: itemsError } = await supabase
        .from("sale_items")
        .insert(saleItemsData);
      if (itemsError) throw itemsError;

      for (const item of saleItems) {
        const newStock = item.product.stock_quantity - item.quantity;

        const { error: stockError } = await supabase
          .from("products")
          .update({
            stock_quantity: newStock,
            updated_at: new Date().toISOString(),
          })
          .eq("id", item.product.id);

        if (stockError) throw stockError;

        const { error: movementError } = await supabase
          .from("stock_movements")
          .insert([
            {
              product_id: item.product.id,
              movement_type: "salida",
              quantity: -item.quantity,
              previous_stock: item.product.stock_quantity,
              new_stock: newStock,
              reference_id: sale.id,
              reference_type: "sale",
              notes: `Venta ${saleNumber}`,
            },
          ]);

        if (movementError) throw movementError;
      }

      toast({
        title: "Venta completada",
        description: `Venta ${saleNumber} registrada exitosamente`,
      });

      setSaleItems([]);
      setCustomerName("");
      setCustomerPhone("");
      setDiscountAmount(0);
      setBarcodeInput("");
    } catch (error) {
      console.error("Error completing sale:", error);
      toast({
        title: "Error",
        description: "No se pudo completar la venta",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const { subtotal, total } = calculateTotals();

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Información de venta */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <ShoppingCart className="h-5 w-5" />
            Información de la Venta
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="store">Tienda *</Label>
              <Select
                value={selectedStore}
                onValueChange={setSelectedStore}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tienda" />
                </SelectTrigger>
                <SelectContent>
                  {stores.map((store) => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment">Método de Pago</Label>
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
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customer">Cliente</Label>
              <Input
                id="customer"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Nombre del cliente (opcional)"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Teléfono del cliente (opcional)"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Escáner y input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Scan className="h-5 w-5" />
            Escáner de Productos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1">
                <Input
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  placeholder="Escanea o escribe el código de barras, SKU o nombre del producto..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleBarcodeScanned(barcodeInput);
                  }}
                  disabled={!selectedStore}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleBarcodeScanned(barcodeInput)}
                  disabled={!selectedStore || !barcodeInput.trim()}
                  className="flex-1 sm:flex-none"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowScanner(true)}
                  disabled={!selectedStore}
                  className="flex-1 sm:flex-none"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Cámara</span>
                  <span className="sm:hidden">Escanear</span>
                </Button>
              </div>
            </div>
            {!selectedStore && (
              <p className="text-sm text-muted-foreground">
                Selecciona una tienda para comenzar a escanear productos
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabla Desktop */}
      {saleItems.length > 0 && (
        <div className="hidden lg:block">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">
                Productos en la Venta
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[200px]">Producto</TableHead>
                      <TableHead className="min-w-[100px]">Precio</TableHead>
                      <TableHead className="min-w-[120px]">Cantidad</TableHead>
                      <TableHead className="min-w-[100px]">Total</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {saleItems.map((item) => (
                      <TableRow key={item.product.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">{item.product.name}</div>
                            <div className="text-xs text-muted-foreground">
                              Stock: {item.product.stock_quantity} unidades
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{formatCurrency(item.unit_price)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 sm:gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                updateQuantity(item.product.id, item.quantity - 1)
                              }
                              className="h-8 w-8 p-0"
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center text-sm">
                              {item.quantity}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                updateQuantity(item.product.id, item.quantity + 1)
                              }
                              className="h-8 w-8 p-0"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(item.total_price)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(item.product.id)}
                            className="h-8 w-8 p-0"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Totales Desktop */}
              <Separator className="my-4" />
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
                <div className="flex items-center gap-2">
                  <Label htmlFor="discount" className="text-sm">Descuento</Label>
                  <Input
                    id="discount"
                    type="number"
                    step="0.01"
                    min="0"
                    max={subtotal}
                    value={discountAmount}
                    onChange={(e) =>
                      setDiscountAmount(Number.parseFloat(e.target.value) || 0)
                    }
                    className="w-32"
                  />
                  {discountAmount > 0 && (
                    <span className="text-sm text-muted-foreground">
                      -{formatCurrency(discountAmount)}
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-base sm:text-lg">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-lg sm:text-xl font-bold">
                    <span>Total:</span>
                    <span>{formatCurrency(total)}</span>
                  </div>

                  <Button
                    onClick={completeSale}
                    disabled={loading || saleItems.length === 0}
                    className="w-full sm:w-auto"
                    size="lg"
                  >
                    {loading ? "Procesando..." : "Completar Venta"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Cards Mobile */}
      {saleItems.length > 0 && (
        <div className="lg:hidden">
          <Card>
            <CardContent className="space-y-4">
              {saleItems.map((item) => (
                <div
                  key={item.product.id}
                  className="grid grid-cols-2 gap-4 items-center relative"
                >
                  <div className="space-y-1">
                    <div className="font-medium">{item.product.name}</div>
                    <div className="text-xs text-muted-foreground">
                      Stock: {item.product.stock_quantity} unidades
                    </div>
                  </div>
                  <div className="text-right">
                    <div>{formatCurrency(item.unit_price)}</div>
                    <div className="flex justify-end items-center gap-1 mt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          updateQuantity(item.product.id, item.quantity - 1)
                        }
                        className="h-8 w-8 p-0"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center text-sm">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          updateQuantity(item.product.id, item.quantity + 1)
                        }
                        className="h-8 w-8 p-0"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="font-medium mt-1">{formatCurrency(item.total_price)}</div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(item.product.id)}
                    className="h-8 w-8 p-0 absolute right-2 top-2"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}

              <Separator className="my-4" />

              <div className="space-y-2">
                <div className="flex justify-between text-base">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>

                <div className="flex justify-between items-center gap-2">
                  <Label htmlFor="discount" className="text-sm">Descuento</Label>
                  <Input
                    id="discount"
                    type="number"
                    step="0.01"
                    min="0"
                    max={subtotal}
                    value={discountAmount}
                    onChange={(e) =>
                      setDiscountAmount(Number.parseFloat(e.target.value) || 0)
                    }
                    className="w-24"
                  />
                  {discountAmount > 0 && (
                    <span className="text-sm text-muted-foreground">
                      -{formatCurrency(discountAmount)}
                    </span>
                  )}
                </div>

                <div className="flex justify-between font-bold text-lg">
                  <span>Total:</span>
                  <span>{formatCurrency(total)}</span>
                </div>

                <Button
                  onClick={completeSale}
                  disabled={loading || saleItems.length === 0}
                  className="w-full"
                  size="lg"
                >
                  {loading ? "Procesando..." : "Completar Venta"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Escáner de códigos */}
      <BarcodeScanner
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleBarcodeScanned}
      />
    </div>
  );
}
