"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Product } from "@/lib/types"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Icons } from "@/components/icons"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { formatCurrency } from "@/lib/utils"

export function InventoryTable() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    const supabase = createClient()

    const { data, error } = await supabase
      .from("products")
      .select(`
        *,
        category:categories(name),
        store:stores(name, type)
      `)
      .eq("is_active", true)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error loading products:", error)
    } else {
      setProducts(data || [])
    }
    setLoading(false)
  }

  const getStockStatus = (product: Product) => {
    if (product.stock_quantity === 0) {
      return { label: "Sin stock", variant: "destructive" as const }
    } else if (product.stock_quantity <= product.min_stock) {
      return { label: "Stock bajo", variant: "secondary" as const }
    } else {
      return { label: "Normal", variant: "default" as const }
    }
  }

  const getStoreTypeColor = (type: string) => {
    switch (type) {
      case "ferreteria":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      case "cosmeticos":
        return "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200"
      case "animales":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
    }
  }

  if (loading) {
    return <div className="text-center py-8">Cargando productos...</div>
  }

  return (
    <>
      {/* Desktop Table */}
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
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No hay productos registrados
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => {
                const stockStatus = getStockStatus(product)
                return (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{product.name}</div>
                        {product.barcode && (
                          <div className="text-xs text-muted-foreground">Código: {product.barcode}</div>
                        )}
                        {product.sku && <div className="text-xs text-muted-foreground">SKU: {product.sku}</div>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getStoreTypeColor((product as any).store?.type)}>
                        {(product as any).store?.name}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{(product as any).category?.name || "Sin categoría"}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{product.stock_quantity}</span>
                        {product.stock_quantity <= product.min_stock && <Icons.AlertTriangle />}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Min: {product.min_stock} | Max: {product.max_stock}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{formatCurrency(product.unit_price)}</TableCell>
                    <TableCell className="text-muted-foreground">{formatCurrency(product.cost_price)}</TableCell>
                    <TableCell>
                      <Badge variant={stockStatus.variant}>{stockStatus.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Icons.MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Icons.Edit />
                            <span className="ml-2">Editar</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
                            <Icons.Trash2 />
                            <span className="ml-2">Eliminar</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden space-y-4">
        {products.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8 text-muted-foreground">No hay productos registrados</CardContent>
          </Card>
        ) : (
          products.map((product) => {
            const stockStatus = getStockStatus(product)
            return (
              <Card key={product.id}>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <h3 className="font-medium text-sm">{product.name}</h3>
                        {product.barcode && <p className="text-xs text-muted-foreground">Código: {product.barcode}</p>}
                        {product.sku && <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Icons.MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Icons.Edit />
                            <span className="ml-2">Editar</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
                            <Icons.Trash2 />
                            <span className="ml-2">Eliminar</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={getStoreTypeColor((product as any).store?.type)}>
                        {(product as any).store?.name}
                      </Badge>
                      <Badge variant={stockStatus.variant}>{stockStatus.label}</Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Categoría</p>
                        <p className="font-medium">{(product as any).category?.name || "Sin categoría"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Stock</p>
                        <div className="flex items-center gap-1">
                          <span className="font-medium">{product.stock_quantity}</span>
                          {product.stock_quantity <= product.min_stock && <Icons.AlertTriangle />}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Min: {product.min_stock} | Max: {product.max_stock}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Precio</p>
                        <p className="font-medium">{formatCurrency(product.unit_price)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Costo</p>
                        <p className="font-medium">{formatCurrency(product.cost_price)}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </>
  )
}
