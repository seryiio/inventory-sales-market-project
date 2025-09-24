"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Product } from "@/lib/types";
import { InventoryFilters } from "./inventory-filters";
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
import { Card } from "../ui/card";

// 🎨 mapping estados -> variantes del Badge
const stockStatusVariants: Record<
  string,
  "success" | "warning" | "danger" | "info" | "expired" | "combo"
> = {
  Normal: "success",
  "Por agotarse": "warning",
  Agotado: "danger",
  "Por vencer": "info",
  Vencido: "expired",
  "Agotado y Vencido": "danger",
  "Por agotarse y vencer": "combo",
};

type SortKey =
  | "supplier"
  | "name"
  | "store"
  | "category"
  | "stock_quantity"
  | "unit_price"
  | "cost_price"
  | "expiry_date";

type SortConfig = {
  key: SortKey;
  direction: "asc" | "desc";
};

type Filters = {
  searchTerm: string;
  selectedStore: string;
  selectedCategory: string;
  stockFilter: string;
};

const SortIndicator = ({ direction }: { direction?: "asc" | "desc" }) => (
  <span className="inline-block ml-1 text-gray-400">
    {direction === "asc" ? "▲" : direction === "desc" ? "▼" : "⇅"}
  </span>
);

interface Props {
  filters: Filters;
}

export function InventoryTable({ filters }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [stores, setStores] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>("");
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
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

  // ---- CALCULAR ESTADO ----
  const getStockStatus = (product: Product) => {
    const today = new Date();
    const expiry = product.expiry_date ? new Date(product.expiry_date) : null;

    let isExpired = false;
    let isExpiringSoon = false;

    if (expiry) {
      if (expiry < today) {
        isExpired = true;
      } else {
        const diffDays = Math.ceil(
          (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (diffDays <= 30) {
          isExpiringSoon = true;
        }
      }
    }

    const isOutOfStock = product.stock_quantity === 0;
    const isLowStock =
      !isOutOfStock && product.stock_quantity <= product.min_stock;

    if (isOutOfStock && isExpired)
      return { label: "Agotado y Vencido", variant: "danger" as const };
    if (isOutOfStock) return { label: "Agotado", variant: "danger" as const };
    if (isExpired) return { label: "Vencido", variant: "expired" as const };
    if (isLowStock && isExpiringSoon)
      return { label: "Por agotarse y vencer", variant: "combo" as const };
    if (isLowStock)
      return { label: "Por agotarse", variant: "warning" as const };
    if (isExpiringSoon)
      return { label: "Por vencer", variant: "info" as const };

    return { label: "Normal", variant: "success" as const };
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

  const handleSort = (key: SortKey) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig?.key === key && sortConfig.direction === "asc")
      direction = "desc";

    const sortedProducts = [...products].sort((a: any, b: any) => {
      let aValue = a[key];
      let bValue = b[key];

      if (key === "store") aValue = a.store?.name || "";
      if (key === "category") aValue = a.category?.name || "";

      if (aValue < bValue) return direction === "asc" ? -1 : 1;
      if (aValue > bValue) return direction === "asc" ? 1 : -1;
      return 0;
    });

    setProducts(sortedProducts);
    setSortConfig({ key, direction });
  };

  if (loading)
    return <div className="text-center py-8">Cargando productos...</div>;

  // ------------------------
  // FILTRADO DINÁMICO
  // ------------------------
  const filteredProducts = products.filter((p) => {
    const term = filters.searchTerm.toLowerCase();
    const matchSearch =
      p.name.toLowerCase().includes(term) ||
      (p.barcode?.toLowerCase().includes(term) ?? false) ||
      (p.sku?.toLowerCase().includes(term) ?? false);

    const matchStore =
      filters.selectedStore === "all" || p.store?.id === filters.selectedStore;
    const matchCategory =
      filters.selectedCategory === "all" ||
      p.category?.id === filters.selectedCategory;
    const matchStock =
      filters.stockFilter === "all" ||
      (filters.stockFilter === "low" && p.stock_quantity <= p.min_stock) ||
      (filters.stockFilter === "out" && p.stock_quantity === 0) ||
      (filters.stockFilter === "normal" && p.stock_quantity > p.min_stock);

    return matchSearch && matchStore && matchCategory && matchStock;
  });

  return (
    <>
      {/* Tabla Desktop */}
      <div className="hidden lg:block rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead onClick={() => handleSort("supplier")}>
                Proveedor
                {sortConfig?.key === "supplier" && (
                  <SortIndicator direction={sortConfig.direction} />
                )}
              </TableHead>
              <TableHead onClick={() => handleSort("name")}>
                Producto
                {sortConfig?.key === "name" && (
                  <SortIndicator direction={sortConfig.direction} />
                )}
              </TableHead>
              <TableHead onClick={() => handleSort("store")}>
                Tienda
                {sortConfig?.key === "store" && (
                  <SortIndicator direction={sortConfig.direction} />
                )}
              </TableHead>
              <TableHead onClick={() => handleSort("category")}>
                Categoría
                {sortConfig?.key === "category" && (
                  <SortIndicator direction={sortConfig.direction} />
                )}
              </TableHead>
              <TableHead onClick={() => handleSort("stock_quantity")}>
                Stock
                {sortConfig?.key === "stock_quantity" && (
                  <SortIndicator direction={sortConfig.direction} />
                )}
              </TableHead>
              <TableHead onClick={() => handleSort("unit_price")}>
                Precio
                {sortConfig?.key === "unit_price" && (
                  <SortIndicator direction={sortConfig.direction} />
                )}
              </TableHead>
              <TableHead onClick={() => handleSort("cost_price")}>
                Costo
                {sortConfig?.key === "cost_price" && (
                  <SortIndicator direction={sortConfig.direction} />
                )}
              </TableHead>
              <TableHead onClick={() => handleSort("expiry_date")}>
                F. Vencimiento
                {sortConfig?.key === "expiry_date" && (
                  <SortIndicator direction={sortConfig.direction} />
                )}
              </TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={10}
                  className="text-center py-8 text-muted-foreground"
                >
                  No hay productos registrados
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((product) => {
                const stockStatus = getStockStatus(product);
                return (
                  <TableRow key={product.id}>
                    <TableCell>{product.supplier}</TableCell>
                    <TableCell>{product.name}</TableCell>
                    <TableCell>
                      <Badge>
                        {(product as any).store?.name || "Sin tienda"}
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
                    </TableCell>
                    <TableCell>{formatCurrency(product.unit_price)}</TableCell>
                    <TableCell>{formatCurrency(product.cost_price)}</TableCell>
                    <TableCell>{product.expiry_date}</TableCell>
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
                        <Icons.Edit />
                      </Button>
                      <Button
                        style={{ color: "red" }}
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(product.id)}
                      >
                        <Icons.Trash2 />
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
        {filteredProducts.map((product) => {
          const stockStatus = getStockStatus(product);
          return (
            <Card key={product.id} className="p-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium">{product.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {product.supplier}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      style={{ color: "orange" }}
                      size="sm"
                      variant="outline"
                      onClick={() => startEditing(product)}
                    >
                      <Icons.Edit />
                    </Button>
                    <Button
                      style={{ color: "red" }}
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(product.id)}
                    >
                      <Icons.Trash2 />
                    </Button>
                  </div>
                </div>
                <div>
                  <Label>Tienda</Label>
                  <div>{(product as any).store?.name || "Sin tienda"}</div>
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
                  <Label>Fecha de Vencimiento</Label>
                  <div>{product.expiry_date}</div>
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
        })}
      </div>

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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tienda</Label>
                  <Select
                    value={selectedStore}
                    onValueChange={(val) => setSelectedStore(val)}
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

                <div>
                  <Label>Categoría</Label>
                  <Select
                    value={formData.category_id}
                    onValueChange={(val) =>
                      setFormData((prev: any) => ({
                        ...prev,
                        category_id: val,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Nombre</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev: any) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                  />
                </div>

                <div>
                  <Label>Descripción</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev: any) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                  />
                </div>

                <div>
                  <Label>Código de barras</Label>
                  <Input
                    value={formData.barcode}
                    onChange={(e) =>
                      setFormData((prev: any) => ({
                        ...prev,
                        barcode: e.target.value,
                      }))
                    }
                  />
                </div>

                <div>
                  <Label>SKU</Label>
                  <Input
                    value={formData.sku}
                    onChange={(e) =>
                      setFormData((prev: any) => ({
                        ...prev,
                        sku: e.target.value,
                      }))
                    }
                  />
                </div>

                <div>
                  <Label>Precio</Label>
                  <Input
                    type="number"
                    value={formData.unit_price}
                    onChange={(e) =>
                      setFormData((prev: any) => ({
                        ...prev,
                        unit_price: e.target.value,
                      }))
                    }
                  />
                </div>

                <div>
                  <Label>Costo</Label>
                  <Input
                    type="number"
                    value={formData.cost_price}
                    onChange={(e) =>
                      setFormData((prev: any) => ({
                        ...prev,
                        cost_price: e.target.value,
                      }))
                    }
                  />
                </div>

                <div>
                  <Label>Stock</Label>
                  <Input
                    type="number"
                    value={formData.stock_quantity}
                    onChange={(e) =>
                      setFormData((prev: any) => ({
                        ...prev,
                        stock_quantity: e.target.value,
                      }))
                    }
                  />
                </div>

                <div>
                  <Label>Stock mínimo</Label>
                  <Input
                    type="number"
                    value={formData.min_stock}
                    onChange={(e) =>
                      setFormData((prev: any) => ({
                        ...prev,
                        min_stock: e.target.value,
                      }))
                    }
                  />
                </div>

                <div>
                  <Label>Stock máximo</Label>
                  <Input
                    type="number"
                    value={formData.max_stock}
                    onChange={(e) =>
                      setFormData((prev: any) => ({
                        ...prev,
                        max_stock: e.target.value,
                      }))
                    }
                  />
                </div>

                <div>
                  <Label>Fecha de vencimiento</Label>
                  <Input
                    type="date"
                    value={formData.expiry_date}
                    onChange={(e) =>
                      setFormData((prev: any) => ({
                        ...prev,
                        expiry_date: e.target.value,
                      }))
                    }
                  />
                </div>

                <div>
                  <Label>Número de lote</Label>
                  <Input
                    value={formData.batch_number}
                    onChange={(e) =>
                      setFormData((prev: any) => ({
                        ...prev,
                        batch_number: e.target.value,
                      }))
                    }
                  />
                </div>

                <div>
                  <Label>Proveedor</Label>
                  <Input
                    value={formData.supplier}
                    onChange={(e) =>
                      setFormData((prev: any) => ({
                        ...prev,
                        supplier: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingProduct(null)}
                >
                  Cancelar
                </Button>
                <Button type="submit">Guardar</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
