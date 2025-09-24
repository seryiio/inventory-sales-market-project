"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Product } from "@/lib/types";
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
import { Icons } from "@/components/icons";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function InventoryTable() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [stores, setStores] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    loadProducts();
    loadStores();
  }, []);

  useEffect(() => {
    if (selectedStore) loadCategories(selectedStore);
  }, [selectedStore]);

  const loadProducts = async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("products")
      .select(
        `
        *,
        category:categories(name),
        store:stores(name, id, type)
      `
      )
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) console.error(error);
    else setProducts(data || []);
    setLoading(false);
  };

  const loadStores = async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("stores")
      .select("*")
      .order("name");
    if (error) console.error(error);
    else setStores(data || []);
  };

  const loadCategories = async (storeId: string) => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("store_id", storeId)
      .order("name");
    if (error) console.error(error);
    else setCategories(data || []);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Seguro que quieres eliminar este producto?")) return;
    const supabase = createClient();
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error)
      toast({
        title: "Error al eliminar",
        description: error.message,
        variant: "destructive",
      });
    else setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const getStockStatus = (product: Product) => {
    if (product.stock_quantity === 0)
      return { label: "Sin stock", variant: "destructive" as const };
    if (product.stock_quantity <= product.min_stock)
      return { label: "Stock bajo", variant: "secondary" as const };
    return { label: "Normal", variant: "default" as const };
  };

  const getStoreTypeColor = (type: string) => {
    switch (type) {
      case "ferreteria":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "cosmeticos":
        return "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200";
      case "animales":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const startEditing = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name || "",
      description: product.description || "",
      barcode: product.barcode || "",
      sku: product.sku || "",
      store_id: (product as any).store?.id || "",
      category_id: (product as any).category?.id || "",
      unit_price: product.unit_price || "",
      cost_price: product.cost_price || "",
      stock_quantity: product.stock_quantity || "",
      min_stock: product.min_stock || "5",
      max_stock: product.max_stock || "100",
      expiry_date: product.expiry_date || "",
      batch_number: product.batch_number || "",
      supplier: product.supplier || "",
    });
    setSelectedStore((product as any).store?.id || "");
  };

  const handleSave = async () => {
    if (!editingProduct) return;
    const supabase = createClient();

    const updatedData = {
      ...formData,
      store_id: selectedStore,
      category_id: formData.category_id || null,
      unit_price: Number(formData.unit_price),
      cost_price: Number(formData.cost_price),
      stock_quantity: Number(formData.stock_quantity),
      min_stock: Number(formData.min_stock),
      max_stock: Number(formData.max_stock),
    };

    const { error } = await supabase
      .from("products")
      .update(updatedData)
      .eq("id", editingProduct.id);
    if (error)
      toast({
        title: "Error al actualizar",
        description: error.message,
        variant: "destructive",
      });
    else {
      setProducts((prev) =>
        prev.map((p) =>
          p.id === editingProduct.id ? { ...p, ...updatedData } : p
        )
      );
      setEditingProduct(null);
      toast({ title: "Producto actualizado" });
    }
  };

  if (loading)
    return <div className="text-center py-8">Cargando productos...</div>;

  return (
    <>
      {/* Tabla Desktop */}
      <div className="hidden lg:block rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead>Tienda</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Precio</TableHead>
              <TableHead>Costo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center py-8 text-muted-foreground"
                >
                  No hay productos registrados
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => {
                const stockStatus = getStockStatus(product);
                return (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{product.name}</div>
                        {product.barcode && (
                          <div className="text-xs text-muted-foreground">
                            Código: {product.barcode}
                          </div>
                        )}
                        {product.sku && (
                          <div className="text-xs text-muted-foreground">
                            SKU: {product.sku}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={getStoreTypeColor(
                          (product as any).store?.type
                        )}
                      >
                        {(product as any).store?.name}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {(product as any).category?.name || "Sin categoría"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {product.stock_quantity}
                        </span>
                        {product.stock_quantity <= product.min_stock && (
                          <Icons.AlertTriangle />
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Min: {product.min_stock} | Max: {product.max_stock}
                      </div>
                    </TableCell>
                    <TableCell>{formatCurrency(product.unit_price)}</TableCell>
                    <TableCell>{formatCurrency(product.cost_price)}</TableCell>
                    <TableCell>
                      <Badge variant={stockStatus.variant}>
                        {stockStatus.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="flex gap-2">
                      <Button
                        style={{ color: "orange" }}
                        size="sm"
                        variant="outline"
                        onClick={() => startEditing(product)}
                      >
                        <Icons.Edit className="h-4 w-4 stroke-orange-500" />
                      </Button>
                      <Button
                        style={{ color: "red" }}
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(product.id)}
                      >
                        <Icons.Trash2 className="h-4 w-4 stroke-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Tabla Móvil */}
      <div className="block lg:hidden space-y-4">
        {products.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No hay productos registrados
          </div>
        ) : (
          products.map((product) => {
            const stockStatus = getStockStatus(product);
            return (
              <Card key={product.id} className="p-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="font-medium">{product.name}</div>
                    <div className="flex gap-2">
                      <Button
                        style={{ color: "orange" }}
                        size="sm"
                        variant="outline"
                        onClick={() => startEditing(product)}
                      >
                        <Icons.Edit className="h-4 w-4 stroke-orange-500" />
                      </Button>
                      <Button
                        style={{ color: "red" }}
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(product.id)}
                      >
                        <Icons.Trash2 className="h-4 w-4 stroke-red-500" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label>Tienda</Label>
                    <Badge
                      variant="outline"
                      className={getStoreTypeColor(
                        (product as any).store?.type
                      )}
                    >
                      {(product as any).store?.name}
                    </Badge>
                  </div>

                  <div>
                    <Label>Categoría</Label>
                    <div>
                      {(product as any).category?.name || "Sin categoría"}
                    </div>
                  </div>

                  <div>
                    <Label>Stock</Label>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {product.stock_quantity}
                      </span>
                      {product.stock_quantity <= product.min_stock && (
                        <Icons.AlertTriangle />
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Min: {product.min_stock} | Max: {product.max_stock}
                    </div>
                  </div>

                  <div>
                    <Label>Precio</Label>
                    <div>{formatCurrency(product.unit_price)}</div>
                  </div>

                  <div>
                    <Label>Costo</Label>
                    <div>{formatCurrency(product.cost_price)}</div>
                  </div>

                  <div>
                    <Label>Estado</Label>
                    <Badge variant={stockStatus.variant}>
                      {stockStatus.label}
                    </Badge>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Modal Edición */}
      {/* Modal Edición */}
      <Dialog
        open={!!editingProduct}
        onOpenChange={() => setEditingProduct(null)}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Producto</DialogTitle>
          </DialogHeader>
          {editingProduct && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSave();
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="store">Tienda *</Label>
                  <Select
                    value={selectedStore}
                    onValueChange={setSelectedStore}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tienda" />
                    </SelectTrigger>
                    <SelectContent>
                      {stores.map((s) => (
                        <SelectItem key={String(s.id)} value={String(s.id)}>
                          {s.name}
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
                      setFormData({ ...formData, category_id: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={String(c.id)} value={String(c.id)}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Nombre del Producto *</Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
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
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="barcode">Código de Barras</Label>
                  <Input
                    id="barcode"
                    value={formData.barcode}
                    onChange={(e) =>
                      setFormData({ ...formData, barcode: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sku">SKU</Label>
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) =>
                      setFormData({ ...formData, sku: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="unit_price">Precio de Venta *</Label>
                  <Input
                    id="unit_price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.unit_price}
                    onChange={(e) =>
                      setFormData({ ...formData, unit_price: e.target.value })
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
                      setFormData({ ...formData, cost_price: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="stock_quantity">Stock Inicial *</Label>
                  <Input
                    id="stock_quantity"
                    type="number"
                    min="0"
                    value={formData.stock_quantity}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        stock_quantity: e.target.value,
                      })
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
                      setFormData({ ...formData, min_stock: e.target.value })
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
                      setFormData({ ...formData, max_stock: e.target.value })
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
                      setFormData({ ...formData, expiry_date: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="batch_number">Número de Lote</Label>
                  <Input
                    id="batch_number"
                    value={formData.batch_number}
                    onChange={(e) =>
                      setFormData({ ...formData, batch_number: e.target.value })
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
                    setFormData({ ...formData, supplier: e.target.value })
                  }
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingProduct(null)}
                >
                  Cancelar
                </Button>
                <Button type="submit">Guardar cambios</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
