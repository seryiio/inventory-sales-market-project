"use client";

import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { useState, useEffect } from "react";
import { AddProductDialog } from "./add-product-dialog";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { createClient } from "@/lib/supabase/client";
import type { Product } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

interface InventoryHeaderProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
}

export function InventoryHeader({ products, setProducts }: InventoryHeaderProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const { toast } = useToast();

  // Exportar productos a Excel
  const handleExport = () => {
    if (!products || products.length === 0) {
      toast({ title: "No hay productos para exportar." });
      return;
    }

    const ws = XLSX.utils.json_to_sheet(products);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventario");
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([buf], { type: "application/octet-stream" });
    saveAs(blob, "inventario.xlsx");
  };

  // Importar Excel y agregar productos a Supabase y estado
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const fileData = evt.target?.result;
      const workbook = XLSX.read(fileData , { type: "binary" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const importedData: any[] = XLSX.utils.sheet_to_json(sheet);

      if (!importedData || importedData.length === 0) {
        toast({ title: "El archivo no contiene datos válidos." });
        return;
      }

      const supabase = createClient();

      const newProducts = importedData.map((p) => ({
        name: p.name || "",
        description: p.description || "",
        barcode: p.barcode || "",
        sku: p.sku || "",
        store_id: p.store_id || null,
        category_id: p.category_id || null,
        unit_price: Number(p.unit_price) || 0,
        cost_price: Number(p.cost_price) || 0,
        stock_quantity: Number(p.stock_quantity) || 0,
        min_stock: Number(p.min_stock) || 0,
        max_stock: Number(p.max_stock) || 0,
        expiry_date: p.expiry_date || null,
        batch_number: p.batch_number || "",
        supplier: p.supplier || "",
        is_active: true,
        created_at: new Date().toISOString(),
      }));

      const { data, error } = await supabase.from("products").insert(newProducts);

      if (error) {
        console.error("Error al importar productos:", error);
        toast({ title: "Error al importar productos", description: error.message, variant: "destructive" });
        return;
      }

      // Actualizamos estado
      setProducts((prev) => [...prev, ...(data || [])]);
      toast({ title: "Productos importados correctamente", variant: "success" });
    };

    reader.readAsBinaryString(file);
  };

  return (
    <div className="flex flex-col md:flex-row items-center justify-between">
      <div className="text-center md:text-left">
        <h1 className="text-3xl font-bold text-foreground">Gestión de Inventario</h1>
        <p className="text-muted-foreground mt-1">Administra productos y stock de inventario</p>
      </div>

      <div className="flex items-center gap-3 mt-4 md:mt-0">
        <Button className="cursor-pointer" onClick={handleExport} variant="outline" size="sm">
          <Icons.Download /> Exportar
        </Button>

        <label>
          <input
            type="file"
            accept=".xlsx, .xls"
            onChange={handleImport}
            style={{ display: "none" }}
          />
          <Button className="cursor-pointer" variant="outline" size="sm">
            <Icons.Upload /> Importar
          </Button>
        </label>

        <Button onClick={() => setShowAddDialog(true)} className="bg-primary text-primary-foreground cursor-pointer">
          <Icons.Plus /> Agregar Producto
        </Button>
      </div>

      <AddProductDialog open={showAddDialog} onOpenChange={setShowAddDialog} />
    </div>
  );
}
