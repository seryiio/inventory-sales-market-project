import { NewSaleForm } from "@/components/sales/new-sale-form"
import { Card } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NewSalePage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col md:flex-row p0 items-center gap-4">
        <Link href="/sales">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a Ventas
          </Button>
        </Link>
        <div className="text-center md:text-left">
          <h1 className="text-3xl font-bold text-foreground">Nueva Venta</h1>
          <p className="text-muted-foreground mt-1">Registra una nueva venta con escáner de códigos</p>
        </div>
      </div>

      <Card className="p-6">
        <NewSaleForm />
      </Card>
    </div>
  )
}
