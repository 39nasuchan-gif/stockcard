"use client";

import { useEffect, useState, use } from "react";
import { supabase } from "@/lib/supabase";
import { 
  ArrowLeft, PackagePlus, PackageMinus, CalendarDays, 
  History, X, Calculator, User, Users, Lock, LogOut
} from "lucide-react";
import Link from "next/link";

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

// ==========================================
// 1. คอมโพเนนต์หน้าล็อกอิน (สำหรับหน้า QR)
// ==========================================
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

  const closeModal = () => {
    setSelectedName(null); setStaffRow(null); setPassword(""); setPassword2(""); setError("");
  };

  const openStaffLogin = async (name: string) => {
    setSelectedName(name); setError(""); setPassword(""); setPassword2(""); setLoadingRow(true);
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
    } catch (e: any) { setError("โหลดข้อมูลผู้ใช้ไม่สำเร็จ"); } 
    finally { setLoadingRow(false); }
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
    } catch (e: any) { alert("เข้าสู่ระบบไม่สำเร็จ"); } 
    finally { setCentralBusy(false); }
  };

  const handleSubmitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffRow) return;
    setError("");
    if (mode === "setPassword") {
      if (password.length < 4) return setError("รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร");
      if (password !== password2) return setError("รหัสผ่านไม่ตรงกัน");
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
        if (hash !== staffRow.password_hash) { setBusy(false); return setError("รหัสผ่านไม่ถูกต้อง"); }
        const session: Session = { id: staffRow.id, name: staffRow.name, isCentral: false };
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        onLogin(session);
      }
    } catch (e: any) { setError("เกิดข้อผิดพลาด"); } 
    finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col p-4 md:p-6">
      <div className="mb-6"><Link href="/" className="inline-flex items-center gap-2 text-blue-600 font-medium bg-blue-50 px-4 py-2 rounded-lg"><ArrowLeft size={18} /> กลับหน้าหลัก</Link></div>
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-800">ระบบคลังยา (สแกน QR)</h1>
            <p className="text-gray-500 mt-1">กรุณายืนยันตัวตนก่อนทำรายการ</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6 mb-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {STAFF_LIST.map((name) => (
                <button key={name} onClick={() => openStaffLogin(name)} className="flex items-center gap-2 justify-center border border-gray-200 rounded-lg p-3 font-medium text-gray-700 hover:border-blue-400 hover:bg-blue-50 transition-colors">
                  <User size={16} className="text-gray-400" /> {name}
                </button>
              ))}
            </div>
          </div>
          <button onClick={handleCentralLogin} disabled={centralBusy} className="w-full flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-900 text-white p-3.5 rounded-xl font-medium disabled:opacity-60 transition-colors">
            <Users size={18} /> {centralBusy ? "กำลังเข้าสู่ระบบ..." : `เข้าสู่ระบบด้วย${CENTRAL_ACCOUNT_NAME}`}
          </button>
          
          {selectedName && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-xl shadow-lg w-full max-w-sm overflow-hidden">
                <div className="flex justify-between items-center p-5 border-b bg-blue-50 border-blue-100">
                  <h2 className="text-lg font-bold flex items-center gap-2 text-blue-900"><Lock size={18} /> {selectedName}</h2>
                  <button onClick={closeModal}><X size={22} className="text-gray-400" /></button>
                </div>
                {loadingRow ? (
                  <div className="p-8 text-center text-gray-500">กำลังโหลด...</div>
                ) : (
                  <form onSubmit={handleSubmitPassword} className="p-6 space-y-4">
                    {mode === "setPassword" && <p className="text-sm text-amber-700 bg-amber-50 rounded-lg p-3">ยังไม่เคยตั้งรหัสผ่าน กรุณาตั้งรหัสผ่านใหม่</p>}
                    <div>
                      <label className="block text-sm font-medium mb-1">{mode === "setPassword" ? "ตั้งรหัสผ่านใหม่" : "รหัสผ่าน"}</label>
                      <input type="password" required autoFocus className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500" value={password} onChange={(e) => setPassword(e.target.value)} />
                    </div>
                    {mode === "setPassword" && (
                      <div><label className="block text-sm font-medium mb-1">ยืนยันรหัสผ่าน</label><input type="password" required className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500" value={password2} onChange={(e) => setPassword2(e.target.value)} /></div>
                    )}
                    {error && <p className="text-red-600 text-sm">{error}</p>}
                    <button type="submit" disabled={busy} className="w-full bg-blue-600 text-white p-3 rounded-lg font-medium">{busy ? "กำลังตรวจสอบ..." : "เข้าสู่ระบบ"}</button>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 2. คอมโพเนนต์หลัก (รายละเอียดตู้ยา)
// ==========================================
export default function MedicineDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const [session, setSession] = useState<Session | null>(null);
  const [checkedSession, setCheckedSession] = useState(false);
  const [med, setMed] = useState<any>(null);
  const [historyRows, setHistoryRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [stockAction, setStockAction] = useState<'in' | 'out'>('in');
  const [selectedLotId, setSelectedLotId] = useState("");
  
  // สำหรับรับเข้าล็อตใหม่
  const [stockExpDate, setStockExpDate] = useState("");
  const [stockPackSize, setStockPackSize] = useState("100");
  const [stockUnitName, setStockUnitName] = useState("'s");
  
  const [inputMode, setInputMode] = useState<'base' | 'pack'>('base');
  const [inputAmount, setInputAmount] = useState("");
  const [inputPackCount, setInputPackCount] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) setSession(JSON.parse(raw));
    } catch {}
    setCheckedSession(true);
  }, []);

  const fetchData = async () => {
    try {
      const { data, error } = await supabase.from("medicines").select(`*, medicine_lots (*)`).eq("id", id).single();
      if (error) throw error;
      setMed(data);

      const { data: hData, error: hError } = await supabase.from("stock_transactions").select("*").eq("medicine_id", id).order("created_at", { ascending: false });
      if (hError) throw hError;
      setHistoryRows(hData || []);
    } catch (error) {
      console.error("Error fetching detail:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) fetchData();
  }, [id, session]);

  const handleLogout = () => {
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
  };

  const openStockModal = (action: 'in' | 'out') => {
    setStockAction(action);
    setInputMode('base'); setInputAmount(""); setInputPackCount(""); setSelectedLotId(""); setStockExpDate("");
    if (med.medicine_lots && med.medicine_lots.length > 0) {
      setStockPackSize(med.medicine_lots[0].pack_size.toString());
      setStockUnitName(med.medicine_lots[0].unit_name);
    } else {
      setStockPackSize("100"); setStockUnitName("'s");
    }
    setIsStockModalOpen(true);
  };

  const handleUpdateStock = async (e: React.FormEvent) => {
    e.preventDefault();
    let totalItems = 0;
    
    // คำนวณขนาด Pack
    let activePackSize = 1;
    if (selectedLotId && selectedLotId !== "NEW") {
      const existingLot = (med.medicine_lots || []).find((l: any) => l.id === selectedLotId);
      if (existingLot) activePackSize = existingLot.pack_size;
    } else {
      activePackSize = parseInt(stockPackSize) || 1;
    }

    if (inputMode === 'base') {
      totalItems = parseInt(inputAmount);
      if (!totalItems || totalItems <= 0) return alert("กรุณาระบุจำนวนให้ถูกต้อง");
    } else {
      const packs = parseFloat(inputPackCount);
      if (!packs || packs <= 0 || !activePackSize || activePackSize <= 0) return alert("กรุณาระบุข้อมูลให้ครบถ้วน");
      totalItems = Math.round(packs * activePackSize);
    }

    try {
      if (stockAction === 'in') {
        if (selectedLotId === "NEW") {
          // รับเข้าล็อตใหม่
          if (!stockExpDate) return alert("กรุณาระบุวันหมดอายุ (EXP)");
          const { data: newLot, error } = await supabase.from("medicine_lots").insert([{
            medicine_id: med.id, exp_date: stockExpDate, pack_size: activePackSize, unit_name: stockUnitName, current_stock: totalItems
          }]).select().single();
          if (error) throw error;
          await supabase.from("stock_transactions").insert([{ medicine_id: med.id, lot_id: newLot.id, exp_date: newLot.exp_date, action: 'in', amount: totalItems, staff_name: session?.name }]);
        } else {
          // รับเข้าล็อตเดิม
          if (!selectedLotId) return alert("กรุณาเลือกล็อต หรือเพิ่มล็อตใหม่");
          const lotToUpdate = (med.medicine_lots || []).find((l: any) => l.id === selectedLotId);
          const { error } = await supabase.from("medicine_lots").update({ current_stock: lotToUpdate.current_stock + totalItems }).eq("id", lotToUpdate.id);
          if (error) throw error;
          await supabase.from("stock_transactions").insert([{ medicine_id: med.id, lot_id: lotToUpdate.id, exp_date: lotToUpdate.exp_date, action: 'in', amount: totalItems, staff_name: session?.name }]);
        }
      } else {
        // ตัดจ่าย
        if (!selectedLotId) return alert("กรุณาเลือกล็อตที่ต้องการตัดจ่าย");
        const lotToDeduct = (med.medicine_lots || []).find((l: any) => l.id === selectedLotId);
        if (!lotToDeduct) return alert("ไม่พบข้อมูลล็อต");
        if (totalItems > lotToDeduct.current_stock) return alert(`สต็อกไม่พอ! ต้องการเบิก ${totalItems} แต่มีแค่ ${lotToDeduct.current_stock}`);
        const { error } = await supabase.from("medicine_lots").update({ current_stock: lotToDeduct.current_stock - totalItems }).eq("id", lotToDeduct.id);
        if (error) throw error;
        await supabase.from("stock_transactions").insert([{ medicine_id: med.id, lot_id: lotToDeduct.id, exp_date: lotToDeduct.exp_date, action: 'out', amount: totalItems, staff_name: session?.name }]);
      }
      setIsStockModalOpen(false);
      fetchData(); // รีเฟรชข้อมูลโดยไม่กระตุกเพจ
    } catch (error: any) {
      alert("ทำรายการไม่สำเร็จ: " + error.message);
    }
  };

  const formatHistoryDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString("th-TH", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch { return iso; }
  };

  if (!checkedSession) return <div className="min-h-screen flex items-center justify-center text-gray-500">กำลังโหลด...</div>;
  if (!session) return <LoginScreen onLogin={setSession} />;
  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500">กำลังโหลดข้อมูลยา...</div>;
  if (!med) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500">ไม่พบข้อมูลยา หรือยานี้ถูกลบไปแล้ว</div>;

  const activeLots = (med.medicine_lots || []).filter((l: any) => l.current_stock > 0).sort((a: any, b: any) => new Date(a.exp_date).getTime() - new Date(b.exp_date).getTime());
  const allLots = (med.medicine_lots || []).sort((a: any, b: any) => new Date(a.exp_date).getTime() - new Date(b.exp_date).getTime());

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-gray-600 hover:text-blue-600 font-medium">
            <ArrowLeft size={20} /> <span className="hidden sm:inline">กลับหน้ารวม</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="text-xs md:text-sm font-medium text-gray-700 flex items-center gap-1.5 bg-gray-100 px-3 py-1.5 rounded-full"><User size={14} /> {session.name}</div>
            <button onClick={handleLogout} className="p-1.5 text-gray-400 hover:text-red-600 bg-gray-50 rounded-lg"><LogOut size={18} /></button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 mt-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 md:p-8 mb-6">
          <div className="text-center mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">{med.name}</h1>
            <div className="flex flex-wrap justify-center gap-2 text-sm">
              <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full border">บาร์โค้ด: {med.barcode || "-"}</span>
              <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full border">รหัส: {med.hosxp_icode || "-"}</span>
              <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full border border-blue-100">ตู้ยาที่: {med.cabinet_category || "-"}</span>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-200">
            <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2"><CalendarDays size={16} /> สต็อกคงเหลือแบ่งตาม EXP</h3>
            {activeLots.length === 0 ? (
              <div className="text-center py-4 text-red-500 font-bold bg-white rounded-lg border border-red-100">สต็อกหมด / ไม่มีข้อมูลล็อต</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activeLots.map((lot: any) => {
                  const fullPacks = Math.floor(lot.current_stock / lot.pack_size);
                  const remainder = lot.current_stock % lot.pack_size;
                  return (
                    <div key={lot.id} className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                      <div className="text-xs font-bold text-rose-600 mb-1 border-b border-gray-50 pb-1">EXP: {lot.exp_date}</div>
                      <div className="flex items-baseline gap-1 mt-2">
                        <span className="font-bold text-emerald-700 text-lg">{fullPacks}</span>
                        <span className="text-gray-400 text-sm">x</span>
                        <span className="text-gray-700 font-medium">{lot.pack_size}</span>
                        {remainder > 0 && <span className="text-amber-600 font-bold ml-1 text-sm">...เศษ {remainder}</span>}
                        <span className="text-gray-500 text-xs ml-1">{lot.unit_name}</span>
                      </div>
                      <div className="text-[10px] text-gray-400 mt-1">รวม: {lot.current_stock} ชิ้นย่อย</div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <button onClick={() => openStockModal('in')} className="flex flex-col items-center justify-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 p-4 md:p-6 rounded-2xl border border-emerald-200 transition-colors">
              <PackagePlus size={32} />
              <span className="font-bold text-lg">รับเข้าสต็อก</span>
            </button>
            <button onClick={() => openStockModal('out')} className="flex flex-col items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-700 p-4 md:p-6 rounded-2xl border border-red-200 transition-colors">
              <PackageMinus size={32} />
              <span className="font-bold text-lg">ตัดจ่ายสต็อก</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 md:p-8">
          <h2 className="text-lg font-bold flex items-center gap-2 text-gray-800 mb-4 border-b pb-4"><History size={20} className="text-gray-500" /> ประวัติการทำรายการล่าสุด</h2>
          <div className="space-y-3">
            {historyRows.length === 0 ? (
              <div className="text-center text-gray-500 py-8 bg-gray-50 rounded-xl border border-dashed">ยังไม่มีประวัติการทำรายการ</div>
            ) : (
              historyRows.map((row: any) => {
                const isInc = row.action === 'in';
                // คำนวณหาจำนวนกล่องสำหรับแสดงผลในประวัติ
                const lotInfo = allLots.find((l: any) => l.id === row.lot_id);
                const pSize = lotInfo?.pack_size || 100;
                const pUnit = lotInfo?.unit_name || 'หน่วย';
                const fPacks = Math.floor(row.amount / pSize);
                const fRem = row.amount % pSize;
                
                return (
                  <div key={row.id} className="flex items-center justify-between p-3 md:p-4 bg-white border border-gray-100 rounded-xl hover:shadow-sm transition-shadow">
                    <div className="flex items-start gap-3">
                      <div className={`p-2.5 rounded-xl ${isInc ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                        {isInc ? <PackagePlus size={20} /> : <PackageMinus size={20} />}
                      </div>
                      <div>
                        <div className={`font-bold ${isInc ? 'text-emerald-700' : 'text-red-700'}`}>
                          {isInc ? 'รับเข้า' : 'ตัดจ่าย'} {row.amount} {pUnit}
                        </div>
                        {/* แสดงผลเป็นกล่อง */}
                        <div className="text-xs font-medium text-blue-600 mt-0.5">
                          (≈ {fPacks} กล่อง {fRem > 0 ? `เศษ ${fRem}` : ''})
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-1 mt-1"><CalendarDays size={12} /> EXP: {row.exp_date || "-"}</div>
                        <div className="text-[10px] text-gray-400 mt-0.5">{formatHistoryDate(row.created_at)}</div>
                      </div>
                    </div>
                    <div className="text-xs font-medium text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg flex items-center gap-1.5"><User size={12} /> <span className="hidden sm:inline">{row.staff_name}</span></div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {isStockModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className={`flex justify-between items-center p-6 border-b ${stockAction === 'in' ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
              <h2 className={`text-lg font-bold flex items-center gap-2 ${stockAction === 'in' ? 'text-emerald-800' : 'text-red-800'}`}>
                {stockAction === 'in' ? <PackagePlus size={22} /> : <PackageMinus size={22} />}
                {stockAction === 'in' ? 'รับเข้าสต็อก' : 'ตัดจ่ายสต็อก'}
              </h2>
              <button onClick={() => setIsStockModalOpen(false)}><X size={24} className="text-gray-400" /></button>
            </div>

            <form onSubmit={handleUpdateStock} className="p-6 space-y-4">
              <div className="font-bold text-gray-800 mb-2 border-b pb-2">{med.name}</div>
              
              {stockAction === 'in' ? (
                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 space-y-3">
                  <label className="block text-sm font-medium text-emerald-800">เลือกล็อต EXP ที่ต้องการรับเข้า *</label>
                  <select required className="w-full border rounded-lg p-3 bg-white font-medium outline-none focus:ring-2 focus:ring-emerald-500" value={selectedLotId} onChange={(e) => setSelectedLotId(e.target.value)}>
                    <option value="">-- กรุณาเลือกล็อต --</option>
                    <option value="NEW" className="font-bold text-emerald-600">+ เพิ่มล็อตใหม่ (ระบุ EXP เอง)</option>
                    {allLots.map((lot: any) => (
                      <option key={lot.id} value={lot.id}>EXP: {lot.exp_date} (บรรจุ {lot.pack_size} {lot.unit_name})</option>
                    ))}
                  </select>

                  {selectedLotId === "NEW" && (
                    <div className="pt-2 mt-2 border-t border-emerald-200/50 space-y-3">
                      <div><label className="block text-sm font-medium text-emerald-800 mb-1">วันหมดอายุ (EXP) *</label><input type="date" required className="w-full border rounded-lg p-2.5 outline-none" value={stockExpDate} onChange={(e) => setStockExpDate(e.target.value)} /></div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><label className="block text-sm font-medium text-emerald-800 mb-1">บรรจุ / กล่อง</label><input type="number" required min="1" className="w-full border rounded-lg p-2.5 outline-none" value={stockPackSize} onChange={(e) => setStockPackSize(e.target.value)} /></div>
                        <div><label className="block text-sm font-medium text-emerald-800 mb-1">หน่วยนับ</label>
                          <select className="w-full border rounded-lg p-2.5 bg-white outline-none" value={stockUnitName} onChange={(e) => setStockUnitName(e.target.value)}>
                            <option value="'s">'s (เม็ด)</option><option value="vial">vial</option><option value="amp">amp</option><option value="bottle">bottle</option><option value="box">box</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                  <label className="block text-sm font-medium text-red-800 mb-2">เลือกล็อต EXP ที่ต้องการตัดจ่าย *</label>
                  <select required className="w-full border rounded-lg p-3 bg-white font-medium outline-none focus:ring-2 focus:ring-red-500" value={selectedLotId} onChange={(e) => setSelectedLotId(e.target.value)}>
                    <option value="">-- กรุณาเลือกล็อต --</option>
                    {activeLots.map((lot: any) => (
                      <option key={lot.id} value={lot.id}>EXP: {lot.exp_date} (เหลือ: {lot.current_stock} | บรรจุ {lot.pack_size})</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="mt-4">
                <div className="flex bg-gray-100 p-1 rounded-xl mb-3">
                  <button type="button" className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${inputMode === 'base' ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`} onClick={() => setInputMode('base')}>กรอกเป็นชิ้นย่อย</button>
                  <button type="button" className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${inputMode === 'pack' ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`} onClick={() => setInputMode('pack')}>กรอกเป็นกล่อง/แพ็ค</button>
                </div>
                {inputMode === 'base' ? (
                  <div>
                    <label className="block text-sm font-medium mb-1">ระบุจำนวน (ชิ้นย่อย)</label>
                    <input type="number" required min="1" className="w-full border rounded-xl p-3 text-lg font-bold text-center outline-none focus:ring-2 focus:ring-blue-500" value={inputAmount} onChange={(e) => setInputAmount(e.target.value)} />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium mb-1">ระบุจำนวน (กล่อง/แพ็ค)</label>
                    <input type="number" step="0.1" required min="0.1" className="w-full border rounded-xl p-3 text-lg font-bold text-center outline-none focus:ring-2 focus:ring-blue-500" value={inputPackCount} onChange={(e) => setInputPackCount(e.target.value)} />
                    <p className="text-xs text-gray-500 mt-2 text-center flex justify-center items-center gap-1"><Calculator size={12} /> ระบบจะคูณกับขนาดบรรจุให้อัตโนมัติ</p>
                  </div>
                )}
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsStockModalOpen(false)} className="flex-1 border p-3 rounded-xl font-medium text-gray-600 hover:bg-gray-50 transition-colors">ยกเลิก</button>
                <button type="submit" className={`flex-1 text-white p-3 rounded-xl font-medium text-lg transition-colors ${stockAction === 'in' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}>ยืนยัน</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}