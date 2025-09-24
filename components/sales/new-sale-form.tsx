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
import { BrowserMultiFormatReader } from "@zxing/browser";

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

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerRef = useRef<BrowserMultiFormatReader | null>(null);
  const cancelRef = useRef<(() => void) | null>(null);
  const scannedRef = useRef(false);
  const processingRef = useRef(false);

  const { toast } = useToast();

  useEffect(() => {
    loadStores();
  }, []);

  useEffect(() => {
    if (!showScanner) stopScanner();
  }, [showScanner]);

  const loadStores = async () => {
    const supabase = createClient();
    const { data: storesData } = await supabase.from("stores").select("*").order("name");
    if (storesData) setStores(storesData);
  };

  // ============================
  // Escáner
  // ============================

  const startScanner = async () => {
    scannedRef.current = false;
    setShowScanner(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const scanner = new BrowserMultiFormatReader();
      scannerRef.current = scanner;

      cancelRef.current = await scanner.decodeFromVideoDevice(
        undefined,
        videoRef.current!,
        (result, err) => {
          if (result && !scannedRef.current) {
            scannedRef.current = true;
            stopScanner();
            addProductToSale(result.getText());
          }
          if (err && err.name !== "NotFoundException") console.error(err);
        }
      );
    } catch (err) {
      console.error("Error iniciar cámara:", err);
      toast({
        title: "Error",
        description: "No se pudo activar la cámara",
        variant: "destructive",
      });
      setShowScanner(false);
    }
  };

  const stopScanner = () => {
    try {
      if (cancelRef.current) cancelRef.current();
      if (scannerRef.current) scannerRef.current = null;
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
        videoRef.current.srcObject = null;
      }
    } catch (err) {
      console.warn("Error detener scanner:", err);
    } finally {
      scannedRef.current = false;
    }
  };

  // ============================
  // Agregar productos
  // ============================

  const addProductToSale = async (barcodeOrProduct: string | Product) => {
    if (processingRef.current) return;
    processingRef.current = true;

    try {
      if (typeof barcodeOrProduct === "string") {
        const barcode = barcodeOrProduct.trim();
        if (!barcode || !selectedStore) return;

        const supabase = createClient();
        const { data: product, error } = await supabase
          .from("products")
          .select("*")
          .eq("store_id", selectedStore)
          .eq("is_active", true)
          .or(`barcode.eq.${barcode},sku.eq.${barcode},name.ilike.%${barcode}%`)
          .single();

        if (!product || error) {
          toast({
            title: "Producto no encontrado",
            description: "No se encontró un producto con ese código",
            variant: "destructive",
          });
          return;
        }
        if (product.stock_quantity <= 0) {
          toast({
            title: "Sin stock",
            description: "Producto sin stock disponible",
            variant: "destructive",
          });
          return;
        }

        updateSaleItemsWithProduct(product);
      } else {
        updateSaleItemsWithProduct(barcodeOrProduct);
      }
    } finally {
      processingRef.current = false;
    }
  };

  const updateSaleItemsWithProduct = (product: Product) => {
    setSaleItems((prev) => {
      const index = prev.findIndex((i) => i.product.id === product.id);
      if (index >= 0) {
        const currentQty = prev[index].quantity;
        if (currentQty >= product.stock_quantity) {
          toast({
            title: "Stock insuficiente",
            description: `Solo hay ${product.stock_quantity} unidades disponibles`,
            variant: "destructive",
          });
          return prev;
        }
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          quantity: currentQty + 1,
          total_price: (currentQty + 1) * product.unit_price,
        };
        return updated;
      }
      return [...prev, { product, quantity: 1, unit_price: product.unit_price, total_price: product.unit_price }];
    });
    setBarcodeInput("");
  };

  // ============================
  // Cantidad / eliminación
  // ============================

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) return removeItem(productId);
    setSaleItems((prev) =>
      prev.map((item) =>
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
    setSaleItems((prev) => prev.filter((i) => i.product.id !== productId));
  };

  const calculateTotals = () => {
    const subtotal = saleItems.reduce((sum, i) => sum + i.total_price, 0);
    const total = subtotal - discountAmount;
    return { subtotal, total };
  };

  const completeSale = async () => {
    if (!selectedStore || saleItems.length === 0) {
      toast({ title: "Error", description: "Agrega productos", variant: "destructive" });
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

      const saleItemsData = saleItems.map((i) => ({
        sale_id: sale.id,
        product_id: i.product.id,
        quantity: i.quantity,
        unit_price: i.unit_price,
        total_price: i.total_price,
      }));
      const { error: itemsError } = await supabase.from("sale_items").insert(saleItemsData);
      if (itemsError) throw itemsError;

      for (const item of saleItems) {
        const newStock = item.product.stock_quantity - item.quantity;
        const { error: stockError } = await supabase
          .from("products")
          .update({ stock_quantity: newStock, updated_at: new Date().toISOString() })
          .eq("id", item.product.id);
        if (stockError) throw stockError;
      }

      toast({ title: "Venta completada", description: `Venta ${saleNumber} registrada` });
      setSaleItems([]);
      setCustomerName("");
      setCustomerPhone("");
      setDiscountAmount(0);
      setBarcodeInput("");
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "No se pudo completar la venta", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const { subtotal, total } = calculateTotals();

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Info venta */}
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
              <Label>Tienda *</Label>
              <Select value={selectedStore} onValueChange={setSelectedStore} required>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tienda" />
                </SelectTrigger>
                <SelectContent>
                  {stores.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
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
          </div>
        </CardContent>
      </Card>

      {/* Escáner */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Scan className="h-5 w-5" />
            Escáner de Productos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              placeholder="Código de barras / SKU / nombre"
              onKeyDown={(e) => e.key === "Enter" && addProductToSale(barcodeInput)}
            />
            <Button onClick={() => addProductToSale(barcodeInput)} disabled={!barcodeInput.trim()}>
              <Plus className="h-4 w-4 mr-2" />
              Agregar
            </Button>
            <Button onClick={startScanner}>
              <Camera className="h-4 w-4 mr-2" /> Cámara
            </Button>
          </div>
          {showScanner && <video ref={videoRef} className="w-full h-64 mt-2 rounded-lg object-cover" autoPlay playsInline muted />}
        </CardContent>
      </Card>

      {/* Tabla productos */}
      {saleItems.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Productos en la Venta</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {saleItems.map((item) => (
                  <TableRow key={item.product.id}>
                    <TableCell>{item.product.name}</TableCell>
                    <TableCell>{formatCurrency(item.unit_price)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button onClick={() => updateQuantity(item.product.id, item.quantity - 1)}><Minus className="h-3 w-3" /></Button>
                        <span>{item.quantity}</span>
                        <Button onClick={() => updateQuantity(item.product.id, item.quantity + 1)}><Plus className="h-3 w-3" /></Button>
                      </div>
                    </TableCell>
                    <TableCell>{formatCurrency(item.total_price)}</TableCell>
                    <TableCell>
                      <Button onClick={() => removeItem(item.product.id)}><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Separator className="my-4" />
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
            <div className="flex justify-between font-bold text-lg">
              <span>Total:</span>
              <span>{formatCurrency(total)}</span>
            </div>
            <Button onClick={completeSale} className="w-full mt-2" disabled={loading || saleItems.length === 0}>
              {loading ? "Procesando..." : "Completar Venta"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
