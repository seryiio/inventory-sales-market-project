"use client"

import { Button } from "@/components/ui/button"
import { Download, FileText, Printer, Share } from "lucide-react"

export function ReportsHeader() {
  return (
    <div className="flex flex-col md:flex-row items-center justify-between">
      <div className="text-center md:text-left">
        <h1 className="text-3xl font-bold text-foreground">Reportes y Análisis</h1>
        <p className="text-muted-foreground mt-1">Análisis detallado de ventas, inventario y rentabilidad</p>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm">
          <Printer className="h-4 w-4 mr-2" />
          Imprimir
        </Button>
        <Button variant="outline" size="sm">
          <Share className="h-4 w-4 mr-2" />
          Compartir
        </Button>
        <Button variant="outline" size="sm">
          <FileText className="h-4 w-4 mr-2" />
          PDF
        </Button>
        <Button className="bg-primary text-primary-foreground">
          <Download className="h-4 w-4 mr-2" />
          Exportar Excel
        </Button>
      </div>
    </div>
  )
}
