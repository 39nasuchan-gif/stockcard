'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { PackagePlus, PackageMinus, CalendarDays } from 'lucide-react';

export default function MedicineDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [medicine, setMedicine] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMedicine() {
      const { data, error } = await supabase
        .from('medicines')
        .select('*, medicine_lots (*)')
        .eq('id', id)
        .single();
        
      if (data) setMedicine(data);
      setLoading(false);
    }
    fetchMedicine();
  }, [id]);

  if (loading) return <div className="p-8 text-center text-xl text-gray-500">กำลังโหลดข้อมูลยา...</div>;
  if (!medicine) return <div className="p-8 text-center text-xl text-red-500">ไม่พบข้อมูลยานี้ในระบบ</div>;

  const activeLots = (medicine.medicine_lots || [])
    .filter((l: any) => l.current_stock > 0)
    .sort((a: any, b: any) => new Date(a.exp_date).getTime() - new Date(b.exp_date).getTime());

  return (
    <div className="p-6 max-w-xl mx-auto mt-10 bg-white rounded-2xl shadow-md border border-gray-100">
      <button onClick={() => router.push('/')} className="mb-6 text-blue-600 hover:underline text-sm font-medium">
        &larr; กลับหน้าหลักคลังยา
      </button>
      
      <h1 className="text-3xl font-bold text-gray-800 mb-2">{medicine.name}</h1>
      <p className="text-sm text-gray-500 mb-6">บาร์โค้ด: {medicine.barcode || '-'}</p>

      <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-6">
        <h2 className="text-sm font-semibold text-gray-600 mb-3">📦 สต็อกคงเหลือแยกตามล็อต (EXP)</h2>
        {activeLots.length === 0 ? (
          <p className="text-red-500 font-bold">สต็อกหมด</p>
        ) : (
          <div className="space-y-2">
            {activeLots.map((lot: any) => (
              <div key={lot.id} className="flex justify-between items-center bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                <span className="text-xs font-semibold text-rose-600 flex items-center gap-1">
                  <CalendarDays size={14} /> EXP: {lot.exp_date}
                </span>
                <span className="text-sm font-bold text-emerald-700">
                  {lot.current_stock} {lot.unit_name} <span className="text-gray-400 font-normal text-xs">(บรรจุ {lot.pack_size})</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-4">
        <button onClick={() => router.push('/')} className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-colors">
          <PackagePlus size={18} /> ไปหน้าจัดการรับเข้า
        </button>
        <button onClick={() => router.push('/')} className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition-colors">
          <PackageMinus size={18} /> ไปหน้าตัดจ่าย
        </button>
      </div>
    </div>
  );
}