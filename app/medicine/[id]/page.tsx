"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { PackageMinus, CalendarDays, CheckCircle2, User, AlertCircle, Info } from "lucide-react";

const formatBoxString = (totalItems: number, packSize: number, unitName: string) => {
  if (packSize <= 1 || totalItems === 0) return `${totalItems} ${unitName}`;
  const packs = Math.floor(totalItems / packSize);
  const rem = totalItems % packSize;
  if (packs === 0) return `${rem} ${unitName}`;
  return `${packs} กล่อง × ${packSize} ${unitName} ${rem > 0 ? `(เศษ ${rem} ${unitName})` : ''}`;
}

export default function VisitorMedicinePage({ params }: { params: { id: string } }) {
  const { id } = params;
  
  const [med, setMed] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Form states
  const [lotId, setLotId] = useState("");
  const [inputMode, setInputMode] = useState<'base' | 'pack'>('base');
  const [amount, setAmount] = useState("");
  const [packCount, setPackCount] = useState("");
  const [visitorName, setVisitorName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchMedicine();
  }, [id]);

  const fetchMedicine = async () => {
    try {
      const { data, error } = await supabase
        .from("medicines")
        .select(`*, medicine_lots (*)`)
        .eq("id", id)
        .single();
        
      if (error) throw error;
      if (!data) throw new Error("ไม่พบข้อมูลยาในระบบ");
      
      setMed(data);
      
      // Auto-select first available lot if exists
      const availableLots = (data.medicine_lots || []).filter((l: any) => l.current_stock > 0);
      if (availableLots.length > 0) {
        // Sort by EXP date (closest first)
        availableLots.sort((a: any, b: any) => new Date(a.exp_date).getTime() - new Date(b.exp_date).getTime());
        setLotId(availableLots[0].id.toString());
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lotId || !visitorName) return alert("กรุณากรอกข้อมูลให้ครบถ้วน");

    const lot = (med.medicine_lots || []).find((l: any) => l.id.toString() === lotId);
    if (!lot) return alert("ไม่พบข้อมูลล็อต");

    let totalItems = 0;
    if (inputMode === 'base') {
      totalItems = parseInt(amount);
      if (!totalItems || totalItems <= 0) return alert("กรุณาระบุจำนวนให้ถูกต้อง");
    } else {
      const packs = parseFloat(packCount);
      if (!packs || packs <= 0) return alert("กรุณาระบุจำนวนกล่องให้ถูกต้อง");
      totalItems = Math.round(packs * lot.pack_size);
    }

    if (totalItems > lot.current_stock) {
      return alert(`สต็อกในล็อตนี้ไม่เพียงพอ! (ต้องการเบิก ${totalItems} แต่มี ${lot.current_stock})`);
    }

    setIsSubmitting(true);
    try {
      // 1. หักสต็อกออกจากล็อต
      const { error: lotError } = await supabase
        .from("medicine_lots")
        .update({ current_stock: lot.current_stock - totalItems })
        .eq("id", lot.id);
      if (lotError) throw lotError;

      // 2. บันทึกประวัติการเบิกจ่าย (สถานะ 'visitor_note' เพื่อให้ไปแจ้งเตือน Admin)
      const { error: txError } = await supabase
        .from("stock_transactions")
        .insert([{
          medicine_id: String(med.id),
          lot_id: String(lot.id),
          exp_date: lot.exp_date,
          action: 'out',
          amount: totalItems,
          staff_name: visitorName,
          status: 'visitor_note'
        }]);
      if (txError) throw txError;

      setSuccess(true);
    } catch (err: any) {
      alert("บันทึกข้อมูลไม่สำเร็จ: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center font-bold text-slate-500">กำลังโหลดข้อมูล...</div>;
  }

  if (error || !med) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 max-w-sm w-full">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">ไม่พบข้อมูลยา</h2>
          <p className="text-sm text-slate-500">{error || "ยานี้อาจถูกลบออกจากระบบแล้ว"}</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center p-6 text-center">
        <div className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-xl border border-white max-w-sm w-full">
          <CheckCircle2 size={64} className="text-emerald-500 mx-auto mb-5" />
          <h2 className="text-2xl font-bold text-emerald-800 mb-2">บันทึกสำเร็จ!</h2>
          <p className="text-sm font-medium text-emerald-600 mb-6">ระบบได้บันทึกการเบิกยาของคุณและแจ้งเตือนไปยังเจ้าหน้าที่คลังยาเรียบร้อยแล้ว</p>
          <button 
            onClick={() => window.location.reload()} 
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 rounded-xl shadow-md transition-colors"
          >
            เบิกยาเพิ่มเติม
          </button>
        </div>
      </div>
    );
  }

  const activeLots = (med.medicine_lots || []).filter((l: any) => l.current_stock > 0).sort((a: any, b: any) => new Date(a.exp_date).getTime() - new Date(b.exp_date).getTime());

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#e0eaf5] via-[#f0f4f8] to-[#e8ebf2] p-4 md:p-8 font-sans flex items-center justify-center">
      <div className="max-w-md w-full bg-white/80 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-white overflow-hidden">
        
        {/* Header */}
        <div className="bg-blue-600 p-6 text-center">
          <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
            <PackageMinus size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight leading-tight mb-1">บันทึกการเบิกยา</h1>
          <p className="text-blue-100 text-sm font-medium">สำหรับผู้มาเยือน / เบิกใช้งานด่วน</p>
        </div>

        <div className="p-6 md:p-8">
          <div className="mb-6 bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-sm text-center">
            <h2 className="text-xl font-extrabold text-slate-800 leading-tight">{med.name}</h2>
            <div className="text-sm text-slate-500 font-medium mt-1">รหัส: {med.hosxp_icode || "-"}</div>
            {med.note && (
              <div className="mt-2 text-xs text-amber-700 bg-amber-100/50 px-3 py-1.5 rounded-lg inline-block border border-amber-200/50 flex items-center gap-1.5 mx-auto w-fit">
                <Info size={14} /> {med.note}
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* เลือกล็อต */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">1. เลือกล็อตที่เบิกออก (EXP) *</label>
              {activeLots.length === 0 ? (
                <div className="text-sm font-bold text-red-500 bg-red-50 p-4 rounded-xl border border-red-200 text-center shadow-sm">
                  ไม่มียาในสต็อก (หมดชั่วคราว)
                </div>
              ) : (
                <select 
                  required 
                  className="w-full bg-white border border-slate-300 rounded-xl p-3.5 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                  value={lotId} 
                  onChange={(e) => setLotId(e.target.value)}
                >
                  <option value="">-- กรุณาเลือกล็อต --</option>
                  {activeLots.map((lot: any) => {
                    const packs = Math.floor(lot.current_stock / lot.pack_size);
                    const rem = lot.current_stock % lot.pack_size;
                    const unitStr = lot.unit_name === "'s" ? "'" : ` ${lot.unit_name}`;
                    return (
                      <option key={lot.id} value={lot.id}>
                        EXP: {lot.exp_date} (เหลือ {packs} กล่อง × {lot.pack_size}{unitStr} {rem > 0 ? `+ เศษ ${rem}` : ''})
                      </option>
                    )
                  })}
                </select>
              )}
            </div>

            {/* ใส่จำนวน */}
            {activeLots.length > 0 && (
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">2. ระบุจำนวนที่เบิก *</label>
                <div className="flex bg-slate-100 p-1.5 rounded-xl mb-3 shadow-inner">
                  <button 
                    type="button" 
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${inputMode === 'base' ? 'bg-white shadow-sm text-blue-700 border border-slate-200' : 'text-slate-500 hover:bg-slate-200'}`} 
                    onClick={() => setInputMode('base')}
                  >
                    ระบุเป็นเม็ด/ชิ้น
                  </button>
                  <button 
                    type="button" 
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${inputMode === 'pack' ? 'bg-white shadow-sm text-blue-700 border border-slate-200' : 'text-slate-500 hover:bg-slate-200'}`} 
                    onClick={() => setInputMode('pack')}
                  >
                    ระบุเป็นกล่อง
                  </button>
                </div>
                
                {inputMode === 'base' ? (
                  <input 
                    type="number" 
                    required min="1" 
                    placeholder="ใส่จำนวน (ชิ้นย่อย)" 
                    className="w-full bg-white border border-slate-300 rounded-xl p-4 text-lg font-extrabold text-center outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                    value={amount} 
                    onChange={(e) => setAmount(e.target.value)} 
                  />
                ) : (
                  <input 
                    type="number" 
                    step="0.1" required min="0.1" 
                    placeholder="ใส่จำนวน (กล่อง/แพ็ค)" 
                    className="w-full bg-white border border-slate-300 rounded-xl p-4 text-lg font-extrabold text-center outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                    value={packCount} 
                    onChange={(e) => setPackCount(e.target.value)} 
                  />
                )}
              </div>
            )}

            {/* ชื่อผู้เบิก */}
            {activeLots.length > 0 && (
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">3. ชื่อผู้รับยา/ผู้เบิก *</label>
                <div className="relative">
                  <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    required 
                    placeholder="เช่น ศิริรัตน์ (ยืมวอร์ด), แลกยา" 
                    className="w-full bg-white border border-slate-300 rounded-xl pl-11 pr-4 py-3.5 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                    value={visitorName} 
                    onChange={(e) => setVisitorName(e.target.value)} 
                  />
                </div>
              </div>
            )}

            {/* Submit */}
            <div className="pt-4">
              <button 
                type="submit" 
                disabled={isSubmitting || activeLots.length === 0} 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg p-4 rounded-xl shadow-lg shadow-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? "กำลังบันทึกข้อมูล..." : "ยืนยันการเบิกยา"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}