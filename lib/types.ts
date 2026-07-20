export type Medicine = {
  id: string
  name: string
  barcode: string | null
  hosxp_icode: string | null
  cabinet_category: number | null
  min_stock: number | null
  current_stock: number | null
}

export type StockTransaction = {
  id: string
  medicine_id: string
  transaction_type: 'IN' | 'OUT'
  quantity: number
  note: string | null
  created_at: string
  medicines: Pick<Medicine, 'name' | 'barcode' | 'hosxp_icode'> | null
}

export type TransactionType = 'IN' | 'OUT'

export type NewMedicineForm = {
  name: string
  barcode: string
  hosxp_icode: string
  cabinet_category: string
  min_stock: string
}

export const MEDICINE_SELECT =
  'id, name, barcode, hosxp_icode, cabinet_category, min_stock, current_stock'

export const CABINET_OPTIONS = Array.from({ length: 10 }, (_, index) => String(index + 1))
