"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import {
  Plus, PackagePlus, PackageMinus, X, CalendarDays,
  User, Lock, LogOut, KeyRound, Bell, Check,
  Search, Edit, Trash2, LayoutGrid, History,
  FileText, Printer, QrCode, ArrowLeft, Upload, ArrowUpDown, Clock, Users, UserPlus, MessageSquareText
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

const DEFAULT_STAFF_LIST = ["ศรีไพร", "จุฬารัตน์", "วิภาวรรณ", "ณัฏฐริกา", "ณัฐพร", "นทีทิพย์", "วรรณอาษา", "จุฑาภรณ์", "วีรากานต์", "มีนนรี", "Admin"];
const SESSION_KEY = "stockcard_session_v1";

const CAT_COLORS = [
  "bg-blue-100/60 text-blue-800 border-blue-200/50 shadow-[0_4px_10px_rgba(59,130,246,0.1)]", 
  "bg-pink-100/60 text-pink-800 border-pink-200/50 shadow-[0_4px_10px_rgba(236,72,153,0.1)]",
  "bg-emerald-100/60 text-emerald-800 border-emerald-200/50 shadow-[0_4px_10px_rgba(16,185,129,0.1)]",
  "bg-amber-100/60 text-amber-800 border-amber-200/50 shadow-[0_4px_10px_rgba(245,158,11,0.1)]",
  "bg-purple-100/60 text-purple-800 border-purple-200/50 shadow-[0_4px_10px_rgba(168,85,247,0.1)]",
  "bg-rose-100/60 text-rose-800 border-rose-200/50 shadow-[0_4px_10px_rgba(244,63,94,0.1)]",
  "bg-cyan-100/60 text-cyan-800 border-cyan-200/50 shadow-[0_4px_10px_rgba(6,182,212,0.1)]",
  "bg-violet-100/60 text-violet-800 border-violet-200/50 shadow-[0_4px_10px_rgba(139,92,246,0.1)]",
  "bg-teal-100/60 text-teal-800 border-teal-200/50 shadow-[0_4px_10px_rgba(20,184,166,0.1)]"
];

type Session = { id: string; name: string; isCentral: boolean };
async function sha256Hex(t: string) { const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t)); return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join(""); }
const formatBoxString = (totalItems: number, packSize: number, unitName: string) => { if (packSize <= 1 || totalItems === 0) return `${totalItems} ${unitName}`; const packs = Math.floor(totalItems / packSize); const rem = totalItems % packSize; if (packs === 0) return `${rem} ${unitName}`; return `${packs} กล่อง × ${packSize} ${unitName} ${rem > 0 ? `(เศษ ${rem} ${unitName})` : ''}`; }

function LoginScreen({ onLogin, staffList }: { onLogin: (s: Session) => void, staffList: string[] }) {
  const [selectedName, setSelectedName] = useState<string | null>(null); const [staffRow, setStaffRow] = useState<any>(null); const [loadingRow, setLoadingRow] = useState(false); const [mode, setMode] = useState<"password" | "setPassword">("password"); const [password, setPassword] = useState(""); const [password2, setPassword2] = useState(""); const [error, setError] = useState(""); const [busy, setBusy] = useState(false); const closeModal = () => { setSelectedName(null); setStaffRow(null); setPassword(""); setPassword2(""); setError(""); };
  const openStaffLogin = async (name: string) => { setSelectedName(name); setError(""); setPassword(""); setPassword2(""); setLoadingRow(true); try { let { data, error } = await supabase.from("staff_accounts").select("*").eq("name", name).maybeSingle(); if (error) throw error; if (!data) { const defaultHash = name === "Admin" ? await sha256Hex("1115") : ""; const { data: inserted } = await supabase.from("staff_accounts").insert([{ name, password_hash: defaultHash, is_central: false }]).select().single(); data = inserted; } setStaffRow(data); setMode(data.password_hash ? "password" : "setPassword"); } catch (e: any) { setError("โหลดข้อมูลไม่สำเร็จ"); } finally { setLoadingRow(false); } };
  const handleSubmitPassword = async (e: React.FormEvent) => { e.preventDefault(); if (!staffRow) return; setError(""); if (mode === "setPassword") { if (password.length < 4) return setError("อย่างน้อย 4 ตัวอักษร"); if (password !== password2) return setError("รหัสไม่ตรงกัน"); } setBusy(true); try { const hash = await sha256Hex(password); if (mode === "setPassword") { const { data } = await supabase.from("staff_accounts").update({ password_hash: hash }).eq("id", staffRow.id).select().single(); const session: Session = { id: data.id, name: data.name, isCentral: false }; localStorage.setItem(SESSION_KEY, JSON.stringify(session)); onLogin(session); } else { if (hash !== staffRow.password_hash) { setBusy(false); return setError("รหัสผ่านไม่ถูกต้อง"); } const session: Session = { id: staffRow.id, name: staffRow.name, isCentral: false }; localStorage.setItem(SESSION_KEY, JSON.stringify(session)); onLogin(session); } } catch (e: any) { setError("เกิดข้อผิดพลาด"); } finally { setBusy(false); } };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#eef2f5] to-[#f8fafc] flex items-center justify-center p-4"><div className="w-full max-w-2xl"><div className="text-center mb-8"><h1 className="text-3xl font-bold text-slate-800 tracking-tight">ระบบคลังยา</h1><p className="text-slate-500 mt-2 text-sm">กรุณาเลือกชื่อเจ้าหน้าที่เพื่อเข้าสู่ระบบ</p></div><div className="bg-white/60 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/80 p-5 mb-5"><div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{staffList.map((name) => (<button key={name} onClick={() => openStaffLogin(name)} className={`flex items-center gap-2 justify-center border rounded-2xl p-3.5 font-medium transition-all ${name === 'Admin' ? 'bg-amber-50/80 text-amber-800 border-amber-200 hover:bg-amber-100 font-bold' : 'bg-white/50 border-white/60 text-slate-700 hover:bg-white/90 hover:shadow-sm'}`}><User size={18} className={name === 'Admin' ? 'text-amber-600' : 'text-slate-400'} /> {name}</button>))}</div></div>{selectedName && (<div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center p-4 z-50"><div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-white"><div className="flex justify-between items-center p-5 border-b border-white/50 bg-white/40"><h2 className="text-lg font-bold flex items-center gap-2 text-slate-800"><Lock size={18} /> {selectedName}</h2><button onClick={closeModal}><X size={22} className="text-slate-400 hover:text-slate-600" /></button></div>{loadingRow ? (<div className="p-8 text-center text-slate-500">กำลังโหลด...</div>) : (<form onSubmit={handleSubmitPassword} className="p-6 space-y-5">{mode === "setPassword" && (<p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-xl p-3">การเข้าสู่ระบบครั้งแรก กรุณาตั้งรหัสผ่านใหม่เพื่อความปลอดภัย</p>)}<div><label className="block text-sm font-medium mb-1.5 text-slate-700">{mode === "setPassword" ? "ตั้งรหัสผ่านใหม่" : "รหัสผ่าน"}</label><input type="password" required autoFocus className="w-full bg-white/50 border border-white rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition-all" value={password} onChange={(e) => setPassword(e.target.value)} /></div>{mode === "setPassword" && (<div><label className="block text-sm font-medium mb-1.5 text-slate-700">ยืนยันรหัสผ่าน</label><input type="password" required className="w-full bg-white/50 border border-white rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition-all" value={password2} onChange={(e) => setPassword2(e.target.value)} /></div>)}{error && <p className="text-red-500 text-sm">{error}</p>}<button type="submit" disabled={busy} className="w-full bg-blue-500 hover:bg-blue-600 text-white p-3.5 rounded-xl font-medium disabled:opacity-60 shadow-lg shadow-blue-200 transition-all">{busy ? "กำลังตรวจสอบ..." : mode === "setPassword" ? "ตั้งรหัสผ่านและเข้าสู่ระบบ" : "เข้าสู่ระบบ"}</button></form>)}</div></div>)}</div></div>
  );
}

function StockCardApp({ session, onLogout, staffList, refreshStaffList }: { session: Session; onLogout: () => void; staffList: string[]; refreshStaffList: () => void }) {
  const [medicines, setMedicines] = useState<any[]>([]); const [loading, setLoading] = useState(true); const [sortOrder, setSortOrder] = useState<'recent' | 'alpha'>('alpha');
  const [isMedModalOpen, setIsMedModalOpen] = useState(false); const [isEditing, setIsEditing] = useState(false); const [medFormData, setMedFormData] = useState({ id: "", name: "", note: "", hosxp_icode: "", cabinet_category: "1", min_stock: "" });
  
  const [isStockModalOpen, setIsStockModalOpen] = useState(false); const [selectedMed, setSelectedMed] = useState<any>(null); const [stockAction, setStockAction] = useState<'in' | 'out'>('in'); const [stockInMode, setStockInMode] = useState<'existing' | 'new'>('existing'); const [stockExpDate, setStockExpDate] = useState(""); const [stockPackSize, setStockPackSize] = useState("100"); const [stockUnitName, setStockUnitName] = useState("'s"); const [selectedLotId, setSelectedLotId] = useState(""); const [inputMode, setInputMode] = useState<'base' | 'pack'>('base'); const [inputAmount, setInputAmount] = useState(""); const [inputPackCount, setInputPackCount] = useState("");
  const [isPendingStock, setIsPendingStock] = useState(false); const [expectedDate, setExpectedDate] = useState(""); const [stockNote, setStockNote] = useState(""); const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [categoriesList, setCategoriesList] = useState<{id: number, name: string}[]>([]); const [selectedCategory, setSelectedCategory] = useState<number | "all">("all"); const [searchTerm, setSearchTerm] = useState(""); const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null); const [categoryNameInput, setCategoryNameInput] = useState("");
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false); const [historyMed, setHistoryMed] = useState<any>(null); const [historyRows, setHistoryRows] = useState<any[]>([]); const [historyLoading, setHistoryLoading] = useState(false); const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const [globalPeriodMode, setGlobalPeriodMode] = useState<'1m' | '2m' | '3m' | 'custom'>('1m'); const [globalStartDate, setGlobalStartDate] = useState(""); const [globalEndDate, setGlobalEndDate] = useState("");
  
  const [isReportModalOpen, setIsReportModalOpen] = useState(false); const [reportTargetCategory, setReportTargetCategory] = useState<number | "all">("all"); const [reportTargetId, setReportTargetId] = useState("all"); const [isGeneratingReport, setIsGeneratingReport] = useState(false); const [showPrintView, setShowPrintView] = useState(false); const [printData, setPrintData] = useState<any>({});
  
  const [isQRModalOpen, setIsQRModalOpen] = useState(false); const [qrTargetCategory, setQrTargetCategory] = useState<number | "all">("all"); const [qrTargetId, setQrTargetId] = useState("all"); const [showQRPrintView, setShowQRPrintView] = useState(false); const [qrPrintData, setQrPrintData] = useState<any[]>([]);
  
  const [isImportModalOpen, setIsImportModalOpen] = useState(false); const [importText, setImportText] = useState(""); const [importing, setImporting] = useState(false);
  const [isChangePwdModalOpen, setIsChangePwdModalOpen] = useState(false); const [oldPwd, setOldPwd] = useState(""); const [newPwd, setNewPwd] = useState(""); const [newPwd2, setNewPwd2] = useState(""); const [pwdError, setPwdError] = useState("");
  
  const [isStaffAdminModalOpen, setIsStaffAdminModalOpen] = useState(false); const [newStaffNameInput, setNewStaffNameInput] = useState(""); const [staffRows, setStaffRows] = useState<any[]>([]);
  
  // Visitor Note Main states
  const [isVisitorMainModalOpen, setIsVisitorMainModalOpen] = useState(false); 
  const [visitorSearchTerm, setVisitorSearchTerm] = useState("");
  const [visitorMedId, setVisitorMedId] = useState(""); 
  const [visitorLotId, setVisitorLotId] = useState(""); 
  const [visitorInputMode, setVisitorInputMode] = useState<'base' | 'pack'>('base');
  const [visitorAmount, setVisitorAmount] = useState(""); 
  const [visitorPackCount, setVisitorPackCount] = useState("");
  const [visitorName, setVisitorName] = useState(""); 
  const [visitorSubmitting, setVisitorSubmitting] = useState(false);

  const [visitorNotes, setVisitorNotes] = useState<any[]>([]);

  const fetchMedicines = async () => { try { const { data, error } = await supabase.from("medicines").select(`*, medicine_lots (*)`).order("id", { ascending: false }); if (error) throw error; if (data) setMedicines(data); const { data: txData } = await supabase.from("stock_transactions").select("*").in("action", ["out","in"]); if (txData) setAllTransactions(txData); } catch (error) { console.error(error); } finally { setLoading(false); } };
  const fetchCategories = async () => { try { const { data, error } = await supabase.from("cabinet_categories").select("*").order("id"); if (error) throw error; if (data && data.length > 0) setCategoriesList(data); } catch (error) { console.error(error); } };
  const fetchVisitorNotes = async () => { 
    try { 
      const { data } = await supabase.from("stock_transactions").select("*").eq("status", "visitor_note").order("created_at", { ascending: false }); 
      if (data) setVisitorNotes(data); 
    } catch (error) { console.error(error); } 
  };
  const fetchStaffRows = async () => { try { const { data } = await supabase.from("staff_accounts").select("*").order("name"); if (data) setStaffRows(data); } catch (e) {} };

  useEffect(() => { fetchMedicines(); fetchCategories(); fetchVisitorNotes(); fetchStaffRows(); const savedCat = localStorage.getItem(`saved_cat_${session.id}`); if (savedCat) setSelectedCategory(savedCat === "all" ? "all" : Number(savedCat)); }, []);
  useEffect(() => { if (globalPeriodMode !== 'custom') { const end = new Date(); const start = new Date(); if (globalPeriodMode === '1m') start.setMonth(start.getMonth() - 1); if (globalPeriodMode === '2m') start.setMonth(start.getMonth() - 2); if (globalPeriodMode === '3m') start.setMonth(start.getMonth() - 3); setGlobalEndDate(end.toISOString().split('T')[0]); setGlobalStartDate(start.toISOString().split('T')[0]); } }, [globalPeriodMode]);

  const handleSelectCategory = (catId: number | "all") => { setSelectedCategory(catId); localStorage.setItem(`saved_cat_${session.id}`, String(catId)); }
  const handleAddCategory = async () => { const newName = prompt("กรุณาระบุชื่อตู้ยาใหม่ (เช่น ตู้ยา 11):"); if (!newName || !newName.trim()) return; try { const { data: existing } = await supabase.from("cabinet_categories").select("id").order("id", { ascending: false }).limit(1); const nextId = (existing && existing.length > 0) ? existing[0].id + 1 : 1; const { error } = await supabase.from("cabinet_categories").insert([{ id: nextId, name: newName.trim() }]); if (error) throw error; fetchCategories(); } catch (error: any) { alert("เพิ่มตู้ยาไม่สำเร็จ: " + error.message); } };
  const handleRenameCategory = async (e: React.FormEvent) => { e.preventDefault(); if (editingCategoryId === null) return; const trimmed = categoryNameInput.trim(); if (!trimmed) return; try { const { error } = await supabase.from("cabinet_categories").update({ name: trimmed }).eq("id", editingCategoryId); if (error) throw error; fetchCategories(); setEditingCategoryId(null); setCategoryNameInput(""); alert("เปลี่ยนชื่อตู้ยาสำเร็จ!"); } catch (error: any) { alert("บันทึกชื่อหมวดหมู่ไม่สำเร็จ: " + error.message); } };
  const getCategoryName = (id: string | number) => { const cat = categoriesList?.find(c => String(c.id) === String(id)); return cat ? cat.name : id; };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault(); setPwdError("");
    if (newPwd.length < 4) return setPwdError("รหัสผ่านใหม่ต้องมีอย่างน้อย 4 ตัวอักษร");
    if (newPwd !== newPwd2) return setPwdError("รหัสผ่านใหม่ไม่ตรงกัน");
    setIsSubmitting(true);
    try {
      const oldHash = await sha256Hex(oldPwd);
      const { data } = await supabase.from("staff_accounts").select("password_hash").eq("id", session.id).single();
      if (data?.password_hash !== oldHash) { setIsSubmitting(false); return setPwdError("รหัสผ่านเดิมไม่ถูกต้อง"); }
      const newHash = await sha256Hex(newPwd);
      await supabase.from("staff_accounts").update({ password_hash: newHash }).eq("id", session.id);
      alert("เปลี่ยนรหัสผ่านสำเร็จ!"); setIsChangePwdModalOpen(false); setOldPwd(""); setNewPwd(""); setNewPwd2("");
    } catch (err: any) { setPwdError("เกิดข้อผิดพลาด: " + err.message); } finally { setIsSubmitting(false); }
  }

  const handleAdminResetStaffPwd = async (staffId: string, staffName: string) => {
    const p = prompt(`ระบุรหัสผ่านใหม่สำหรับ ${staffName}:`);
    if (!p || p.length < 4) return alert("รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร");
    try {
      const hash = await sha256Hex(p);
      const { error } = await supabase.from("staff_accounts").update({ password_hash: hash }).eq("id", staffId);
      if (error) throw error;
      alert(`เปลี่ยนรหัสผ่านของ ${staffName} สำเร็จ!`);
      fetchStaffRows();
    } catch (e: any) { alert("ไม่สำเร็จ: " + e.message); }
  };

  const handleAdminDeleteStaff = async (staffId: string, staffName: string) => {
    if (staffName === "Admin") return alert("ไม่สามารถลบบัญชี Admin หลักได้");
    if (!confirm(`ยืนยันการลบผู้ใช้ "${staffName}" ออกจากระบบ?`)) return;
    try {
      const { error } = await supabase.from("staff_accounts").delete().eq("id", staffId);
      if (error) throw error;
      alert(`ลบผู้ใช้ ${staffName} สำเร็จ!`);
      await fetchStaffRows();
      refreshStaffList();
    } catch (e: any) { alert("ลบไม่สำเร็จ: " + e.message); }
  };

  const handleAdminAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newStaffNameInput.trim();
    if (!name) return;
    try {
      const { error } = await supabase.from("staff_accounts").insert([{ name, password_hash: await sha256Hex("1234"), is_central: false }]);
      if (error) throw error;
      alert(`เพิ่มเจ้าหน้าที่ ${name} สำเร็จ! (รหัสผ่านเริ่มต้น: 1234)`);
      setNewStaffNameInput("");
      await fetchStaffRows();
      refreshStaffList();
    } catch (e: any) { alert("เพิ่มไม่สำเร็จ: " + e.message); }
  };

  const handleAcknowledgeNote = async (id: string) => {
    try {
      const { error } = await supabase.from("stock_transactions").update({ status: "visitor_acknowledged" }).eq("id", id);
      if (error) throw error;
      setVisitorNotes(prev => prev.filter(n => n.id !== id));
    } catch (e: any) { alert("เกิดข้อผิดพลาด: " + e.message); }
  }

  const handleVisitorMainSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitorMedId || !visitorLotId || !visitorName) return alert("กรุณากรอกข้อมูลให้ครบถ้วน");
    
    let totalItems = 0;
    const med = medicines.find(m => m.id.toString() === visitorMedId);
    const lot = (med?.medicine_lots || []).find((l: any) => l.id.toString() === visitorLotId);
    if (!lot) return alert("ไม่พบข้อมูลล็อต");

    if (visitorInputMode === 'base') {
      totalItems = parseInt(visitorAmount);
      if (!totalItems || totalItems <= 0) return alert("กรุณาระบุจำนวนให้ถูกต้อง");
    } else {
      const packs = parseFloat(visitorPackCount);
      if (!packs || packs <= 0) return alert("กรุณาระบุจำนวนกล่องให้ถูกต้อง");
      totalItems = Math.round(packs * lot.pack_size);
    }

    setVisitorSubmitting(true);
    try {
      await supabase.from("stock_transactions").insert([{
        medicine_id: String(visitorMedId), lot_id: String(visitorLotId), exp_date: lot.exp_date,
        action: 'out', amount: totalItems, staff_name: visitorName,
        status: 'visitor_note'
      }]);
      alert("บันทึกโน้ตสำเร็จเรียบร้อย!");
      setIsVisitorMainModalOpen(false);
      setVisitorMedId(""); setVisitorLotId(""); setVisitorAmount(""); setVisitorPackCount(""); setVisitorName(""); setVisitorSearchTerm("");
      fetchVisitorNotes();
    } catch (error: any) { alert("บันทึกไม่สำเร็จ: " + error.message); }
    finally { setVisitorSubmitting(false); }
  };

  const handleImportExcel = async () => {
    if (!importText.trim()) return alert("กรุณาวางข้อมูล CSV หรือข้อความที่ต้องการนำเข้า");
    setImporting(true);
    try {
      const lines = importText.trim().split("\n");
      let count = 0;
      for (let line of lines) {
        const parts = line.split(",").map(p => p.trim());
        if (parts.length >= 1 && parts[0]) {
          const name = parts[0];
          const hosxp_icode = parts[1] || "";
          const note = parts[2] || "";
          const cabinet_category = parts[3] || "1";
          const min_stock = parseInt(parts[4]) || 0;

          await supabase.from("medicines").insert([{
            name, hosxp_icode, note, cabinet_category, min_stock, is_available: true
          }]);
          count++;
        }
      }
      alert(`นำเข้าสำเร็จ ${count} รายการ!`);
      setIsImportModalOpen(false);
      setImportText("");
      fetchMedicines();
    } catch (e: any) { alert("นำเข้าไม่สำเร็จ: " + e.message); }
    finally { setImporting(false); }
  };

  const filteredMedicines = medicines.filter((med) => selectedCategory === "all" || String(med.cabinet_category) === String(selectedCategory)).filter((med) => { const term = searchTerm.trim().toLowerCase(); if (!term) return true; return ((med.name || "").toLowerCase().includes(term) || (med.hosxp_icode || "").toLowerCase().includes(term) || (med.note || "").toLowerCase().includes(term)); }).sort((a, b) => { if (sortOrder === 'alpha') return (a.name || "").localeCompare(b.name || "", "th"); return b.id - a.id; });

  const handleSaveMedicine = async (e: React.FormEvent) => { e.preventDefault(); try { const payload = { name: medFormData.name, note: medFormData.note, hosxp_icode: medFormData.hosxp_icode, cabinet_category: medFormData.cabinet_category, min_stock: parseInt(medFormData.min_stock) || 0, is_available: true }; if (isEditing) { const { error } = await supabase.from("medicines").update(payload).eq("id", medFormData.id); if (error) throw error; } else { const { error } = await supabase.from("medicines").insert([payload]); if (error) throw error; } setIsMedModalOpen(false); fetchMedicines(); } catch (error: any) { alert("บันทึกไม่สำเร็จ: " + error.message); } };
  const openAddMedModal = () => { setIsEditing(false); setMedFormData({ id: "", name: "", note: "", hosxp_icode: "", cabinet_category: categoriesList && categoriesList.length > 0 ? String(categoriesList[0].id) : "1", min_stock: "" }); setIsMedModalOpen(true); };
  const openEditMedModal = (med: any) => { setIsEditing(true); setMedFormData({ id: med.id, name: med.name, note: med.note || "", hosxp_icode: med.hosxp_icode || "", cabinet_category: med.cabinet_category || (categoriesList && categoriesList.length > 0 ? String(categoriesList[0].id) : "1"), min_stock: med.min_stock?.toString() || "0" }); setIsMedModalOpen(true); };
  const handleDeleteMed = async (id: string) => { if (!confirm("ลบยานี้? (สต็อกทั้งหมดจะหายไป)")) return; try { await supabase.from("medicines").delete().eq("id", id); fetchMedicines(); } catch (error: any) { alert("ลบไม่สำเร็จ: " + error.message); } };
  const toggleAvailability = async (med: any) => { try { const newVal = med.is_available === false ? true : false; const { error } = await supabase.from("medicines").update({ is_available: newVal }).eq("id", med.id); if (error) throw error; fetchMedicines(); } catch (e: any) { alert("เปลี่ยนสถานะไม่สำเร็จ: " + e.message); } }

  const handleUpdateStock = async (e: React.FormEvent) => {
    e.preventDefault(); let totalItems = 0; setIsSubmitting(true);
    if (inputMode === 'base') { totalItems = parseInt(inputAmount); if (!totalItems || totalItems <= 0) { setIsSubmitting(false); return alert("ระบุจำนวนให้ถูกต้อง"); } } else { const packs = parseFloat(inputPackCount); const size = (stockAction === 'out' || stockInMode === 'existing') ? (selectedMed.medicine_lots || []).find((l: any) => l.id.toString() === selectedLotId)?.pack_size : parseInt(stockPackSize); if (!packs || packs <= 0 || !size || size <= 0) { setIsSubmitting(false); return alert("ระบุข้อมูลให้ครบถ้วน"); } totalItems = Math.round(packs * size); }
    try {
      const pending = stockAction === 'in' && isPendingStock; let finalLotId = selectedLotId;
      if (stockAction === 'in') {
        if (stockInMode === 'existing') {
          if (!selectedLotId) throw new Error("กรุณาเลือกล็อตที่มีอยู่"); const existingLot = (selectedMed.medicine_lots || []).find((l: any) => String(l.id) === String(selectedLotId)); if (!existingLot) throw new Error("ไม่พบข้อมูลล็อต");
          if (!pending) { const { error } = await supabase.from("medicine_lots").update({ current_stock: existingLot.current_stock + totalItems }).eq("id", existingLot.id); if (error) throw error; }
        } else {
          if (!stockExpDate) throw new Error("กรุณาระบุวันหมดอายุ (EXP)"); const existingLot = (selectedMed.medicine_lots || []).find((l: any) => l.exp_date === stockExpDate && l.pack_size === parseInt(stockPackSize) && l.unit_name === stockUnitName);
          if (existingLot) { finalLotId = existingLot.id; if (!pending) { const { error } = await supabase.from("medicine_lots").update({ current_stock: existingLot.current_stock + totalItems }).eq("id", existingLot.id); if (error) throw error; }
          } else { const initStock = pending ? 0 : totalItems; const { data: newLot, error } = await supabase.from("medicine_lots").insert([{ medicine_id: selectedMed.id, exp_date: stockExpDate, pack_size: parseInt(stockPackSize), unit_name: stockUnitName, current_stock: initStock }]).select().single(); if (error) throw error; finalLotId = newLot.id; }
        }
      } else {
        if (!selectedLotId) throw new Error("กรุณาเลือกล็อตที่ต้องการตัดจ่าย"); const lotToDeduct = (selectedMed.medicine_lots || []).find((l: any) => l.id.toString() === selectedLotId); if (!lotToDeduct) throw new Error("ไม่พบข้อมูลล็อต"); if (totalItems > lotToDeduct.current_stock) throw new Error(`สต็อกไม่พอ! ต้องการเบิก ${totalItems} แต่มีแค่ ${lotToDeduct.current_stock}`);
        const { error } = await supabase.from("medicine_lots").update({ current_stock: lotToDeduct.current_stock - totalItems }).eq("id", lotToDeduct.id); if (error) throw error;
      }
      const expD = (selectedMed.medicine_lots || []).find((l:any) => String(l.id) === String(finalLotId))?.exp_date || stockExpDate;
      const txPayload: any = { medicine_id: String(selectedMed.id), lot_id: String(finalLotId), exp_date: expD, action: stockAction, amount: totalItems, staff_name: session.name, status: pending ? 'pending' : 'completed', edit_note: stockNote || null };
      if (pending) txPayload.expected_date = expectedDate || null;
      await supabase.from("stock_transactions").insert([txPayload]);
      await fetchMedicines(); setIsStockModalOpen(false); 
      if (isHistoryModalOpen && selectedMed) { 
        const { data: freshMed } = await supabase.from("medicines").select(`*, medicine_lots (*)`).eq("id", selectedMed.id).single(); 
        if (freshMed) {
            setHistoryMed(freshMed);
            const { data: txs } = await supabase.from("stock_transactions").select("*").eq("medicine_id", String(selectedMed.id)).order("created_at", { ascending: false });
            setHistoryRows(txs || []);
        }
      }
    } catch (error: any) { alert("อัปเดตสต็อกไม่สำเร็จ: " + error.message); } finally { setIsSubmitting(false); }
  };

  const openStockModal = (med: any, action: 'in' | 'out') => { setSelectedMed(med); setStockAction(action); setInputMode('base'); setInputAmount(""); setInputPackCount(""); setStockExpDate(""); setSelectedLotId(""); setIsPendingStock(false); setExpectedDate(""); setStockNote(""); if (action === 'in') { if (med.medicine_lots && med.medicine_lots.length > 0) { setStockInMode('existing'); const firstLot = med.medicine_lots[0]; setSelectedLotId(firstLot.id.toString()); setStockPackSize(firstLot.pack_size.toString()); setStockUnitName(firstLot.unit_name); } else { setStockInMode('new'); setStockPackSize("100"); setStockUnitName("'s"); } } else { if (med.medicine_lots && med.medicine_lots.length > 0) { const firstLot = med.medicine_lots[0]; setStockPackSize(firstLot.pack_size.toString()); setStockUnitName(firstLot.unit_name); } else { setStockPackSize("100"); setStockUnitName("'s"); } } setIsStockModalOpen(true); };
  const openHistoryModal = async (med: any) => { setHistoryMed(med); setIsHistoryModalOpen(true); setHistoryLoading(true); try { const { data, error } = await supabase.from("stock_transactions").select("*").eq("medicine_id", String(med.id)).order("created_at", { ascending: false }); if (error) throw error; setHistoryRows(data || []); } catch (error) { setHistoryRows([]); } finally { setHistoryLoading(false); } };
  
  const handleApprovePending = async (tx: any, setBtnDone?: (val: boolean) => void) => { 
    if (!confirm("ยืนยันการนำรายการรับล่วงหน้านี้ เข้าสต็อกจริงใช่หรือไม่?")) return; 
    try { 
      const lot = (historyMed ? historyMed.medicine_lots : medicines.find(m => m.id.toString() === tx.medicine_id)?.medicine_lots || []).find((l: any) => l.id.toString() === tx.lot_id?.toString()); 
      if (lot) { 
        const { error: lotErr } = await supabase.from("medicine_lots").update({ current_stock: lot.current_stock + tx.amount }).eq("id", lot.id); 
        if (lotErr) throw lotErr; 
      } 
      const appendedNote = tx.edit_note ? `${tx.edit_note} | อนุมัติโดย ${session.name}` : `อนุมัติโดย ${session.name}`; 
      await supabase.from("stock_transactions").update({ status: 'completed', edit_note: appendedNote }).eq("id", tx.id); 
      await fetchMedicines(); 
      if (historyMed) {
        const { data: freshMed } = await supabase.from("medicines").select(`*, medicine_lots (*)`).eq("id", historyMed.id).single(); 
        if (freshMed) {
            setHistoryMed(freshMed);
            const { data: txs } = await supabase.from("stock_transactions").select("*").eq("medicine_id", String(historyMed.id)).order("created_at", { ascending: false });
            setHistoryRows(txs || []);
        }
      }
      if (setBtnDone) setBtnDone(true);
      alert("นำยอดเข้าสต็อกสำเร็จ"); 
    } catch (e: any) { alert("เกิดข้อผิดพลาด: " + e.message); } 
  };

  const formatHistoryDate = (iso: string) => { try { return new Date(iso).toLocaleString("th-TH", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }); } catch { return iso; } };
  const calculateMedStats = (med: any) => { if (!globalStartDate || !globalEndDate) return { totalUsage: 0, target1Week: 0, target2Weeks: 0, daysDiff: 0 }; const start = new Date(globalStartDate); const end = new Date(globalEndDate); start.setHours(0, 0, 0, 0); end.setHours(23, 59, 59, 999); let daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)); if (daysDiff < 1) daysDiff = 1; const medTx = allTransactions.filter(tx => { const txDate = new Date(tx.created_at); return String(tx.medicine_id) === String(med.id) && txDate >= start && txDate <= end && tx.status === 'completed'; }); const totalUsage = medTx.reduce((sum, tx) => sum + tx.amount, 0); const dailyRate = totalUsage / daysDiff; return { totalUsage, target1Week: Math.ceil(dailyRate * 7 * 1.15), target2Weeks: Math.ceil(dailyRate * 14 * 1.15), daysDiff }; };

  const handleGenerateReport = async () => { setIsGeneratingReport(true); try { let query = supabase.from("stock_transactions").select("*").eq("status", "completed").order("created_at", { ascending: false }); if (reportTargetId !== "all") query = query.eq("medicine_id", reportTargetId); const { data: txData, error } = await query; if (error) throw error; const grouped: any = {}; const medsToProcess = medicines.filter(m => reportTargetCategory === "all" || String(m.cabinet_category) === String(reportTargetCategory)).filter(m => reportTargetId === "all" || m.id.toString() === reportTargetId); medsToProcess.forEach(med => { let currentTotalStock = (med.medicine_lots || []).reduce((sum: number, lot: any) => sum + lot.current_stock, 0); const medTxs = (txData || []).filter(tx => tx.medicine_id.toString() === med.id.toString()); let runningBal = currentTotalStock; const processedTxs = medTxs.map(tx => { const balanceAfter = runningBal; if (tx.action === 'in') runningBal -= tx.amount; if (tx.action === 'out') runningBal += tx.amount; const lotInfo = (med.medicine_lots || []).find((l: any) => l.id.toString() === tx.lot_id?.toString()); const pUnit = lotInfo?.unit_name || 'หน่วย'; const pSize = lotInfo?.pack_size || 100; const formatPrintPack = (amt: number) => { if(pSize <= 1 || amt === 0) return `${amt} ${pUnit}`; const p = Math.floor(amt / pSize); const r = amt % pSize; return p === 0 ? `${r} ${pUnit}` : `${p} กล่อง${r > 0 ? ` เศษ ${r} ${pUnit}` : ''}`; }; return { ...tx, balanceAfter, pUnit, lotExp: tx.exp_date, amountText: formatPrintPack(tx.amount), balanceText: formatPrintPack(balanceAfter) }; }); grouped[med.id] = { medName: med.name, hosxp: med.hosxp_icode, note: med.note, transactions: processedTxs.reverse() }; }); setPrintData(grouped); setShowPrintView(true); setIsReportModalOpen(false); } catch(e: any) { alert("เกิดข้อผิดพลาดในการดึงข้อมูลรายงาน: " + e.message); } finally { setIsGeneratingReport(false); } };
  const handleGenerateQRPrint = () => { let medsToPrint = medicines; if (qrTargetCategory !== "all") medsToPrint = medsToPrint.filter(m => String(m.cabinet_category) === String(qrTargetCategory)); if (qrTargetId !== "all") medsToPrint = medsToPrint.filter(m => m.id.toString() === qrTargetId); setQrPrintData(medsToPrint); setShowQRPrintView(true); setIsQRModalOpen(false); };

  if (showPrintView) return ( <div className="bg-white min-h-screen text-black print:p-0 p-8"><div className="max-w-5xl mx-auto"><div className="print:hidden flex justify-between mb-6 bg-gray-100 p-4 rounded-xl"><div><h1 className="text-xl font-bold">ตัวอย่างก่อนพิมพ์รายงาน</h1></div><div className="flex gap-3"><button onClick={() => setShowPrintView(false)} className="px-4 py-2 border rounded-lg font-medium">ปิด</button><button onClick={() => window.print()} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium flex gap-2"><Printer size={18}/> พิมพ์ PDF</button></div></div><div className="print-content">{Object.values(printData).map((medData: any) => (<div key={medData.medName} style={{ pageBreakAfter: 'always' }} className="mb-10 pb-4"><h1 className="text-2xl font-bold text-center mb-2">รายงานประวัติการใช้ยา</h1><p className="text-center text-sm text-gray-600 mb-6">พิมพ์วันที่: {new Date().toLocaleString("th-TH")}</p><div className="mb-4 border-b-2 border-black pb-2"><h2 className="text-xl font-bold text-black">{medData.medName}</h2><div className="text-sm text-black">รหัส HosXP: {medData.hosxp || "-"} | หมายเหตุ: {medData.note || "-"}</div></div>{medData.transactions.length === 0 ? <p className="text-sm text-gray-500 italic py-4">ไม่มีประวัติการทำรายการ</p> : (<table className="w-full text-sm text-left border-collapse border border-gray-400"><thead><tr className="bg-gray-100"><th className="border border-gray-400 p-2 text-black font-bold">วันที่ทำรายการ</th><th className="border border-gray-400 p-2 text-center text-black font-bold">รับเข้า</th><th className="border border-gray-400 p-2 text-center text-black font-bold">ตัดจ่าย</th><th className="border border-gray-400 p-2 text-center text-black font-bold">ยอดยกไป (คงเหลือ)</th><th className="border border-gray-400 p-2 text-black font-bold">ผู้ดำเนินการ</th><th className="border border-gray-400 p-2 text-black font-bold">หมายเหตุ (EXP)</th></tr></thead><tbody>{medData.transactions.map((tx: any) => (<tr key={tx.id} className="border border-gray-400"><td className="border border-gray-400 p-2 text-black">{formatHistoryDate(tx.created_at)}</td><td className="border border-gray-400 p-2 text-center text-black font-medium">{tx.action === 'in' ? tx.amountText : '-'}</td><td className="border border-gray-400 p-2 text-center text-black font-medium">{tx.action === 'out' ? tx.amountText : '-'}</td><td className="border border-gray-400 p-2 text-center text-black font-bold">{tx.balanceText}</td><td className="border border-gray-400 p-2 text-black">{tx.staff_name}</td><td className="border border-gray-400 p-2 text-black text-xs">EXP: {tx.lotExp} {tx.edit_note ? `[${tx.edit_note}]` : ''}</td></tr>))}</tbody></table>)}</div>))}</div></div></div> );
  if (showQRPrintView) return ( <div className="bg-white min-h-screen text-black print:p-0 p-4"><div className="max-w-5xl mx-auto"><div className="print:hidden flex justify-between mb-6 bg-gray-100 p-4 rounded-xl"><h1 className="text-xl font-bold">พิมพ์ QR Code</h1><div className="flex gap-3"><button onClick={() => setShowQRPrintView(false)} className="px-4 py-2 border rounded-lg">ปิด</button><button onClick={() => window.print()} className="px-4 py-2 bg-blue-600 text-white rounded-lg flex gap-2"><Printer size={18}/> พิมพ์</button></div></div><div className="grid grid-cols-2 md:grid-cols-4 gap-4">{qrPrintData.map((med) => (<div key={med.id} className="border-2 border-dashed border-gray-400 p-4 flex flex-col items-center justify-center text-center"><QRCodeSVG value={`${typeof window !== 'undefined' ? window.location.origin : ''}/medicine/${med.id}`} size={100} /><div className="mt-3 font-bold text-sm leading-tight text-black">{med.name}</div></div>))}</div></div></div> );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#e0eaf5] via-[#f0f4f8] to-[#e8ebf2] p-2 md:p-8 font-sans">
      <div className="max-w-[1400px] mx-auto space-y-4 md:space-y-6">
        {/* Header - Glassmorphism */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white/70 backdrop-blur-xl p-4 md:p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/80">
          <div className="w-full xl:w-auto flex justify-between items-start md:items-center">
            <div><h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 leading-tight tracking-tight">ระบบคลังยา <br className="md:hidden" /><span className="text-base md:text-2xl font-semibold text-slate-500 opacity-80">(จัดล็อต EXP)</span></h1></div>
            <div className="text-right md:hidden"><div className="text-[10px] font-medium text-slate-700 flex items-center justify-end gap-1 bg-white/80 px-3 py-1.5 rounded-full border border-white shadow-sm"><User size={12} className="text-slate-400" /> {session.name}</div></div>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto mt-2 xl:mt-0">
            <button onClick={() => setIsVisitorMainModalOpen(true)} className="flex items-center justify-center gap-1.5 bg-amber-50/80 text-amber-700 border border-amber-200/50 hover:bg-amber-100 px-3 py-2 rounded-xl font-medium text-xs md:text-sm shadow-sm transition-all"><MessageSquareText size={16} /> โน้ตผู้มาเยือน</button>
            <button onClick={() => setIsQRModalOpen(true)} className="flex items-center justify-center gap-1.5 bg-indigo-50/80 text-indigo-700 border border-indigo-200/50 hover:bg-indigo-100 px-3 py-2 rounded-xl font-medium text-xs md:text-sm shadow-sm transition-all"><QrCode size={16} /> พิมพ์ QR</button>
            <button onClick={() => setIsReportModalOpen(true)} className="flex items-center justify-center gap-1.5 bg-blue-50/80 text-blue-700 border border-blue-200/50 hover:bg-blue-100 px-3 py-2 rounded-xl font-medium text-xs md:text-sm shadow-sm transition-all"><FileText size={16} /> พิมพ์รายงาน</button>
            <button onClick={() => setIsImportModalOpen(true)} className="flex items-center justify-center gap-1.5 bg-amber-50/80 text-amber-700 border border-amber-200/50 hover:bg-amber-100 px-3 py-2 rounded-xl font-medium text-xs md:text-sm shadow-sm transition-all"><Upload size={16} /> นำเข้า</button>
            <button onClick={openAddMedModal} className="flex items-center justify-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white px-3.5 py-2 rounded-xl font-medium text-xs md:text-sm shadow-md shadow-emerald-200 transition-all"><Plus size={18} /> เพิ่มยา</button>
            {session.name === "Admin" && (
              <button onClick={() => setIsStaffAdminModalOpen(true)} title="จัดการเจ้าหน้าที่" className="flex items-center gap-1.5 bg-purple-50/80 text-purple-700 border border-purple-200 hover:bg-purple-100 px-3 py-2 rounded-xl font-medium text-xs md:text-sm shadow-sm transition-all"><Users size={16}/> จัดการเจ้าหน้าที่</button>
            )}
            <button onClick={() => setIsChangePwdModalOpen(true)} title="เปลี่ยนรหัสผ่าน" className="p-2 bg-white/50 border border-white text-slate-500 rounded-xl hover:bg-blue-50 hover:text-blue-500 shadow-sm transition-all"><KeyRound size={18} /></button>
            <button onClick={onLogout} title="ออกจากระบบ" className="p-2 bg-white/50 border border-white text-slate-500 rounded-xl hover:bg-red-50 hover:text-red-500 shadow-sm transition-all"><LogOut size={18} /></button>
          </div>
        </div>

        {/* แจ้งเตือนผู้มาเยือน */}
        {visitorNotes.length > 0 && (
          <div className="bg-amber-50/80 backdrop-blur-xl rounded-3xl shadow-sm border border-amber-200/50 p-4 md:p-5 w-full transition-all">
             <div className="flex items-center gap-2 mb-3 text-sm font-bold text-amber-700">
                <Bell size={18} /> แจ้งเตือน: โน้ตจากผู้มาเยือนที่สแกน QR ({visitorNotes.length})
             </div>
             <div className="max-h-48 overflow-y-auto space-y-2.5 pr-2">
                {visitorNotes.map(note => {
                   const med = medicines.find(m => m.id.toString() === note.medicine_id);
                   const medName = med?.name || 'ไม่ทราบชื่อยา';
                   const lotInfo = (med?.medicine_lots || []).find((l:any) => l.id.toString() === note.lot_id?.toString());
                   const pSize = lotInfo?.pack_size || 1; const pUnit = lotInfo?.unit_name || 'หน่วย';
                   const formattedAmount = formatBoxString(note.amount, pSize, pUnit);

                   return (
                     <div key={note.id} className="flex justify-between items-center bg-white/90 p-3.5 rounded-2xl border border-amber-100 shadow-sm">
                        <div>
                           <div className="text-sm font-extrabold text-slate-800">{medName}</div>
                           <div className="text-xs text-slate-700 mt-1 font-medium">
                              นำออก <span className="font-bold text-red-600">{formattedAmount}</span> (รวม {note.amount} {pUnit})
                           </div>
                           <div className="text-[11px] font-bold text-rose-500 mt-1 flex items-center gap-1">
                              <CalendarDays size={12}/> EXP: {note.exp_date}
                           </div>
                           <div className="text-[10px] text-slate-500 mt-2 font-medium bg-slate-50 px-2 py-1 rounded-lg inline-block border border-slate-100">
                              ผู้บันทึก: <span className="font-bold text-slate-700">{note.staff_name}</span> | {formatHistoryDate(note.created_at)}
                           </div>
                        </div>
                        <button onClick={() => handleAcknowledgeNote(note.id)} title="รับทราบข้อความนี้" className="p-3 bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white border border-emerald-200 rounded-xl transition-all shadow-sm flex items-center justify-center">
                           <Check size={22} />
                        </button>
                     </div>
                   )
                })}
             </div>
          </div>
        )}

        {/* Categories - Glassmorphism Pastels */}
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/80 p-4 md:p-5 w-full">
          <div className="flex items-center gap-2 mb-4 text-sm font-bold text-slate-500"><LayoutGrid size={18} /> หมวดหมู่ตู้ยา</div>
          <div className="flex flex-wrap gap-2.5 mb-4">
            <button onClick={() => handleSelectCategory("all")} className={`px-4 py-2 rounded-2xl text-sm font-bold border backdrop-blur-md transition-all ${selectedCategory === "all" ? "bg-slate-800 text-white border-slate-700 shadow-md" : "bg-white/60 text-slate-600 border-white hover:bg-white/90 shadow-sm"}`}>ทั้งหมด</button>
            {categoriesList?.map((cat, index) => {
              const baseColor = CAT_COLORS[index % CAT_COLORS.length];
              const isActive = selectedCategory === cat.id;
              const activeClass = isActive ? `${baseColor} ring-2 ring-offset-2 ring-blue-300 font-extrabold transform scale-105` : "bg-white/60 text-slate-600 border-white hover:bg-white/90 font-medium shadow-sm";
              return (
              <div key={cat.id} className={`flex items-center gap-0.5 rounded-2xl border backdrop-blur-md px-1 transition-all duration-200 ${activeClass}`}>
                <button onClick={() => handleSelectCategory(cat.id)} className="pl-3 pr-2 py-2 text-sm">{cat.name}</button>
                <button onClick={() => { setEditingCategoryId(cat.id); setCategoryNameInput(cat.name); }} title="แก้ไขชื่อหมวดหมู่" className={`p-1 rounded-xl transition-colors ${isActive ? "text-slate-700 hover:bg-white/30" : "text-slate-400 hover:text-blue-600 hover:bg-white"}`}><Edit size={14} /></button>
              </div>
            )})}
            <button onClick={handleAddCategory} className="px-4 py-2 rounded-2xl border-2 border-dashed border-slate-300 text-slate-500 hover:bg-white/60 text-sm font-semibold flex items-center gap-1.5 transition-all"><Plus size={16} /> เพิ่มตู้ยา</button>
          </div>
          <div className="flex flex-col md:flex-row gap-3 mt-4 items-center">
            <div className="relative flex-1 w-full"><Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" /><input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="ค้นหาชื่อยา, HosXP หรือหมายเหตุ..." className="w-full bg-white/50 border border-white rounded-2xl pl-11 pr-4 py-3 outline-none focus:ring-2 focus:ring-blue-400 text-slate-700 shadow-sm transition-all" /></div>
            <div className="relative w-full md:w-auto shrink-0 flex items-center gap-2 bg-white/50 border border-white rounded-2xl px-4 py-1 shadow-sm transition-all"><ArrowUpDown size={16} className="text-slate-400 shrink-0"/>
              <select className="w-full bg-transparent outline-none text-sm font-medium text-slate-600 py-2 cursor-pointer" value={sortOrder} onChange={(e) => setSortOrder(e.target.value as 'recent'|'alpha')}>
                <option value="alpha">เรียงตามตัวอักษร (A-Z, ก-ฮ)</option>
                <option value="recent">เรียงตามแก้ไขล่าสุด (ใหม่-เก่า)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Edit Category Name Modal */}
        {editingCategoryId !== null && (
          <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-md flex items-center justify-center p-4 z-[75]">
             <div className="bg-white/90 backdrop-blur-xl border border-white rounded-3xl shadow-2xl w-full max-w-sm p-6 relative">
                <button onClick={() => setEditingCategoryId(null)} className="absolute top-4 right-4 p-1 hover:bg-white/60 rounded-xl"><X size={20} className="text-slate-400"/></button>
                <h2 className="text-lg font-bold text-slate-800 mb-4">แก้ไขชื่อหมวดหมู่ตู้ยา</h2>
                <form onSubmit={handleRenameCategory} className="space-y-4">
                   <input type="text" required className="w-full bg-white/50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-400 shadow-sm" value={categoryNameInput} onChange={(e) => setCategoryNameInput(e.target.value)} placeholder="ชื่อตู้ยาใหม่" />
                   <button type="submit" className="w-full bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-xl font-medium shadow-md transition-colors">บันทึกชื่อใหม่</button>
                </form>
             </div>
          </div>
        )}

        {/* Modal: Admin Staff Management */}
        {isStaffAdminModalOpen && (
          <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-md flex items-center justify-center p-4 z-[80]">
             <div className="bg-white/95 backdrop-blur-xl border border-white rounded-3xl shadow-2xl w-full max-w-lg p-6 relative max-h-[85vh] overflow-y-auto">
                <button onClick={() => setIsStaffAdminModalOpen(false)} className="absolute top-4 right-4 p-1 hover:bg-slate-100 rounded-xl"><X size={20} className="text-slate-400"/></button>
                <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2"><Users size={22} className="text-purple-600"/> จัดการรายชื่อเจ้าหน้าที่</h2>
                
                <form onSubmit={handleAdminAddStaff} className="mb-6 bg-purple-50/60 p-4 rounded-2xl border border-purple-100 space-y-3">
                   <h3 className="text-sm font-bold text-purple-800 flex items-center gap-1.5"><UserPlus size={16}/> เพิ่มเจ้าหน้าที่ใหม่</h3>
                   <div className="flex gap-2">
                      <input type="text" required placeholder="ชื่อเจ้าหน้าที่" className="flex-1 bg-white border border-purple-200 rounded-xl p-2.5 text-sm outline-none shadow-sm" value={newStaffNameInput} onChange={(e) => setNewStaffNameInput(e.target.value)} />
                      <button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm">เพิ่ม</button>
                   </div>
                </form>

                <div className="space-y-2">
                   <h3 className="text-sm font-bold text-slate-700 mb-2">รายชื่อเจ้าหน้าที่ทั้งหมดในระบบ</h3>
                   {staffRows.map(st => (
                      <div key={st.id} className="flex justify-between items-center bg-slate-50 border border-slate-200 p-3 rounded-2xl">
                         <span className="font-semibold text-sm text-slate-800">{st.name} {st.name === 'Admin' && <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full ml-1 font-bold">Admin</span>}</span>
                         <div className="flex items-center gap-2">
                            <button onClick={() => handleAdminResetStaffPwd(st.id, st.name)} className="bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm flex items-center gap-1">
                               <KeyRound size={12}/> เปลี่ยนรหัสผ่าน
                            </button>
                            {st.name !== 'Admin' && (
                               <button onClick={() => handleAdminDeleteStaff(st.id, st.name)} title="ลบผู้ใช้" className="bg-red-50 border border-red-200 hover:bg-red-500 hover:text-white text-red-600 p-2 rounded-xl transition-all shadow-sm">
                                  <Trash2 size={14}/>
                               </button>
                            )}
                         </div>
                      </div>
                   ))}
                </div>
             </div>
          </div>
        )}

        {/* Modal: Visitor Note Main Page */}
        {isVisitorMainModalOpen && (
          <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-md flex items-center justify-center p-4 z-[80]">
             <div className="bg-white/95 backdrop-blur-xl border border-white rounded-3xl shadow-2xl w-full max-w-md p-6 relative max-h-[90vh] overflow-y-auto">
                <button onClick={() => { setIsVisitorMainModalOpen(false); setVisitorSearchTerm(""); setVisitorMedId(""); setVisitorLotId(""); }} className="absolute top-4 right-4 p-1 hover:bg-slate-100 rounded-xl"><X size={20} className="text-slate-400"/></button>
                <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><MessageSquareText size={20} className="text-amber-600"/> โน้ตสำหรับผู้มาเยือน</h2>
                <form onSubmit={handleVisitorMainSubmit} className="space-y-3">
                   <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">ค้นหาและเลือกรายการยา *</label>
                      <input type="text" placeholder="พิมพ์ชื่อยาเพื่อค้นหา..." className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-sm outline-none mb-2 shadow-sm" value={visitorSearchTerm} onChange={(e) => setVisitorSearchTerm(e.target.value)} />
                      <select required className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-medium outline-none shadow-sm" value={visitorMedId} onChange={(e) => { setVisitorMedId(e.target.value); setVisitorLotId(""); }}>
                         <option value="">-- เลือกยาจากผลค้นหา --</option>
                         {medicines
                           .filter(m => m.name.toLowerCase().includes(visitorSearchTerm.toLowerCase()) || (m.hosxp_icode || "").toLowerCase().includes(visitorSearchTerm.toLowerCase()))
                           .map(m => <option key={m.id} value={m.id}>{m.name} (ตู้: {getCategoryName(m.cabinet_category)})</option>)}
                      </select>
                   </div>
                   {visitorMedId && (
                      <div>
                         <label className="block text-xs font-bold text-slate-600 mb-1">เลือกล็อต EXP *</label>
                         <select required className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-medium outline-none shadow-sm" value={visitorLotId} onChange={(e) => setVisitorLotId(e.target.value)}>
                            <option value="">-- เลือกล็อต EXP --</option>
                            {(medicines.find(m => m.id.toString() === visitorMedId)?.medicine_lots || []).filter((l: any) => l.current_stock > 0).map((lot: any) => {
                               const packs = Math.floor(lot.current_stock / lot.pack_size); const rem = lot.current_stock % lot.pack_size;
                               const unitStr = lot.unit_name === "'s" ? "'" : ` ${lot.unit_name}`;
                               return <option key={lot.id} value={lot.id}>EXP: {lot.exp_date} ({packs} กล่อง × {lot.pack_size}{unitStr} {rem > 0 ? `+ เศษ ${rem}` : ''} | เหลือรวม: {lot.current_stock})</option>
                            })}
                         </select>
                      </div>
                   )}
                   <div>
                      <div className="flex bg-slate-100/80 p-1 rounded-xl mb-2 shadow-inner">
                        <button type="button" className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${visitorInputMode === 'base' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`} onClick={() => setVisitorInputMode('base')}>กรอกเป็นเม็ด/ชิ้น</button>
                        <button type="button" className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${visitorInputMode === 'pack' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`} onClick={() => setVisitorInputMode('pack')}>กรอกเป็นกล่อง/แพ็ค</button>
                      </div>
                      {visitorInputMode === 'base' ? (
                        <input type="number" required min="1" placeholder="จำนวน (ชิ้นย่อย)" className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none shadow-sm" value={visitorAmount} onChange={(e) => setVisitorAmount(e.target.value)} />
                      ) : (
                        <input type="number" step="0.1" required min="0.1" placeholder="จำนวน (กล่อง/แพ็ค)" className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none shadow-sm" value={visitorPackCount} onChange={(e) => setVisitorPackCount(e.target.value)} />
                      )}
                   </div>
                   <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">ชื่อผู้บันทึก *</label>
                      <input type="text" required placeholder="ชื่อผู้เบิก" className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-medium outline-none shadow-sm" value={visitorName} onChange={(e) => setVisitorName(e.target.value)} />
                   </div>
                   <button type="submit" disabled={visitorSubmitting} className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold p-3.5 rounded-xl shadow-md transition-all mt-2 disabled:opacity-60">{visitorSubmitting ? 'กำลังบันทึก...' : 'บันทึกโน้ตผู้มาเยือน'}</button>
                </form>
             </div>
          </div>
        )}

        {loading ? (<div className="p-10 text-center text-slate-400 bg-white/60 backdrop-blur-xl rounded-3xl shadow-sm border border-white">กำลังโหลดข้อมูล...</div>) : filteredMedicines.length === 0 ? (<div className="p-10 text-center text-slate-400 bg-white/60 backdrop-blur-xl rounded-3xl shadow-sm border border-white">ไม่พบรายการยาที่ตรงกับเงื่อนไข</div>) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
            {filteredMedicines.map((med) => {
              const activeLots = (med.medicine_lots || []).filter((l: any) => l.current_stock > 0).sort((a: any, b: any) => new Date(a.exp_date).getTime() - new Date(b.exp_date).getTime());
              const medStats = calculateMedStats(med);
              const latestPackSize = activeLots.length > 0 ? activeLots[0].pack_size : (med.medicine_lots?.[0]?.pack_size || 100);
              const latestUnitName = activeLots.length > 0 ? activeLots[0].unit_name : (med.medicine_lots?.[0]?.unit_name || 'หน่วย');
              const isAvail = med.is_available !== false;

              return (
                <div key={med.id} className={`bg-white/70 backdrop-blur-xl rounded-3xl shadow-sm border p-5 relative flex flex-col gap-3.5 transition-all ${!isAvail ? 'border-red-300/80 bg-red-50/70' : 'border-white/80 hover:shadow-md'}`}>
                  <div className="flex justify-between items-start border-b border-white/50 pb-3">
                    <div className="w-full">
                      <div onClick={() => openHistoryModal(med)} className="font-extrabold text-slate-800 text-lg cursor-pointer hover:text-blue-500 tracking-tight leading-tight">{med.name}</div>
                      <div className="text-xs text-slate-500 mt-1.5 font-medium">รหัส HosXP: <span className="font-bold">{med.hosxp_icode || "-"}</span></div>
                      {med.note && <div className="text-[10px] text-amber-700 bg-amber-50/80 px-2.5 py-1 rounded-lg border border-amber-100/50 mt-1.5 inline-block font-medium">หมายเหตุ: {med.note}</div>}
                      <div className="mt-1.5"><span className="text-[10px] font-semibold bg-white/60 text-slate-600 px-3 py-1 rounded-full border border-white shadow-sm w-fit inline-block">ตู้ยา: {getCategoryName(med.cabinet_category)}</span></div>
                    </div>
                    <div className="flex flex-col gap-2 shrink-0 w-[72px]">
                      <div className="flex gap-1.5 w-full"><button onClick={() => openEditMedModal(med)} className="flex-1 p-2 bg-white/60 border border-white text-slate-500 rounded-xl hover:bg-blue-50 hover:text-blue-600 flex justify-center shadow-sm"><Edit size={14} /></button><button onClick={() => handleDeleteMed(med.id)} className="flex-1 p-2 bg-white/60 border border-white text-slate-500 rounded-xl hover:bg-red-50 hover:text-red-500 flex justify-center shadow-sm"><Trash2 size={14} /></button></div>
                      <button onClick={() => toggleAvailability(med)} className={`w-full py-1.5 text-[10px] font-bold border rounded-xl flex justify-center items-center gap-1 shadow-sm transition-colors ${isAvail ? 'bg-emerald-50/80 text-emerald-700 border-emerald-200/50 hover:bg-emerald-100' : 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${isAvail ? 'bg-emerald-400' : 'bg-red-500'}`}></div>{isAvail ? "เบิกได้" : "คลังเป็น 0"}
                      </button>
                    </div>
                  </div>
                  <div>
                     <div className="text-[11px] font-bold text-slate-500 mb-2">คงเหลือ (แยกตาม EXP):</div>
                     {activeLots.length === 0 ? <span className="text-red-500 text-xs font-bold px-4 py-1.5 bg-red-50/80 rounded-xl border border-red-200 backdrop-blur-sm shadow-sm inline-block">สต็อกหมด</span> : (
                       <div className="flex flex-col gap-2">
                          {activeLots.map((lot: any) => {
                            const fullPacks = Math.floor(lot.current_stock / lot.pack_size); const remainder = lot.current_stock % lot.pack_size;
                            return (
                              <div key={lot.id} className="flex justify-between items-center bg-white/50 border border-white p-2.5 rounded-2xl shadow-sm">
                                <span className="text-[10px] font-bold text-rose-500 flex items-center gap-1"><CalendarDays size={12} /> EXP: {lot.exp_date}</span>
                                <div className="flex items-baseline gap-1 text-sm"><span className="font-extrabold text-emerald-600">{fullPacks}</span><span className="text-slate-400 text-[9px] font-medium">x</span><span className="text-slate-700 font-bold">{lot.pack_size}</span>{remainder > 0 && <span className="text-amber-500 font-bold ml-1 text-[9px]">เศษ {remainder}</span>}<span className="text-slate-500 text-[9px] ml-1 font-medium">{lot.unit_name}</span></div>
                              </div>
                            )
                          })}
                       </div>
                     )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-auto pt-2">
                      <button onClick={() => openStockModal(med, 'in')} className="flex items-center justify-center gap-1.5 p-2.5 bg-emerald-50/80 text-emerald-700 rounded-xl border border-emerald-100/50 font-bold text-xs shadow-sm hover:bg-emerald-100 transition-colors"><PackagePlus size={16} /> รับเข้า</button>
                      <button onClick={() => openStockModal(med, 'out')} className="flex items-center justify-center gap-1.5 p-2.5 bg-red-50/80 text-red-700 rounded-xl border border-red-100/50 font-bold text-xs shadow-sm hover:bg-red-100 transition-colors"><PackageMinus size={16} /> ตัดจ่าย</button>
                  </div>
                  <div className="bg-blue-50/40 backdrop-blur-sm p-3 rounded-2xl border border-blue-100/30 mt-1 space-y-1.5">
                    <div className="flex justify-between text-[11px]"><span className="text-slate-500 font-medium">ใช้รวม ({medStats.daysDiff} วัน):</span><span className="font-bold text-slate-800">{formatBoxString(medStats.totalUsage, latestPackSize, latestUnitName)}</span></div>
                    <div className="flex justify-between text-[11px]"><span className="text-amber-600 font-medium">เบิก 1 สัปดาห์:</span><span className="font-extrabold text-amber-600">{formatBoxString(medStats.target1Week, latestPackSize, latestUnitName)}</span></div>
                    <div className="flex justify-between text-[11px]"><span className="text-emerald-600 font-medium">เบิก 2 สัปดาห์:</span><span className="font-extrabold text-emerald-600">{formatBoxString(medStats.target2Weeks, latestPackSize, latestUnitName)}</span></div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Modal: Change Password */}
        {isChangePwdModalOpen && (
          <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-md flex items-center justify-center p-4 z-[80]">
            <div className="bg-white/90 backdrop-blur-xl border border-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center relative">
               <button onClick={() => setIsChangePwdModalOpen(false)} className="absolute top-4 right-4 p-1 hover:bg-white/60 rounded-xl"><X size={20} className="text-slate-400"/></button>
               <div className="w-16 h-16 bg-blue-100/80 text-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm border border-blue-200/50"><KeyRound size={32}/></div>
               <h2 className="text-lg font-bold text-slate-800 mb-4">เปลี่ยนรหัสผ่าน</h2>
               <form onSubmit={handleChangePassword} className="space-y-4 text-left">
                  <div><label className="block text-sm font-medium mb-1.5 text-slate-600">รหัสผ่านเดิม</label><input type="password" required className="w-full bg-white/50 border border-white rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-400 shadow-sm" value={oldPwd} onChange={(e) => setOldPwd(e.target.value)} /></div>
                  <div><label className="block text-sm font-medium mb-1.5 text-slate-600">รหัสผ่านใหม่</label><input type="password" required className="w-full bg-white/50 border border-white rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-400 shadow-sm" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} /></div>
                  <div><label className="block text-sm font-medium mb-1.5 text-slate-600">ยืนยันรหัสผ่านใหม่</label><input type="password" required className="w-full bg-white/50 border border-white rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-400 shadow-sm" value={newPwd2} onChange={(e) => setNewPwd2(e.target.value)} /></div>
                  {pwdError && <p className="text-red-500 text-sm">{pwdError}</p>}
                  <button type="submit" disabled={isSubmitting} className="w-full bg-blue-500 hover:bg-blue-600 text-white p-3.5 rounded-xl font-medium shadow-md transition-colors disabled:opacity-60">{isSubmitting ? "กำลังบันทึก..." : "ยืนยันการเปลี่ยนรหัสผ่าน"}</button>
               </form>
            </div>
          </div>
        )}

        {/* Modal: Add/Edit Med */}
        {isMedModalOpen && (
          <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-md flex items-center justify-center p-4 z-[60]">
            <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-white">
              <div className="flex justify-between items-center p-5 md:p-6 border-b border-white/50 bg-white/40"><h2 className="text-lg md:text-xl font-bold text-slate-800">{isEditing ? 'แก้ไขข้อมูลยา' : 'เพิ่มรายการยาใหม่'}</h2><button onClick={() => setIsMedModalOpen(false)} className="p-1 hover:bg-white/60 rounded-xl transition-colors"><X size={22} className="text-slate-500" /></button></div>
              <form onSubmit={handleSaveMedicine} className="p-5 md:p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium mb-1.5 text-slate-600">ชื่อยา *</label><input type="text" required className="w-full border border-white bg-white/50 shadow-sm rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-400" value={medFormData.name} onChange={(e) => setMedFormData({ ...medFormData, name: e.target.value })} /></div>
                  <div><label className="block text-sm font-medium mb-1.5 text-slate-600">รหัส HosXP</label><input type="text" className="w-full border border-white bg-white/50 shadow-sm rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-400" value={medFormData.hosxp_icode} onChange={(e) => setMedFormData({ ...medFormData, hosxp_icode: e.target.value })} /></div>
                </div>
                <div><label className="block text-sm font-medium mb-1.5 text-slate-600">หมวดหมู่ตู้ยา</label><select className="w-full border border-white bg-white/50 shadow-sm rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-400 font-medium text-slate-700" value={medFormData.cabinet_category} onChange={(e) => setMedFormData({ ...medFormData, cabinet_category: e.target.value })}>{categoriesList?.map(cat => <option key={cat.id} value={cat.id.toString()}>{cat.name}</option>)}</select></div>
                <div><label className="block text-sm font-medium mb-1.5 text-slate-600">หมายเหตุ</label><textarea className="w-full border border-white bg-white/50 shadow-sm rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-400" rows={2} value={medFormData.note} onChange={(e) => setMedFormData({ ...medFormData, note: e.target.value })} /></div>
                <div className="pt-4 flex gap-3"><button type="button" onClick={() => setIsMedModalOpen(false)} className="flex-1 bg-white/60 border border-white hover:bg-white/90 p-3.5 rounded-xl font-medium text-slate-600 shadow-sm">ยกเลิก</button><button type="submit" className="flex-1 bg-blue-500 hover:bg-blue-600 text-white p-3.5 rounded-xl font-medium shadow-md shadow-blue-200 transition-colors">{isEditing ? 'บันทึกการแก้ไข' : 'บันทึกยาใหม่'}</button></div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: QR, Report, Import */}
        {isQRModalOpen && (
          <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-md flex items-center justify-center p-4 z-[60]">
            <div className="bg-white/80 backdrop-blur-xl border border-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
              <div className="flex justify-between items-center p-5 border-b border-white/50"><h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><QrCode size={20}/> พิมพ์ QR Code</h2><button onClick={() => setIsQRModalOpen(false)}><X size={22} className="text-slate-400 hover:text-slate-600" /></button></div>
              <div className="p-6 space-y-4">
                <div>
                   <label className="block text-sm font-medium mb-1.5 text-slate-600">เลือกตู้ยา (Cabinet)</label>
                   <select className="w-full bg-white/60 border border-white/80 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-400 font-medium text-slate-700 shadow-sm" value={qrTargetCategory} onChange={(e) => { setQrTargetCategory(e.target.value === "all" ? "all" : Number(e.target.value)); setQrTargetId("all"); }}>
                      <option value="all">-- ทุกตู้ยา --</option>
                      {categoriesList?.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                   </select>
                </div>
                <div>
                   <label className="block text-sm font-medium mb-1.5 text-slate-600">เลือกรายการยา</label>
                   <select className="w-full bg-white/60 border border-white/80 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-400 font-medium text-slate-700 shadow-sm" value={qrTargetId} onChange={(e) => setQrTargetId(e.target.value)}>
                      <option value="all">-- พิมพ์ทั้งหมด (ตามตู้ที่เลือก) --</option>
                      {medicines.filter(m => qrTargetCategory === "all" || String(m.cabinet_category) === String(qrTargetCategory)).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                   </select>
                </div>
                <div className="pt-2 flex gap-3"><button onClick={() => setIsQRModalOpen(false)} className="flex-1 bg-white/60 border border-white hover:bg-white/90 p-3.5 rounded-xl font-medium text-slate-600 shadow-sm">ยกเลิก</button><button onClick={handleGenerateQRPrint} className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white p-3.5 rounded-xl font-medium shadow-md transition-colors">สร้าง QR Code</button></div>
              </div>
            </div>
          </div>
        )}
        {isReportModalOpen && (
          <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-md flex items-center justify-center p-4 z-[60]">
            <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-white">
              <div className="flex justify-between items-center p-5 border-b border-white/50 bg-blue-50/50"><h2 className="text-lg font-bold flex items-center gap-2 text-blue-800"><FileText size={20} /> พิมพ์รายงาน Stock Card</h2><button onClick={() => setIsReportModalOpen(false)} className="p-1 hover:bg-white/60 rounded-xl transition-colors"><X size={20} className="text-blue-400" /></button></div>
              <div className="p-6 space-y-5">
                <div><label className="block text-sm font-medium mb-2 text-slate-600">เลือกตู้ยา (Cabinet)</label><select className="w-full bg-white/60 border border-white shadow-sm rounded-xl p-3.5 outline-none focus:ring-2 focus:ring-blue-400 font-medium text-slate-700" value={reportTargetCategory} onChange={(e) => { setReportTargetCategory(e.target.value === "all" ? "all" : Number(e.target.value)); setReportTargetId("all"); }}><option value="all">-- ทุกตู้ยา --</option>{categoriesList?.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}</select></div>
                <div><label className="block text-sm font-medium mb-2 text-slate-600">เลือกรายการยาที่ต้องการพิมพ์</label><select className="w-full bg-white/60 border border-white shadow-sm rounded-xl p-3.5 outline-none focus:ring-2 focus:ring-blue-400 font-medium text-slate-700" value={reportTargetId} onChange={(e) => setReportTargetId(e.target.value)}><option value="all">-- พิมพ์ทั้งหมด (ตามตู้ที่เลือก) --</option>{medicines.filter(m => reportTargetCategory === "all" || String(m.cabinet_category) === String(reportTargetCategory)).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></div>
                <div className="pt-2 flex gap-3"><button onClick={() => setIsReportModalOpen(false)} className="flex-1 bg-white/60 border border-white p-3.5 rounded-xl font-medium text-slate-600 shadow-sm">ยกเลิก</button><button onClick={handleGenerateReport} disabled={isGeneratingReport} className="flex-1 bg-blue-500 hover:bg-blue-600 text-white p-3.5 rounded-xl font-medium shadow-md shadow-blue-200 transition-colors disabled:opacity-60 flex justify-center items-center gap-2">{isGeneratingReport ? "รอสักครู่..." : <><Printer size={18}/> สร้าง PDF</>}</button></div>
              </div>
            </div>
          </div>
        )}
        {isImportModalOpen && (
          <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-md flex items-center justify-center p-4 z-[60]">
            <div className="bg-white/90 backdrop-blur-xl border border-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden p-6">
               <div className="flex justify-between items-center mb-4"><h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Upload size={20}/> นำเข้าข้อมูลยา</h2><button onClick={() => setIsImportModalOpen(false)}><X size={20} className="text-slate-400" /></button></div>
               <p className="text-xs text-slate-500 mb-3">รูปแบบข้อมูลแต่ละบรรทัด (คั่นด้วยจุลภาค comma): <br/><code className="bg-slate-100 p-1 rounded text-slate-700">ชื่อยา, รหัสHosXP, หมายเหตุ, รหัสตู้ยา(ตัวเลข), สต็อกขั้นต่ำ</code></p>
               <textarea rows={6} className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-400 mb-4 shadow-sm font-mono" placeholder="พาราสเซทตามอล, P01, ยาแก้ปวด, 1, 10&#10;อม็อกซี่ซิลลิน, A02, ยาปฏิชีวนะ, 1, 5" value={importText} onChange={(e) => setImportText(e.target.value)} />
               <div className="flex gap-3">
                  <button onClick={() => setIsImportModalOpen(false)} className="flex-1 bg-slate-100 text-slate-700 p-3.5 rounded-xl font-medium shadow-sm">ยกเลิก</button>
                  <button onClick={handleImportExcel} disabled={importing} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white p-3.5 rounded-xl font-medium shadow-md transition-colors disabled:opacity-60">{importing ? "กำลังนำเข้า..." : "ยืนยันการนำเข้า"}</button>
               </div>
            </div>
          </div>
        )}

        {/* Modal: Stock In/Out */}
        {isStockModalOpen && selectedMed && (
          <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-md flex items-center justify-center p-4 z-[70]">
            <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-white flex flex-col max-h-[90vh]">
              <div className={`flex justify-between items-center p-5 border-b border-white/50 ${stockAction === 'in' ? 'bg-emerald-50/60' : 'bg-red-50/60'}`}>
                <h2 className={`text-lg font-bold flex items-center gap-2 ${stockAction === 'in' ? 'text-emerald-700' : 'text-red-700'}`}>{stockAction === 'in' ? <PackagePlus size={22} /> : <PackageMinus size={22} />}{stockAction === 'in' ? 'รับเข้าสต็อก' : 'ตัดจ่ายสต็อก'}</h2>
                <button onClick={() => setIsStockModalOpen(false)}><X size={24} className="text-slate-400 hover:text-slate-600" /></button>
              </div>
              <form onSubmit={handleUpdateStock} className="p-6 space-y-4 overflow-y-auto">
                <div className="font-extrabold text-slate-800 mb-2 border-b border-slate-100 pb-3">{selectedMed.name}</div>
                {stockAction === 'in' ? (
                  <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100/50 space-y-3 shadow-inner">
                    <div className="bg-white/80 p-3 rounded-xl border border-emerald-200/50 shadow-sm flex flex-col gap-2">
                      <label className="flex items-center gap-2.5 cursor-pointer">
                        <input type="checkbox" className="w-4 h-4 text-emerald-500 rounded border-slate-300 focus:ring-emerald-400" checked={isPendingStock} onChange={(e) => setIsPendingStock(e.target.checked)} />
                        <span className="text-sm font-bold text-emerald-700">เป็นรายการรับเข้าล่วงหน้า (ยังไม่บวกสต็อก)</span>
                      </label>
                      {isPendingStock && (<div className="pl-6.5 mt-1"><label className="block text-xs font-medium text-emerald-600 mb-1">คาดว่าจะเข้าวันที่ *</label><input type="date" required className="w-full border border-emerald-200/50 rounded-lg p-2.5 text-sm bg-white" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} /></div>)}
                    </div>
                    <div className="flex gap-2 bg-white/60 p-1 rounded-xl border border-emerald-200/50">
                      <button type="button" onClick={() => setStockInMode('existing')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${stockInMode === 'existing' ? 'bg-emerald-100/80 text-emerald-700 shadow-sm' : 'text-slate-500 hover:bg-white'}`}>เลือกล็อตเดิม</button>
                      <button type="button" onClick={() => setStockInMode('new')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${stockInMode === 'new' ? 'bg-emerald-100/80 text-emerald-700 shadow-sm' : 'text-slate-500 hover:bg-white'}`}>+ เพิ่มล็อตใหม่</button>
                    </div>
                    {stockInMode === 'existing' ? (
                      <div><label className="block text-sm font-bold text-emerald-700 mb-1.5">เลือกล็อต (EXP) *</label><select required className="w-full bg-white border border-emerald-200/50 rounded-xl p-3 font-medium outline-none focus:ring-2 focus:ring-emerald-400 shadow-sm" value={selectedLotId} onChange={(e) => { setSelectedLotId(e.target.value); const l = (selectedMed.medicine_lots || []).find((x: any) => String(x.id) === e.target.value); if(l) { setStockPackSize(l.pack_size.toString()); setStockUnitName(l.unit_name); }}}><option value="">-- กรุณาเลือกล็อต --</option>{(selectedMed.medicine_lots || []).map((lot: any) => { const packs = Math.floor(lot.current_stock / lot.pack_size); const remainder = lot.current_stock % lot.pack_size; const unitString = lot.unit_name === "'s" ? "'" : ` ${lot.unit_name}`; const remainderText = remainder > 0 ? ` เศษ ${remainder}` : ""; return <option key={lot.id} value={lot.id}>EXP: {lot.exp_date} (เหลือ: {packs}x{lot.pack_size}{unitString}{remainderText})</option> })}</select></div>
                    ) : (
                      <><div className="grid grid-cols-2 gap-3"><div className="col-span-2"><label className="block text-sm font-bold text-emerald-700 mb-1.5">วันหมดอายุ (EXP) *</label><input type="date" required className="w-full bg-white border border-emerald-200/50 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-400 shadow-sm" value={stockExpDate} onChange={(e) => setStockExpDate(e.target.value)} /></div><div><label className="block text-sm font-bold text-emerald-700 mb-1.5">ขนาดบรรจุ / กล่อง</label><input type="number" required min="1" className="w-full bg-white border border-emerald-200/50 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-400 shadow-sm" value={stockPackSize} onChange={(e) => setStockPackSize(e.target.value)} /></div><div><label className="block text-sm font-bold text-emerald-700 mb-1.5">หน่วยนับ</label><select className="w-full bg-white border border-emerald-200/50 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-400 shadow-sm" value={stockUnitName} onChange={(e) => setStockUnitName(e.target.value)}><option value="'s">'s (เม็ด)</option><option value="vial">vial</option><option value="amp">amp</option><option value="bottle">bottle</option><option value="box">box</option></select></div></div></>
                    )}
                  </div>
                ) : (
                  <div className="bg-red-50/50 p-4 rounded-2xl border border-red-100/50 shadow-inner">
                    <label className="block text-sm font-bold text-red-700 mb-2">เลือกล็อต EXP ที่ต้องการหักสต็อก *</label>
                    <select required className="w-full bg-white border border-red-200/50 rounded-xl p-3.5 font-medium outline-none focus:ring-2 focus:ring-red-400 shadow-sm" value={selectedLotId} onChange={(e) => setSelectedLotId(e.target.value)}>
                      <option value="">-- กรุณาเลือกล็อต --</option>
                      {(selectedMed.medicine_lots || []).filter((l: any) => l.current_stock > 0).map((lot: any) => { const packs = Math.floor(lot.current_stock / lot.pack_size); const remainder = lot.current_stock % lot.pack_size; const unitString = lot.unit_name === "'s" ? "'" : ` ${lot.unit_name}`; const remainderText = remainder > 0 ? ` เศษ ${remainder}` : ""; return <option key={lot.id} value={lot.id}>EXP: {lot.exp_date} (เหลือ: {packs}x{lot.pack_size}{unitString}{remainderText})</option> })}
                    </select>
                  </div>
                )}
                <div className="mt-5 space-y-3">
                  <div>
                    <div className="flex bg-slate-100/80 p-1.5 rounded-xl mb-3 shadow-inner">
                      <button type="button" className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${inputMode === 'base' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`} onClick={() => setInputMode('base')}>กรอกเป็นเม็ด/ชิ้น</button>
                      <button type="button" className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${inputMode === 'pack' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`} onClick={() => setInputMode('pack')}>กรอกเป็นกล่อง/แพ็ค</button>
                    </div>
                    {inputMode === 'base' ? (
                      <div><label className="block text-sm font-medium mb-1.5 text-slate-600">ระบุจำนวน (ชิ้นย่อย)</label><input type="number" required min="1" className="w-full bg-white border border-slate-200 rounded-xl p-3.5 text-lg font-extrabold text-center outline-none focus:ring-2 focus:ring-blue-400 shadow-sm" value={inputAmount} onChange={(e) => setInputAmount(e.target.value)} /></div>
                    ) : (
                      <div><label className="block text-sm font-medium mb-1.5 text-slate-600">ระบุจำนวน (กล่อง/แพ็ค)</label><input type="number" step="0.1" required min="0.1" className="w-full bg-white border border-slate-200 rounded-xl p-3.5 text-lg font-extrabold text-center outline-none focus:ring-2 focus:ring-blue-400 shadow-sm" value={inputPackCount} onChange={(e) => setInputPackCount(e.target.value)} /></div>
                    )}
                  </div>
                  <div>
                     <label className="block text-sm font-medium mb-1.5 text-slate-600">หมายเหตุเพิ่มเติม (ถ้ามี)</label>
                     <input type="text" className="w-full bg-white border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-400 shadow-sm text-sm" placeholder="เช่น ยืมวอร์ด, แลกเปลี่ยนยา" value={stockNote} onChange={(e) => setStockNote(e.target.value)} />
                  </div>
                </div>
                <div className="pt-4 flex gap-3"><button type="button" onClick={() => setIsStockModalOpen(false)} className="flex-1 bg-white border border-slate-200 p-3.5 rounded-xl font-bold text-slate-600 shadow-sm">ยกเลิก</button><button type="submit" disabled={isSubmitting} className={`flex-1 text-white p-3.5 rounded-xl font-bold text-lg shadow-md transition-colors disabled:opacity-60 ${stockAction === 'in' ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200' : 'bg-red-500 hover:bg-red-600 shadow-red-200'}`}>{isSubmitting ? 'กำลังบันทึก...' : 'ยืนยัน'}</button></div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: History */}
        {isHistoryModalOpen && historyMed && (
          <div className="fixed inset-0 bg-slate-50 flex flex-col z-50 overflow-y-auto w-full h-full">
            <div className="bg-white/80 backdrop-blur-md border-b border-slate-200 flex justify-between items-center p-4 sticky top-0 z-10 shadow-sm">
              <button onClick={() => { setIsHistoryModalOpen(false); setHistoryMed(null); setHistoryRows([]); }} className="flex items-center text-sm font-bold text-slate-600 hover:text-blue-600 transition-colors"><ArrowLeft size={18} className="mr-1.5"/> กลับหน้ารวม</button>
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full"><User size={14} /> {session.name}</div>
            </div>
            <div className="p-4 md:p-6 max-w-3xl mx-auto w-full space-y-5 pb-20">
              <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100">
                <div className="text-center mb-6">
                  <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight">{historyMed.name}</h1>
                  <div className="flex justify-center gap-2.5 mt-3 flex-wrap">
                    <span className="px-3 py-1 bg-slate-100 rounded-full text-xs font-bold text-slate-600">รหัส: {historyMed.hosxp_icode || "-"}</span>
                    <span className="px-3 py-1 bg-blue-50 border border-blue-100 rounded-full text-xs font-bold text-blue-600">ตู้ยา: {getCategoryName(historyMed.cabinet_category)}</span>
                  </div>
                </div>
                <div className="mb-6 bg-slate-50 rounded-2xl p-5 border border-slate-100">
                  <h3 className="text-sm font-bold flex items-center gap-2 mb-4 text-slate-600"><CalendarDays size={18} /> สต็อกคงเหลือแบ่งตาม EXP</h3>
                  <div className="flex flex-wrap gap-3">
                    {(!historyMed.medicine_lots || historyMed.medicine_lots.filter((l: any) => l.current_stock > 0).length === 0) ? <div className="text-sm text-red-500 font-bold bg-red-50 px-4 py-2 rounded-xl border border-red-100">สต็อกหมด</div> : (
                      historyMed.medicine_lots.filter((l: any) => l.current_stock > 0).sort((a: any, b: any) => new Date(a.exp_date).getTime() - new Date(b.exp_date).getTime()).map((lot: any) => {
                          const packs = Math.floor(lot.current_stock / lot.pack_size); const remainder = lot.current_stock % lot.pack_size;
                          return (
                            <div key={lot.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm min-w-[160px]">
                              <div className="text-xs font-bold text-rose-500 mb-2 border-b border-slate-50 pb-2">EXP: {lot.exp_date}</div>
                              <div className="flex items-baseline gap-1.5 text-lg"><span className="font-extrabold text-emerald-600">{packs}</span><span className="text-slate-400 text-sm font-medium">x</span><span className="text-slate-700 text-base font-bold">{lot.pack_size}</span>{remainder > 0 && <span className="text-amber-500 font-bold ml-1 text-xs">เศษ {remainder}</span>}<span className="text-slate-500 text-xs ml-0.5 font-medium">{lot.unit_name}</span></div>
                              <div className="text-[10px] text-slate-400 mt-1.5 font-medium">รวม {lot.current_stock} หน่วย</div>
                            </div>
                          )
                        })
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  <button onClick={() => openStockModal(historyMed, 'in')} className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-100/80 text-emerald-700 p-5 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all shadow-sm"><PackagePlus size={28} /><span className="font-bold text-sm md:text-base">รับเข้าสต็อก</span></button>
                  <button onClick={() => openStockModal(historyMed, 'out')} className="bg-red-50 hover:bg-red-100 border border-red-100/80 text-red-700 p-5 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all shadow-sm"><PackageMinus size={28} /><span className="font-bold text-sm md:text-base">ตัดจ่ายสต็อก</span></button>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100">
                <h3 className="text-sm font-bold flex items-center gap-2 mb-5 text-slate-700 border-b pb-4 border-slate-100"><History size={20} /> ประวัติการทำรายการล่าสุด</h3>
                <div className="space-y-3.5">
                  {historyLoading ? <div className="text-center text-slate-500 py-10 font-medium">กำลังโหลดข้อมูล...</div> : historyRows.filter(r => r.status !== 'visitor_note' && r.status !== 'visitor_acknowledged').length === 0 ? <div className="text-center text-slate-400 py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200 font-medium">ยังไม่มีประวัติการรับเข้า/ตัดจ่าย</div> : (
                    historyRows.filter(r => r.status !== 'visitor_note' && r.status !== 'visitor_acknowledged').map((row: any) => {
                      const isInc = row.action === 'in'; const isPending = row.status === 'pending';
                      const lotInfo = (historyMed.medicine_lots || []).find((l: any) => l.id.toString() === row.lot_id?.toString());
                      const pSize = lotInfo?.pack_size || 100; const pUnit = lotInfo?.unit_name || 'หน่วย';
                      
                      return (
                        <div key={row.id} className="flex flex-col gap-2 bg-white border border-slate-100 rounded-2xl p-4 md:p-5 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3 md:gap-4">
                              <div className={`p-2.5 rounded-xl mt-0.5 shadow-sm ${isPending ? 'bg-amber-100 text-amber-600' : isInc ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                {isPending ? <Clock size={22} /> : isInc ? <PackagePlus size={22} /> : <PackageMinus size={22} />}
                              </div>
                              <div>
                                <div className={`text-sm md:text-base font-extrabold ${isPending ? 'text-amber-700' : isInc ? 'text-emerald-700' : 'text-red-700'}`}>
                                  {isPending ? 'รอรับเข้า' : isInc ? 'รับเข้า' : 'ตัดจ่าย'} {formatBoxString(row.amount, pSize, pUnit)}
                                </div>
                                <div className="text-xs font-bold text-blue-500 mt-0.5">(รวมทั้งหมด {row.amount} {pUnit})</div>
                                <div className="text-[10px] md:text-xs text-slate-500 flex items-center gap-1 mt-2 font-medium"><CalendarDays size={12} /> EXP: {row.exp_date || "-"}</div>
                                <div className="text-[10px] text-slate-400 mt-1 font-medium">{formatHistoryDate(row.created_at)}</div>
                                
                                {isPending && <div className="mt-2.5 text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 inline-block shadow-sm">คาดว่าจะเข้า: {row.expected_date ? new Date(row.expected_date).toLocaleDateString('th-TH') : '-'}</div>}
                                {row.edit_note && <div className="mt-2.5 text-[10px] text-slate-500 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200 inline-block font-medium">หมายเหตุ: {row.edit_note}</div>}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2 shrink-0">
                               <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200 shadow-sm"><User size={12} /> {row.staff_name}</div>
                               {isPending && (
                                 <PendingApproveButton tx={row} onApprove={(setDone) => handleApprovePending(row, setDone)} />
                               )}
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PendingApproveButton({ tx, onApprove }: { tx: any, onApprove: (setDone: (val: boolean) => void) => void }) {
  const [done, setDone] = useState(false);
  return (
    <button 
      onClick={() => onApprove(setDone)} 
      disabled={done} 
      className={`text-[10px] md:text-xs font-bold px-3 py-2 rounded-lg shadow-sm transition-colors mt-1 ${done ? 'bg-slate-300 text-slate-700 cursor-not-allowed' : 'bg-emerald-500 text-white hover:bg-emerald-600'}`}
    >
      {done ? 'รับของเข้าสต็อกแล้ว' : 'รับของเข้าสต็อก'}
    </button>
  );
}

export default function StockCardPage() {
  const [session, setSession] = useState<Session | null>(null); const [checkedSession, setCheckedSession] = useState(false);
  const [staffList, setStaffList] = useState<string[]>(DEFAULT_STAFF_LIST);

  const fetchStaffNames = async () => {
    try {
      const { data } = await supabase.from("staff_accounts").select("name").order("name");
      if (data && data.length > 0) {
        const names = data.map(d => d.name);
        const combined = Array.from(new Set([...DEFAULT_STAFF_LIST, ...names]));
        setStaffList(combined);
      }
    } catch (e) {}
  };

  useEffect(() => { 
    try { const raw = localStorage.getItem(SESSION_KEY); if (raw) setSession(JSON.parse(raw)); } catch { } 
    fetchStaffNames();
    setCheckedSession(true); 
  }, []);

  const handleLogout = () => { localStorage.removeItem(SESSION_KEY); setSession(null); };
  if (!checkedSession) return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400">กำลังโหลด...</div>;
  if (!session) return <LoginScreen staffList={staffList} onLogin={setSession} />;
  return <StockCardApp session={session} onLogout={handleLogout} staffList={staffList} refreshStaffList={fetchStaffNames} />;
}