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

// --- Login Screen สำหรับหน้าสแกนมือถือ ---
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800">เข้าสู่ระบบ</h1>
          <p className="text-gray-500 mt-1">เพื่อจัดการสต็อกยา</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4 mb-4">
          <div className="grid grid-cols-2 gap-2">
            {STAFF_LIST.map((name) => (
              <button key={name} onClick={() => openStaffLogin(name)} className="flex items-center gap-2 justify-center border rounded-lg p-3 font-medium text-gray-700 hover:bg-blue-50 text-sm">
                <User size={14} className="text-gray-400" /> {name}
              </button>
            ))}
          </div>
        </div>
        <button onClick={handleCentralLogin} disabled={centralBusy} className="w-full flex items-center justify-center gap-2 bg-gray-800 text-white p-3.5 rounded-xl font-medium">
          <Users size={18} /> {centralBusy ? "กำลังเข้าสู่ระบบ..." : `เข้าสู่ระบบด้วย${CENTRAL_ACCOUNT_NAME}`}
        </button>

        {selectedName && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-sm overflow-hidden">
              <div className="flex justify-between items-center p-5 border-b bg-blue-50">
                <h2 className="text-lg font-bold flex items-center gap-2 text-blue-900"><Lock size={18} /> {selectedName}</h2>
                <button onClick={() => setSelectedName(null)}><X size={22} className="text-gray-400" /></button>
              </div>
              {loadingRow ? (
                <div className="p-8 text-center text-gray-500">กำลังโหลด...</div>
              ) : (
                <form onSubmit={handleSubmitPassword} className="p-6 space-y-4">
                  {mode === "setPassword" && <p className="text-xs text-amber-700 bg-amber-50 border rounded p-2">ยังไม่เคยตั้งรหัสผ่าน กรุณาตั้งรหัสใหม่</p>}
                  <div>
                    <label className="block text-sm font-medium mb-1">รหัสผ่าน</label>
                    <input type="password" required autoFocus className="w-full border rounded-lg p-3" value={password} onChange={(e) => setPassword(e.target.value)} />
                  </div>
                  {mode === "setPassword" && (
                    <div>
                      <label className="block text-sm font-medium mb-1">ยืนยันรหัสผ่าน</label>
                      <input type="password" required className="w-full border rounded-lg p-3" value={password2} onChange={(e) => setPassword2(e.target.value)} />
                    </div>
                  )}
                  {error && <p className="text-red-600 text-sm">{error}</p>}
                  <button type="submit" disabled={busy} className="w-full bg-blue-600 text-white p-3 rounded-lg font-medium">
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

  const fetchData = async () => {
    try {
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
    setStockAction(action);
    setInputMode('base');
    setInputAmount(""); setInputPackCount(""); setStockExpDate(""); setSelectedLotId("");

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
        if (stockInMode === 'existing') {
          if (!selectedLotId) return alert("กรุณาเลือกล็อตที่มีอยู่");
          const existingLot = (medicine.medicine_lots || []).find((l: any) => String(l.id) === String(selectedLotId));
          if (!existingLot) return alert("ไม่พบข้อมูลล็อตในระบบ");

          const { error } = await supabase.from("medicine_lots").update({ current_stock: existingLot.current_stock + totalItems }).eq("id", existingLot.id);
          if (error) throw error;
          await supabase.from("stock_transactions").insert([{ medicine_id: id, lot_id: existingLot.id, exp_date: existingLot.exp_date, action: 'in', amount: totalItems, staff_name: session.name }]);
        } else {
          if (!stockExpDate) return alert("กรุณาระบุวันหมดอายุ (EXP)");
          const existingLot = (medicine.medicine_lots || []).find(
            (l: any) => l.exp_date === stockExpDate && l.pack_size === parseInt(stockPackSize) && l.unit_name === stockUnitName
          );

          if (existingLot) {
            const { error } = await supabase.from("medicine_lots").update({ current_stock: existingLot.current_stock + totalItems }).eq("id", existingLot.id);
            if (error) throw error;
            await supabase.from("stock_transactions").insert([{ medicine_id: id, lot_id: existingLot.id, exp_date: existingLot.exp_date, action: 'in', amount: totalItems, staff_name: session.name }]);
          } else {
            const { data: newLot, error } = await supabase.from("medicine_lots").insert([{ medicine_id: id, exp_date: stockExpDate, pack_size: parseInt(stockPackSize), unit_name: stockUnitName, current_stock: totalItems }]).select().single();
            if (error) throw error;
            await supabase.from("stock_transactions").insert([{ medicine_id: id, lot_id: newLot.id, exp_date: newLot.exp_date, action: 'in', amount: totalItems, staff_name: session.name }]);
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

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">กำลังโหลดข้อมูล...</div>;
  if (!medicine) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">ไม่พบข้อมูลยา</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col w-full">
      {/* Top Navbar */}
      <div className="bg-white border-b flex justify-between items-center p-4 sticky top-0 z-10 shadow-sm">
        <button onClick={() => router.push("/")} className="flex items-center text-sm font-medium text-gray-600 hover:text-gray-900">
          <ArrowLeft size={18} className="mr-1.5"/> กลับหน้ารวม
        </button>
        <div className="flex items-center gap-2 text-xs font-medium text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full">
          <User size={14} /> {session.name}
        </div>
      </div>

      <div className="p-4 md:p-6 max-w-3xl mx-auto w-full space-y-4 pb-20">
        {/* Main Med Info Card */}
        <div className="bg-white rounded-2xl p-5 md:p-6 shadow-sm border border-gray-100">
          <div className="text-center mb-6">
            <h1 className="text-xl md:text-2xl font-bold text-gray-800">{medicine.name}</h1>
            <div className="flex justify-center gap-2 mt-3 flex-wrap">
              {medicine.barcode && <span className="px-3 py-1 bg-gray-50 border rounded-full text-[10px] md:text-xs text-gray-600">บาร์โค้ด: {medicine.barcode}</span>}
              <span className="px-3 py-1 bg-gray-50 border rounded-full text-[10px] md:text-xs text-gray-600">รหัส: {medicine.hosxp_icode || "-"}</span>
              <span className="px-3 py-1 bg-blue-50 border border-blue-100 rounded-full text-[10px] md:text-xs text-blue-600">ตู้ยา: {medicine.cabinet_category}</span>
            </div>
          </div>

          {/* Stock Lots */}
          <div className="mb-6 bg-gray-50/50 rounded-xl p-4 border border-gray-100">
            <h3 className="text-sm font-bold flex items-center gap-2 mb-3 text-gray-700">
              <CalendarDays size={16} /> สต็อกคงเหลือแบ่งตาม EXP
            </h3>
            <div className="flex flex-wrap gap-3">
              {(!medicine.medicine_lots || medicine.medicine_lots.filter((l: any) => l.current_stock > 0).length === 0) ? (
                <div className="text-sm text-red-500 font-bold bg-red-50 px-4 py-2 rounded-lg border border-red-100">สต็อกหมด</div>
              ) : (
                medicine.medicine_lots
                  .filter((l: any) => l.current_stock > 0)
                  .sort((a: any, b: any) => new Date(a.exp_date).getTime() - new Date(b.exp_date).getTime())
                  .map((lot: any) => {
                    const packs = Math.floor(lot.current_stock / lot.pack_size);
                    const remainder = lot.current_stock % lot.pack_size;
                    return (
                      <div key={lot.id} className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm min-w-[150px]">
                        <div className="text-[10px] md:text-xs font-bold text-rose-600 mb-1.5 border-b border-gray-50 pb-1.5">EXP: {lot.exp_date}</div>
                        <div className="flex items-baseline gap-1.5 text-lg">
                          <span className="font-bold text-emerald-700">{packs}</span>
                          <span className="text-gray-400 text-sm">x</span>
                          <span className="text-gray-700 text-base font-medium">{lot.pack_size}</span>
                          {remainder > 0 && <span className="text-amber-600 font-bold ml-1 text-xs">เศษ {remainder}</span>}
                          <span className="text-gray-500 text-xs ml-0.5">{lot.unit_name}</span>
                        </div>
                        <div className="text-[10px] text-gray-400 mt-1">รวม {lot.current_stock} หน่วย</div>
                      </div>
                    )
                  })
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <button onClick={() => openStockModal('in')} className="bg-emerald-50/50 text-emerald-600 hover:bg-emerald-50 border border-emerald-100 p-4 md:p-5 rounded-xl flex flex-col items-center justify-center gap-2 transition-colors shadow-sm">
              <PackagePlus size={28} />
              <span className="font-bold text-sm md:text-base">รับเข้าสต็อก</span>
            </button>
            <button onClick={() => openStockModal('out')} className="bg-red-50/50 text-red-600 hover:bg-red-50 border border-red-100 p-4 md:p-5 rounded-xl flex flex-col items-center justify-center gap-2 transition-colors shadow-sm">
              <PackageMinus size={28} />
              <span className="font-bold text-sm md:text-base">ตัดจ่ายสต็อก</span>
            </button>
          </div>
        </div>

        {/* History List Card */}
        <div className="bg-white rounded-2xl p-5 md:p-6 shadow-sm border border-gray-100">
          <h3 className="text-sm font-bold flex items-center gap-2 mb-4 text-gray-700 border-b pb-3 border-gray-100">
            <History size={18} /> ประวัติการทำรายการล่าสุด
          </h3>
          <div className="space-y-3">
            {historyRows.length === 0 ? (
              <div className="text-center text-gray-500 py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">ยังไม่มีประวัติการรับเข้า/ตัดจ่าย</div>
            ) : (
              historyRows.map((row: any) => {
                const isInc = row.action === 'in';
                const lotInfo = (medicine.medicine_lots || []).find((l: any) => l.id.toString() === row.lot_id?.toString());
                const pSize = lotInfo?.pack_size || 100;
                const pUnit = lotInfo?.unit_name || 'หน่วย';
                const fPacks = Math.floor(row.amount / pSize);
                const fRem = row.amount % pSize;

                return (
                  <div key={row.id} className="flex items-start justify-between border border-gray-100 bg-white rounded-xl p-3 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg mt-0.5 ${isInc ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                        {isInc ? <PackagePlus size={20} /> : <PackageMinus size={20} />}
                      </div>
                      <div>
                        <div className={`text-sm md:text-base font-bold ${isInc ? 'text-emerald-700' : 'text-red-700'}`}>
                          {isInc ? 'รับเข้า' : 'ตัดจ่าย'} {row.amount} {pUnit}
                        </div>
                        <div className="text-[11px] font-medium text-blue-600 mt-0.5">
                          (≈ {fPacks} กล่อง {fRem > 0 ? `เศษ ${fRem}` : ''})
                        </div>
                        <div className="text-[10px] text-gray-500 flex items-center gap-1 mt-1">
                          <CalendarDays size={12} /> EXP: {row.exp_date || "-"}
                        </div>
                        <div className="text-[9px] text-gray-400 mt-0.5">{formatHistoryDate(row.created_at)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-[9px] font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-md shrink-0">
                      <User size={10} /> {row.staff_name}
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[70]">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden">
            <div className={`flex justify-between items-center p-6 border-b ${stockAction === 'in' ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
              <h2 className={`text-lg font-bold flex items-center gap-2 ${stockAction === 'in' ? 'text-emerald-800' : 'text-red-800'}`}>
                {stockAction === 'in' ? <PackagePlus size={22} /> : <PackageMinus size={22} />}
                {stockAction === 'in' ? 'รับเข้าสต็อก' : 'ตัดจ่ายสต็อก (เลือก EXP)'}
              </h2>
              <button onClick={() => setIsStockModalOpen(false)}><X size={24} className="text-gray-400" /></button>
            </div>

            <form onSubmit={handleUpdateStock} className="p-6 space-y-4">
              {stockAction === 'in' ? (
                <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100 space-y-3">
                  <div className="flex gap-2 bg-white p-1 rounded-lg border border-emerald-200">
                    <button type="button" onClick={() => setStockInMode('existing')} className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${stockInMode === 'existing' ? 'bg-emerald-100 text-emerald-800 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}>เลือกล็อตเดิม</button>
                    <button type="button" onClick={() => setStockInMode('new')} className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${stockInMode === 'new' ? 'bg-emerald-100 text-emerald-800 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}>+ เพิ่มล็อตใหม่</button>
                  </div>

                  {stockInMode === 'existing' ? (
                    <div>
                      <label className="block text-sm font-medium text-emerald-800 mb-1">เลือกล็อต (EXP) *</label>
                      <select required className="w-full border border-emerald-200 rounded-lg p-3 bg-white font-medium outline-none focus:ring-2 focus:ring-emerald-500" value={selectedLotId} onChange={(e) => {
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
                      <div>
                        <label className="block text-sm font-medium text-emerald-800 mb-1">วันหมดอายุ (EXP) *</label>
                        <input type="date" required className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-emerald-500" value={stockExpDate} onChange={(e) => setStockExpDate(e.target.value)} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-emerald-800 mb-1">ขนาดบรรจุ / กล่อง</label>
                          <input type="number" required min="1" className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-emerald-500" value={stockPackSize} onChange={(e) => setStockPackSize(e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-emerald-800 mb-1">หน่วยนับ</label>
                          <select className="w-full border rounded-lg p-2.5 bg-white outline-none focus:ring-2 focus:ring-emerald-500" value={stockUnitName} onChange={(e) => setStockUnitName(e.target.value)}>
                            <option value="'s">'s (เม็ด)</option><option value="vial">vial</option><option value="amp">amp</option><option value="bottle">bottle</option><option value="box">box</option>
                          </select>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="bg-red-50 p-3 rounded-lg border border-red-100">
                  <label className="block text-sm font-medium text-red-800 mb-1">เลือกล็อต EXP ที่ต้องการหักสต็อก *</label>
                  <select required className="w-full border border-red-200 rounded-lg p-3 bg-white font-medium outline-none focus:ring-2 focus:ring-red-500" value={selectedLotId} onChange={(e) => setSelectedLotId(e.target.value)}>
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
                  </div>
                )}
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsStockModalOpen(false)} className="flex-1 border p-3 rounded-lg font-medium">ยกเลิก</button>
                <button type="submit" className={`flex-1 text-white p-3 rounded-lg font-medium text-lg ${stockAction === 'in' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}>ยืนยัน</button>
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

  if (!checkedSession) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">กำลังโหลด...</div>;
  if (!session) return <LoginScreen onLogin={setSession} />;
  
  return <MedicineDetailApp session={session} id={id} />;
}