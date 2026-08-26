"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import {
  Plus, PackagePlus, PackageMinus, X, Calculator, Edit, Trash2, CalendarDays,
  User, Users, Lock, LogOut, KeyRound, ShieldCheck, CheckCircle2, CircleDashed,
  Search, Tag, Check, LayoutGrid, History, TrendingDown, CalendarRange,
  FileText, Printer, QrCode, ArrowLeft, Upload, Download, ArrowUpDown, Clock
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import * as XLSX from "xlsx";

const STAFF_LIST = ["ศรีไพร", "จุฬารัตน์", "วิภาวรรณ", "ณัฏฐริกา", "ณัฐพร", "นทีทิพย์", "วรรณอาษา", "จุฑาภรณ์", "วีรากานต์", "มีนนรี"];
const CENTRAL_ACCOUNT_NAME = "บัญชีส่วนกลาง";
const SESSION_KEY = "stockcard_session_v1";

// ชุดสีสำหรับตู้ยาที่หลากหลายและสดใส มองเห็นง่าย
const CAT_COLORS = [
  "bg-blue-600 border-blue-600", "bg-emerald-600 border-emerald-600", "bg-purple-600 border-purple-600", 
  "bg-amber-600 border-amber-600", "bg-rose-600 border-rose-600", "bg-indigo-600 border-indigo-600",
  "bg-teal-600 border-teal-600", "bg-orange-600 border-orange-600", "bg-pink-600 border-pink-600",
  "bg-cyan-600 border-cyan-600", "bg-violet-600 border-violet-600", "bg-lime-600 border-lime-600"
];

type Session = { id: string; name: string; isCentral: boolean };
async function sha256Hex(t: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const formatBoxString = (totalItems: number, packSize: number, unitName: string) => {
  if (packSize <= 1 || totalItems === 0) return `${totalItems} ${unitName}`;
  const packs = Math.floor(totalItems / packSize);
  const rem = totalItems % packSize;
  if (packs === 0) return `${rem} ${unitName}`;
  return `${packs} กล่อง × ${packSize} ${unitName} ${rem > 0 ? `(เศษ ${rem} ${unitName})` : ''}`;
}

function LoginScreen({ onLogin }: { onLogin: (s: Session) => void }) {
  const [selectedName, setSelectedName] = useState<string | null>(null); const [staffRow, setStaffRow] = useState<any>(null);
  const [loadingRow, setLoadingRow] = useState(false); const [mode, setMode] = useState<"password" | "setPassword">("password");
  const [password, setPassword] = useState(""); const [password2, setPassword2] = useState("");
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const [centralBusy, setCentralBusy] = useState(false); const [centralError, setCentralError] = useState("");
  const closeModal = () => { setSelectedName(null); setStaffRow(null); setPassword(""); setPassword2(""); setError(""); };

  const openStaffLogin = async (name: string) => {
    setSelectedName(name); setError(""); setPassword(""); setPassword2(""); setLoadingRow(true);
    try {
      let { data, error } = await supabase.from("staff_accounts").select("*").eq("name", name).maybeSingle();
      if (error) throw error;
      if (!data) { const { data: inserted } = await supabase.from("staff_accounts").insert([{ name, is_central: false }]).select().single(); data = inserted; }
      setStaffRow(data); setMode(data.password_hash ? "password" : "setPassword");
    } catch (e: any) { setError("โหลดข้อมูลไม่สำเร็จ"); } finally { setLoadingRow(false); }
  };
  const handleCentralLogin = async () => {
    setCentralBusy(true); setCentralError("");
    try {
      let { data, error } = await supabase.from("staff_accounts").select("*").eq("name", CENTRAL_ACCOUNT_NAME).maybeSingle();
      if (error) throw error;
      if (!data) { const { data: inserted } = await supabase.from("staff_accounts").insert([{ name: CENTRAL_ACCOUNT_NAME, is_central: true }]).select().single(); data = inserted; }
      const session: Session = { id: data.id, name: data.name, isCentral: true }; localStorage.setItem(SESSION_KEY, JSON.stringify(session)); onLogin(session);
    } catch (e: any) { setCentralError("เข้าสู่ระบบไม่สำเร็จ"); } finally { setCentralBusy(false); }
  };
  const handleSubmitPassword = async (e: React.FormEvent) => {
    e.preventDefault(); if (!staffRow) return; setError("");
    if (mode === "setPassword") { if (password.length < 4) return setError("อย่างน้อย 4 ตัวอักษร"); if (password !== password2) return setError("รหัสไม่ตรงกัน"); }
    setBusy(true);
    try {
      const hash = await sha256Hex(password);
      if (mode === "setPassword") {
        const { data } = await supabase.from("staff_accounts").update({ password_hash: hash }).eq("id", staffRow.id).select().single();
        const session: Session = { id: data.id, name: data.name, isCentral: false }; localStorage.setItem(SESSION_KEY, JSON.stringify(session)); onLogin(session);
      } else {
        if (hash !== staffRow.password_hash) { setBusy(false); return setError("รหัสผ่านไม่ถูกต้อง"); }
        const session: Session = { id: staffRow.id, name: staffRow.name, isCentral: false }; localStorage.setItem(SESSION_KEY, JSON.stringify(session)); onLogin(session);
      }
    } catch (e: any) { setError("เกิดข้อผิดพลาด"); } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4"><div className="w-full max-w-2xl"><div className="text-center mb-8"><h1 className="text-2xl font-bold text-gray-800">ระบบคลังยา</h1><p className="text-gray-500 mt-1">กรุณาเลือกชื่อเจ้าหน้าที่เพื่อเข้าสู่ระบบ</p></div><div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4"><div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{STAFF_LIST.map((name) => (<button key={name} onClick={() => openStaffLogin(name)} className="flex items-center gap-2 justify-center border border-gray-200 rounded-lg p-3 font-medium text-gray-700 hover:border-blue-400 hover:bg-blue-50 transition-colors"><User size={16} className="text-gray-400" /> {name}</button>))}</div></div><button onClick={handleCentralLogin} disabled={centralBusy} className="w-full flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-900 text-white p-3.5 rounded-xl font-medium disabled:opacity-60"><Users size={18} /> {centralBusy ? "กำลังเข้าสู่ระบบ..." : `เข้าสู่ระบบด้วย${CENTRAL_ACCOUNT_NAME}`}</button>{centralError && <p className="text-red-600 text-sm mt-3 text-center">{centralError}</p>}{selectedName && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"><div className="bg-white rounded-xl shadow-lg w-full max-w-sm overflow-hidden"><div className="flex justify-between items-center p-5 border-b bg-blue-50 border-blue-100"><h2 className="text-lg font-bold flex items-center gap-2 text-blue-900"><Lock size={18} /> {selectedName}</h2><button onClick={closeModal}><X size={22} className="text-gray-400" /></button></div>{loadingRow ? (<div className="p-8 text-center text-gray-500">กำลังโหลด...</div>) : (<form onSubmit={handleSubmitPassword} className="p-6 space-y-4">{mode === "setPassword" && (<p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg p-3">ยังไม่เคยตั้งรหัสผ่าน กรุณาตั้งรหัสผ่านใหม่</p>)}<div><label className="block text-sm font-medium mb-1">{mode === "setPassword" ? "ตั้งรหัสผ่านใหม่" : "รหัสผ่าน"}</label><input type="password" required autoFocus className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500" value={password} onChange={(e) => setPassword(e.target.value)} /></div>{mode === "setPassword" && (<div><label className="block text-sm font-medium mb-1">ยืนยันรหัสผ่าน</label><input type="password" required className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500" value={password2} onChange={(e) => setPassword2(e.target.value)} /></div>)}{error && <p className="text-red-600 text-sm">{error}</p>}<button type="submit" disabled={busy} className="w-full bg-blue-600 text-white p-3 rounded-lg font-medium disabled:opacity-60">{busy ? "กำลังตรวจสอบ..." : mode === "setPassword" ? "ตั้งรหัสผ่านและเข้าสู่ระบบ" : "เข้าสู่ระบบ"}</button></form>)}</div></div>)}</div></div>
  );
}

function StockCardApp({ session, onLogout }: { session: Session; onLogout: () => void }) {
  const [medicines, setMedicines] = useState<any[]>([]); const [loading, setLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState<'recent' | 'alpha'>('alpha');

  const [isMedModalOpen, setIsMedModalOpen] = useState(false); const [isEditing, setIsEditing] = useState(false);
  const [medFormData, setMedFormData] = useState({ id: "", name: "", note: "", hosxp_icode: "", cabinet_category: "1", min_stock: "" });

  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [selectedMed, setSelectedMed] = useState<any>(null); const [stockAction, setStockAction] = useState<'in' | 'out'>('in');
  const [stockInMode, setStockInMode] = useState<'existing' | 'new'>('existing'); 
  const [stockExpDate, setStockExpDate] = useState(""); const [stockPackSize, setStockPackSize] = useState("100");
  const [stockUnitName, setStockUnitName] = useState("'s"); const [selectedLotId, setSelectedLotId] = useState("");
  const [inputMode, setInputMode] = useState<'base' | 'pack'>('base');
  const [inputAmount, setInputAmount] = useState(""); const [inputPackCount, setInputPackCount] = useState("");
  
  const [isPendingStock, setIsPendingStock] = useState(false);
  const [expectedDate, setExpectedDate] = useState("");

  const [categoriesList, setCategoriesList] = useState<{id: number, name: string}[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | "all">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [categoryNameInput, setCategoryNameInput] = useState("");

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyMed, setHistoryMed] = useState<any>(null);
  const [historyRows, setHistoryRows] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [allTransactions, setAllTransactions] = useState<any[]>([]);

  const [globalPeriodMode, setGlobalPeriodMode] = useState<'1m' | '2m' | '3m' | 'custom'>('1m');
  const [globalStartDate, setGlobalStartDate] = useState(""); const [globalEndDate, setGlobalEndDate] = useState("");

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportTargetCategory, setReportTargetCategory] = useState<number | "all">("all");
  const [reportTargetId, setReportTargetId] = useState("all");
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [showPrintView, setShowPrintView] = useState(false); const [printData, setPrintData] = useState<any>({});

  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [qrTargetCategory, setQrTargetCategory] = useState<number | "all">("all");
  const [qrTargetId, setQrTargetId] = useState("all");
  const [showQRPrintView, setShowQRPrintView] = useState(false); const [qrPrintData, setQrPrintData] = useState<any[]>([]);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);

  const fetchMedicines = async () => {
    try {
      const { data, error } = await supabase.from("medicines").select(`*, medicine_lots (*)`).order("id", { ascending: false });
      if (error) throw error; if (data) setMedicines(data);
      const { data: txData } = await supabase.from("stock_transactions").select("*").in("action", ["out","in"]);
      if (txData) setAllTransactions(txData);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase.from("cabinet_categories").select("*").order("id");
      if (error) throw error; if (data && data.length > 0) setCategoriesList(data);
    } catch (error) { console.error(error); }
  };

  useEffect(() => { 
    fetchMedicines(); fetchCategories(); 
    const savedCat = localStorage.getItem(`saved_cat_${session.id}`);
    if (savedCat) setSelectedCategory(savedCat === "all" ? "all" : Number(savedCat));
  }, []);

  useEffect(() => { 
    if (isHistoryModalOpen && historyMed) { 
      const updated = medicines.find(m => m.id === historyMed.id); 
      if (updated) setHistoryMed(updated); 
    } 
  }, [medicines]);

  useEffect(() => {
    if (globalPeriodMode !== 'custom') {
      const end = new Date(); const start = new Date();
      if (globalPeriodMode === '1m') start.setMonth(start.getMonth() - 1);
      if (globalPeriodMode === '2m') start.setMonth(start.getMonth() - 2);
      if (globalPeriodMode === '3m') start.setMonth(start.getMonth() - 3);
      setGlobalEndDate(end.toISOString().split('T')[0]); setGlobalStartDate(start.toISOString().split('T')[0]);
    }
  }, [globalPeriodMode]);

  const handleSelectCategory = (catId: number | "all") => {
    setSelectedCategory(catId);
    localStorage.setItem(`saved_cat_${session.id}`, String(catId));
  }

  const handleAddCategory = async () => {
    const newName = prompt("กรุณาระบุชื่อตู้ยาใหม่ (เช่น ตู้ยา 11):");
    if (!newName || !newName.trim()) return;
    try { 
      const { data: existing } = await supabase.from("cabinet_categories").select("id").order("id", { ascending: false }).limit(1);
      const nextId = (existing && existing.length > 0) ? existing[0].id + 1 : 1;
      const { error } = await supabase.from("cabinet_categories").insert([{ id: nextId, name: newName.trim() }]); 
      if (error) throw error; fetchCategories(); 
    } catch (error: any) { alert("เพิ่มตู้ยาไม่สำเร็จ: " + error.message); }
  };

  const getCategoryName = (id: string | number) => { const cat = categoriesList?.find(c => String(c.id) === String(id)); return cat ? cat.name : id; };

  const filteredMedicines = medicines
    .filter((med) => selectedCategory === "all" || String(med.cabinet_category) === String(selectedCategory))
    .filter((med) => {
      const term = searchTerm.trim().toLowerCase(); if (!term) return true;
      return ((med.name || "").toLowerCase().includes(term) || (med.hosxp_icode || "").toLowerCase().includes(term) || (med.note || "").toLowerCase().includes(term));
    })
    .sort((a, b) => { if (sortOrder === 'alpha') return (a.name || "").localeCompare(b.name || "", "th"); return b.id - a.id; });

  const handleSaveMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: medFormData.name, note: medFormData.note, hosxp_icode: medFormData.hosxp_icode,
        cabinet_category: medFormData.cabinet_category, min_stock: parseInt(medFormData.min_stock) || 0,
        is_available: true
      };
      if (isEditing) { const { error } = await supabase.from("medicines").update(payload).eq("id", medFormData.id); if (error) throw error; } 
      else { const { error } = await supabase.from("medicines").insert([payload]); if (error) throw error; }
      setIsMedModalOpen(false); fetchMedicines();
    } catch (error: any) { alert("บันทึกไม่สำเร็จ: " + error.message); }
  };

  const openAddMedModal = () => {
    setIsEditing(false); setMedFormData({ id: "", name: "", note: "", hosxp_icode: "", cabinet_category: categoriesList && categoriesList.length > 0 ? String(categoriesList[0].id) : "1", min_stock: "" }); setIsMedModalOpen(true);
  };
  const openEditMedModal = (med: any) => {
    setIsEditing(true); setMedFormData({ id: med.id, name: med.name, note: med.note || "", hosxp_icode: med.hosxp_icode || "", cabinet_category: med.cabinet_category || (categoriesList && categoriesList.length > 0 ? String(categoriesList[0].id) : "1"), min_stock: med.min_stock?.toString() || "0" }); setIsMedModalOpen(true);
  };
  const handleDeleteMed = async (id: string) => {
    if (!confirm("ลบยานี้? (สต็อกทั้งหมดจะหายไป)")) return;
    try { await supabase.from("medicines").delete().eq("id", id); fetchMedicines(); } catch (error: any) { alert("ลบไม่สำเร็จ: " + error.message); }
  };

  const toggleAvailability = async (med: any) => {
    try {
      const newVal = med.is_available === false ? true : false;
      const { error } = await supabase.from("medicines").update({ is_available: newVal }).eq("id", med.id);
      if (error) throw error; fetchMedicines();
    } catch (e: any) { alert("เปลี่ยนสถานะไม่สำเร็จ: " + e.message); }
  }

  const handleUpdateStock = async (e: React.FormEvent) => {
    e.preventDefault(); let totalItems = 0;
    if (inputMode === 'base') {
      totalItems = parseInt(inputAmount); if (!totalItems || totalItems <= 0) return alert("ระบุจำนวนให้ถูกต้อง");
    } else {
      const packs = parseFloat(inputPackCount);
      const size = (stockAction === 'out' || stockInMode === 'existing') ? (selectedMed.medicine_lots || []).find((l: any) => l.id.toString() === selectedLotId)?.pack_size : parseInt(stockPackSize);
      if (!packs || packs <= 0 || !size || size <= 0) return alert("ระบุข้อมูลให้ครบถ้วน");
      totalItems = Math.round(packs * size);
    }

    try {
      const pending = stockAction === 'in' && isPendingStock;
      let finalLotId = selectedLotId;

      if (stockAction === 'in') {
        if (stockInMode === 'existing') {
          if (!selectedLotId) return alert("กรุณาเลือกล็อตที่มีอยู่");
          const existingLot = (selectedMed.medicine_lots || []).find((l: any) => String(l.id) === String(selectedLotId));
          if (!existingLot) return alert("ไม่พบข้อมูลล็อต");
          if (!pending) {
            const { error } = await supabase.from("medicine_lots").update({ current_stock: existingLot.current_stock + totalItems }).eq("id", existingLot.id);
            if (error) throw error;
          }
        } else {
          if (!stockExpDate) return alert("กรุณาระบุวันหมดอายุ (EXP)");
          const existingLot = (selectedMed.medicine_lots || []).find((l: any) => l.exp_date === stockExpDate && l.pack_size === parseInt(stockPackSize) && l.unit_name === stockUnitName);
          
          if (existingLot) {
            finalLotId = existingLot.id;
            if (!pending) {
               const { error } = await supabase.from("medicine_lots").update({ current_stock: existingLot.current_stock + totalItems }).eq("id", existingLot.id);
               if (error) throw error;
            }
          } else {
            const initStock = pending ? 0 : totalItems; 
            const { data: newLot, error } = await supabase.from("medicine_lots").insert([{ medicine_id: selectedMed.id, exp_date: stockExpDate, pack_size: parseInt(stockPackSize), unit_name: stockUnitName, current_stock: initStock }]).select().single();
            if (error) throw error;
            finalLotId = newLot.id;
          }
        }
      } else {
        if (!selectedLotId) return alert("กรุณาเลือกล็อตที่ต้องการตัดจ่าย");
        const lotToDeduct = (selectedMed.medicine_lots || []).find((l: any) => l.id.toString() === selectedLotId);
        if (!lotToDeduct) return alert("ไม่พบข้อมูลล็อต");
        if (totalItems > lotToDeduct.current_stock) return alert(`สต็อกไม่พอ! ต้องการเบิก ${totalItems} แต่มีแค่ ${lotToDeduct.current_stock}`);
        const { error } = await supabase.from("medicine_lots").update({ current_stock: lotToDeduct.current_stock - totalItems }).eq("id", lotToDeduct.id);
        if (error) throw error;
      }

      const expD = (selectedMed.medicine_lots || []).find((l:any) => String(l.id) === String(finalLotId))?.exp_date || stockExpDate;
      const txPayload: any = { medicine_id: String(selectedMed.id), lot_id: String(finalLotId), exp_date: expD, action: stockAction, amount: totalItems, staff_name: session.name, status: pending ? 'pending' : 'completed' };
      if (pending) txPayload.expected_date = expectedDate || null;
      
      await supabase.from("stock_transactions").insert([txPayload]);

      await fetchMedicines();
      setIsStockModalOpen(false); 
      if (isHistoryModalOpen && selectedMed) {
        const { data: freshMed } = await supabase.from("medicines").select(`*, medicine_lots (*)`).eq("id", selectedMed.id).single();
        if (freshMed) openHistoryModal(freshMed);
      }
    } catch (error: any) { alert("อัปเดตสต็อกไม่สำเร็จ: " + error.message); }
  };

  const openStockModal = (med: any, action: 'in' | 'out') => {
    setSelectedMed(med); setStockAction(action); setInputMode('base'); setInputAmount(""); setInputPackCount(""); setStockExpDate(""); setSelectedLotId("");
    setIsPendingStock(false); setExpectedDate("");
    if (action === 'in') {
      if (med.medicine_lots && med.medicine_lots.length > 0) {
        setStockInMode('existing'); const firstLot = med.medicine_lots[0];
        setSelectedLotId(firstLot.id.toString()); setStockPackSize(firstLot.pack_size.toString()); setStockUnitName(firstLot.unit_name);
      } else { setStockInMode('new'); setStockPackSize("100"); setStockUnitName("'s"); }
    } else {
      if (med.medicine_lots && med.medicine_lots.length > 0) {
        const firstLot = med.medicine_lots[0]; setStockPackSize(firstLot.pack_size.toString()); setStockUnitName(firstLot.unit_name);
      } else { setStockPackSize("100"); setStockUnitName("'s"); }
    }
    setIsStockModalOpen(true);
  };

  const openHistoryModal = async (med: any) => {
    setHistoryMed(med); setIsHistoryModalOpen(true); setHistoryLoading(true);
    try {
      const { data, error } = await supabase.from("stock_transactions").select("*").eq("medicine_id", String(med.id)).order("created_at", { ascending: false });
      if (error) throw error; setHistoryRows(data || []);
    } catch (error) { setHistoryRows([]); } finally { setHistoryLoading(false); }
  };

  const handleApprovePending = async (tx: any) => {
    if (!confirm("ยืนยันการนำรายการรับล่วงหน้านี้ เข้าสต็อกจริงใช่หรือไม่?")) return;
    try {
        const lot = (historyMed.medicine_lots || []).find((l: any) => l.id.toString() === tx.lot_id?.toString());
        if (lot) {
            const { error: lotErr } = await supabase.from("medicine_lots").update({ current_stock: lot.current_stock + tx.amount }).eq("id", lot.id);
            if (lotErr) throw lotErr;
        }
        await supabase.from("stock_transactions").update({ status: 'completed', edit_note: `อนุมัติรับเข้าโดย ${session.name} เมื่อ ${new Date().toLocaleDateString('th-TH')}` }).eq("id", tx.id);
        
        await fetchMedicines();
        const { data: freshMed } = await supabase.from("medicines").select(`*, medicine_lots (*)`).eq("id", historyMed.id).single();
        if (freshMed) await openHistoryModal(freshMed);

        alert("นำยอดเข้าสต็อกสำเร็จ");
    } catch (e: any) { alert("เกิดข้อผิดพลาด: " + e.message); }
  }

  const formatHistoryDate = (iso: string) => { try { return new Date(iso).toLocaleString("th-TH", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }); } catch { return iso; } };

  const calculateMedStats = (med: any) => {
    if (!globalStartDate || !globalEndDate) return { totalUsage: 0, target1Week: 0, target2Weeks: 0, daysDiff: 0 };
    const start = new Date(globalStartDate); const end = new Date(globalEndDate);
    start.setHours(0, 0, 0, 0); end.setHours(23, 59, 59, 999);
    let daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)); if (daysDiff < 1) daysDiff = 1;
    const medTx = allTransactions.filter(tx => { const txDate = new Date(tx.created_at); return String(tx.medicine_id) === String(med.id) && txDate >= start && txDate <= end && tx.status === 'completed'; });
    const totalUsage = medTx.reduce((sum, tx) => sum + tx.amount, 0);
    const dailyRate = totalUsage / daysDiff;
    return { totalUsage, target1Week: Math.ceil(dailyRate * 7 * 1.15), target2Weeks: Math.ceil(dailyRate * 14 * 1.15), daysDiff };
  };

  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    try {
      let query = supabase.from("stock_transactions").select("*").eq("status", "completed").order("created_at", { ascending: false });
      if (reportTargetId !== "all") query = query.eq("medicine_id", reportTargetId);
      const { data: txData, error } = await query; if (error) throw error;

      const grouped: any = {};
      const medsToProcess = medicines
         .filter(m => reportTargetCategory === "all" || String(m.cabinet_category) === String(reportTargetCategory))
         .filter(m => reportTargetId === "all" || m.id.toString() === reportTargetId);
      
      medsToProcess.forEach(med => {
         let currentTotalStock = (med.medicine_lots || []).reduce((sum: number, lot: any) => sum + lot.current_stock, 0);
         const medTxs = (txData || []).filter(tx => tx.medicine_id.toString() === med.id.toString());
         let runningBal = currentTotalStock;
         const processedTxs = medTxs.map(tx => {
             const balanceAfter = runningBal;
             if (tx.action === 'in') runningBal -= tx.amount; if (tx.action === 'out') runningBal += tx.amount;
             const lotInfo = (med.medicine_lots || []).find((l: any) => l.id.toString() === tx.lot_id?.toString());
             const pUnit = lotInfo?.unit_name || 'หน่วย'; const pSize = lotInfo?.pack_size || 100;
             const formatPrintPack = (amt: number) => {
                 if(pSize <= 1 || amt === 0) return `${amt} ${pUnit}`;
                 const p = Math.floor(amt / pSize); const r = amt % pSize;
                 return p === 0 ? `${r} ${pUnit}` : `${p} กล่อง${r > 0 ? ` เศษ ${r} ${pUnit}` : ''}`;
             };
             return { ...tx, balanceAfter, pUnit, lotExp: tx.exp_date, amountText: formatPrintPack(tx.amount), balanceText: formatPrintPack(balanceAfter) };
         });
         grouped[med.id] = { medName: med.name, hosxp: med.hosxp_icode, note: med.note, transactions: processedTxs.reverse() };
      });
      setPrintData(grouped); setShowPrintView(true); setIsReportModalOpen(false);
    } catch(e: any) { alert("เกิดข้อผิดพลาดในการดึงข้อมูลรายงาน: " + e.message); } finally { setIsGeneratingReport(false); }
  };

  const handleGenerateQRPrint = () => {
    let medsToPrint = medicines;
    if (qrTargetCategory !== "all") medsToPrint = medsToPrint.filter(m => String(m.cabinet_category) === String(qrTargetCategory));
    if (qrTargetId !== "all") medsToPrint = medsToPrint.filter(m => m.id.toString() === qrTargetId);
    setQrPrintData(medsToPrint); setShowQRPrintView(true); setIsQRModalOpen(false);
  };

  if (showPrintView) {
    return (
      <div className="bg-white min-h-screen text-black print:p-0 p-8"><div className="max-w-5xl mx-auto"><div className="print:hidden flex justify-between mb-6 bg-gray-100 p-4 rounded-xl"><div><h1 className="text-xl font-bold">ตัวอย่างก่อนพิมพ์รายงาน</h1></div><div className="flex gap-3"><button onClick={() => setShowPrintView(false)} className="px-4 py-2 border rounded-lg font-medium">ปิด</button><button onClick={() => window.print()} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium flex gap-2"><Printer size={18}/> พิมพ์ PDF</button></div></div><div className="print-content">{Object.values(printData).map((medData: any) => (<div key={medData.medName} style={{ pageBreakAfter: 'always' }} className="mb-10 pb-4"><h1 className="text-2xl font-bold text-center mb-2">รายงานประวัติการใช้ยา</h1><p className="text-center text-sm text-gray-600 mb-6">พิมพ์วันที่: {new Date().toLocaleString("th-TH")}</p><div className="mb-4 border-b-2 border-black pb-2"><h2 className="text-xl font-bold text-black">{medData.medName}</h2><div className="text-sm text-black">รหัส HosXP: {medData.hosxp || "-"} | หมายเหตุ: {medData.note || "-"}</div></div>{medData.transactions.length === 0 ? <p className="text-sm text-gray-500 italic py-4">ไม่มีประวัติการทำรายการ</p> : (<table className="w-full text-sm text-left border-collapse border border-gray-400"><thead><tr className="bg-gray-100"><th className="border border-gray-400 p-2 text-black font-bold">วันที่ทำรายการ</th><th className="border border-gray-400 p-2 text-center text-black font-bold">รับเข้า</th><th className="border border-gray-400 p-2 text-center text-black font-bold">ตัดจ่าย</th><th className="border border-gray-400 p-2 text-center text-black font-bold">ยอดยกไป (คงเหลือ)</th><th className="border border-gray-400 p-2 text-black font-bold">ผู้ดำเนินการ</th><th className="border border-gray-400 p-2 text-black font-bold">หมายเหตุ (EXP)</th></tr></thead><tbody>{medData.transactions.map((tx: any) => (<tr key={tx.id} className="border border-gray-400"><td className="border border-gray-400 p-2 text-black">{formatHistoryDate(tx.created_at)}</td><td className="border border-gray-400 p-2 text-center text-black font-medium">{tx.action === 'in' ? tx.amountText : '-'}</td><td className="border border-gray-400 p-2 text-center text-black font-medium">{tx.action === 'out' ? tx.amountText : '-'}</td><td className="border border-gray-400 p-2 text-center text-black font-bold">{tx.balanceText}</td><td className="border border-gray-400 p-2 text-black">{tx.staff_name}</td><td className="border border-gray-400 p-2 text-black text-xs">EXP: {tx.lotExp}</td></tr>))}</tbody></table>)}</div>))}</div></div></div>
    );
  }

  if (showQRPrintView) return ( <div className="bg-white min-h-screen text-black print:p-0 p-4"><div className="max-w-5xl mx-auto"><div className="print:hidden flex justify-between mb-6 bg-gray-100 p-4 rounded-xl"><h1 className="text-xl font-bold">พิมพ์ QR Code</h1><div className="flex gap-3"><button onClick={() => setShowQRPrintView(false)} className="px-4 py-2 border rounded-lg">ปิด</button><button onClick={() => window.print()} className="px-4 py-2 bg-blue-600 text-white rounded-lg flex gap-2"><Printer size={18}/> พิมพ์</button></div></div><div className="grid grid-cols-2 md:grid-cols-4 gap-4">{qrPrintData.map((med) => (<div key={med.id} className="border-2 border-dashed border-gray-400 p-4 flex flex-col items-center justify-center text-center"><QRCodeSVG value={`${typeof window !== 'undefined' ? window.location.origin : ''}/medicine/${med.id}`} size={100} /><div className="mt-3 font-bold text-sm leading-tight text-black">{med.name}</div></div>))}</div></div></div> );

  return (
    <div className="min-h-screen bg-gray-50 p-2 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-4 md:mb-8 bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="w-full flex justify-between items-start md:items-center">
            <div><h1 className="text-xl md:text-2xl font-bold text-gray-800 leading-tight">ระบบคลังยา <br className="md:hidden" /><span className="text-base md:text-2xl font-semibold text-gray-600">(จัดล็อต EXP)</span></h1></div>
            <div className="text-right md:hidden"><div className="text-[10px] font-medium text-gray-700 flex items-center justify-end gap-1 bg-gray-100 px-2 py-1 rounded-full"><User size={12} className="text-gray-500" /> {session.name}</div></div>
          </div>
          <div className="flex flex-wrap md:flex-nowrap items-center gap-2 w-full xl:w-auto mt-2 xl:mt-0">
            <button onClick={() => setIsQRModalOpen(true)} className="flex-1 md:flex-none flex justify-center items-center gap-1 md:gap-2 bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 px-2 md:px-3 py-2.5 md:py-2 rounded-lg font-medium text-xs md:text-sm"><QrCode size={16} /> <span className="hidden sm:inline">พิมพ์ QR ติดตู้</span><span className="sm:hidden">พิมพ์ QR</span></button>
            <button onClick={() => setIsReportModalOpen(true)} className="flex-1 md:flex-none flex justify-center items-center gap-1 md:gap-2 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 px-2 md:px-3 py-2.5 md:py-2 rounded-lg font-medium text-xs md:text-sm"><FileText size={16} /> พิมพ์รายงาน</button>
            <button onClick={() => setIsImportModalOpen(true)} className="flex-1 md:flex-none flex justify-center items-center gap-1 md:gap-2 bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 px-2 md:px-3 py-2.5 md:py-2 rounded-lg font-medium text-xs md:text-sm shadow-sm"><Upload size={16} /> นำเข้า Excel</button>
            <button onClick={openAddMedModal} className="flex-1 md:flex-none flex justify-center items-center gap-1 md:gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2.5 md:px-4 md:py-2 rounded-lg font-medium text-xs md:text-sm shadow-sm"><Plus size={16} /> เพิ่มยา</button>
            {session.isCentral && <button onClick={() => setIsAdminModalOpen(true)} title="จัดการรหัสผ่าน" className="p-2.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-blue-100 hover:text-blue-700"><ShieldCheck size={20} /></button>}
            <button onClick={onLogout} title="ออกจากระบบ" className="p-2.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-red-100 hover:text-red-700"><LogOut size={20} /></button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 md:p-4 mb-4 w-full">
          <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-gray-500"><LayoutGrid size={16} /> หมวดหมู่ตู้ยา (สีตู้หลากหลายและโดดเด่น)</div>
          <div className="flex flex-wrap gap-2 mb-3">
            <button onClick={() => handleSelectCategory("all")} className={`px-3.5 py-2 rounded-lg text-sm font-bold border transition-colors shadow-sm ${selectedCategory === "all" ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"}`}>ทั้งหมด</button>
            {categoriesList?.map((cat, index) => {
              // กำหนดสีที่แตกต่างกันตามลำดับ index ของตู้ยา
              const colorClass = selectedCategory === cat.id 
                ? `${CAT_COLORS[index % CAT_COLORS.length]} text-white shadow-md ring-2 ring-offset-2 ring-blue-400 font-bold` 
                : "bg-white text-gray-800 border-gray-300 hover:bg-gray-50 font-medium";
              return (
              <div key={cat.id} className={`flex items-center gap-0.5 rounded-lg border px-1 transition-all shadow-sm ${colorClass}`}>
                <button onClick={() => handleSelectCategory(cat.id)} className="pl-2.5 pr-2 py-1.5 text-sm">{cat.name}</button>
                <button onClick={() => { setEditingCategoryId(cat.id); setCategoryNameInput(cat.name); }} title="แก้ไขชื่อหมวดหมู่" className={`p-1 rounded-md transition-colors ${selectedCategory === cat.id ? "text-white hover:bg-black/20" : "text-gray-400 hover:text-blue-600 hover:bg-blue-50"}`}><Edit size={14} /></button>
              </div>
            )})}
            <button onClick={handleAddCategory} className="px-3.5 py-2 rounded-lg border border-dashed border-gray-400 text-gray-600 hover:bg-gray-50 text-sm font-medium flex items-center gap-1 transition-colors"><Plus size={14} /> เพิ่มตู้ยา</button>
          </div>
          <div className="flex flex-col md:flex-row gap-2 mt-3 items-center">
            <div className="relative flex-1 w-full"><Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="ค้นหาชื่อยา, HosXP หรือหมายเหตุ..." className="w-full border rounded-lg pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50/50 text-sm md:text-base" /></div>
            <div className="relative w-full md:w-auto shrink-0 flex items-center gap-2 border border-gray-200 rounded-lg bg-gray-50/50 px-3 py-1"><ArrowUpDown size={14} className="text-gray-500 shrink-0"/>
              <select className="w-full bg-transparent outline-none text-sm text-gray-700 py-1.5 cursor-pointer" value={sortOrder} onChange={(e) => setSortOrder(e.target.value as 'recent'|'alpha')}>
                <option value="alpha">เรียงตามตัวอักษร (A-Z, ก-ฮ)</option>
                <option value="recent">เรียงตามแก้ไขล่าสุด (ใหม่-เก่า)</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (<div className="p-8 text-center text-gray-500 bg-white rounded-xl shadow-sm border border-gray-100">กำลังโหลด...</div>) : filteredMedicines.length === 0 ? (<div className="p-8 text-center text-gray-500 bg-white rounded-xl shadow-sm border border-gray-100">ไม่พบรายการยาที่ตรงกับเงื่อนไข</div>) : (
          <>
            <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto pb-4">
                <table className="w-full text-left border-collapse min-w-[1050px]">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="p-4 font-semibold text-gray-600 w-32">จัดการ</th><th className="p-4 font-semibold text-gray-600 w-1/4">รหัส/ชื่อยา</th><th className="p-4 font-semibold text-gray-600 text-center w-32">รับเข้า/ตัดจ่าย</th><th className="p-4 font-semibold text-gray-600">คงเหลือ (แยกตาม EXP)</th><th className="p-4 font-semibold text-gray-600 w-56">สถิติ & รอบเบิก (1 / 2 สัปดาห์)</th><th className="p-4 font-semibold text-gray-600 text-center w-32">QR Code</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMedicines.map((med) => {
                      const activeLots = (med.medicine_lots || []).filter((l: any) => l.current_stock > 0).sort((a: any, b: any) => new Date(a.exp_date).getTime() - new Date(b.exp_date).getTime());
                      const medStats = calculateMedStats(med);
                      const latestPackSize = activeLots.length > 0 ? activeLots[0].pack_size : (med.medicine_lots?.[0]?.pack_size || 100);
                      const latestUnitName = activeLots.length > 0 ? activeLots[0].unit_name : (med.medicine_lots?.[0]?.unit_name || 'หน่วย');
                      const isAvail = med.is_available !== false;

                      return (
                        <tr key={med.id} className={`border-b border-gray-50 transition-colors ${!isAvail ? 'opacity-70 bg-red-50/10' : 'hover:bg-blue-50/30'}`}>
                          <td className="p-4 align-top">
                            <div className="flex flex-col gap-2">
                              <div className="flex gap-2">
                                <button onClick={() => openEditMedModal(med)} className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-blue-100 hover:text-blue-700 transition-colors"><Edit size={16} /></button>
                                <button onClick={() => handleDeleteMed(med.id)} className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-red-100 hover:text-red-700 transition-colors"><Trash2 size={16} /></button>
                              </div>
                              <button onClick={() => toggleAvailability(med)} title={isAvail ? 'คลิกเพื่อเปลี่ยนเป็น "คลังเป็น 0"' : 'คลิกเพื่อเปลี่ยนเป็น "เบิกได้"'} className={`flex justify-center items-center gap-1 w-full py-1.5 border rounded-md text-xs font-bold transition-colors shadow-sm ${isAvail ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'}`}>
                                <div className={`w-2 h-2 rounded-full ${isAvail ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                                {isAvail ? "เบิกได้" : "คลังเป็น 0"}
                              </button>
                            </div>
                          </td>
                          <td className="p-4 align-top">
                            <div onClick={() => openHistoryModal(med)} className="font-bold text-gray-800 text-lg cursor-pointer hover:text-blue-600 hover:underline w-fit mb-1">{med.name}</div>
                            <div className="text-xs text-gray-500 mb-1 leading-snug">รหัส HosXP: <span className="font-semibold text-gray-700">{med.hosxp_icode || "-"}</span></div>
                            {med.note && <div className="text-[11px] text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-100 mb-2 inline-block">หมายเหตุ: {med.note}</div>}
                            <div><span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">ตู้ยา: {getCategoryName(med.cabinet_category)}</span></div>
                          </td>
                          <td className="p-4 align-top text-center">
                            <div className="flex justify-center gap-2 mt-1">
                              <button onClick={() => openStockModal(med, 'in')} className="p-3 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 shadow-sm transition-colors" title="รับเข้า"><PackagePlus size={20} /></button>
                              <button onClick={() => openStockModal(med, 'out')} className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 shadow-sm transition-colors" title="ตัดจ่าย"><PackageMinus size={20} /></button>
                            </div>
                          </td>
                          <td className="p-4 align-top">
                            {activeLots.length === 0 ? <span className="text-red-500 text-sm font-bold px-3 py-1 bg-red-50 rounded-lg border border-red-100">สต็อกหมด</span> : (
                              <div className="flex flex-col gap-2">
                                {activeLots.map((lot: any) => {
                                  const fullPacks = Math.floor(lot.current_stock / lot.pack_size); const remainder = lot.current_stock % lot.pack_size;
                                  return (
                                    <div key={lot.id} className="flex flex-col bg-white border border-gray-200 p-2.5 rounded-lg shadow-sm w-fit min-w-[140px]">
                                      <span className="text-xs font-semibold text-rose-600 flex items-center gap-1 mb-1 border-b border-gray-50 pb-1"><CalendarDays size={12} /> EXP: {lot.exp_date}</span>
                                      <div className="flex items-baseline gap-1 text-base"><span className="font-bold text-emerald-700">{fullPacks}</span><span className="text-gray-400 text-xs">x</span><span className="text-gray-700 font-medium">{lot.pack_size}</span>{remainder > 0 && <span className="text-amber-600 font-bold ml-1 text-xs">...เศษ {remainder}</span>}<span className="text-gray-500 text-xs ml-1">{lot.unit_name}</span></div>
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </td>
                          <td className="p-4 align-top">
                            <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-200 text-xs space-y-1.5">
                              <div className="flex justify-between border-b pb-1"><span className="text-gray-500">ใช้รวม ({medStats.daysDiff} วัน):</span><span className="font-bold text-gray-800">{formatBoxString(medStats.totalUsage, latestPackSize, latestUnitName)}</span></div>
                              <div className="flex justify-between text-amber-800 pt-0.5"><span>เบิก 1 สัปดาห์:</span><span className="font-bold">{formatBoxString(medStats.target1Week, latestPackSize, latestUnitName)}</span></div>
                              <div className="flex justify-between text-emerald-800 pt-0.5 border-t border-dashed"><span>เบิก 2 สัปดาห์:</span><span className="font-bold">{formatBoxString(medStats.target2Weeks, latestPackSize, latestUnitName)}</span></div>
                            </div>
                          </td>
                          <td className="p-4 text-center align-top"><div className="flex flex-col items-center justify-center p-2 bg-white rounded-lg border border-gray-200 shadow-sm mx-auto w-fit"><QRCodeSVG value={`${typeof window !== 'undefined' ? window.location.origin : ''}/medicine/${med.id}`} size={64} /></div></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="md:hidden flex flex-col gap-4">
              {filteredMedicines.map((med) => {
                const activeLots = (med.medicine_lots || []).filter((l: any) => l.current_stock > 0).sort((a: any, b: any) => new Date(a.exp_date).getTime() - new Date(b.exp_date).getTime());
                const medStats = calculateMedStats(med);
                const latestPackSize = activeLots.length > 0 ? activeLots[0].pack_size : (med.medicine_lots?.[0]?.pack_size || 100);
                const latestUnitName = activeLots.length > 0 ? activeLots[0].unit_name : (med.medicine_lots?.[0]?.unit_name || 'หน่วย');
                const isAvail = med.is_available !== false;

                return (
                  <div key={med.id} className={`bg-white rounded-xl shadow-sm border p-4 relative flex flex-col gap-3 ${!isAvail ? 'border-red-200 bg-red-50/20' : 'border-gray-200'}`}>
                    <div className="flex justify-between items-start border-b border-gray-100 pb-3">
                      <div>
                        <div onClick={() => openHistoryModal(med)} className="font-bold text-gray-800 text-lg cursor-pointer hover:text-blue-600 hover:underline">{med.name}</div>
                        <div className="text-xs text-gray-500 mt-1">รหัส HosXP: {med.hosxp_icode || "-"}</div>
                        {med.note && <div className="text-[10px] text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-100 mt-1 inline-block">หมายเหตุ: {med.note}</div>}
                        <div className="mt-1"><span className="text-[10px] font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full w-fit">ตู้ยา: {getCategoryName(med.cabinet_category)}</span></div>
                      </div>
                      <div className="flex flex-col gap-1.5 w-24">
                        <div className="flex gap-1 w-full"><button onClick={() => openEditMedModal(med)} className="flex-1 p-1.5 bg-gray-50 text-gray-600 rounded-md hover:bg-blue-100 flex justify-center"><Edit size={16} /></button><button onClick={() => handleDeleteMed(med.id)} className="flex-1 p-1.5 bg-gray-50 text-gray-600 rounded-md hover:bg-red-100 flex justify-center"><Trash2 size={16} /></button></div>
                        <button onClick={() => toggleAvailability(med)} className={`w-full py-1 text-[10px] font-bold border rounded-md flex justify-center items-center gap-1 shadow-sm ${isAvail ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${isAvail ? 'bg-emerald-500' : 'bg-red-500'}`}></div>{isAvail ? "เบิกได้" : "คลังเป็น 0"}
                        </button>
                      </div>
                    </div>
                    <div>
                       <div className="text-xs font-semibold text-gray-500 mb-2">คงเหลือ (แยกตาม EXP):</div>
                       {activeLots.length === 0 ? <span className="text-red-500 text-xs font-bold px-3 py-1 bg-red-50 rounded-lg border border-red-100">สต็อกหมด</span> : (
                         <div className="flex flex-col gap-2">
                            {activeLots.map((lot: any) => {
                              const fullPacks = Math.floor(lot.current_stock / lot.pack_size); const remainder = lot.current_stock % lot.pack_size;
                              return (
                                <div key={lot.id} className="flex justify-between items-center bg-gray-50 border border-gray-100 p-2.5 rounded-lg shadow-sm">
                                  <span className="text-[11px] font-semibold text-rose-600 flex items-center gap-1"><CalendarDays size={12} /> EXP: {lot.exp_date}</span>
                                  <div className="flex items-baseline gap-1 text-sm"><span className="font-bold text-emerald-700">{fullPacks}</span><span className="text-gray-400 text-[10px]">x</span><span className="text-gray-700 font-medium">{lot.pack_size}</span>{remainder > 0 && <span className="text-amber-600 font-bold ml-1 text-[10px]">เศษ {remainder}</span>}<span className="text-gray-500 text-[10px] ml-1">{lot.unit_name}</span></div>
                                </div>
                              )
                            })}
                         </div>
                       )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                        <button onClick={() => openStockModal(med, 'in')} className="flex items-center justify-center gap-2 p-2.5 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100 font-bold text-sm"><PackagePlus size={18} /> รับเข้า</button>
                        <button onClick={() => openStockModal(med, 'out')} className="flex items-center justify-center gap-2 p-2.5 bg-red-50 text-red-700 rounded-lg border border-red-100 font-bold text-sm"><PackageMinus size={18} /> ตัดจ่าย</button>
                    </div>
                    <div className="bg-blue-50/40 p-2.5 rounded-lg border border-blue-100/50 mt-1 space-y-1.5">
                      <div className="text-[10px] font-semibold text-gray-500 mb-1.5">สถิติและเป้าหมายสต็อก:</div>
                      <div className="flex justify-between text-xs"><span className="text-gray-600">ใช้รวม ({medStats.daysDiff} วัน):</span><span className="font-bold text-gray-800">{formatBoxString(medStats.totalUsage, latestPackSize, latestUnitName)}</span></div>
                      <div className="flex justify-between text-xs"><span className="text-amber-700">เบิก 1 สัปดาห์:</span><span className="font-bold text-amber-700">{formatBoxString(medStats.target1Week, latestPackSize, latestUnitName)}</span></div>
                      <div className="flex justify-between text-xs"><span className="text-emerald-700">เบิก 2 สัปดาห์:</span><span className="font-bold text-emerald-700">{formatBoxString(medStats.target2Weeks, latestPackSize, latestUnitName)}</span></div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {isMedModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
              <div className="flex justify-between items-center p-5 md:p-6 border-b bg-gray-50"><h2 className="text-lg md:text-xl font-bold text-gray-800">{isEditing ? 'แก้ไขข้อมูลยา' : 'เพิ่มรายการยาใหม่'}</h2><button onClick={() => setIsMedModalOpen(false)} className="p-1 hover:bg-gray-200 rounded-md transition-colors"><X size={22} className="text-gray-500" /></button></div>
              <form onSubmit={handleSaveMedicine} className="p-5 md:p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium mb-1.5 text-gray-700">ชื่อยา *</label><input type="text" required className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500" value={medFormData.name} onChange={(e) => setMedFormData({ ...medFormData, name: e.target.value })} /></div>
                  <div><label className="block text-sm font-medium mb-1.5 text-gray-700">รหัส HosXP</label><input type="text" className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500" value={medFormData.hosxp_icode} onChange={(e) => setMedFormData({ ...medFormData, hosxp_icode: e.target.value })} /></div>
                </div>
                <div><label className="block text-sm font-medium mb-1.5 text-gray-700">หมวดหมู่ตู้ยา</label><select className="w-full border border-gray-300 rounded-lg p-2.5 bg-white outline-none focus:ring-2 focus:ring-blue-500" value={medFormData.cabinet_category} onChange={(e) => setMedFormData({ ...medFormData, cabinet_category: e.target.value })}>{categoriesList?.map(cat => <option key={cat.id} value={cat.id.toString()}>{cat.name}</option>)}</select></div>
                <div><label className="block text-sm font-medium mb-1.5 text-gray-700">หมายเหตุ</label><textarea className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500" rows={2} value={medFormData.note} onChange={(e) => setMedFormData({ ...medFormData, note: e.target.value })} /></div>
                <div className="pt-4 flex gap-3"><button type="button" onClick={() => setIsMedModalOpen(false)} className="flex-1 border border-gray-300 p-3 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors">ยกเลิก</button><button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl font-medium transition-colors">{isEditing ? 'บันทึกการแก้ไข' : 'บันทึกยาใหม่'}</button></div>
              </form>
            </div>
          </div>
        )}

        {isReportModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
              <div className="flex justify-between items-center p-5 border-b bg-blue-50 border-blue-100"><h2 className="text-lg font-bold flex items-center gap-2 text-blue-900"><FileText size={18} /> พิมพ์รายงาน Stock Card</h2><button onClick={() => setIsReportModalOpen(false)} className="p-1 hover:bg-blue-100 rounded-md transition-colors"><X size={20} className="text-blue-500" /></button></div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">เลือกตู้ยา (Cabinet)</label>
                  <select className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 bg-white" value={reportTargetCategory} onChange={(e) => { setReportTargetCategory(e.target.value === "all" ? "all" : Number(e.target.value)); setReportTargetId("all"); }}>
                    <option value="all">-- ทุกตู้ยา --</option>
                    {categoriesList?.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">เลือกรายการยาที่ต้องการพิมพ์</label>
                  <select className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 bg-white" value={reportTargetId} onChange={(e) => setReportTargetId(e.target.value)}>
                    <option value="all">-- พิมพ์ทั้งหมด (ตามตู้ที่เลือก) --</option>
                    {medicines.filter(m => reportTargetCategory === "all" || String(m.cabinet_category) === String(reportTargetCategory)).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div className="pt-4 flex gap-3"><button onClick={() => setIsReportModalOpen(false)} className="flex-1 border border-gray-300 p-3 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors">ยกเลิก</button><button onClick={handleGenerateReport} disabled={isGeneratingReport} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl font-medium transition-colors disabled:opacity-60 flex justify-center items-center gap-2">{isGeneratingReport ? "กำลังดึงข้อมูล..." : <><Printer size={18}/> สร้าง PDF</>}</button></div>
              </div>
            </div>
          </div>
        )}

        {isStockModalOpen && selectedMed && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[70]">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col">
              <div className={`flex justify-between items-center p-5 border-b ${stockAction === 'in' ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                <h2 className={`text-lg font-bold flex items-center gap-2 ${stockAction === 'in' ? 'text-emerald-800' : 'text-red-800'}`}>{stockAction === 'in' ? <PackagePlus size={22} /> : <PackageMinus size={22} />}{stockAction === 'in' ? 'รับเข้าสต็อก' : 'ตัดจ่ายสต็อก (เลือก EXP)'}</h2>
                <button onClick={() => setIsStockModalOpen(false)}><X size={24} className="text-gray-400" /></button>
              </div>
              <form onSubmit={handleUpdateStock} className="p-5 space-y-4 overflow-y-auto">
                <div className="font-bold text-gray-800 mb-2 border-b pb-2">{selectedMed.name}</div>
                {stockAction === 'in' ? (
                  <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100 space-y-3">
                    <div className="bg-white p-2 rounded border border-emerald-200 flex flex-col gap-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500" checked={isPendingStock} onChange={(e) => setIsPendingStock(e.target.checked)} />
                        <span className="text-sm font-bold text-emerald-800">เป็นรายการรับเข้าล่วงหน้า (ยังไม่บวกสต็อก)</span>
                      </label>
                      {isPendingStock && (
                        <div className="pl-6"><label className="block text-xs font-medium text-emerald-700 mb-1">คาดว่าจะเข้าวันที่ *</label><input type="date" required className="w-full border rounded p-2 text-sm" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} /></div>
                      )}
                    </div>
                    <div className="flex gap-2 bg-white p-1 rounded-lg border border-emerald-200">
                      <button type="button" onClick={() => setStockInMode('existing')} className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${stockInMode === 'existing' ? 'bg-emerald-100 text-emerald-800 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}>เลือกล็อตเดิม</button>
                      <button type="button" onClick={() => setStockInMode('new')} className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${stockInMode === 'new' ? 'bg-emerald-100 text-emerald-800 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}>+ เพิ่มล็อตใหม่</button>
                    </div>
                    {stockInMode === 'existing' ? (
                      <div>
                        <label className="block text-sm font-medium text-emerald-800 mb-1">เลือกล็อต (EXP) *</label>
                        <select required className="w-full border border-emerald-200 rounded-lg p-3 bg-white font-medium outline-none focus:ring-2 focus:ring-emerald-500" value={selectedLotId} onChange={(e) => { setSelectedLotId(e.target.value); const l = (selectedMed.medicine_lots || []).find((x: any) => String(x.id) === e.target.value); if(l) { setStockPackSize(l.pack_size.toString()); setStockUnitName(l.unit_name); }}}>
                          <option value="">-- กรุณาเลือกล็อต --</option>
                          {(selectedMed.medicine_lots || []).map((lot: any) => {
                            const packs = Math.floor(lot.current_stock / lot.pack_size); const remainder = lot.current_stock % lot.pack_size; const unitString = lot.unit_name === "'s" ? "'" : ` ${lot.unit_name}`; const remainderText = remainder > 0 ? ` เศษ ${remainder}` : "";
                            return <option key={lot.id} value={lot.id}>EXP: {lot.exp_date} (เหลือ: {packs}x{lot.pack_size}{unitString}{remainderText})</option>
                          })}
                        </select>
                      </div>
                    ) : (
                      <><div className="grid grid-cols-2 gap-3"><div className="col-span-2"><label className="block text-sm font-medium text-emerald-800 mb-1">วันหมดอายุ (EXP) *</label><input type="date" required className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-emerald-500" value={stockExpDate} onChange={(e) => setStockExpDate(e.target.value)} /></div><div><label className="block text-sm font-medium text-emerald-800 mb-1">ขนาดบรรจุ / กล่อง</label><input type="number" required min="1" className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-emerald-500" value={stockPackSize} onChange={(e) => setStockPackSize(e.target.value)} /></div><div><label className="block text-sm font-medium text-emerald-800 mb-1">หน่วยนับ</label><select className="w-full border rounded-lg p-2.5 bg-white outline-none focus:ring-2 focus:ring-emerald-500" value={stockUnitName} onChange={(e) => setStockUnitName(e.target.value)}><option value="'s">'s (เม็ด)</option><option value="vial">vial</option><option value="amp">amp</option><option value="bottle">bottle</option><option value="box">box</option></select></div></div></>
                    )}
                  </div>
                ) : (
                  <div className="bg-red-50 p-3 rounded-lg border border-red-100">
                    <label className="block text-sm font-medium text-red-800 mb-1">เลือกล็อต EXP ที่ต้องการหักสต็อก *</label>
                    <select required className="w-full border border-red-200 rounded-lg p-3 bg-white font-medium outline-none focus:ring-2 focus:ring-red-500" value={selectedLotId} onChange={(e) => setSelectedLotId(e.target.value)}>
                      <option value="">-- กรุณาเลือกล็อต --</option>
                      {(selectedMed.medicine_lots || []).filter((l: any) => l.current_stock > 0).map((lot: any) => {
                        const packs = Math.floor(lot.current_stock / lot.pack_size); const remainder = lot.current_stock % lot.pack_size; const unitString = lot.unit_name === "'s" ? "'" : ` ${lot.unit_name}`; const remainderText = remainder > 0 ? ` เศษ ${remainder}` : "";
                        return <option key={lot.id} value={lot.id}>EXP: {lot.exp_date} (เหลือ: {packs}x{lot.pack_size}{unitString}{remainderText})</option>
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
                    <div><label className="block text-sm font-medium mb-1">ระบุจำนวน (ชิ้นย่อย)</label><input type="number" required min="1" className="w-full border rounded-lg p-3 text-lg font-bold text-center" value={inputAmount} onChange={(e) => setInputAmount(e.target.value)} /></div>
                  ) : (
                    <div><label className="block text-sm font-medium mb-1">ระบุจำนวน (กล่อง/แพ็ค)</label><input type="number" step="0.1" required min="0.1" className="w-full border rounded-lg p-3 text-lg font-bold text-center" value={inputPackCount} onChange={(e) => setInputPackCount(e.target.value)} /></div>
                  )}
                </div>
                <div className="pt-4 flex gap-3"><button type="button" onClick={() => setIsStockModalOpen(false)} className="flex-1 border p-3 rounded-lg font-medium">ยกเลิก</button><button type="submit" className={`flex-1 text-white p-3 rounded-lg font-medium text-lg ${stockAction === 'in' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}>ยืนยัน</button></div>
              </form>
            </div>
          </div>
        )}

        {isHistoryModalOpen && historyMed && (
          <div className="fixed inset-0 bg-gray-50 flex flex-col z-50 overflow-y-auto w-full h-full">
            <div className="bg-white border-b flex justify-between items-center p-4 sticky top-0 z-10 shadow-sm">
              <button onClick={() => { setIsHistoryModalOpen(false); setHistoryMed(null); setHistoryRows([]); }} className="flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"><ArrowLeft size={18} className="mr-1.5"/> กลับหน้ารวม</button>
              <div className="flex items-center gap-2 text-[10px] md:text-xs font-medium text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full"><User size={14} /> {session.name}</div>
            </div>

            <div className="p-4 md:p-6 max-w-3xl mx-auto w-full space-y-4 pb-20">
              <div className="bg-white rounded-2xl p-5 md:p-6 shadow-sm border border-gray-100">
                <div className="text-center mb-6">
                  <h1 className="text-xl md:text-2xl font-bold text-gray-800">{historyMed.name}</h1>
                  <div className="flex justify-center gap-2 mt-3 flex-wrap">
                    <span className="px-3 py-1 bg-gray-50 border rounded-full text-[10px] md:text-xs text-gray-600">รหัส: {historyMed.hosxp_icode || "-"}</span>
                    <span className="px-3 py-1 bg-blue-50 border border-blue-100 rounded-full text-[10px] md:text-xs text-blue-600">ตู้ยา: {getCategoryName(historyMed.cabinet_category)}</span>
                  </div>
                </div>

                <div className="mb-6 bg-gray-50/50 rounded-xl p-4 border border-gray-100">
                  <h3 className="text-sm font-bold flex items-center gap-2 mb-3 text-gray-700"><CalendarDays size={16} /> สต็อกคงเหลือแบ่งตาม EXP</h3>
                  <div className="flex flex-wrap gap-3">
                    {(!historyMed.medicine_lots || historyMed.medicine_lots.filter((l: any) => l.current_stock > 0).length === 0) ? <div className="text-sm text-red-500 font-bold bg-red-50 px-4 py-2 rounded-lg border border-red-100">สต็อกหมด</div> : (
                      historyMed.medicine_lots.filter((l: any) => l.current_stock > 0).sort((a: any, b: any) => new Date(a.exp_date).getTime() - new Date(b.exp_date).getTime()).map((lot: any) => {
                          const packs = Math.floor(lot.current_stock / lot.pack_size); const remainder = lot.current_stock % lot.pack_size;
                          return (
                            <div key={lot.id} className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm min-w-[150px]">
                              <div className="text-[10px] md:text-xs font-bold text-rose-600 mb-1.5 border-b border-gray-50 pb-1.5">EXP: {lot.exp_date}</div>
                              <div className="flex items-baseline gap-1.5 text-lg"><span className="font-bold text-emerald-700">{packs}</span><span className="text-gray-400 text-sm">x</span><span className="text-gray-700 text-base font-medium">{lot.pack_size}</span>{remainder > 0 && <span className="text-amber-600 font-bold ml-1 text-xs">เศษ {remainder}</span>}<span className="text-gray-500 text-xs ml-0.5">{lot.unit_name}</span></div>
                              <div className="text-[10px] text-gray-400 mt-1">รวม {lot.current_stock} หน่วย</div>
                            </div>
                          )
                        })
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  <button onClick={() => openStockModal(historyMed, 'in')} className="bg-emerald-50/50 text-emerald-600 hover:bg-emerald-50 border border-emerald-100 p-4 md:p-5 rounded-xl flex flex-col items-center justify-center gap-2 transition-colors shadow-sm"><PackagePlus size={28} /><span className="font-bold text-sm md:text-base">รับเข้าสต็อก</span></button>
                  <button onClick={() => openStockModal(historyMed, 'out')} className="bg-red-50/50 text-red-600 hover:bg-red-50 border border-red-100 p-4 md:p-5 rounded-xl flex flex-col items-center justify-center gap-2 transition-colors shadow-sm"><PackageMinus size={28} /><span className="font-bold text-sm md:text-base">ตัดจ่ายสต็อก</span></button>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 md:p-6 shadow-sm border border-gray-100">
                <h3 className="text-sm font-bold flex items-center gap-2 mb-4 text-gray-700 border-b pb-3 border-gray-100"><History size={18} /> ประวัติการทำรายการล่าสุด</h3>
                <div className="space-y-3">
                  {historyLoading ? <div className="text-center text-gray-500 py-8">กำลังโหลดข้อมูล...</div> : historyRows.length === 0 ? <div className="text-center text-gray-500 py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">ยังไม่มีประวัติการรับเข้า/ตัดจ่าย</div> : (
                    historyRows.map((row: any) => {
                      const isInc = row.action === 'in'; const isPending = row.status === 'pending';
                      const lotInfo = (historyMed.medicine_lots || []).find((l: any) => l.id.toString() === row.lot_id?.toString());
                      const pSize = lotInfo?.pack_size || 100; const pUnit = lotInfo?.unit_name || 'หน่วย';
                      
                      return (
                        <div key={row.id} className="flex flex-col gap-2 border rounded-xl p-3 md:p-4 shadow-sm bg-white border-gray-100">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3 md:gap-4">
                              <div className={`p-2 rounded-lg mt-0.5 ${isPending ? 'bg-amber-100 text-amber-600' : isInc ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                {isPending ? <Clock size={20} /> : isInc ? <PackagePlus size={20} /> : <PackageMinus size={20} />}
                              </div>
                              <div>
                                <div className={`text-sm md:text-base font-bold ${isPending ? 'text-amber-700' : isInc ? 'text-emerald-700' : 'text-red-700'}`}>
                                  {isPending ? 'รอรับเข้า' : isInc ? 'รับเข้า' : 'ตัดจ่าย'} {formatBoxString(row.amount, pSize, pUnit)}
                                </div>
                                <div className="text-[11px] md:text-xs font-medium text-blue-600 mt-0.5">(รวมทั้งหมด {row.amount} {pUnit})</div>
                                <div className="text-[10px] md:text-xs text-gray-500 flex items-center gap-1 mt-1.5"><CalendarDays size={12} /> EXP: {row.exp_date || "-"}</div>
                                <div className="text-[9px] md:text-[10px] text-gray-400 mt-0.5">{formatHistoryDate(row.created_at)}</div>
                                
                                {isPending && <div className="mt-2 text-xs font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200 inline-block">คาดว่าจะเข้า: {row.expected_date ? new Date(row.expected_date).toLocaleDateString('th-TH') : '-'}</div>}
                                {row.edit_note && <div className="mt-2 text-[10px] text-gray-500 bg-gray-50 px-2 py-1 rounded border inline-block">[{row.edit_note}]</div>}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2 shrink-0">
                               <div className="flex items-center gap-1 text-[9px] md:text-[10px] font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-md"><User size={10} /> {row.staff_name}</div>
                               {isPending && <button onClick={() => handleApprovePending(row)} className="text-[10px] md:text-xs bg-emerald-600 text-white px-2.5 py-1.5 rounded hover:bg-emerald-700">รับของเข้าสต็อก</button>}
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

export default function StockCardPage() {
  const [session, setSession] = useState<Session | null>(null); const [checkedSession, setCheckedSession] = useState(false);
  useEffect(() => { try { const raw = localStorage.getItem(SESSION_KEY); if (raw) setSession(JSON.parse(raw)); } catch { } setCheckedSession(true); }, []);
  const handleLogout = () => { localStorage.removeItem(SESSION_KEY); setSession(null); };
  if (!checkedSession) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">กำลังโหลด...</div>;
  if (!session) return <LoginScreen onLogin={setSession} />;
  return <StockCardApp session={session} onLogout={handleLogout} />;
}