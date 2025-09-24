"use client"

import * as XLSX from "xlsx"
import { saveAs } from "file-saver"
import { Sale } from "./types"

export function exportSalesToExcel(ventas: Sale[]) {
  if (!ventas || ventas.length === 0) return

  const data = ventas.map(v => ({
    "ID": v.id,
    "Número de venta": v.sale_number,
    "Cliente": v.customer_name ?? "",
    "Total": v.total_amount,
    "Estado": v.status,
    "Fecha": v.created_at,
  }))

  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Ventas")

  const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" })
  const blob = new Blob([excelBuffer], { type: "application/octet-stream" })
  saveAs(blob, "ventas.xlsx")
}
