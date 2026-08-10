'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { PackagePlus, PackageMinus, CalendarDays, Calculator, X } from 'lucide-react';

export default function MedicineDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [medicine, setMedicine] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // States สำหรับเปิด Modal รับเข้า/ตัดจ่าย
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [stockAction, setStockAction] = useState<'in' | 'out'>('in');
  const [stockExpDate, setStockExpDate] = useState("");
  const [stockPackSize, setStockPackSize] = useState("100");
  const [stockUnitName, setStockUnitName] = useState("'s");
  const [selectedLotId, setSelectedLotId] = useState("");
  const [inputMode, setInputMode] = useState<'base' | 'pack'>('base');
  const [inputAmount, setInputAmount] = useState("");
  const [inputPackCount, setInputPackCount] = useState("");

  const fetchMedicine = async () => {
    const { data, error } = await supabase
      .from('medicines')
      .select('*, medicine_lots (*)')
      .eq('id', id)
      .single();
      
    if (data) setMedicine(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchMedicine();
  }, [id]);

  const openStockModal = (action: 'in' | 'out') => {
    setStockAction(action);
    setInputMode('base');
    setInputAmount(""); setInputPackCount(""); setStockExpDate(""); setSelectedLotId("");
    if (medicine.medicine_lots && medicine.medicine_lots.length > 0) {
      setStockPackSize(medicine.medicine_lots[0].pack_size.toString());
      setStockUnitName(medicine.medicine_lots[0].unit_name);
    } else {
      setStockPackSize("100"); setStockUnitName("'s");
    }
    setIsStockModalOpen(true);
  };

  const handleUpdateStock = async (e: React.FormEvent) => {
    e.preventDefault();
    let totalItems = 0;

    if (inputMode === 'base') {
      totalItems = parseInt(inputAmount);
      if (!totalItems || totalItems <= 0) return alert("กรุณาระบุจำนวนให้ถูกต้อง");
    } else {
      const packs = parseFloat(inputPackCount);
      const size = stockAction === 'out'
        ? (medicine.medicine_lots || []).find((l: any) => l.id === selectedLotId)?.pack_size
        : parseInt(stockPackSize);

      if (!packs || packs <= 0 || !size || size <= 0) return alert("กรุณาระบุข้อมูลให้ครบถ้วน");
      totalItems = Math.round(packs * size);
    }

    try {
      if (stockAction === 'in') {
        if (!stockExpDate) return alert("กรุณาระบุวันหมดอายุ (EXP)");

        const existingLot = (medicine.medicine_lots || []).find(
          (l: any) => l.exp_date === stockExpDate && l.pack_size === parseInt(stockPackSize) && l.unit_name === stockUnitName
        );

        if (existingLot) {
          const { error } = await supabase.from("medicine_lots").update({ current_stock: existingLot.current_stock + totalItems }).eq("id", existingLot.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("medicine_lots").insert([{
            medicine_id: medicine.id, exp_date: stockExpDate, pack_size: parseInt(stockPackSize), unit_name: stockUnitName, current_stock: totalItems
          }]);
          if (error) throw error;
        }
      } else {
        if (!selectedLotId) return alert("กรุณาเลือกล็อตที่ต้องการตัดจ่าย");
        const lotToDeduct = (medicine.medicine_lots || []).find((l: any) => l.id === selectedLotId);

        if (!lotToDeduct) return alert("ไม่พบข้อมูลล็อต");
        if (totalItems > lotToDeduct.current_stock) {
          return alert(`สต็อกในล็อตนี้ไม่พอ! ต้องการเบิก ${totalItems} แต่มีแค่ ${lotToDeduct.current_stock}`);
        }
        const { error } = await supabase.from("medicine_lots").update({ current_stock: lotToDeduct.current_stock - totalItems }).eq("id", lotToDeduct.id);
        if (error) throw error;
      }

      setIsStockModalOpen(false);
      fetchMedicine(); // โหลดข้อมูลสต็อกล่าสุดมาแสดงทันที
      alert("อัปเดตสต็อกสำเร็จ!");
    } catch (error: any) {
      alert("อัปเดตสต็อกไม่สำเร็จ: " + error.message);
    }
  };

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

      {/* ปุ่มกดรับเข้า / ตัดจ่าย ตรงนี้จะเด้งหน้าต่างกรอกจำนวนขึ้นมาทันทีโดยไม่ต้องย้อนกลับ */}
      <div className="flex gap-4">
        <button onClick={() => openStockModal('in')} className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-colors">
          <PackagePlus size={18} /> รับเข้า
        </button>
        <button onClick={() => openStockModal('out')} className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition-colors">
          <PackageMinus size={18} /> ตัดจ่าย
        </button>
      </div>

      {/* Modal รับเข้า/ตัดจ่าย (เด้งขึ้นมาบนหน้านี้เลย) */}
      {isStockModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden">
            <div className={`flex justify-between items-center p-6 border-b ${stockAction === 'in' ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
              <h2 className={`text-lg font-bold flex items-center gap-2 ${stockAction === 'in' ? 'text-emerald-800' : 'text-red-800'}`}>
                {stockAction === 'in' ? <PackagePlus size={22} /> : <PackageMinus size={22} />}
                {stockAction === 'in' ? 'รับเข้าสต็อก (ระบุ EXP)' : 'ตัดจ่ายสต็อก (เลือก EXP)'}
              </h2>
              <button onClick={() => setIsStockModalOpen(false)}><X size={24} className="text-gray-400" /></button>
            </div>

            <form onSubmit={handleUpdateStock} className="p-6 space-y-4">
              <div className="font-bold text-gray-800 mb-2 border-b pb-2">{medicine.name}</div>

              {stockAction === 'in' ? (
                <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-emerald-800 mb-1">วันหมดอายุ (EXP) *</label>
                    <input type="date" required className="w-full border rounded-lg p-2.5" value={stockExpDate} onChange={(e) => setStockExpDate(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-emerald-800 mb-1">ขนาดบรรจุ / กล่อง</label>
                      <input type="number" required min="1" className="w-full border rounded-lg p-2.5" value={stockPackSize} onChange={(e) => setStockPackSize(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-emerald-800 mb-1">หน่วยนับ</label>
                      <select className="w-full border rounded-lg p-2.5 bg-white" value={stockUnitName} onChange={(e) => setStockUnitName(e.target.value)}>
                        <option value="'s">'s (เม็ด)</option><option value="vial">vial</option><option value="amp">amp</option><option value="bottle">bottle</option><option value="box">box</option>
                      </select>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-red-50 p-3 rounded-lg border border-red-100">
                  <label className="block text-sm font-medium text-red-800 mb-1">เลือกล็อต EXP ที่ต้องการหักสต็อก *</label>
                  <select required className="w-full border rounded-lg p-3 bg-white font-medium" value={selectedLotId} onChange={(e) => setSelectedLotId(e.target.value)}>
                    <option value="">-- กรุณาเลือกล็อต --</option>
                    {(medicine.medicine_lots || []).filter((l: any) => l.current_stock > 0).map((lot: any) => (
                      <option key={lot.id} value={lot.id}>
                        EXP: {lot.exp_date} (เหลือ: {lot.current_stock} {lot.unit_name} | บรรจุ {lot.pack_size})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="mt-4">
                <div className="flex bg-gray-100 p-1 rounded-lg mb-3">
                  <button type="button" className={`flex-1 py-1.5 text-sm font-medium rounded ${inputMode === 'base' ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`} onClick={() => setInputMode('base')}>กรอกเป็นเม็ด/ชิ้น</button>
                  <button type="button" className={`flex-1 py-1.5 text-sm font-medium rounded ${inputMode === 'pack' ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`} onClick={() => setInputMode('pack')}>กรอกเป็นกล่อง/แพ็ค</button>
                </div>

                {inputMode === 'base' ? (
                  <div>
                    <label className="block text-sm font-medium mb-1">ระบุจำนวน (ชิ้นย่อย)</label>
                    <input type="number" required min="1" className="w-full border rounded-lg p-3 text-lg font-bold text-center" value={inputAmount} onChange={(e) => setInputAmount(e.target.value)} />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium mb-1">ระบุจำนวน (กล่อง/แพ็ค)</label>
                    <input type="number" step="0.1" required min="0.1" className="w-full border rounded-lg p-3 text-lg font-bold text-center" value={inputPackCount} onChange={(e) => setInputPackCount(e.target.value)} />
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      <Calculator size={12} className="inline mr-1" /> ระบบจะนำจำนวนที่กรอก ไปคูณกับขนาดบรรจุให้อัตโนมัติ
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsStockModalOpen(false)} className="flex-1 border p-3 rounded-lg font-medium">ยกเลิก</button>
                <button type="submit" className={`flex-1 text-white p-3 rounded-lg font-medium text-lg ${stockAction === 'in' ? 'bg-emerald-600' : 'bg-red-600'}`}>ยืนยัน</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}