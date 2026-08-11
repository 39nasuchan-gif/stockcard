'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { PackagePlus, PackageMinus, CalendarDays, Calculator, X, History, User, TrendingDown, CalendarRange } from 'lucide-react';

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

  // States สำหรับเปิด Modal ดูประวัติ
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyRows, setHistoryRows] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // States สำหรับคำนวณการใช้ยา
  const [outHistory, setOutHistory] = useState<any[]>([]);
  const [periodMode, setPeriodMode] = useState<'1m' | '2m' | '3m' | 'custom'>('1m');
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchMedicine = async () => {
    // ดึงข้อมูลยาหลัก และล็อต
    const { data: medData } = await supabase
      .from('medicines')
      .select('*, medicine_lots (*)')
      .eq('id', id)
      .single();
      
    if (medData) setMedicine(medData);

    // ดึงประวัติการตัดจ่ายทั้งหมดของยานี้มาเพื่อใช้คำนวณ
    const { data: outData } = await supabase
      .from('stock_transactions')
      .select('*')
      .eq('medicine_id', String(id))
      .eq('action', 'out');
      
    if (outData) setOutHistory(outData);
    setLoading(false);
  };

  useEffect(() => {
    fetchMedicine();
  }, [id]);

  // จัดการตั้งคาวันที่อัตโนมัติ
  useEffect(() => {
    if (periodMode !== 'custom') {
      const end = new Date();
      const start = new Date();
      if (periodMode === '1m') start.setMonth(start.getMonth() - 1);
      if (periodMode === '2m') start.setMonth(start.getMonth() - 2);
      if (periodMode === '3m') start.setMonth(start.getMonth() - 3);

      setEndDate(end.toISOString().split('T')[0]);
      setStartDate(start.toISOString().split('T')[0]);
    }
  }, [periodMode]);

  // ฟังก์ชันคำนวณอัตราการใช้ยา
  const stats = useMemo(() => {
    if (!startDate || !endDate) return { totalUsage: 0, recommend1W: 0, recommend2W: 0, daysDiff: 0, dailyRate: 0 };
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    let daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff < 1) daysDiff = 1;

    const filteredOut = outHistory.filter(tx => {
      const txDate = new Date(tx.created_at);
      return txDate >= start && txDate <= end;
    });

    const totalUsage = filteredOut.reduce((sum, tx) => sum + tx.amount, 0);
    const dailyRate = totalUsage / daysDiff;

    const week1Need = dailyRate * 7;
    const week2Need = dailyRate * 14;

    const recommend1W = Math.ceil(week1Need * 1.15);
    const recommend2W = Math.ceil(week2Need * 1.15);

    return { totalUsage, recommend1W, recommend2W, daysDiff, dailyRate };
  }, [startDate, endDate, outHistory]);

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

  const openHistoryModal = async () => {
    setIsHistoryModalOpen(true);
    setHistoryLoading(true);
    try {
      const { data, error } = await supabase
        .from("stock_transactions")
        .select("*")
        .eq("medicine_id", String(id))
        .order("created_at", { ascending: false });
      if (error) throw error;
      setHistoryRows(data || []);
    } catch (error) {
      console.error("Error fetching stock history:", error);
      setHistoryRows([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const formatHistoryDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString("th-TH", {
        day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
      });
    } catch {
      return iso;
    }
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
      fetchMedicine(); 
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
    
  // ดึงหน่วยนับและขนาดบรรจุหลักมาใช้คำนวณ
  const mainPackSize = activeLots.length > 0 ? activeLots[0].pack_size : (medicine.medicine_lots?.[0]?.pack_size || 100);
  const mainUnit = activeLots.length > 0 ? activeLots[0].unit_name : (medicine.medicine_lots?.[0]?.unit_name || 'หน่วย');

  // ฟังก์ชันแปลงจำนวนชิ้นเป็นกล่อง/แพ็ค
  const formatToPack = (total: number) => {
    if (mainPackSize <= 1 || total === 0) return null;
    const packs = Math.floor(total / mainPackSize);
    const remainder = total % mainPackSize;
    
    if (packs === 0) return null; // ไม่ถึง 1 กล่อง ไม่ต้องแสดง
    
    let text = `≈ ${packs} กล่อง`;
    if (remainder > 0) text += ` ${remainder} ${mainUnit}`;
    return text;
  };

  return (
    <div className="p-6 max-w-xl mx-auto mt-6 mb-10 bg-white rounded-2xl shadow-md border border-gray-100">
      <button onClick={() => router.push('/')} className="mb-4 text-blue-600 hover:underline text-sm font-medium">
        &larr; กลับหน้าหลักคลังยา
      </button>
      
      <h1 
        onClick={openHistoryModal}
        className="text-3xl font-bold text-gray-800 mb-1 cursor-pointer hover:text-blue-600 hover:underline w-fit"
        title="คลิกเพื่อดูประวัติ"
      >
        {medicine.name} 📜
      </h1>
      <p className="text-sm text-gray-500 mb-6">บาร์โค้ด: {medicine.barcode || '-'}</p>

      {/* ส่วนสถิติการใช้ยาและการคำนวณ */}
      <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 mb-6">
        <h2 className="text-sm font-bold text-blue-900 mb-3 flex items-center gap-1.5">
          <TrendingDown size={18} /> สถิติการใช้ยา & วางแผนสั่งซื้อ
        </h2>
        
        <div className="flex flex-wrap gap-2 mb-3">
          <button onClick={() => setPeriodMode('1m')} className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${periodMode === '1m' ? 'bg-blue-600 text-white' : 'bg-white border text-gray-600'}`}>1 เดือน</button>
          <button onClick={() => setPeriodMode('2m')} className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${periodMode === '2m' ? 'bg-blue-600 text-white' : 'bg-white border text-gray-600'}`}>2 เดือน</button>
          <button onClick={() => setPeriodMode('3m')} className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${periodMode === '3m' ? 'bg-blue-600 text-white' : 'bg-white border text-gray-600'}`}>3 เดือน</button>
          <button onClick={() => setPeriodMode('custom')} className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${periodMode === 'custom' ? 'bg-blue-600 text-white' : 'bg-white border text-gray-600'}`}>กำหนดเอง</button>
        </div>

        {periodMode === 'custom' && (
          <div className="flex items-center gap-2 mb-4 bg-white p-2 rounded-lg border border-blue-100">
            <CalendarRange size={16} className="text-blue-500" />
            <input type="date" className="text-sm bg-transparent outline-none w-full text-gray-700" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <span className="text-gray-400">-</span>
            <input type="date" className="text-sm bg-transparent outline-none w-full text-gray-700" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        )}

        <div className="bg-white rounded-lg p-3 border border-blue-100 space-y-3">
          <div className="flex justify-between items-center border-b border-gray-50 pb-3">
            <span className="text-sm text-gray-500 font-medium">ยอดใช้รวม ({stats.daysDiff} วัน)</span>
            <div className="text-right">
              <div className="font-bold text-gray-800 text-xl">{stats.totalUsage} <span className="text-sm font-normal text-gray-500">{mainUnit}</span></div>
              {formatToPack(stats.totalUsage) && <div className="text-[11px] font-medium text-blue-600 mt-0.5">{formatToPack(stats.totalUsage)}</div>}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="bg-amber-50 rounded-lg p-3">
              <div className="text-xs text-amber-700 font-bold mb-1">ควรมี 1 สัปดาห์</div>
              <div className="text-base font-bold text-amber-900">{stats.recommend1W} <span className="text-[10px] font-normal">{mainUnit}</span></div>
              {formatToPack(stats.recommend1W) && <div className="text-[10px] font-medium text-amber-700 mt-0.5">{formatToPack(stats.recommend1W)}</div>}
              <div className="text-[9px] text-amber-600/80 mt-1.5">+ เผื่อ 15% แล้ว</div>
            </div>
            
            <div className="bg-emerald-50 rounded-lg p-3">
              <div className="text-xs text-emerald-700 font-bold mb-1">ควรมี 2 สัปดาห์</div>
              <div className="text-base font-bold text-emerald-900">{stats.recommend2W} <span className="text-[10px] font-normal">{mainUnit}</span></div>
              {formatToPack(stats.recommend2W) && <div className="text-[10px] font-medium text-emerald-700 mt-0.5">{formatToPack(stats.recommend2W)}</div>}
              <div className="text-[9px] text-emerald-600/80 mt-1.5">+ เผื่อ 15% แล้ว</div>
            </div>
          </div>
        </div>
      </div>

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
        <button onClick={() => openStockModal('in')} className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-sm">
          <PackagePlus size={18} /> รับเข้า
        </button>
        <button onClick={() => openStockModal('out')} className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition-colors shadow-sm">
          <PackageMinus size={18} /> ตัดจ่าย
        </button>
      </div>

      {/* Modal รับเข้า/ตัดจ่าย */}
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

      {/* Modal ประวัติรับเข้า/ตัดจ่าย */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-lg overflow-hidden max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b bg-gray-50">
              <h2 className="text-lg font-bold flex items-center gap-2 text-gray-800">
                <History size={20} className="text-gray-500" /> ประวัติ: {medicine.name}
              </h2>
              <button onClick={() => setIsHistoryModalOpen(false)}>
                <X size={24} className="text-gray-400" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-2">
              {historyLoading ? (
                <div className="text-center text-gray-500 py-8">กำลังโหลด...</div>
              ) : historyRows.length === 0 ? (
                <div className="text-center text-gray-500 py-8">ยังไม่มีประวัติการรับเข้า/ตัดจ่าย</div>
              ) : (
                historyRows.map((row: any) => (
                  <div key={row.id} className="flex items-start justify-between border border-gray-100 rounded-lg p-3">
                    <div className="flex items-start gap-3">
                      {row.action === 'in' ? (
                        <PackagePlus size={18} className="text-emerald-600 mt-0.5" />
                      ) : (
                        <PackageMinus size={18} className="text-red-600 mt-0.5" />
                      )}
                      <div>
                        <div className={`text-sm font-bold ${row.action === 'in' ? 'text-emerald-700' : 'text-red-700'}`}>
                          {row.action === 'in' ? 'รับเข้า' : 'ตัดจ่าย'} {row.amount} หน่วย
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                          <CalendarDays size={11} /> EXP ล็อต: {row.exp_date || "-"}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">{formatHistoryDate(row.created_at)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-full shrink-0">
                      <User size={12} /> {row.staff_name}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}