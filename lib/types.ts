export interface Store {
  id: string
  name: string
  type: "ferreteria" | "cosmeticos" | "animales"
  address?: string
  phone?: string
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  name: string
  description?: string
  store_id: string
  created_at: string
}

export interface Product {
  id: string
  name: string
  description?: string
  barcode?: string
  sku?: string
  category_id?: string
  store_id: string
  unit_price: number
  cost_price?: number
  stock_quantity?: number
  min_stock?: number
  max_stock?: number
  expiry_date?: string
  batch_number?: string
  supplier?: string
  is_active: boolean
  created_at: string
  updated_at: string
  category?: Category
}

export interface Sale {
  id: string
  store_id: string
  sale_number: string
  customer_name?: string
  customer_phone?: string
  total_amount: number
  discount_amount: number
  tax_amount: number
  payment_method: string
  status: "pending" | "completed" | "cancelled"
  notes?: string
  created_at: string
  updated_at: string
  sale_items?: SaleItem[]
}

export interface SaleItem {
  id: string
  sale_id: string
  product_id: string
  quantity: number
  unit_price: number
  total_price: number
  created_at: string
  product?: Product
}

export interface StockMovement {
  id: string
  product_id: string
  movement_type: "entrada" | "salida" | "ajuste"
  quantity: number
  previous_stock: number
  new_stock: number
  reference_id?: string
  reference_type?: string
  notes?: string
  created_at: string
  product?: Product
}
