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
    const loadStores = async () => {
      const supabase = createClient();
      const { data: storesData } = await supabase.from("stores").select("*").order("name");
      if (storesData) setStores(storesData);
    };
    loadStores();
  }, []);

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
                { product, quantity: 1, unit_price: product.unit_price, total_price: product.unit_price },
              ];
            }
          });
          setBarcodeInput("");
        });
    } else {
      const product = barcodeOrProduct;
      setSaleItems((prevItems) => {
        const existingIndex = prevItems.findIndex((item) => item.product.id === product.id);
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
            total_price: (currentQuantity + 1) * item.unit_price,
          };
          return updatedItems;
        } else {
          return [
            ...prevItems,
            { product, quantity: 1, unit_price: product.unit_price, total_price: product.unit_price },
          ];
        }
      });
      setBarcodeInput("");
    }
  };

  const handleBarcodeScanned = (barcode: string) => {
    setSaleItems((prevItems) => {
      const existingIndex = prevItems.findIndex(
        (item) => item.product.barcode === barcode || item.product.sku === barcode
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
              { product, quantity: 1, unit_price: product.unit_price, total_price: product.unit_price },
            ]);
          }
        });
      return prevItems;
    });
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(productId);
      return;
    }
    setSaleItems((prevItems) =>
      prevItems.map((item) =>
        item.product.id === productId
          ? {
              ...item,
              quantity: Math.min(newQuantity, item.product.stock_quantity),
              total_price: Math.min(newQuantity, item.product.stock_quantity) * item.unit_price,
            }
          : item
      )
    );
  };

  const removeItem = (productId: string) => {
    setSaleItems((prevItems) => prevItems.filter((item) => item.product.id !== productId));
  };

  const calculateTotals = () => {
    const subtotal = saleItems.reduce((sum, item) => sum + item.total_price, 0);
    const total = subtotal - discountAmount;
    return { subtotal, total };
  };

  const completeSale = async () => {
    if (!selectedStore || saleItems.length === 0) {
      toast({ title: "Error", description: "Selecciona tienda y productos", variant: "destructive" });
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
      const { error: itemsError } = await supabase.from("sale_items").insert(saleItemsData);
      if (itemsError) throw itemsError;

      for (const item of saleItems) {
        const newStock = item.product.stock_quantity - item.quantity;
        await supabase.from("products").update({ stock_quantity: newStock }).eq("id", item.product.id);
        await supabase.from("stock_movements").insert({
          product_id: item.product.id,
          movement_type: "salida",
          quantity: -item.quantity,
          previous_stock: item.product.stock_quantity,
          new_stock: newStock,
          reference_id: sale.id,
          reference_type: "sale",
          notes: `Venta ${saleNumber}`,
        });
      }

      toast({ title: "Venta completada", description: `Venta ${saleNumber} registrada` });
      setSaleItems([]);
      setCustomerName("");
      setCustomerPhone("");
      setDiscountAmount(0);
      setBarcodeInput("");
    } catch (error) {
      toast({ title: "Error", description: "No se pudo completar la venta", variant: "destructive" });
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
            <ShoppingCart className="h-5 w-5" /> Información de la Venta
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tienda *</Label>
              <Select value={selectedStore} onValueChange={setSelectedStore}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tienda" />
                </SelectTrigger>
                <SelectContent>
                  {stores.map((store) => (
                    <SelectItem key={store.id} value={store.id}>{store.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Método de Pago</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
              <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Nombre (opcional)" />
            </div>
            <div className="space-y-2">
              <Label>Teléfono</Label>
              <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="Teléfono (opcional)" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Escáner */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Scan className="h-5 w-5" /> Escáner de Productos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              placeholder="Escanea o escribe código/SKU/nombre"
              onKeyDown={(e) => e.key === "Enter" && handleBarcodeScanned(barcodeInput)}
              disabled={!selectedStore}
            />
            <Button onClick={() => handleBarcodeScanned(barcodeInput)} disabled={!selectedStore || !barcodeInput.trim()}>
              <Plus className="h-4 w-4 mr-2" /> Agregar
            </Button>
            <Button variant="outline" onClick={() => setShowScanner(true)} disabled={!selectedStore}>
              <Camera className="h-4 w-4 mr-2" /> <span className="hidden sm:inline">Cámara</span><span className="sm:hidden">Escanear</span>
            </Button>
          </div>
          {!selectedStore && <p className="text-sm text-muted-foreground">Selecciona una tienda para comenzar</p>}
        </CardContent>
      </Card>

      {/* Productos */}
      <div className="space-y-4">
        {saleItems.map((item) => (
          <Card key={item.product.id}>
            <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex-1">
                <div className="font-medium">{item.product.name}</div>
                <div className="text-xs text-muted-foreground">Stock: {item.product.stock_quantity}</div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={() => updateQuantity(item.product.id, item.quantity - 1)}><Minus className="h-3 w-3" /></Button>
                <span className="w-8 text-center">{item.quantity}</span>
                <Button size="sm" onClick={() => updateQuantity(item.product.id, item.quantity + 1)}><Plus className="h-3 w-3" /></Button>
              </div>
              <div className="font-medium">{formatCurrency(item.total_price)}</div>
              <Button variant="ghost" size="sm" onClick={() => removeItem(item.product.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Totales y descuento */}
      {saleItems.length > 0 && (
        <Card>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4">
              <Label>Descuento</Label>
              <Input type="number" min={0} max={subtotal} value={discountAmount} onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)} className="w-full sm:w-32" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between"><span>Subtotal:</span><span>{formatCurrency(subtotal)}</span></div>
              {discountAmount > 0 && <div className="flex justify-between text-sm text-muted-foreground"><span>Descuento:</span><span>-{formatCurrency(discountAmount)}</span></div>}
              <div className="flex justify-between font-bold text-lg sm:text-xl"><span>Total:</span><span>{formatCurrency(total)}</span></div>
            </div>
            <Button className="w-full" size="lg" onClick={completeSale} disabled={loading || saleItems.length === 0}>
              {loading ? "Procesando..." : "Completar Venta"}
            </Button>
          </CardContent>
        </Card>
      )}

      <BarcodeScanner isOpen={showScanner} onClose={() => setShowScanner(false)} onScan={handleBarcodeScanned} />
    </div>
  );
}
