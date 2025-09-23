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

    if (storesData) {
      console.log(
        "✅ Tiendas cargadas (primeros ids y tipos):",
        storesData
          .slice(0, 5)
          .map((s: any) => ({ id: s.id, typeof: typeof s.id }))
      );
      setStores(storesData);
    }
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

    if (categoriesData) {
      console.log(
        "✅ Categorías cargadas (primeros ids y tipos):",
        categoriesData
          .slice(0, 5)
          .map((c: any) => ({ id: c.id, typeof: typeof c.id }))
      );
      setCategories(categoriesData);
    }
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

    // --- Detectar y preparar store_id para insertar (number vs string)
    const storeObj = stores.find(
      (s: any) => String(s.id) === String(selectedStore)
    );
    const store_id_for_insert = storeObj
      ? typeof storeObj.id === "number"
        ? Number(storeObj.id)
        : String(storeObj.id)
      : // fallback: intenta inferir
      isNaN(Number(selectedStore))
      ? selectedStore
      : Number(selectedStore);

    // --- Detectar y preparar category_id (si existe)
    const categoryObj = categories.find(
      (c: any) => String(c.id) === String(formData.category_id)
    );
    const category_id_for_insert = formData.category_id
      ? categoryObj
        ? typeof categoryObj.id === "number"
          ? Number(categoryObj.id)
          : String(categoryObj.id)
        : isNaN(Number(formData.category_id))
        ? formData.category_id
        : Number(formData.category_id)
      : null;

    const productData = {
      name: formData.name || null,
      description: formData.description || null,
      barcode: formData.barcode || null,
      sku: formData.sku || null,
      store_id: store_id_for_insert,
      category_id: category_id_for_insert,
      unit_price: Number.parseFloat(formData.unit_price) || 0,
      cost_price: Number.parseFloat(formData.cost_price) || 0,
      stock_quantity: Number.parseInt(formData.stock_quantity) || 0,
      min_stock: Number.parseInt(formData.min_stock) || 5,
      max_stock: Number.parseInt(formData.max_stock) || 100,
      expiry_date: formData.expiry_date || null,
      batch_number: formData.batch_number || null,
      supplier: formData.supplier || null,
    };

    console.log("📦 Intentando insertar productData:", productData);

    try {
      // pedimos que devuelva la fila insertada con .select('*') para mayor info
      const { data, error } = await supabase
        .from("products")
        .insert([productData]);

      // si quieres obtener lo insertado, haz un select aparte usando la PK o un campo único
      if (!error && data) {
        console.log("✅ Producto insertado:", data);
      }

      console.log("🔁 Respuesta de Supabase tras insert:", { data, error });

      if (error) {
        // muestra detalles útiles
        console.error(
          "❌ Error al insertar producto (detalle completo):",
          JSON.stringify(error, null, 2)
        );
        toast({
          title: "Error",
          description: `${error.message}${
            error.details ? ` — ${error.details}` : ""
          }${error.hint ? ` — ${error.hint}` : ""}`,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      toast({
        title: "Éxito",
        description: "Producto creado correctamente",
      });
      onOpenChange(false);
      resetForm();
      // si quieres evitar reload en producción, podrías emitir un evento o refrescar datos en cliente
      window.location.reload();
    } catch (err: any) {
      console.error("❌ Excepción al insertar producto:", err);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Agregar Nuevo Producto</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
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
                    // usamos String(store.id) para que el Select siempre maneje strings
                    <SelectItem key={String(store.id)} value={String(store.id)}>
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

          {/* rest of form unchanged (inputs) */}
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="barcode">Código de Barras</Label>
              <Input
                id="barcode"
                value={formData.barcode}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, barcode: e.target.value }))
                }
              />
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
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
          </div>

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
  );
}
