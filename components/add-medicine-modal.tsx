'use client'

import { Loader2, Plus, X } from 'lucide-react'
import { CABINET_OPTIONS, type NewMedicineForm } from '@/lib/types'

type AddMedicineModalProps = {
  open: boolean
  form: NewMedicineForm
  submitting: boolean
  error: string | null
  onClose: () => void
  onChange: (field: keyof NewMedicineForm, value: string) => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
}

const inputClassName =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100'

export default function AddMedicineModal({
  open,
  form,
  submitting,
  error,
  onClose,
  onChange,
  onSubmit,
}: AddMedicineModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="ปิดหน้าต่าง"
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
      />

      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              <Plus className="h-3.5 w-3.5" />
              เพิ่มรายการใหม่
            </div>
            <h2 className="text-xl font-semibold text-slate-900">เพิ่มยาใหม่</h2>
            <p className="mt-1 text-sm text-slate-500">กรอกข้อมูลยาเพื่อเพิ่มเข้าคลัง</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 px-6 py-5">
          <div>
            <label htmlFor="medicine-name" className="mb-2 block text-sm font-medium text-slate-700">
              ชื่อยา <span className="text-rose-500">*</span>
            </label>
            <input
              id="medicine-name"
              type="text"
              value={form.name}
              onChange={(event) => onChange('name', event.target.value)}
              placeholder="เช่น Paracetamol 500 mg"
              className={inputClassName}
              required
            />
          </div>

          <div>
            <label
              htmlFor="medicine-barcode"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              บาร์โค้ด <span className="text-rose-500">*</span>
            </label>
            <input
              id="medicine-barcode"
              type="text"
              value={form.barcode}
              onChange={(event) => onChange('barcode', event.target.value)}
              placeholder="เช่น 8850123456789"
              className={inputClassName}
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="medicine-hosxp"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                รหัส HosXP
              </label>
              <input
                id="medicine-hosxp"
                type="text"
                value={form.hosxp_icode}
                onChange={(event) => onChange('hosxp_icode', event.target.value)}
                placeholder="เช่น 150001"
                className={inputClassName}
              />
            </div>

            <div>
              <label
                htmlFor="medicine-cabinet"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                หมวดหมู่ตู้ยา
              </label>
              <select
                id="medicine-cabinet"
                value={form.cabinet_category}
                onChange={(event) => onChange('cabinet_category', event.target.value)}
                className={inputClassName}
              >
                {CABINET_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    ตู้ยา {option}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="medicine-min-stock"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              ควร stock (min_stock)
            </label>
            <input
              id="medicine-min-stock"
              type="number"
              min="0"
              step="1"
              value={form.min_stock}
              onChange={(event) => onChange('min_stock', event.target.value)}
              placeholder="เช่น 50"
              className={inputClassName}
            />
          </div>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {error}
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  กำลังบันทึก...
                </>
              ) : (
                'บันทึกยาใหม่'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
