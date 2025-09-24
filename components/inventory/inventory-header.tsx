"use client"

import { Button } from "@/components/ui/button"
import { Icons } from "@/components/icons"
import { useState } from "react"
import { AddProductDialog } from "./add-product-dialog"

export function InventoryHeader() {
  const [showAddDialog, setShowAddDialog] = useState(false)

  return (
      <div className="flex flex-col md:flex-row items-center justify-between">
        <div className="text-center md:text-left">
        <h1 className="text-3xl font-bold text-foreground">Gestión de Inventario</h1>
        <p className="text-muted-foreground mt-1">Administra productos y stock de inventario</p>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm">
          <Icons.Download />
          Exportar
        </Button>
        <Button variant="outline" size="sm">
          <Icons.Upload />
          Importar
        </Button>
        <Button onClick={() => setShowAddDialog(true)} className="bg-primary text-primary-foreground">
          <Icons.Plus />
          Agregar Producto
        </Button>
      </div>

      <AddProductDialog open={showAddDialog} onOpenChange={setShowAddDialog} />
    </div>
  )
}
