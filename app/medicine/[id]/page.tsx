"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  PackagePlus, PackageMinus, X, Calculator, CalendarDays,
  User, Users, Lock, ArrowLeft, History
} from "lucide-react";

const STAFF_LIST = [
  "ศรีไพร", "จุฬารัตน์", "วิภาวรรณ", "ณัฏฐริกา", "ณัฐพร",
  "นทีทิพย์", "วรรณอาษา", "จุฑาภรณ์", "วีรากานต์", "มีนนรี",
];
const CENTRAL_ACCOUNT_NAME = "บัญชีส่วนกลาง";
const SESSION_KEY = "stockcard_session_v1";

type Session = { id: string; name: string; isCentral: boolean };

async function sha256Hex(text: string) {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Helper สีพาสเทลสำหรับตู้ยาให้เหมือนหน้าหลัก
const getCategoryColor = (id: string | number) => {
  const colors = [
    "bg-pink-100 text-pink-700 border-pink-200",
    "bg-purple-100 text-purple-700 border-purple-200",
    "bg-blue-100 text-blue-700 border-blue-200",
    "bg-emerald-100 text-emerald-700 border-emerald-200",
    "bg-amber-100 text-amber-700 border-amber-200",
    "bg-rose-100 text-rose-700 border-rose-200",
    "bg-cyan-100 text-cyan-700 border-cyan-200",
    "bg-indigo-100 text-indigo-700 border-indigo-200",
  ];
  const numId = typeof id === "number" ? id : parseInt(id as string) || 0;
  return colors[numId % colors.length];
};

// --- Login Screen สำหรับหน้าสแกนมือถือ (ดีไซน์ Glassmorphism) ---
function LoginScreen({ onLogin }: { onLogin: (s: Session) => void }) {
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [staffRow, setStaffRow] = useState<any>(null);
  const [loadingRow, setLoadingRow] = useState(false);
  const [mode, setMode] = useState<"password" | "setPassword">("password");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [centralBusy, setCentralBusy] = useState(false);

  const openStaffLogin = async (name: string) => {
    setSelectedName(name);
    setError("");
    setPassword("");
    setPassword2("");
    setLoadingRow(true);
    try {
      let { data, error } = await supabase.from("staff_accounts").select("*").eq("name", name).maybeSingle();
      if (error) throw error;
      if (!data) {
        const { data: inserted, error: insErr } = await supabase.from("staff_accounts").insert([{ name, is_central: false }]).select().single();
        if (insErr) throw insErr;
        data = inserted;
      }
      setStaffRow(data);
      setMode(data.password_hash ? "password" : "setPassword");
    } catch (e: any) {
      setError("โหลดข้อมูลผู้ใช้ไม่สำเร็จ: " + e.message);
    } finally {
      setLoadingRow(false);
    }
  };

  const handleCentralLogin = async () => {
    setCentralBusy(true);
    try {
      let { data, error } = await supabase.from("staff_accounts").select("*").eq("name", CENTRAL_ACCOUNT_NAME).maybeSingle();
      if (error) throw error;
      if (!data) {
        const { data: inserted, error: insErr } = await supabase.from("staff_accounts").insert([{ name: CENTRAL_ACCOUNT_NAME, is_central: true }]).select().single();
        if (insErr) throw insErr;
        data = inserted;
      }
      const session: Session = { id: data.id, name: data.name, isCentral: true };
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      onLogin(session);
    } catch (e: any) {
      alert("เข้าสู่ระบบไม่สำเร็จ: " + e.message);
    } finally {
      setCentralBusy(false);
    }
  };

  const handleSubmitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffRow) return;
    setError("");

    if (mode === "setPassword") {
      if (password.length < 4) return setError("รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร");
      if (password !== password2) return setError("รหัสผ่านทั้งสองช่องไม่ตรงกัน");
    }

    setBusy(true);
    try {
      const hash = await sha256Hex(password);
      if (mode === "setPassword") {
        const { data, error } = await supabase.from("staff_accounts").update({ password_hash: hash }).eq("id", staffRow.id).select().single();
        if (error) throw error;
        const session: Session = { id: data.id, name: data.name, isCentral: false };
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        onLogin(session);
      } else {
        if (hash !== staffRow.password_hash) {
          setBusy(false);
          return setError("รหัสผ่านไม่ถูกต้อง");
        }
        const session: Session = { id: staffRow.id, name: staffRow.name, isCentral: false };
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        onLogin(session);
      }
    } catch (e: any) {
      setError("เกิดข้อผิดพลาด: " + e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight">ระบบคลังยา</h1>
          <p className="text-gray-500 mt-2">เพื่อจัดการสต็อกยาผ่านมือถือ</p>
        </div>
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-lg border border-white/50 p-4 mb-4">
          <div className="grid grid-cols-2 gap-2">
            {STAFF_LIST.map((name) => (
              <button key={name} onClick={() => openStaffLogin(name)} className="flex items-center gap-2 justify-center bg-white/50 border border-gray-200 rounded-xl p-3 font-medium text-gray-700 hover:border-blue-400 hover:bg-blue-50/80 transition-all shadow-sm text-sm">
                <User size={14} className="text-blue-500" /> {name}
              </button>
            ))}
          </div>
        </div>
        <button onClick={handleCentralLogin} disabled={centralBusy} className="w-full flex items-center justify-center gap-2 bg-gray-800/90 hover:bg-gray-900 backdrop-blur-md text-white p-4 rounded-2xl font-medium transition-all shadow-lg">
          <Users size={18} /> {centralBusy ? "กำลังเข้าสู่ระบบ..." : `เข้าสู่ระบบด้วย${CENTRAL_ACCOUNT_NAME}`}
        </button>

        {selectedName && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-white">
              <div className="flex justify-between items-center p-5 border-b bg-blue-50/50 border-blue-100">
                <h2 className="text-lg font-bold flex items-center gap-2 text-blue-900"><Lock size={18} /> {selectedName}</h2>
                <button onClick={() => setSelectedName(null)} className="p-1 hover:bg-black/5 rounded-full transition-colors"><X size={22} className="text-gray-400" /></button>
              </div>
              {loadingRow ? (
                <div className="p-8 text-center text-gray-500">กำลังโหลด...</div>
              ) : (
                <form onSubmit={handleSubmitPassword} className="p-6 space-y-4">
                  {mode === "setPassword" && <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-xl p-3">ยังไม่เคยตั้งรหัสผ่าน กรุณาตั้งรหัสใหม่</p>}
                  <div>
                    <label className="block text-sm font-medium mb-1.5 text-gray-700">รหัสผ่าน</label>
                    <input type="password" required autoFocus className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 bg-white/50" value={password} onChange={(e) => setPassword(e.target.value)} />
                  </div>
                  {mode === "setPassword" && (
                    <div>
                      <label className="block text-sm font-medium mb-1.5 text-gray-700">ยืนยันรหัสผ่าน</label>
                      <input type="password" required className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 bg-white/50" value={password2} onChange={(e) => setPassword2(e.target.value)} />
                    </div>
                  )}
                  {error && <p className="text-red-600 text-sm font-medium">{error}</p>}
                  <button type="submit" disabled={busy} className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3.5 rounded-xl font-medium disabled:opacity-60 transition-colors shadow-md mt-2">
                    {busy ? "กำลังตรวจสอบ..." : "เข้าสู่ระบบ"}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- หน้าจอหลักจัดการยา 1 ตัว (Mobile View) ---
function MedicineDetailApp({ session, id }: { session: Session; id: string }) {
  const router = useRouter();
  const [medicine, setMedicine] = useState<any>(null);
  const [historyRows, setHistoryRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [stockAction, setStockAction] = useState<'in' | 'out'>('in');
  const [stockInMode, setStockInMode] = useState<'existing' | 'new'>('existing');
  const [stockExpDate, setStockExpDate] = useState("");
  const [stockPackSize, setStockPackSize] = useState("100");
  const [stockUnitName, setStockUnitName] = useState("'s");
  const [selectedLotId, setSelectedLotId] = useState("");
  const [inputMode, setInputMode] = useState<'base' | 'pack'>('base');
  const [inputAmount, setInputAmount] = useState("");
  const [inputPackCount, setInputPackCount] = useState("");
  
  // เพิ่ม state สำหรับรับเข้าล่วงหน้า
  const [receiveDate, setReceiveDate] = useState(new Date().toISOString().split('T')[0]);

  const processPendingTransactions = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data: pendings, error: fetchErr } = await supabase.from('stock_transactions')
        .select('*')
        .eq('action', 'pending_in')
        .eq('medicine_id', id)
        .lte('pending_date', today);
      
      if (fetchErr) throw fetchErr;

      if (pendings && pendings.length > 0) {
        for (const tx of pendings) {
           const { data: lot } = await supabase.from('medicine_lots').select('current_stock').eq('id', tx.lot_id).single();
           if (lot) {
              await supabase.from('medicine_lots').update({ current_stock: lot.current_stock + tx.amount }).eq('id', tx.lot_id);
              await supabase.from('stock_transactions').update({ action: 'in' }).eq('id', tx.id);
           }
        }
      }
    } catch (e) {
      console.error("Error processing pending stock:", e);
    }
  };

  const fetchData = async () => {
    try {
      await processPendingTransactions();

      // ดึงข้อมูลยาและล็อต
      const { data: medData, error: medError } = await supabase
        .from("medicines")
        .select(`*, medicine_lots (*)`)
        .eq("id", id)
        .single();
      if (medError) throw medError;
      setMedicine(medData);

      // ดึงประวัติ
      const { data: histData, error: histError } = await supabase
        .from("stock_transactions")
        .select("*")
        .eq("medicine_id", id)
        .in("action", ["in", "out", "pending_in"])
        .order("created_at", { ascending: false });
      if (histError) throw histError;
      setHistoryRows(histData || []);

    } catch (e) {
      console.error("Error fetching data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchData();
  }, [id]);

  const openStockModal = (action: 'in' | 'out') => {
    if(medicine?.is_active === false) return; // ถ้าโดนปิด ห้ามทำรายการ

    setStockAction(action);
    setInputMode('base');
    setInputAmount(""); setInputPackCount(""); setStockExpDate(""); setSelectedLotId("");
    setReceiveDate(new Date().toISOString().split('T')[0]);

    if (action === 'in') {
      if (medicine.medicine_lots && medicine.medicine_lots.length > 0) {
        setStockInMode('existing');
        const firstLot = medicine.medicine_lots[0];
        setSelectedLotId(firstLot.id.toString());
        setStockPackSize(firstLot.pack_size.toString());
        setStockUnitName(firstLot.unit_name);
      } else {
        setStockInMode('new');
        setStockPackSize("100"); setStockUnitName("'s");
      }
    } else {
      if (medicine.medicine_lots && medicine.medicine_lots.length > 0) {
        const firstLot = medicine.medicine_lots[0];
        setStockPackSize(firstLot.pack_size.toString());
        setStockUnitName(firstLot.unit_name);
      } else {
        setStockPackSize("100"); setStockUnitName("'s");
      }
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
      const size = (stockAction === 'out' || stockInMode === 'existing')
        ? (medicine.medicine_lots || []).find((l: any) => l.id.toString() === selectedLotId)?.pack_size
        : parseInt(stockPackSize);

      if (!packs || packs <= 0 || !size || size <= 0) return alert("กรุณาระบุข้อมูลให้ครบถ้วน");
      totalItems = Math.round(packs * size);
    }

    try {
      if (stockAction === 'in') {
        const today = new Date().toISOString().split('T')[0];
        const isFuture = new Date(receiveDate) > new Date(today);
        const actualAction = isFuture ? 'pending_in' : 'in';

        if (stockInMode === 'existing') {
          if (!selectedLotId) return alert("กรุณาเลือกล็อตที่มีอยู่");
          const existingLot = (medicine.medicine_lots || []).find((l: any) => String(l.id) === String(selectedLotId));
          if (!existingLot) return alert("ไม่พบข้อมูลล็อตในระบบ");

          if (!isFuture) {
             const { error } = await supabase.from("medicine_lots").update({ current_stock: existingLot.current_stock + totalItems }).eq("id", existingLot.id);
             if (error) throw error;
          }
          await supabase.from("stock_transactions").insert([{ medicine_id: id, lot_id: existingLot.id, exp_date: existingLot.exp_date, action: actualAction, amount: totalItems, staff_name: session.name, pending_date: isFuture ? receiveDate : null }]);
        } else {
          if (!stockExpDate) return alert("กรุณาระบุวันหมดอายุ (EXP)");
          const existingLot = (medicine.medicine_lots || []).find(
            (l: any) => l.exp_date === stockExpDate && l.pack_size === parseInt(stockPackSize) && l.unit_name === stockUnitName
          );

          if (existingLot) {
            if (!isFuture) {
               const { error } = await supabase.from("medicine_lots").update({ current_stock: existingLot.current_stock + totalItems }).eq("id", existingLot.id);
               if (error) throw error;
            }
            await supabase.from("stock_transactions").insert([{ medicine_id: id, lot_id: existingLot.id, exp_date: existingLot.exp_date, action: actualAction, amount: totalItems, staff_name: session.name, pending_date: isFuture ? receiveDate : null }]);
          } else {
            const initialStock = isFuture ? 0 : totalItems;
            const { data: newLot, error } = await supabase.from("medicine_lots").insert([{ medicine_id: id, exp_date: stockExpDate, pack_size: parseInt(stockPackSize), unit_name: stockUnitName, current_stock: initialStock }]).select().single();
            if (error) throw error;
            await supabase.from("stock_transactions").insert([{ medicine_id: id, lot_id: newLot.id, exp_date: newLot.exp_date, action: actualAction, amount: totalItems, staff_name: session.name, pending_date: isFuture ? receiveDate : null }]);
          }
        }
      } else {
        if (!selectedLotId) return alert("กรุณาเลือกล็อตที่ต้องการตัดจ่าย");
        const lotToDeduct = (medicine.medicine_lots || []).find((l: any) => l.id.toString() === selectedLotId);

        if (!lotToDeduct) return alert("ไม่พบข้อมูลล็อต");
        if (totalItems > lotToDeduct.current_stock) return alert(`สต็อกในล็อตนี้ไม่พอ! ต้องการเบิก ${totalItems} แต่มีแค่ ${lotToDeduct.current_stock}`);
        
        const { error } = await supabase.from("medicine_lots").update({ current_stock: lotToDeduct.current_stock - totalItems }).eq("id", lotToDeduct.id);
        if (error) throw error;
        await supabase.from("stock_transactions").insert([{ medicine_id: id, lot_id: lotToDeduct.id, exp_date: lotToDeduct.exp_date, action: 'out', amount: totalItems, staff_name: session.name }]);
      }

      setIsStockModalOpen(false);
      fetchData(); // Refresh data
    } catch (error: any) {
      alert("อัปเดตสต็อกไม่สำเร็จ: " + error.message);
    }
  };

  const formatHistoryDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString("th-TH", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch { return iso; }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500 font-medium">กำลังโหลดข้อมูล...</div>;
  if (!medicine) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500 font-medium">ไม่พบข้อมูลยา</div>;

  const isZero = (!medicine.medicine_lots || medicine.medicine_lots.filter((l: any) => l.current_stock > 0).length === 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex flex-col w-full">
      {/* Top Navbar */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50 flex justify-between items-center p-4 sticky top-0 z-10 shadow-sm">
        <button onClick={() => router.push("/")} className="flex items-center text-sm font-bold text-gray-600 hover:text-gray-900 bg-white border border-gray-200 px-3 py-1.5 rounded-lg shadow-sm transition-colors">
          <ArrowLeft size={16} className="mr-1.5"/> กลับหน้ารวม
        </button>
        <div className="flex items-center gap-1.5 text-xs font-bold text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full shadow-inner">
          <User size={14} /> {session.name}
        </div>
      </div>

      <div className="p-4 md:p-6 max-w-3xl mx-auto w-full space-y-4 pb-20">
        {/* Main Med Info Card */}
        <div className={`bg-white/90 backdrop-blur-xl rounded-3xl p-5 md:p-7 shadow-lg border border-white ${medicine.is_active === false ? 'opacity-80 grayscale-[30%]' : ''}`}>
          <div className="text-center mb-6">
            {medicine.is_active === false && <div className="inline-block bg-red-100 text-red-700 font-bold px-3 py-1 rounded-lg text-sm mb-3">คลังเป็น 0 (ปิดการเบิกจ่าย)</div>}
            <h1 className="text-2xl md:text-3xl font-black text-gray-800 tracking-tight">{medicine.name}</h1>
            <div className="flex justify-center gap-2 mt-3 flex-wrap">
              <span className="px-3.5 py-1.5 bg-gray-50 border border-gray-200 rounded-full text-xs font-semibold text-gray-600 shadow-sm">รหัส: {medicine.hosxp_icode || "-"}</span>
              {medicine.note && <span className="px-3.5 py-1.5 bg-amber-50 border border-amber-100 rounded-full text-xs font-semibold text-amber-700 shadow-sm">หมายเหตุ: {medicine.note}</span>}
              <span className={`px-3.5 py-1.5 rounded-full text-xs font-bold shadow-sm ${getCategoryColor(medicine.cabinet_category)}`}>ตู้ยา: {medicine.cabinet_category}</span>
            </div>
          </div>

          {/* Stock Lots */}
          <div className="mb-6 bg-gradient-to-br from-gray-50 to-white rounded-2xl p-5 border border-gray-100 shadow-inner">
            <h3 className="text-sm font-black flex items-center gap-2 mb-4 text-gray-700">
              <CalendarDays size={18} className="text-blue-500" /> สต็อกคงเหลือแบ่งตาม EXP
            </h3>
            <div className="flex flex-wrap gap-3">
              {isZero ? (
                <div className="text-sm text-red-500 font-bold bg-red-50 px-4 py-2 rounded-xl border border-red-100 shadow-sm">สต็อกหมด</div>
              ) : (
                medicine.medicine_lots
                  .filter((l: any) => l.current_stock > 0)
                  .sort((a: any, b: any) => new Date(a.exp_date).getTime() - new Date(b.exp_date).getTime())
                  .map((lot: any) => {
                    const packs = Math.floor(lot.current_stock / lot.pack_size);
                    const remainder = lot.current_stock % lot.pack_size;
                    return (
                      <div key={lot.id} className="bg-white border border-gray-200 rounded-2xl p-3.5 shadow-sm min-w-[160px] hover:shadow-md transition-shadow">
                        <div className="text-[11px] md:text-xs font-bold text-rose-600 mb-2 border-b border-gray-50 pb-1.5">EXP: {lot.exp_date}</div>
                        <div className="flex items-baseline gap-1.5 text-lg">
                          <span className="font-black text-emerald-700">{packs}</span>
                          <span className="text-gray-400 text-sm font-semibold">x</span>
                          <span className="text-gray-700 text-base font-bold">{lot.pack_size}</span>
                          {remainder > 0 && <span className="text-amber-600 font-bold ml-1 text-xs">เศษ {remainder}</span>}
                          <span className="text-gray-500 text-xs ml-0.5 font-medium">{lot.unit_name}</span>
                        </div>
                        <div className="text-[10px] font-semibold text-gray-400 mt-1">รวม {lot.current_stock} หน่วย</div>
                      </div>
                    )
                  })
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <button onClick={() => openStockModal('in')} disabled={medicine.is_active === false} className="bg-gradient-to-b from-emerald-50 to-white text-emerald-700 hover:from-emerald-100 hover:to-emerald-50 border border-emerald-200 p-4 md:p-5 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all shadow-sm hover:shadow active:scale-95 disabled:opacity-50">
              <PackagePlus size={28} className="text-emerald-500" />
              <span className="font-black text-sm md:text-base">รับเข้าสต็อก</span>
            </button>
            <button onClick={() => openStockModal('out')} disabled={medicine.is_active === false} className="bg-gradient-to-b from-red-50 to-white text-red-700 hover:from-red-100 hover:to-red-50 border border-red-200 p-4 md:p-5 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all shadow-sm hover:shadow active:scale-95 disabled:opacity-50">
              <PackageMinus size={28} className="text-red-500" />
              <span className="font-black text-sm md:text-base">ตัดจ่ายสต็อก</span>
            </button>
          </div>
        </div>

        {/* History List Card */}
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-5 md:p-7 shadow-lg border border-white">
          <h3 className="text-sm font-black flex items-center gap-2 mb-5 text-gray-700 border-b border-gray-100 pb-3">
            <History size={18} className="text-blue-500" /> ประวัติการทำรายการล่าสุด
          </h3>
          <div className="space-y-3">
            {historyRows.length === 0 ? (
              <div className="text-center text-gray-500 font-medium py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">ยังไม่มีประวัติการรับเข้า/ตัดจ่าย</div>
            ) : (
              historyRows.map((row: any) => {
                const isPending = row.action === 'pending_in';
                const isInc = row.action === 'in' || isPending;
                const lotInfo = (medicine.medicine_lots || []).find((l: any) => l.id.toString() === row.lot_id?.toString());
                const pSize = lotInfo?.pack_size || 100;
                const pUnit = lotInfo?.unit_name || 'หน่วย';
                
                // รูปแบบใหม่ จำนวนกล่อง x ขนาดบรรจุ (ข้อ 1)
                const fPacks = Math.floor(row.amount / pSize);
                const fRem = row.amount % pSize;

                return (
                  <div key={row.id} className={`flex items-start justify-between border ${isPending ? 'border-amber-200 bg-amber-50/30' : 'border-gray-100 bg-white'} rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow`}>
                    <div className="flex items-start gap-3 md:gap-4">
                      <div className={`p-2.5 md:p-3 rounded-xl mt-0.5 shadow-sm ${isInc ? (isPending ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600') : 'bg-red-100 text-red-600'}`}>
                        {isPending ? <CalendarDays size={20} /> : (isInc ? <PackagePlus size={20} /> : <PackageMinus size={20} />)}
                      </div>
                      <div>
                        <div className={`text-sm md:text-base font-black ${isInc ? (isPending ? 'text-amber-700' : 'text-emerald-700') : 'text-red-700'}`}>
                          {isPending ? 'รอรับเข้า' : (isInc ? 'รับเข้า' : 'ตัดจ่าย')} {fPacks} กล่อง × {pSize} {fRem > 0 ? ` (+เศษ ${fRem})` : ''}
                        </div>
                        <div className="text-[11px] md:text-xs font-bold text-gray-500 mt-1">
                          (จำนวนรวมทั้งหมด: {row.amount} {pUnit})
                          {isPending && row.pending_date && <span className="ml-2 text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">เข้าวันที่ {row.pending_date}</span>}
                        </div>
                        <div className="text-[10px] md:text-[11px] font-semibold text-gray-500 flex items-center gap-1.5 mt-2">
                          <CalendarDays size={12} className="text-gray-400" /> EXP: {row.exp_date || "-"}
                        </div>
                        <div className="text-[9px] md:text-[10px] font-medium text-gray-400 mt-0.5">{formatHistoryDate(row.created_at)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] md:text-xs font-bold text-gray-600 bg-gray-100/80 px-2.5 py-1.5 rounded-lg shrink-0 shadow-inner">
                      <User size={12} /> {row.staff_name}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Modal รับเข้า/ตัดจ่าย */}
      {isStockModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-[70]">
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-white">
            <div className={`flex justify-between items-center p-5 md:p-6 border-b ${stockAction === 'in' ? 'bg-emerald-50/80 border-emerald-100' : 'bg-red-50/80 border-red-100'}`}>
              <h2 className={`text-lg font-bold flex items-center gap-2 ${stockAction === 'in' ? 'text-emerald-800' : 'text-red-800'}`}>
                {stockAction === 'in' ? <PackagePlus size={22} /> : <PackageMinus size={22} />}
                {stockAction === 'in' ? 'รับเข้าสต็อก' : 'ตัดจ่ายสต็อก (เลือก EXP)'}
              </h2>
              <button onClick={() => setIsStockModalOpen(false)} className="p-1 hover:bg-black/5 rounded-full transition-colors"><X size={24} className="text-gray-400" /></button>
            </div>

            <form onSubmit={handleUpdateStock} className="p-5 md:p-6 space-y-4">
              {stockAction === 'in' ? (
                <div className="bg-emerald-50/50 p-3.5 rounded-2xl border border-emerald-100 space-y-3 shadow-sm">
                  {/* ข้อ 7: รับเข้าล่วงหน้า */}
                  <div className="bg-white p-2.5 rounded-xl border border-emerald-200">
                    <label className="block text-sm font-bold text-emerald-800 mb-1.5">วันที่รับเข้า (สำหรับวางแผนล่วงหน้า)</label>
                    <input type="date" required className="w-full border-0 bg-emerald-50/50 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-emerald-900" value={receiveDate} onChange={(e) => setReceiveDate(e.target.value)} />
                    {receiveDate > new Date().toISOString().split('T')[0] && (
                        <div className="text-[11px] font-semibold text-amber-600 mt-1.5 flex items-center gap-1 bg-amber-50 p-1.5 rounded-md"><CalendarDays size={12}/> สถานะ: รอรับเข้าล่วงหน้า (ยังไม่บวกสต็อก)</div>
                    )}
                  </div>

                  <div className="flex gap-2 bg-white p-1 rounded-xl border border-emerald-200 shadow-sm">
                    <button type="button" onClick={() => setStockInMode('existing')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${stockInMode === 'existing' ? 'bg-emerald-100 text-emerald-800 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}>เลือกล็อตเดิม</button>
                    <button type="button" onClick={() => setStockInMode('new')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${stockInMode === 'new' ? 'bg-emerald-100 text-emerald-800 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}>+ เพิ่มล็อตใหม่</button>
                  </div>

                  {stockInMode === 'existing' ? (
                    <div>
                      <label className="block text-sm font-bold text-emerald-800 mb-1.5 mt-2">เลือกล็อต (EXP) *</label>
                      <select required className="w-full border border-emerald-200 rounded-xl p-3 bg-white font-semibold outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm" value={selectedLotId} onChange={(e) => {
                        setSelectedLotId(e.target.value);
                        const l = (medicine.medicine_lots || []).find((x: any) => String(x.id) === e.target.value);
                        if(l) { setStockPackSize(l.pack_size.toString()); setStockUnitName(l.unit_name); }
                      }}>
                        <option value="">-- กรุณาเลือกล็อต --</option>
                        {(medicine.medicine_lots || []).map((lot: any) => {
                          const packs = Math.floor(lot.current_stock / lot.pack_size);
                          const remainder = lot.current_stock % lot.pack_size;
                          const unitString = lot.unit_name === "'s" ? "'" : ` ${lot.unit_name}`;
                          const remainderText = remainder > 0 ? ` เศษ ${remainder}` : "";
                          return (
                            <option key={lot.id} value={lot.id}>
                              EXP: {lot.exp_date} (เหลือ: {packs}x{lot.pack_size}{unitString}{remainderText})
                            </option>
                          )
                        })}
                      </select>
                    </div>
                  ) : (
                    <>
                      <div className="mt-2">
                        <label className="block text-sm font-bold text-emerald-800 mb-1.5">วันหมดอายุ (EXP) *</label>
                        <input type="date" required className="w-full border border-emerald-200 rounded-xl p-3 bg-white outline-none focus:ring-2 focus:ring-emerald-500 font-semibold shadow-sm" value={stockExpDate} onChange={(e) => setStockExpDate(e.target.value)} />
                      </div>
                      <div className="grid grid-cols-2 gap-3 mt-1">
                        <div>
                          <label className="block text-sm font-bold text-emerald-800 mb-1.5">ขนาดบรรจุ / กล่อง</label>
                          <input type="number" required min="1" className="w-full border border-emerald-200 rounded-xl p-3 bg-white outline-none focus:ring-2 focus:ring-emerald-500 font-bold shadow-sm text-center" value={stockPackSize} onChange={(e) => setStockPackSize(e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-emerald-800 mb-1.5">หน่วยนับ</label>
                          <select className="w-full border border-emerald-200 rounded-xl p-3 bg-white outline-none focus:ring-2 focus:ring-emerald-500 font-semibold shadow-sm text-center" value={stockUnitName} onChange={(e) => setStockUnitName(e.target.value)}>
                            <option value="'s">'s (เม็ด)</option><option value="vial">vial</option><option value="amp">amp</option><option value="bottle">bottle</option><option value="box">box</option>
                          </select>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="bg-red-50/50 p-4 rounded-2xl border border-red-100 shadow-sm">
                  <label className="block text-sm font-bold text-red-800 mb-2">เลือกล็อต EXP ที่ต้องการหักสต็อก *</label>
                  <select required className="w-full border border-red-200 rounded-xl p-3.5 bg-white font-semibold outline-none focus:ring-2 focus:ring-red-500 shadow-sm" value={selectedLotId} onChange={(e) => setSelectedLotId(e.target.value)}>
                    <option value="">-- กรุณาเลือกล็อต --</option>
                    {(medicine.medicine_lots || []).filter((l: any) => l.current_stock > 0).map((lot: any) => {
                      const packs = Math.floor(lot.current_stock / lot.pack_size);
                      const remainder = lot.current_stock % lot.pack_size;
                      const unitString = lot.unit_name === "'s" ? "'" : ` ${lot.unit_name}`;
                      const remainderText = remainder > 0 ? ` เศษ ${remainder}` : "";
                      return (
                        <option key={lot.id} value={lot.id}>
                          EXP: {lot.exp_date} (เหลือ: {packs}x{lot.pack_size}{unitString}{remainderText})
                        </option>
                      )
                    })}
                  </select>
                </div>
              )}

              <div className="mt-5">
                <div className="flex bg-gray-100/80 p-1.5 rounded-xl mb-3 shadow-inner">
                  <button type="button" className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${inputMode === 'base' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`} onClick={() => setInputMode('base')}>กรอกเป็นเม็ด/ชิ้น</button>
                  <button type="button" className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${inputMode === 'pack' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`} onClick={() => setInputMode('pack')}>กรอกเป็นกล่อง/แพ็ค</button>
                </div>

                {inputMode === 'base' ? (
                  <div>
                    <label className="block text-sm font-bold mb-1.5 text-gray-700">ระบุจำนวน (ชิ้นย่อย)</label>
                    <input type="number" required min="1" className="w-full border border-gray-200 rounded-xl p-4 text-2xl font-black text-center bg-white shadow-inner outline-none focus:ring-2 focus:ring-blue-500" value={inputAmount} onChange={(e) => setInputAmount(e.target.value)} />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-bold mb-1.5 text-gray-700">ระบุจำนวน (กล่อง/แพ็ค)</label>
                    <input type="number" step="0.1" required min="0.1" className="w-full border border-gray-200 rounded-xl p-4 text-2xl font-black text-center bg-white shadow-inner outline-none focus:ring-2 focus:ring-blue-500" value={inputPackCount} onChange={(e) => setInputPackCount(e.target.value)} />
                  </div>
                )}
              </div>

              <div className="pt-5 flex gap-3">
                <button type="button" onClick={() => setIsStockModalOpen(false)} className="flex-1 bg-white border border-gray-200 p-3.5 rounded-xl font-bold text-gray-700 hover:bg-gray-50 shadow-sm transition-colors">ยกเลิก</button>
                <button type="submit" className={`flex-1 shadow-md text-white p-3.5 rounded-xl font-bold text-lg transition-colors ${stockAction === 'in' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}>ยืนยันทำรายการ</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MedicineDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [session, setSession] = useState<Session | null>(null);
  const [checkedSession, setCheckedSession] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) setSession(JSON.parse(raw));
    } catch { }
    setCheckedSession(true);
  }, []);

  if (!checkedSession) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400 font-medium">กำลังโหลด...</div>;
  if (!session) return <LoginScreen onLogin={setSession} />;
  
  return <MedicineDetailApp session={session} id={id} />;
}