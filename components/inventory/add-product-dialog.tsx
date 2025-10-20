"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Store, Category } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { Icons } from "@/components/icons";

interface AddProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddProductDialog({
  open,
  onOpenChange,
}: AddProductDialogProps) {
  const [stores, setStores] = useState<Store[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [showScanner, setShowScanner] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    barcode: "",
    sku: "",
    category_id: "",
    unit_price: "",
    cost_price: "",
    stock_quantity: "",
    min_stock: "5",
    max_stock: "100",
    expiry_date: "",
    batch_number: "",
    supplier: "",
  });

  useEffect(() => {
    if (open) {
      loadStoresAndCategories();
    }
  }, [open]);

  useEffect(() => {
    if (selectedStore) {
      loadCategoriesForStore(selectedStore);
    }
  }, [selectedStore]);

  const loadStoresAndCategories = async () => {
    const supabase = createClient();
    const { data: storesData, error } = await supabase
      .from("stores")
      .select("*")
      .order("name");

    if (error) {
      console.error("❌ Error cargando tiendas:", error);
      toast({
        title: "Error cargando tiendas",
        description: error.message || "Revisa la consola",
        variant: "destructive",
      });
      return;
    }
    if (storesData) setStores(storesData);
  };

  const loadCategoriesForStore = async (storeId: string) => {
    const supabase = createClient();
    const { data: categoriesData, error } = await supabase
      .from("categories")
      .select("*")
      .eq("store_id", storeId)
      .order("name");

    if (error) {
      console.error("❌ Error cargando categorías:", error);
      toast({
        title: "Error cargando categorías",
        description: error.message || "Revisa la consola",
        variant: "destructive",
      });
      return;
    }
    if (categoriesData) setCategories(categoriesData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedStore) {
      toast({
        title: "Error",
        description: "Selecciona una tienda",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const productData = {
      ...formData,
      store_id: selectedStore,
      category_id: formData.category_id || null,
      expiry_date: Number(formData.expiry_date) || null,
      unit_price: Number(formData.unit_price) || 0,
      cost_price: Number(formData.cost_price) || 0,
      stock_quantity: Number(formData.stock_quantity) || 0,
      min_stock: Number(formData.min_stock) || 5,
      max_stock: Number(formData.max_stock) || 100,
    };

    try {
      const { data, error } = await supabase
        .from("products")
        .insert([productData]);

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      toast({ title: "Éxito", description: "Producto creado correctamente" });
      onOpenChange(false);
      resetForm();
      window.location.reload();
    } catch (err: any) {
      toast({
        title: "Error inesperado",
        description: err?.message || "Revisa la consola",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      barcode: "",
      sku: "",
      category_id: "",
      unit_price: "",
      cost_price: "",
      stock_quantity: "",
      min_stock: "5",
      max_stock: "100",
      expiry_date: "",
      batch_number: "",
      supplier: "",
    });
    setSelectedStore("");
    setCategories([]);
  };

  const handleBarcodeScanned = (code: string) => {
    setFormData((prev) => ({ ...prev, barcode: code }));
    setShowScanner(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Agregar Nuevo Producto</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* tienda y categoría */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    {stores.map((store: any) => (
                      <SelectItem
                        key={String(store.id)}
                        value={String(store.id)}
                      >
                        {store.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Categoría</Label>
                <Select
                  value={formData.category_id}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, category_id: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category: any) => (
                      <SelectItem
                        key={String(category.id)}
                        value={String(category.id)}
                      >
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* nombre */}
            <div className="space-y-2">
              <Label htmlFor="name">Nombre del Producto *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                required
              />
            </div>

            {/* descripción */}
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                rows={3}
              />
            </div>

            {/* código de barras + SKU 
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="barcode">Código de Barras</Label>
                <div className="flex gap-2">
                  <Input
                    id="barcode"
                    value={formData.barcode}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, barcode: e.target.value }))
                    }
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowScanner(true)}
                  >
                    <Icons.Scan className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sku">SKU</Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, sku: e.target.value }))
                  }
                />
              </div>
            </div>
*/}
            {/* precios */}
            <div className="flex gap-4">
              <div className="w-full space-y-2">
                <Label htmlFor="unit_price">Precio de Venta *</Label>
                <Input
                  id="unit_price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.unit_price}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      unit_price: e.target.value,
                    }))
                  }
                  required
                />
              </div>
              {/* precios de costo
              <div className="space-y-2">
                <Label htmlFor="cost_price">Precio de Costo *</Label>
                <Input
                  id="cost_price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.cost_price}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      cost_price: e.target.value,
                    }))
                  }
                  required
                />
              </div>
               */}
            </div>

            {/* stock 
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stock_quantity">Stock Inicial *</Label>
                <Input
                  id="stock_quantity"
                  type="number"
                  min="0"
                  value={formData.stock_quantity}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      stock_quantity: e.target.value,
                    }))
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="min_stock">Stock Mínimo</Label>
                <Input
                  id="min_stock"
                  type="number"
                  min="0"
                  value={formData.min_stock}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      min_stock: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_stock">Stock Máximo</Label>
                <Input
                  id="max_stock"
                  type="number"
                  min="0"
                  value={formData.max_stock}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      max_stock: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
*/}
            {/* vencimiento / lote 
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expiry_date">Fecha de Vencimiento</Label>
                <Input
                  id="expiry_date"
                  type="date"
                  value={formData.expiry_date}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      expiry_date: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="batch_number">Número de Lote</Label>
                <Input
                  id="batch_number"
                  value={formData.batch_number}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      batch_number: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
*/}
            {/* proveedor 
            <div className="space-y-2">
              <Label htmlFor="supplier">Proveedor</Label>
              <Input
                id="supplier"
                value={formData.supplier}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, supplier: e.target.value }))
                }
              />
            </div>
*/}
            {/* acciones */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Creando..." : "Crear Producto"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Scanner */}
      <BarcodeScanner
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleBarcodeScanned}
      />
    </>
  );
}
