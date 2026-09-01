"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  PackagePlus, PackageMinus, X, CalendarDays,
  User, Lock, ArrowLeft, Clock, MessageSquareText
} from "lucide-react";

const STAFF_LIST = ["ศรีไพร", "จุฬารัตน์", "วิภาวรรณ", "ณัฏฐริกา", "ณัฐพร", "นทีทิพย์", "วรรณอาษา", "จุฑาภรณ์", "วีรากานต์", "มีนนรี"];
const SESSION_KEY = "stockcard_session_v1";

type Session = { id: string; name: string; isCentral: boolean };
async function sha256Hex(t: string) { const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t)); return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join(""); }
const formatBoxString = (totalItems: number, packSize: number, unitName: string) => { if (packSize <= 1 || totalItems === 0) return `${totalItems} ${unitName}`; const packs = Math.floor(totalItems / packSize); const rem = totalItems % packSize; if (packs === 0) return `${rem} ${unitName}`; return `${packs} กล่อง × ${packSize} ${unitName} ${rem > 0 ? `(เศษ ${rem} ${unitName})` : ''}`; }

function LoginModal({ onLogin, onClose }: { onLogin: (s: Session) => void, onClose: () => void }) {
  const [selectedName, setSelectedName] = useState<string | null>(null); const [staffRow, setStaffRow] = useState<any>(null); const [loadingRow, setLoadingRow] = useState(false); const [mode, setMode] = useState<"password" | "setPassword">("password"); const [password, setPassword] = useState(""); const [password2, setPassword2] = useState(""); const [error, setError] = useState(""); const [busy, setBusy] = useState(false); const closeModal = () => { setSelectedName(null); setStaffRow(null); setPassword(""); setPassword2(""); setError(""); };
  const openStaffLogin = async (name: string) => { setSelectedName(name); setError(""); setPassword(""); setPassword2(""); setLoadingRow(true); try { let { data, error } = await supabase.from("staff_accounts").select("*").eq("name", name).maybeSingle(); if (error) throw error; if (!data) { const { data: inserted } = await supabase.from("staff_accounts").insert([{ name, is_central: false }]).select().single(); data = inserted; } setStaffRow(data); setMode(data.password_hash ? "password" : "setPassword"); } catch (e: any) { setError("โหลดข้อมูลไม่สำเร็จ"); } finally { setLoadingRow(false); } };
  const handleSubmitPassword = async (e: React.FormEvent) => { e.preventDefault(); if (!staffRow) return; setError(""); if (mode === "setPassword") { if (password.length < 4) return setError("อย่างน้อย 4 ตัวอักษร"); if (password !== password2) return setError("รหัสไม่ตรงกัน"); } setBusy(true); try { const hash = await sha256Hex(password); if (mode === "setPassword") { const { data } = await supabase.from("staff_accounts").update({ password_hash: hash }).eq("id", staffRow.id).select().single(); const session: Session = { id: data.id, name: data.name, isCentral: false }; localStorage.setItem(SESSION_KEY, JSON.stringify(session)); onLogin(session); } else { if (hash !== staffRow.password_hash) { setBusy(false); return setError("รหัสผ่านไม่ถูกต้อง"); } const session: Session = { id: staffRow.id, name: staffRow.name, isCentral: false }; localStorage.setItem(SESSION_KEY, JSON.stringify(session)); onLogin(session); } } catch (e: any) { setError("เกิดข้อผิดพลาด"); } finally { setBusy(false); } };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 z-[100]">
      <div className="w-full max-w-sm relative">
        <button onClick={onClose} className="absolute -top-12 right-0 text-white hover:text-slate-200"><X size={32}/></button>
        <div className="text-center mb-6"><h1 className="text-2xl font-bold text-white tracking-tight">เข้าสู่ระบบเพื่อดำเนินการ</h1></div>
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl p-5 border border-white/80">
          <div className="grid grid-cols-2 gap-3">{STAFF_LIST.map((name) => (<button key={name} onClick={() => openStaffLogin(name)} className="flex items-center gap-2 justify-center bg-slate-50 border border-slate-200 rounded-2xl p-3 font-medium text-slate-700 hover:bg-slate-100 shadow-sm transition-all text-sm"><User size={16} className="text-slate-400" /> {name}</button>))}</div>
        </div>
        {selectedName && (
          <div className="absolute inset-0 z-10 flex items-center justify-center p-2">
            <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-white">
              <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50/50"><h2 className="text-lg font-bold flex items-center gap-2 text-slate-800"><Lock size={18} /> {selectedName}</h2><button onClick={closeModal}><X size={22} className="text-slate-400" /></button></div>
              {loadingRow ? (<div className="p-8 text-center text-slate-500">กำลังโหลด...</div>) : (
                <form onSubmit={handleSubmitPassword} className="p-6 space-y-5">{mode === "setPassword" && (<p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-xl p-3">การเข้าสู่ระบบครั้งแรก กรุณาตั้งรหัสผ่านใหม่เพื่อความปลอดภัย</p>)}<div><label className="block text-sm font-medium mb-1.5 text-slate-700">{mode === "setPassword" ? "ตั้งรหัสผ่านใหม่" : "รหัสผ่าน"}</label><input type="password" required autoFocus className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-400 transition-all" value={password} onChange={(e) => setPassword(e.target.value)} /></div>{mode === "setPassword" && (<div><label className="block text-sm font-medium mb-1.5 text-slate-700">ยืนยันรหัสผ่าน</label><input type="password" required className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-400 transition-all" value={password2} onChange={(e) => setPassword2(e.target.value)} /></div>)}{error && <p className="text-red-500 text-sm">{error}</p>}<button type="submit" disabled={busy} className="w-full bg-blue-500 hover:bg-blue-600 text-white p-3.5 rounded-xl font-medium shadow-md transition-all">{busy ? "กำลังตรวจสอบ..." : mode === "setPassword" ? "ตั้งรหัสผ่าน" : "เข้าใช้งาน"}</button></form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MedicinePage() {
  const { id } = useParams(); const router = useRouter();
  const [session, setSession] = useState<Session | null>(null); const [checkedSession, setCheckedSession] = useState(false);
  const [med, setMed] = useState<any>(null); const [historyRows, setHistoryRows] = useState<any[]>([]); const [loading, setLoading] = useState(true);
  const [categoriesList, setCategoriesList] = useState<{id: number, name: string}[]>([]);

  // Action/Login Control
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<'in' | 'out' | 'back' | null>(null);

  // Normal Stock states
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [stockAction, setStockAction] = useState<'in' | 'out'>('in');
  const [stockInMode, setStockInMode] = useState<'existing' | 'new'>('existing'); 
  const [stockExpDate, setStockExpDate] = useState(""); const [stockPackSize, setStockPackSize] = useState("100");
  const [stockUnitName, setStockUnitName] = useState("'s"); const [selectedLotId, setSelectedLotId] = useState("");
  const [inputMode, setInputMode] = useState<'base' | 'pack'>('base');
  const [inputAmount, setInputAmount] = useState(""); const [inputPackCount, setInputPackCount] = useState("");
  const [isPendingStock, setIsPendingStock] = useState(false); const [expectedDate, setExpectedDate] = useState("");
  const [stockNote, setStockNote] = useState(""); const [isSubmitting, setIsSubmitting] = useState(false);

  // Visitor Note states
  const [visitorLotId, setVisitorLotId] = useState("");
  const [visitorAmount, setVisitorAmount] = useState("");
  const [visitorName, setVisitorName] = useState("");
  const [visitorSubmitting, setVisitorSubmitting] = useState(false);

  useEffect(() => { try { const raw = localStorage.getItem(SESSION_KEY); if (raw) setSession(JSON.parse(raw)); } catch { } setCheckedSession(true); }, []);

  const fetchData = async () => {
    try {
      const { data: cats } = await supabase.from("cabinet_categories").select("*").order("id");
      if (cats) setCategoriesList(cats);
      const { data: medData, error: medError } = await supabase.from("medicines").select(`*, medicine_lots (*)`).eq("id", id).single();
      if (medError) throw medError; setMed(medData);
      const { data: txData } = await supabase.from("stock_transactions").select("*").eq("medicine_id", id).order("created_at", { ascending: false });
      if (txData) setHistoryRows(txData);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { if (checkedSession && id) fetchData(); }, [checkedSession, id]);

  const handleActionClick = (action: 'in' | 'out' | 'back') => {
    if (session) {
      if (action === 'back') router.push('/');
      else openStockModal(action);
    } else {
      setPendingAction(action);
      setShowLoginModal(true);
    }
  }

  const handleVisitorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitorLotId || !visitorAmount || !visitorName) return alert("กรุณากรอกข้อมูลให้ครบถ้วน");
    setVisitorSubmitting(true);
    try {
      const lot = (med.medicine_lots || []).find((l: any) => l.id.toString() === visitorLotId);
      if (!lot) throw new Error("ไม่พบข้อมูลล็อต");
      
      await supabase.from("stock_transactions").insert([{
        medicine_id: String(med.id), lot_id: String(visitorLotId), exp_date: lot.exp_date,
        action: 'out', amount: parseInt(visitorAmount), staff_name: visitorName,
        status: 'visitor_note'
      }]);
      alert("บันทึกโน้ตสำเร็จ ขอบคุณครับ!");
      setVisitorLotId(""); setVisitorAmount(""); setVisitorName("");
    } catch (error: any) { alert("บันทึกไม่สำเร็จ: " + error.message); }
    finally { setVisitorSubmitting(false); }
  }

  const handleUpdateStock = async (e: React.FormEvent) => {
    e.preventDefault(); let totalItems = 0; setIsSubmitting(true);
    if (inputMode === 'base') { totalItems = parseInt(inputAmount); if (!totalItems || totalItems <= 0) { setIsSubmitting(false); return alert("ระบุจำนวนให้ถูกต้อง"); } } else { const packs = parseFloat(inputPackCount); const size = (stockAction === 'out' || stockInMode === 'existing') ? (med.medicine_lots || []).find((l: any) => l.id.toString() === selectedLotId)?.pack_size : parseInt(stockPackSize); if (!packs || packs <= 0 || !size || size <= 0) { setIsSubmitting(false); return alert("ระบุข้อมูลให้ครบถ้วน"); } totalItems = Math.round(packs * size); }
    try {
      const pending = stockAction === 'in' && isPendingStock; let finalLotId = selectedLotId;
      if (stockAction === 'in') {
        if (stockInMode === 'existing') {
          if (!selectedLotId) throw new Error("กรุณาเลือกล็อตที่มีอยู่"); const existingLot = (med.medicine_lots || []).find((l: any) => String(l.id) === String(selectedLotId)); if (!existingLot) throw new Error("ไม่พบข้อมูลล็อต");
          if (!pending) { const { error } = await supabase.from("medicine_lots").update({ current_stock: existingLot.current_stock + totalItems }).eq("id", existingLot.id); if (error) throw error; }
        } else {
          if (!stockExpDate) throw new Error("กรุณาระบุวันหมดอายุ (EXP)"); const existingLot = (med.medicine_lots || []).find((l: any) => l.exp_date === stockExpDate && l.pack_size === parseInt(stockPackSize) && l.unit_name === stockUnitName);
          if (existingLot) { finalLotId = existingLot.id; if (!pending) { const { error } = await supabase.from("medicine_lots").update({ current_stock: existingLot.current_stock + totalItems }).eq("id", existingLot.id); if (error) throw error; }
          } else { const initStock = pending ? 0 : totalItems; const { data: newLot, error } = await supabase.from("medicine_lots").insert([{ medicine_id: med.id, exp_date: stockExpDate, pack_size: parseInt(stockPackSize), unit_name: stockUnitName, current_stock: initStock }]).select().single(); if (error) throw error; finalLotId = newLot.id; }
        }
      } else {
        if (!selectedLotId) throw new Error("กรุณาเลือกล็อตที่ต้องการตัดจ่าย"); const lotToDeduct = (med.medicine_lots || []).find((l: any) => l.id.toString() === selectedLotId); if (!lotToDeduct) throw new Error("ไม่พบข้อมูลล็อต"); if (totalItems > lotToDeduct.current_stock) throw new Error(`สต็อกไม่พอ! ต้องการเบิก ${totalItems} แต่มีแค่ ${lotToDeduct.current_stock}`);
        const { error } = await supabase.from("medicine_lots").update({ current_stock: lotToDeduct.current_stock - totalItems }).eq("id", lotToDeduct.id); if (error) throw error;
      }
      const expD = (med.medicine_lots || []).find((l:any) => String(l.id) === String(finalLotId))?.exp_date || stockExpDate;
      const txPayload: any = { medicine_id: String(med.id), lot_id: String(finalLotId), exp_date: expD, action: stockAction, amount: totalItems, staff_name: session?.name, status: pending ? 'pending' : 'completed', edit_note: stockNote || null };
      if (pending) txPayload.expected_date = expectedDate || null;
      
      await supabase.from("stock_transactions").insert([txPayload]);
      
      const { data: freshMed } = await supabase.from("medicines").select(`*, medicine_lots (*)`).eq("id", id).single();
      if (freshMed) setMed(freshMed);
      const { data: txs } = await supabase.from("stock_transactions").select("*").eq("medicine_id", id).order("created_at", { ascending: false });
      if (txs) setHistoryRows(txs);
      
      setIsStockModalOpen(false);
    } catch (error: any) { alert("อัปเดตสต็อกไม่สำเร็จ: " + error.message); } finally { setIsSubmitting(false); }
  };

  const openStockModal = (action: 'in' | 'out') => { setStockAction(action); setInputMode('base'); setInputAmount(""); setInputPackCount(""); setStockExpDate(""); setSelectedLotId(""); setIsPendingStock(false); setExpectedDate(""); setStockNote(""); if (action === 'in') { if (med.medicine_lots && med.medicine_lots.length > 0) { setStockInMode('existing'); const firstLot = med.medicine_lots[0]; setSelectedLotId(firstLot.id.toString()); setStockPackSize(firstLot.pack_size.toString()); setStockUnitName(firstLot.unit_name); } else { setStockInMode('new'); setStockPackSize("100"); setStockUnitName("'s"); } } else { if (med.medicine_lots && med.medicine_lots.length > 0) { const firstLot = med.medicine_lots[0]; setStockPackSize(firstLot.pack_size.toString()); setStockUnitName(firstLot.unit_name); } else { setStockPackSize("100"); setStockUnitName("'s"); } } setIsStockModalOpen(true); };
  const handleApprovePending = async (tx: any) => { if (!confirm("ยืนยันการนำรายการรับล่วงหน้านี้ เข้าสต็อกจริงใช่หรือไม่?")) return; try { const lot = (med.medicine_lots || []).find((l: any) => l.id.toString() === tx.lot_id?.toString()); if (lot) { const { error: lotErr } = await supabase.from("medicine_lots").update({ current_stock: lot.current_stock + tx.amount }).eq("id", lot.id); if (lotErr) throw lotErr; } const appendedNote = tx.edit_note ? `${tx.edit_note} | อนุมัติโดย ${session?.name}` : `อนุมัติโดย ${session?.name}`; await supabase.from("stock_transactions").update({ status: 'completed', edit_note: appendedNote }).eq("id", tx.id); await fetchData(); alert("นำยอดเข้าสต็อกสำเร็จ"); } catch (e: any) { alert("เกิดข้อผิดพลาด: " + e.message); } }

  const formatHistoryDate = (iso: string) => { try { return new Date(iso).toLocaleString("th-TH", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }); } catch { return iso; } };
  const getCategoryName = (catId: number) => { const c = categoriesList.find(x => String(x.id) === String(catId)); return c ? c.name : catId; }

  if (!checkedSession || loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400">กำลังโหลด...</div>;
  if (!med) return <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-500"><p className="mb-4">ไม่พบข้อมูลยา</p><button onClick={() => router.push('/')} className="bg-blue-600 text-white px-4 py-2 rounded-xl">กลับหน้าหลัก</button></div>;

  const activeLots = (med.medicine_lots || []).filter((l: any) => l.current_stock > 0).sort((a: any, b: any) => new Date(a.exp_date).getTime() - new Date(b.exp_date).getTime());

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#e0eaf5] via-[#f0f4f8] to-[#e8ebf2] flex flex-col font-sans relative">
      {/* Login Modal Overlay */}
      {showLoginModal && (
        <LoginModal 
          onClose={() => { setShowLoginModal(false); setPendingAction(null); }}
          onLogin={(s) => { 
            setSession(s); setShowLoginModal(false); 
            if (pendingAction === 'back') router.push('/');
            else if (pendingAction) openStockModal(pendingAction);
            setPendingAction(null);
          }} 
        />
      )}

      <div className="bg-white/80 backdrop-blur-md border-b border-white shadow-sm flex justify-between items-center p-4 sticky top-0 z-10">
        <button onClick={() => handleActionClick('back')} className="flex items-center text-sm font-bold text-slate-600 hover:text-blue-600 transition-colors"><ArrowLeft size={18} className="mr-1.5"/> กลับหน้ารวม</button>
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full shadow-sm border border-slate-200"><User size={14} /> {session ? session.name : "ผู้มาเยือน"}</div>
      </div>

      <div className="p-4 w-full max-w-lg mx-auto space-y-4 pb-10">
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-5 md:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/80">
          <div className="text-center mb-5">
            <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">{med.name}</h1>
            <div className="flex justify-center gap-2 mt-2 flex-wrap">
              <span className="px-3 py-1 bg-white/60 border border-white shadow-sm rounded-full text-xs font-bold text-slate-600">รหัส: {med.hosxp_icode || "-"}</span>
              <span className="px-3 py-1 bg-blue-50 border border-blue-100 shadow-sm rounded-full text-xs font-bold text-blue-600">ตู้ยา: {getCategoryName(med.cabinet_category)}</span>
            </div>
          </div>

          <div className="mb-4 bg-white/50 backdrop-blur-sm rounded-2xl p-4 border border-white shadow-sm">
            <h3 className="text-sm font-bold flex items-center gap-2 mb-3 text-slate-700"><CalendarDays size={16} /> สต็อกคงเหลือ</h3>
            <div className="flex flex-wrap gap-2.5">
              {activeLots.length === 0 ? <div className="text-sm text-red-500 font-bold bg-red-50/80 px-4 py-2 rounded-xl border border-red-100/50 shadow-sm">สต็อกหมด</div> : (
                activeLots.map((lot: any) => {
                    const packs = Math.floor(lot.current_stock / lot.pack_size); const remainder = lot.current_stock % lot.pack_size;
                    return (
                      <div key={lot.id} className="bg-white/90 border border-white rounded-2xl p-3 shadow-sm min-w-[140px]">
                        <div className="text-[11px] font-bold text-rose-500 mb-1.5 border-b border-slate-100 pb-1">EXP: {lot.exp_date}</div>
                        <div className="flex items-baseline gap-1.5 text-lg"><span className="font-extrabold text-emerald-600">{packs}</span><span className="text-slate-400 text-xs font-medium">x</span><span className="text-slate-700 text-sm font-bold">{lot.pack_size}</span>{remainder > 0 && <span className="text-amber-500 font-bold ml-1 text-[10px]">เศษ {remainder}</span>}<span className="text-slate-500 text-[10px] ml-0.5 font-medium">{lot.unit_name}</span></div>
                        <div className="text-[10px] text-slate-400 mt-1 font-medium">รวม {lot.current_stock} หน่วย</div>
                      </div>
                    )
                  })
              )}
            </div>
          </div>

          {/* ฟอร์มโน้ตผู้มาเยือน (ไม่ต้อง Login ก็เห็นและใช้ได้) */}
          <div className="mb-5 bg-amber-50/60 backdrop-blur-sm rounded-2xl p-4 border border-amber-200/50 shadow-sm transition-all">
            <h3 className="text-sm font-bold flex items-center gap-2 mb-3 text-amber-700"><MessageSquareText size={16} /> โน้ตสำหรับผู้มาเยือน (ไม่ได้ตัดสต็อกจริง)</h3>
            <form onSubmit={handleVisitorSubmit} className="space-y-3">
              <select required className="w-full bg-white border border-amber-200/50 rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-amber-400 shadow-sm" value={visitorLotId} onChange={(e) => setVisitorLotId(e.target.value)}>
                 <option value="">-- เลือก EXP ที่หยิบออก --</option>
                 {activeLots.map((lot: any) => <option key={lot.id} value={lot.id}>EXP: {lot.exp_date} (เหลือรวม {lot.current_stock} หน่วย)</option>)}
              </select>
              <div className="flex gap-2">
                 <input type="number" required min="1" placeholder="นำออก (หน่วย)" className="w-[45%] bg-white border border-amber-200/50 rounded-xl p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-amber-400 shadow-sm" value={visitorAmount} onChange={(e) => setVisitorAmount(e.target.value)} />
                 <input type="text" required placeholder="ชื่อผู้เบิก (ชื่อผู้บันทึก)" className="w-[55%] bg-white border border-amber-200/50 rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-amber-400 shadow-sm" value={visitorName} onChange={(e) => setVisitorName(e.target.value)} />
              </div>
              <button type="submit" disabled={visitorSubmitting} className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold p-3 rounded-xl shadow-md transition-all disabled:opacity-60">{visitorSubmitting ? 'กำลังบันทึก...' : 'บันทึกโน้ตผู้มาเยือน'}</button>
            </form>
          </div>

          <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-5">
            <button onClick={() => handleActionClick('in')} className="bg-emerald-50/80 hover:bg-emerald-100/80 border border-emerald-100/50 text-emerald-700 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all shadow-sm"><PackagePlus size={24} /><span className="font-bold text-sm">รับเข้าสต็อก (เจ้าหน้าที่)</span></button>
            <button onClick={() => handleActionClick('out')} className="bg-red-50/80 hover:bg-red-100/80 border border-red-100/50 text-red-700 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all shadow-sm"><PackageMinus size={24} /><span className="font-bold text-sm">ตัดจ่ายจริง (เจ้าหน้าที่)</span></button>
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-5 md:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/80">
          <h3 className="text-sm font-bold flex items-center gap-2 mb-4 text-slate-700 border-b pb-3 border-white/50">ประวัติล่าสุด (เจ้าหน้าที่)</h3>
          <div className="space-y-3">
            {historyRows.filter(r => r.status !== 'visitor_note' && r.status !== 'visitor_acknowledged').length === 0 ? <div className="text-center text-slate-400 py-6 bg-white/50 rounded-2xl border border-dashed border-white font-medium text-sm">ไม่มีประวัติ</div> : (
              historyRows.map((row: any) => {
                if (row.status === 'visitor_note' || row.status === 'visitor_acknowledged') return null;
                const isInc = row.action === 'in'; const isPending = row.status === 'pending';
                const lotInfo = (med.medicine_lots || []).find((l: any) => l.id.toString() === row.lot_id?.toString());
                const pSize = lotInfo?.pack_size || 100; const pUnit = lotInfo?.unit_name || 'หน่วย';
                
                return (
                  <div key={row.id} className="flex flex-col gap-2 bg-white/80 border border-white rounded-2xl p-4 shadow-sm">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-xl mt-0.5 shadow-sm ${isPending ? 'bg-amber-100/80 text-amber-600' : isInc ? 'bg-emerald-100/80 text-emerald-600' : 'bg-red-100/80 text-red-600'}`}>
                          {isPending ? <Clock size={18} /> : isInc ? <PackagePlus size={18} /> : <PackageMinus size={18} />}
                        </div>
                        <div>
                          <div className={`text-sm font-extrabold ${isPending ? 'text-amber-700' : isInc ? 'text-emerald-700' : 'text-red-700'}`}>
                            {isPending ? 'รอรับเข้า' : isInc ? 'รับเข้า' : 'ตัดจ่าย'} {formatBoxString(row.amount, pSize, pUnit)}
                          </div>
                          <div className="text-[11px] font-bold text-blue-500 mt-0.5">(รวม {row.amount} {pUnit})</div>
                          <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-1.5 font-medium"><CalendarDays size={10} /> EXP: {row.exp_date || "-"}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5 font-medium">{formatHistoryDate(row.created_at)}</div>
                          
                          {isPending && <div className="mt-2 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200 inline-block">คาดว่าจะเข้า: {row.expected_date ? new Date(row.expected_date).toLocaleDateString('th-TH') : '-'}</div>}
                          {row.edit_note && <div className="mt-2 text-[10px] text-slate-500 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200 inline-block">หมายเหตุ: {row.edit_note}</div>}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                         <div className="flex items-center gap-1 text-[9px] font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-lg"><User size={10} /> {row.staff_name}</div>
                         {isPending && <button onClick={() => handleApprovePending(row)} className="text-[9px] font-bold bg-emerald-500 text-white px-2 py-1.5 rounded-lg hover:bg-emerald-600 shadow-sm mt-1">รับของเข้าสต็อก</button>}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {isStockModalOpen && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-md flex items-end md:items-center justify-center z-[70]">
          <div className="bg-white/95 backdrop-blur-xl rounded-t-3xl md:rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-white flex flex-col max-h-[85vh]">
            <div className={`flex justify-between items-center p-5 border-b border-white/50 ${stockAction === 'in' ? 'bg-emerald-50/60' : 'bg-red-50/60'}`}>
              <h2 className={`text-lg font-bold flex items-center gap-2 ${stockAction === 'in' ? 'text-emerald-700' : 'text-red-700'}`}>{stockAction === 'in' ? <PackagePlus size={22} /> : <PackageMinus size={22} />}{stockAction === 'in' ? 'รับเข้า' : 'ตัดจ่าย'}</h2>
              <button onClick={() => setIsStockModalOpen(false)}><X size={24} className="text-slate-400" /></button>
            </div>
            <form onSubmit={handleUpdateStock} className="p-5 space-y-4 overflow-y-auto">
              {stockAction === 'in' ? (
                <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100/50 space-y-3">
                  <div className="bg-white/80 p-3 rounded-xl border border-emerald-200/50 shadow-sm flex flex-col gap-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="w-4 h-4 text-emerald-500 rounded border-slate-300 focus:ring-emerald-400" checked={isPendingStock} onChange={(e) => setIsPendingStock(e.target.checked)} />
                      <span className="text-sm font-bold text-emerald-700">รับเข้าล่วงหน้า (ยังไม่บวกสต็อก)</span>
                    </label>
                    {isPendingStock && (<div className="pl-6 mt-1"><label className="block text-xs font-medium text-emerald-600 mb-1">วันที่คาดว่าของจะเข้า *</label><input type="date" required className="w-full border border-emerald-200/50 rounded-lg p-2 text-sm bg-white" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} /></div>)}
                  </div>
                  <div className="flex gap-2 bg-white/60 p-1 rounded-xl border border-emerald-200/50">
                    <button type="button" onClick={() => setStockInMode('existing')} className={`flex-1 py-1.5 text-sm font-bold rounded-lg ${stockInMode === 'existing' ? 'bg-emerald-100/80 text-emerald-700 shadow-sm' : 'text-slate-500'}`}>เลือกล็อตเดิม</button>
                    <button type="button" onClick={() => setStockInMode('new')} className={`flex-1 py-1.5 text-sm font-bold rounded-lg ${stockInMode === 'new' ? 'bg-emerald-100/80 text-emerald-700 shadow-sm' : 'text-slate-500'}`}>+ เพิ่มล็อตใหม่</button>
                  </div>
                  {stockInMode === 'existing' ? (
                    <div><label className="block text-sm font-bold text-emerald-700 mb-1">เลือกล็อต (EXP) *</label><select required className="w-full bg-white border border-emerald-200/50 rounded-xl p-3 font-medium outline-none shadow-sm" value={selectedLotId} onChange={(e) => { setSelectedLotId(e.target.value); const l = (med.medicine_lots || []).find((x: any) => String(x.id) === e.target.value); if(l) { setStockPackSize(l.pack_size.toString()); setStockUnitName(l.unit_name); }}}><option value="">-- กรุณาเลือกล็อต --</option>{(med.medicine_lots || []).map((lot: any) => { const packs = Math.floor(lot.current_stock / lot.pack_size); const remainder = lot.current_stock % lot.pack_size; const unitString = lot.unit_name === "'s" ? "'" : ` ${lot.unit_name}`; const remainderText = remainder > 0 ? ` เศษ ${remainder}` : ""; return <option key={lot.id} value={lot.id}>EXP: {lot.exp_date} (เหลือ: {packs}x{lot.pack_size}{unitString}{remainderText})</option> })}</select></div>
                  ) : (
                    <><div className="grid grid-cols-2 gap-3"><div className="col-span-2"><label className="block text-sm font-bold text-emerald-700 mb-1">วันหมดอายุ (EXP) *</label><input type="date" required className="w-full bg-white border border-emerald-200/50 rounded-xl p-3 shadow-sm" value={stockExpDate} onChange={(e) => setStockExpDate(e.target.value)} /></div><div><label className="block text-sm font-bold text-emerald-700 mb-1">ขนาดบรรจุ</label><input type="number" required min="1" className="w-full bg-white border border-emerald-200/50 rounded-xl p-3 shadow-sm" value={stockPackSize} onChange={(e) => setStockPackSize(e.target.value)} /></div><div><label className="block text-sm font-bold text-emerald-700 mb-1">หน่วยนับ</label><select className="w-full bg-white border border-emerald-200/50 rounded-xl p-3 shadow-sm" value={stockUnitName} onChange={(e) => setStockUnitName(e.target.value)}><option value="'s">'s (เม็ด)</option><option value="vial">vial</option><option value="amp">amp</option><option value="bottle">bottle</option><option value="box">box</option></select></div></div></>
                  )}
                </div>
              ) : (
                <div className="bg-red-50/50 p-4 rounded-2xl border border-red-100/50 shadow-inner">
                  <label className="block text-sm font-bold text-red-700 mb-2">เลือกล็อต EXP *</label>
                  <select required className="w-full bg-white border border-red-200/50 rounded-xl p-3.5 font-medium shadow-sm" value={selectedLotId} onChange={(e) => setSelectedLotId(e.target.value)}>
                    <option value="">-- เลือกล็อต --</option>
                    {(med.medicine_lots || []).filter((l: any) => l.current_stock > 0).map((lot: any) => { const packs = Math.floor(lot.current_stock / lot.pack_size); const remainder = lot.current_stock % lot.pack_size; const unitString = lot.unit_name === "'s" ? "'" : ` ${lot.unit_name}`; const remainderText = remainder > 0 ? ` เศษ ${remainder}` : ""; return <option key={lot.id} value={lot.id}>EXP: {lot.exp_date} (เหลือ: {packs}x{lot.pack_size}{unitString}{remainderText})</option> })}
                  </select>
                </div>
              )}
              <div className="mt-4 space-y-3">
                <div>
                  <div className="flex bg-slate-100/80 p-1.5 rounded-xl mb-3">
                    <button type="button" className={`flex-1 py-1.5 text-sm font-bold rounded-lg ${inputMode === 'base' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`} onClick={() => setInputMode('base')}>เป็นเม็ด/ชิ้น</button>
                    <button type="button" className={`flex-1 py-1.5 text-sm font-bold rounded-lg ${inputMode === 'pack' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`} onClick={() => setInputMode('pack')}>เป็นกล่อง/แพ็ค</button>
                  </div>
                  {inputMode === 'base' ? (
                    <div><input type="number" required min="1" placeholder="จำนวน (ชิ้น)" className="w-full bg-white border border-slate-200 rounded-xl p-3 text-lg font-extrabold text-center shadow-sm" value={inputAmount} onChange={(e) => setInputAmount(e.target.value)} /></div>
                  ) : (
                    <div><input type="number" step="0.1" required min="0.1" placeholder="จำนวน (กล่อง)" className="w-full bg-white border border-slate-200 rounded-xl p-3 text-lg font-extrabold text-center shadow-sm" value={inputPackCount} onChange={(e) => setInputPackCount(e.target.value)} /></div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-slate-600">หมายเหตุเพิ่มเติม (ถ้ามี)</label>
                  <input type="text" className="w-full bg-white border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-400 shadow-sm text-sm" placeholder="เช่น ยืมวอร์ด, แลกเปลี่ยนยา" value={stockNote} onChange={(e) => setStockNote(e.target.value)} />
                </div>
              </div>
              <div className="pt-2 flex gap-3"><button type="button" onClick={() => setIsStockModalOpen(false)} className="flex-1 bg-white border border-slate-200 p-3.5 rounded-xl font-bold text-slate-600 shadow-sm">ยกเลิก</button><button type="submit" disabled={isSubmitting} className={`flex-1 text-white p-3.5 rounded-xl font-bold shadow-md disabled:opacity-60 ${stockAction === 'in' ? 'bg-emerald-500' : 'bg-red-500'}`}>{isSubmitting ? 'กำลังบันทึก...' : 'ยืนยัน'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}