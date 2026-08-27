"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import {
  Plus, PackagePlus, PackageMinus, X, Calculator, Edit, Trash2, CalendarDays,
  User, Users, Lock, LogOut, KeyRound, ShieldCheck, CheckCircle2, CircleDashed,
  Search, Tag, Check, LayoutGrid, History, TrendingDown, CalendarRange,
  FileText, Printer, QrCode, ArrowLeft, Upload, Download, ArrowUpDown,
  Power
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import * as XLSX from "xlsx";

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

// Helper สีพาสเทลสำหรับตู้ยา (ข้อ 4)
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

// -------------------------------------------------------------
// [1] คอมโพเนนต์หน้าล็อกอิน
// -------------------------------------------------------------
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
  const [centralError, setCentralError] = useState("");

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
    } catch (e: any) {
      setError("โหลดข้อมูลผู้ใช้ไม่สำเร็จ: " + e.message);
    } finally {
      setLoadingRow(false);
    }
  };

  const handleCentralLogin = async () => {
    setCentralBusy(true); setCentralError("");
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
      setCentralError("เข้าสู่ระบบไม่สำเร็จ: " + e.message);
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
          setBusy(false); return setError("รหัสผ่านไม่ถูกต้อง");
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4 md:p-6">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight">ระบบคลังยา</h1>
          <p className="text-gray-500 mt-2">กรุณาเลือกชื่อเจ้าหน้าที่เพื่อเข้าสู่ระบบ</p>
        </div>
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-lg border border-white/50 p-4 md:p-6 mb-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {STAFF_LIST.map((name) => (
              <button key={name} onClick={() => openStaffLogin(name)} className="flex items-center gap-2 justify-center bg-white/50 border border-gray-200 rounded-xl p-3.5 font-medium text-gray-700 hover:border-blue-400 hover:bg-blue-50/80 transition-all shadow-sm hover:shadow">
                <User size={16} className="text-blue-500" /> {name}
              </button>
            ))}
          </div>
        </div>
        <button onClick={handleCentralLogin} disabled={centralBusy} className="w-full flex items-center justify-center gap-2 bg-gray-800/90 hover:bg-gray-900 backdrop-blur-md text-white p-4 rounded-2xl font-medium disabled:opacity-60 transition-all shadow-lg">
          <Users size={18} /> {centralBusy ? "กำลังเข้าสู่ระบบ..." : `เข้าสู่ระบบด้วย${CENTRAL_ACCOUNT_NAME}`}
        </button>
        {centralError && <p className="text-red-600 text-sm mt-3 text-center bg-white/80 p-2 rounded-lg">{centralError}</p>}

        {selectedName && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-white">
              <div className="flex justify-between items-center p-5 border-b bg-blue-50/50 border-blue-100">
                <h2 className="text-lg font-bold flex items-center gap-2 text-blue-900"><Lock size={18} /> {selectedName}</h2>
                <button onClick={closeModal} className="p-1 hover:bg-black/5 rounded-full transition-colors"><X size={22} className="text-gray-400" /></button>
              </div>
              {loadingRow ? (
                <div className="p-8 text-center text-gray-500">กำลังโหลด...</div>
              ) : (
                <form onSubmit={handleSubmitPassword} className="p-6 space-y-4">
                  {mode === "setPassword" && <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-xl p-3">ยังไม่เคยตั้งรหัสผ่าน กรุณาตั้งรหัสผ่านใหม่สำหรับใช้เข้าสู่ระบบครั้งถัดไป</p>}
                  <div>
                    <label className="block text-sm font-medium mb-1.5 text-gray-700">{mode === "setPassword" ? "ตั้งรหัสผ่านใหม่" : "รหัสผ่าน"}</label>
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
                    {busy ? "กำลังตรวจสอบ..." : mode === "setPassword" ? "ตั้งรหัสผ่านและเข้าสู่ระบบ" : "เข้าสู่ระบบ"}
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

function AdminPasswordManager({ onClose }: { onClose: () => void }) {
  const [rows, setRows] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [editingName, setEditingName] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [newPassword2, setNewPassword2] = useState("");
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  const fetchStaffRows = async () => {
    setLoading(true); setLoadError("");
    try {
      const { data, error } = await supabase.from("staff_accounts").select("*").in("name", STAFF_LIST);
      if (error) throw error;
      const map: Record<string, any> = {};
      (data || []).forEach((row: any) => { map[row.name] = row; });
      setRows(map);
    } catch (e: any) {
      setLoadError("โหลดรายชื่อเจ้าหน้าที่ไม่สำเร็จ: " + e.message);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchStaffRows(); }, []);

  const openResetForm = (name: string) => { setEditingName(name); setNewPassword(""); setNewPassword2(""); setFormError(""); };
  const closeResetForm = () => { setEditingName(null); setNewPassword(""); setNewPassword2(""); setFormError(""); };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingName) return;
    if (newPassword.length < 4) return setFormError("รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร");
    if (newPassword !== newPassword2) return setFormError("รหัสผ่านทั้งสองช่องไม่ตรงกัน");
    setBusy(true); setFormError("");
    try {
      const hash = await sha256Hex(newPassword);
      const { error } = await supabase.from("staff_accounts").upsert({ name: editingName, password_hash: hash, is_central: false }, { onConflict: "name" });
      if (error) throw error;
      closeResetForm(); fetchStaffRows();
    } catch (e: any) {
      setFormError("บันทึกไม่สำเร็จ: " + e.message);
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[85vh] flex flex-col border border-white">
        <div className="flex justify-between items-center p-5 border-b bg-gray-50/50">
          <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800"><ShieldCheck size={22} className="text-blue-500" /> จัดการรหัสผ่านเจ้าหน้าที่</h2>
          <button onClick={onClose} className="p-1 hover:bg-black/5 rounded-full transition-colors"><X size={24} className="text-gray-400" /></button>
        </div>
        <div className="p-4 md:p-6 overflow-y-auto space-y-3">
          {loading ? <div className="text-center text-gray-500 py-8">กำลังโหลด...</div> : loadError ? <div className="text-center text-red-600 py-8">{loadError}</div> : (
            STAFF_LIST.map((name) => {
              const row = rows[name];
              const hasPassword = !!row?.password_hash;
              return (
                <div key={name} className="flex flex-col sm:flex-row sm:items-center justify-between border border-gray-100 bg-white/50 rounded-xl p-3.5 gap-3 shadow-sm hover:shadow transition-shadow">
                  <div className="flex items-center gap-3">
                    <div className="bg-gray-100 p-2 rounded-full"><User size={16} className="text-gray-500" /></div>
                    <span className="font-semibold text-gray-800">{name}</span>
                    {hasPassword ? <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full"><CheckCircle2 size={14} /> ตั้งรหัสแล้ว</span> : <span className="flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full"><CircleDashed size={14} /> ยังไม่ได้ตั้งรหัส</span>}
                  </div>
                  <button onClick={() => openResetForm(name)} className="flex items-center justify-center gap-1.5 text-sm font-semibold text-blue-600 border border-blue-100 bg-blue-50 py-2 sm:py-1.5 px-4 rounded-lg hover:bg-blue-100 hover:border-blue-200 transition-colors w-full sm:w-auto">
                    <KeyRound size={14} /> {hasPassword ? "รีเซ็ตรหัสผ่าน" : "ตั้งรหัสผ่าน"}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
      {editingName && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-white">
            <div className="flex justify-between items-center p-5 border-b bg-blue-50/50 border-blue-100">
              <h2 className="text-lg font-bold flex items-center gap-2 text-blue-900"><KeyRound size={18} /> ตั้งรหัสผ่านให้ {editingName}</h2>
              <button onClick={closeResetForm} className="p-1 hover:bg-black/5 rounded-full transition-colors"><X size={22} className="text-gray-400" /></button>
            </div>
            <form onSubmit={handleSavePassword} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5 text-gray-700">รหัสผ่านใหม่</label>
                <input type="password" required autoFocus className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 bg-white/50" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5 text-gray-700">ยืนยันรหัสผ่านใหม่</label>
                <input type="password" required className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 bg-white/50" value={newPassword2} onChange={(e) => setNewPassword2(e.target.value)} />
              </div>
              {formError && <p className="text-red-600 text-sm font-medium">{formError}</p>}
              <button type="submit" disabled={busy} className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3.5 rounded-xl font-medium disabled:opacity-60 transition-colors shadow-md mt-2">
                {busy ? "กำลังบันทึก..." : "บันทึกรหัสผ่านใหม่"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// [2] แอปพลิเคชันหลัก Stock Card
// -------------------------------------------------------------
function StockCardApp({ session, onLogout }: { session: Session; onLogout: () => void }) {
  const [medicines, setMedicines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState<'recent' | 'alpha'>('recent');

  const [isMedModalOpen, setIsMedModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  // ข้อ 2: เปลี่ยน barcode เป็น note
  const [medFormData, setMedFormData] = useState({ id: "", name: "", note: "", hosxp_icode: "", cabinet_category: "1", min_stock: "", is_active: true });

  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [selectedMed, setSelectedMed] = useState<any>(null);
  const [stockAction, setStockAction] = useState<'in' | 'out'>('in');
  const [stockInMode, setStockInMode] = useState<'existing' | 'new'>('existing'); 
  const [stockExpDate, setStockExpDate] = useState("");
  const [stockPackSize, setStockPackSize] = useState("100");
  const [stockUnitName, setStockUnitName] = useState("'s");
  const [selectedLotId, setSelectedLotId] = useState("");
  const [inputMode, setInputMode] = useState<'base' | 'pack'>('base');
  const [inputAmount, setInputAmount] = useState("");
  const [inputPackCount, setInputPackCount] = useState("");
  // ข้อ 7: วันที่รับเข้า (สำหรับรับเข้าล่วงหน้า)
  const [receiveDate, setReceiveDate] = useState(new Date().toISOString().split('T')[0]);

  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  
  const [categoriesList, setCategoriesList] = useState<{id: number, name: string}[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | "all">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [categoryNameInput, setCategoryNameInput] = useState("");
  const [categoryBusy, setCategoryBusy] = useState(false);

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyMed, setHistoryMed] = useState<any>(null);
  const [historyRows, setHistoryRows] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const [globalPeriodMode, setGlobalPeriodMode] = useState<'1m' | '2m' | '3m' | 'custom'>('1m');
  const [globalStartDate, setGlobalStartDate] = useState("");
  const [globalEndDate, setGlobalEndDate] = useState("");

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportTargetCategory, setReportTargetCategory] = useState<number | "all">("all"); // ข้อ 3
  const [reportTargetId, setReportTargetId] = useState("all");
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [showPrintView, setShowPrintView] = useState(false);
  const [printData, setPrintData] = useState<any>({});

  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [qrTargetCategory, setQrTargetCategory] = useState<number | "all">("all");
  const [qrTargetId, setQrTargetId] = useState("all");
  const [showQRPrintView, setShowQRPrintView] = useState(false);
  const [qrPrintData, setQrPrintData] = useState<any[]>([]);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importData, setImportData] = useState<any[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  // ข้อ 5: โหลดค่าตู้ยาที่ใช้ล่าสุด
  useEffect(() => {
    if (session) {
      const savedCat = localStorage.getItem(`stockcard_cat_${session.name}`);
      if (savedCat) setSelectedCategory(savedCat === "all" ? "all" : Number(savedCat));
    }
  }, [session]);

  const handleCategoryChange = (val: number | "all") => {
    setSelectedCategory(val);
    if (session) localStorage.setItem(`stockcard_cat_${session.name}`, val.toString());
  };

  const processPendingTransactions = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data: pendings, error: fetchErr } = await supabase.from('stock_transactions')
        .select('*')
        .eq('action', 'pending_in')
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

  const fetchMedicines = async () => {
    try {
      await processPendingTransactions(); // ข้อ 7: ตรวจสอบยอดยกยอดเมื่อถึงกำหนด
      const { data, error } = await supabase.from("medicines").select(`*, medicine_lots (*)`).order("id", { ascending: false });
      if (error) throw error;
      if (data) setMedicines(data);

      const { data: txData } = await supabase.from("stock_transactions").select("*").in("action", ["out", "pending_in"]);
      if (txData) setAllTransactions(txData);
    } catch (error) { console.error("Error fetching medicines:", error); } finally { setLoading(false); }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase.from("cabinet_categories").select("*").order("id");
      if (error) throw error;
      if (data && data.length > 0) {
        setCategoriesList(data);
      }
    } catch (error) { console.error("Error fetching categories:", error); }
  };

  useEffect(() => { fetchMedicines(); fetchCategories(); }, []);

  useEffect(() => {
    if (isHistoryModalOpen && historyMed) {
      const updated = medicines.find(m => m.id === historyMed.id);
      if (updated) setHistoryMed(updated);
    }
  }, [medicines]);

  useEffect(() => {
    if (globalPeriodMode !== 'custom') {
      const end = new Date();
      const start = new Date();
      if (globalPeriodMode === '1m') start.setMonth(start.getMonth() - 1);
      if (globalPeriodMode === '2m') start.setMonth(start.getMonth() - 2);
      if (globalPeriodMode === '3m') start.setMonth(start.getMonth() - 3);
      setGlobalEndDate(end.toISOString().split('T')[0]);
      setGlobalStartDate(start.toISOString().split('T')[0]);
    }
  }, [globalPeriodMode]);

  const handleAddCategory = async () => {
    const newName = prompt("กรุณาระบุชื่อตู้ยาใหม่ (เช่น ตู้ยา 11):");
    if (!newName || !newName.trim()) return;
    try {
      const { error } = await supabase.from("cabinet_categories").insert([{ name: newName.trim() }]);
      if (error) throw error;
      fetchCategories();
    } catch (error: any) { alert("เพิ่มตู้ยาไม่สำเร็จ: " + error.message); }
  };

  const handleRenameCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCategoryId === null) return;
    const trimmed = categoryNameInput.trim();
    if (!trimmed) return;
    setCategoryBusy(true);
    try {
      const { error } = await supabase.from("cabinet_categories").upsert({ id: editingCategoryId, name: trimmed }, { onConflict: "id" });
      if (error) throw error;
      fetchCategories();
      setEditingCategoryId(null); setCategoryNameInput("");
    } catch (error: any) { alert("บันทึกชื่อหมวดหมู่ไม่สำเร็จ: " + error.message); } finally { setCategoryBusy(false); }
  };

  const getCategoryName = (id: string | number) => {
    const cat = categoriesList.find(c => String(c.id) === String(id));
    return cat ? cat.name : id;
  };

  const filteredMedicines = medicines
    .filter((med) => selectedCategory === "all" || String(med.cabinet_category) === String(selectedCategory))
    .filter((med) => {
      const term = searchTerm.trim().toLowerCase();
      if (!term) return true;
      return ((med.name || "").toLowerCase().includes(term) || (med.hosxp_icode || "").toLowerCase().includes(term) || (med.note || "").toLowerCase().includes(term));
    })
    .sort((a, b) => {
      if (sortOrder === 'alpha') return (a.name || "").localeCompare(b.name || "", "th");
      return b.id - a.id; 
    });

  // ข้อ 8: ฟังก์ชันเปิดปิดสถานะเบิกได้/คลัง 0
  const toggleMedStatus = async (medId: string, currentStatus: boolean) => {
    try {
      const newStatus = currentStatus === false ? true : false;
      const { error } = await supabase.from("medicines").update({ is_active: newStatus }).eq("id", medId);
      if (error) throw error;
      fetchMedicines();
    } catch (error: any) {
      alert("เปลี่ยนสถานะไม่สำเร็จ: " + error.message);
    }
  };

  const handleSaveMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: medFormData.name,
        note: medFormData.note === "" ? null : medFormData.note, // ข้อ 2: บันทึก note
        hosxp_icode: medFormData.hosxp_icode,
        cabinet_category: medFormData.cabinet_category,
        min_stock: parseInt(medFormData.min_stock) || 0,
        is_active: medFormData.is_active
      };
      if (isEditing) {
        const { error } = await supabase.from("medicines").update(payload).eq("id", medFormData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("medicines").insert([payload]);
        if (error) throw error;
      }
      setIsMedModalOpen(false); fetchMedicines();
    } catch (error: any) { alert("บันทึกไม่สำเร็จ: " + error.message); }
  };

  const openAddMedModal = () => {
    setIsEditing(false);
    setMedFormData({ id: "", name: "", note: "", hosxp_icode: "", cabinet_category: categoriesList.length > 0 ? String(categoriesList[0].id) : "1", min_stock: "", is_active: true });
    setIsMedModalOpen(true);
  };

  const openEditMedModal = (med: any) => {
    setIsEditing(true);
    setMedFormData({
      id: med.id, name: med.name, note: med.note || "", hosxp_icode: med.hosxp_icode || "",
      cabinet_category: med.cabinet_category || (categoriesList.length > 0 ? String(categoriesList[0].id) : "1"), min_stock: med.min_stock?.toString() || "0", is_active: med.is_active !== false
    });
    setIsMedModalOpen(true);
  };

  const handleDeleteMed = async (id: string) => {
    if (!confirm("คุณแน่ใจหรือไม่ที่จะลบยานี้? (ข้อมูลสต็อกของยานี้จะหายไปทั้งหมด)")) return;
    try {
      await supabase.from("medicines").delete().eq("id", id);
      fetchMedicines();
    } catch (error: any) { alert("ลบไม่สำเร็จ: " + error.message); }
  };

  const logTransaction = async (opts: { lot_id: string; exp_date: string; action: 'in' | 'out' | 'pending_in'; amount: number; pending_date?: string }) => {
    try {
      const { error } = await supabase.from("stock_transactions").insert([{
        medicine_id: String(selectedMed.id), lot_id: String(opts.lot_id), exp_date: opts.exp_date, action: opts.action, amount: opts.amount, staff_name: session.name, pending_date: opts.pending_date || null
      }]);
      if (error) throw error;
    } catch (error: any) { alert("อัปเดตสต็อกสำเร็จ แต่บันทึกประวัติไม่สำเร็จ: " + (error?.message || "ไม่ทราบสาเหตุ")); }
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
        ? (selectedMed.medicine_lots || []).find((l: any) => l.id.toString() === selectedLotId)?.pack_size
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
          const existingLot = (selectedMed.medicine_lots || []).find((l: any) => String(l.id) === String(selectedLotId));
          if (!existingLot) return alert("ไม่พบข้อมูลล็อตในระบบ");
          
          if (!isFuture) {
             const { error } = await supabase.from("medicine_lots").update({ current_stock: existingLot.current_stock + totalItems }).eq("id", existingLot.id);
             if (error) throw error;
          }
          await logTransaction({ lot_id: existingLot.id, exp_date: existingLot.exp_date, action: actualAction, amount: totalItems, pending_date: isFuture ? receiveDate : undefined });
        } else {
          if (!stockExpDate) return alert("กรุณาระบุวันหมดอายุ (EXP)");
          const existingLot = (selectedMed.medicine_lots || []).find((l: any) => l.exp_date === stockExpDate && l.pack_size === parseInt(stockPackSize) && l.unit_name === stockUnitName);
          
          if (existingLot) {
            if (!isFuture) {
               const { error } = await supabase.from("medicine_lots").update({ current_stock: existingLot.current_stock + totalItems }).eq("id", existingLot.id);
               if (error) throw error;
            }
            await logTransaction({ lot_id: existingLot.id, exp_date: existingLot.exp_date, action: actualAction, amount: totalItems, pending_date: isFuture ? receiveDate : undefined });
          } else {
            const initialStock = isFuture ? 0 : totalItems; // ถ้าอนาคต ยังไม่บวก
            const { data: newLot, error } = await supabase.from("medicine_lots").insert([{ medicine_id: selectedMed.id, exp_date: stockExpDate, pack_size: parseInt(stockPackSize), unit_name: stockUnitName, current_stock: initialStock }]).select().single();
            if (error) throw error;
            await logTransaction({ lot_id: newLot.id, exp_date: newLot.exp_date, action: actualAction, amount: totalItems, pending_date: isFuture ? receiveDate : undefined });
          }
        }
      } else {
        if (!selectedLotId) return alert("กรุณาเลือกล็อตที่ต้องการตัดจ่าย");
        const lotToDeduct = (selectedMed.medicine_lots || []).find((l: any) => l.id.toString() === selectedLotId);
        if (!lotToDeduct) return alert("ไม่พบข้อมูลล็อต");
        if (totalItems > lotToDeduct.current_stock) return alert(`สต็อกในล็อตนี้ไม่พอ! ต้องการเบิก ${totalItems} แต่มีแค่ ${lotToDeduct.current_stock}`);
        const { error } = await supabase.from("medicine_lots").update({ current_stock: lotToDeduct.current_stock - totalItems }).eq("id", lotToDeduct.id);
        if (error) throw error;
        await logTransaction({ lot_id: lotToDeduct.id, exp_date: lotToDeduct.exp_date, action: 'out', amount: totalItems });
      }
      setIsStockModalOpen(false); await fetchMedicines();
      if (isHistoryModalOpen) openHistoryModal(selectedMed); 
    } catch (error: any) { alert("อัปเดตสต็อกไม่สำเร็จ: " + error.message); }
  };

  const openStockModal = (med: any, action: 'in' | 'out') => {
    setSelectedMed(med); setStockAction(action); setInputMode('base'); setInputAmount(""); setInputPackCount(""); setStockExpDate(""); setSelectedLotId("");
    setReceiveDate(new Date().toISOString().split('T')[0]); // Default to today
    if (action === 'in') {
      if (med.medicine_lots && med.medicine_lots.length > 0) {
        setStockInMode('existing'); const firstLot = med.medicine_lots[0];
        setSelectedLotId(firstLot.id.toString()); setStockPackSize(firstLot.pack_size.toString()); setStockUnitName(firstLot.unit_name);
      } else { setStockInMode('new'); setStockPackSize("100"); setStockUnitName("'s"); }
    } else {
      if (med.medicine_lots && med.medicine_lots.length > 0) {
        const firstLot = med.medicine_lots[0];
        setStockPackSize(firstLot.pack_size.toString()); setStockUnitName(firstLot.unit_name);
      } else { setStockPackSize("100"); setStockUnitName("'s"); }
    }
    setIsStockModalOpen(true);
  };

  const openHistoryModal = async (med: any) => {
    setHistoryMed(med); setIsHistoryModalOpen(true); setHistoryLoading(true);
    try {
      const { data, error } = await supabase.from("stock_transactions").select("*").eq("medicine_id", String(med.id)).order("created_at", { ascending: false });
      if (error) throw error;
      setHistoryRows(data || []);
    } catch (error) { setHistoryRows([]); } finally { setHistoryLoading(false); }
  };

  const formatHistoryDate = (iso: string) => {
    try { return new Date(iso).toLocaleString("th-TH", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }); } catch { return iso; }
  };

  const calculateMedStats = (med: any) => {
    if (!globalStartDate || !globalEndDate) return { totalUsage: 0, target1Week: 0, target2Weeks: 0, daysDiff: 0 };
    const start = new Date(globalStartDate); const end = new Date(globalEndDate);
    start.setHours(0, 0, 0, 0); end.setHours(23, 59, 59, 999);
    let daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff < 1) daysDiff = 1;
    const medTx = allTransactions.filter(tx => {
      const txDate = new Date(tx.created_at);
      return String(tx.medicine_id) === String(med.id) && txDate >= start && txDate <= end && tx.action === 'out';
    });
    const totalUsage = medTx.reduce((sum, tx) => sum + tx.amount, 0);
    const dailyRate = totalUsage / daysDiff;
    const target1Week = Math.ceil(dailyRate * 7 * 1.15);
    const target2Weeks = Math.ceil(dailyRate * 14 * 1.15);
    return { totalUsage, target1Week, target2Weeks, daysDiff };
  };

  // ข้อ 6: แปลงรูปแบบการแสดงผลเป็น จำนวนกล่อง × ขนาดบรรจุ
  const formatToPack = (total: number, med: any) => {
    const activeLots = (med.medicine_lots || []).filter((l: any) => l.current_stock > 0);
    const packSize = activeLots.length > 0 ? activeLots[0].pack_size : (med.medicine_lots?.[0]?.pack_size || 100);
    const unitName = activeLots.length > 0 ? activeLots[0].unit_name : (med.medicine_lots?.[0]?.unit_name || 'หน่วย');
    if (packSize <= 1 || total === 0) return null;
    const packs = Math.floor(total / packSize);
    const remainder = total % packSize;
    if (packs === 0) return `${remainder} ${unitName}`;
    let text = `${packs} กล่อง × ${packSize}`;
    if (remainder > 0) text += ` (+เศษ ${remainder})`;
    return text;
  };

  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    try {
      let query = supabase.from("stock_transactions").select("*").in("action", ["in", "out"]).order("created_at", { ascending: false });
      if (reportTargetId !== "all") query = query.eq("medicine_id", reportTargetId);
      
      const { data: txData, error } = await query;
      if (error) throw error;

      const grouped: any = {};
      // ข้อ 3: กรองตามหมวดหมู่ตู้ยา
      let medsToProcess = medicines;
      if (reportTargetCategory !== "all") medsToProcess = medsToProcess.filter(m => String(m.cabinet_category) === String(reportTargetCategory));
      if (reportTargetId !== "all") medsToProcess = medsToProcess.filter(m => m.id.toString() === reportTargetId);
      
      if(medsToProcess.length === 0) {
          alert("ไม่พบข้อมูลยาตามเงื่อนไขที่เลือก");
          setIsGeneratingReport(false);
          return;
      }

      medsToProcess.forEach(med => {
         let currentTotalStock = (med.medicine_lots || []).reduce((sum: number, lot: any) => sum + lot.current_stock, 0);
         const medTxs = (txData || []).filter(tx => tx.medicine_id.toString() === med.id.toString());
         
         let runningBal = currentTotalStock;
         const processedTxs = medTxs.map(tx => {
             const balanceAfter = runningBal;
             if (tx.action === 'in') runningBal -= tx.amount;
             if (tx.action === 'out') runningBal += tx.amount;
             
             const lotInfo = (med.medicine_lots || []).find((l: any) => l.id.toString() === tx.lot_id?.toString());
             const pUnit = lotInfo?.unit_name || 'หน่วย';
             const pSize = lotInfo?.pack_size || 100;
             
             // แปลงยอดแสดงใน Stock Card เป็น กล่อง x ขนาดบรรจุ (อิงตามข้อ 1, 6)
             const formatPrintPack = (amt: number) => {
                 if(pSize <= 1 || amt === 0) return `${amt} ${pUnit}`;
                 const p = Math.floor(amt / pSize);
                 const r = amt % pSize;
                 if (p === 0) return `${r} ${pUnit}`;
                 return `${p} กล่อง × ${pSize}${r > 0 ? ` (+เศษ ${r})` : ''}`;
             };

             return { 
                ...tx, 
                balanceAfter, 
                pUnit, 
                lotExp: tx.exp_date,
                amountText: formatPrintPack(tx.amount),
                balanceText: formatPrintPack(balanceAfter)
             };
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

  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      { "ชื่อยา": "Paracetamol 500mg", "ตู้ยา": categoriesList.length > 0 ? categoriesList[0].name : "ตู้ยา 1", "รหัส HosXP": "1001", "หมายเหตุ": "สำหรับแก้ปวด", "EXP(YYYY-MM-DD)": "2026-12-31", "จำนวน(ชิ้นย่อย)": 1000, "ขนาดบรรจุ": 100, "หน่วยนับ": "'s" }
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "medicine_import_template.xlsx");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false });

    const parsed = jsonData.map((row: any, index) => {
       const rawCatName = row["ตู้ยา"]?.toString().trim() || "";
       const matchedCat = categoriesList.find(c => String(c.id) === rawCatName || c.name === rawCatName);
       const catIdToSave = matchedCat ? String(matchedCat.id) : rawCatName; 

       return {
         id: index,
         name: row["ชื่อยา"]?.toString().trim() || "",
         cabinet_category: catIdToSave,
         hosxp_icode: row["รหัส HosXP"]?.toString().trim() || "",
         note: row["หมายเหตุ"]?.toString().trim() || "",
         exp: row["EXP(YYYY-MM-DD)"]?.toString().trim() || "",
         amount: parseInt(row["จำนวน(ชิ้นย่อย)"]) || 0,
         pack_size: parseInt(row["ขนาดบรรจุ"]) || 100,
         unit: row["หน่วยนับ"]?.toString().trim() || "'s",
         isValid: !!(row["ชื่อยา"]?.toString().trim() && rawCatName)
       }
    });
    setImportData(parsed); e.target.value = ''; 
  };

  const executeImport = async () => {
    const validData = importData.filter(d => d.isValid);
    if (validData.length === 0) return alert("ไม่มีข้อมูลที่ถูกต้องให้บันทึก");
    setIsImporting(true);
    try {
      const medsPayload = validData.map(d => ({
        name: d.name, cabinet_category: d.cabinet_category, hosxp_icode: d.hosxp_icode || null, note: d.note || null, min_stock: 0, is_active: true
      }));
      const { data: insertedMeds, error: medErr } = await supabase.from('medicines').insert(medsPayload).select();
      if (medErr) throw medErr;

      const lotsToInsert: any[] = [];
      validData.forEach((d, i) => {
        if (d.exp && d.amount > 0) {
           lotsToInsert.push({ _originalIndex: i, medicine_id: insertedMeds[i].id, exp_date: d.exp, pack_size: d.pack_size, unit_name: d.unit, current_stock: d.amount });
        }
      });

      if (lotsToInsert.length > 0) {
        const { data: insertedLots, error: lotErr } = await supabase.from('medicine_lots').insert(lotsToInsert.map(({_originalIndex, ...rest}) => rest)).select();
        if (lotErr) throw lotErr;
        const txPayload = insertedLots.map((lot: any) => ({ medicine_id: lot.medicine_id, lot_id: lot.id, exp_date: lot.exp_date, action: 'in', amount: lot.current_stock, staff_name: session?.name || "System Import" }));
        const { error: txErr } = await supabase.from('stock_transactions').insert(txPayload);
        if (txErr) throw txErr;
      }
      alert(`นำเข้าสำเร็จ ${validData.length} รายการ`); setIsImportModalOpen(false); setImportData([]); fetchMedicines();
    } catch (e: any) { alert("เกิดข้อผิดพลาดในการนำเข้า: " + e.message); } finally { setIsImporting(false); }
  };

  // ----------------------------------------------------
  // มุมมองสำหรับหน้า Print
  // ----------------------------------------------------
  if (showPrintView) {
    return (
      <div className="bg-white min-h-screen text-black print:p-0 p-8">
        <div className="max-w-5xl mx-auto">
          <div className="print:hidden flex justify-between items-center mb-6 bg-gray-100 p-4 rounded-xl">
            <div>
              <h1 className="text-xl font-bold">ตัวอย่างก่อนพิมพ์รายงาน (Print Preview)</h1>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowPrintView(false)} className="px-4 py-2 border rounded-lg font-medium hover:bg-gray-200">ปิด</button>
              <button onClick={() => window.print()} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium flex items-center gap-2"><Printer size={18}/> พิมพ์ / Save PDF</button>
            </div>
          </div>
          <div className="print-content">
            {Object.values(printData).map((medData: any) => (
              <div key={medData.medName} style={{ pageBreakAfter: 'always' }} className="mb-10 pb-4">
                <h1 className="text-2xl font-bold text-center mb-2">รายงานประวัติการใช้ยา (Stock Card)</h1>
                <p className="text-center text-sm text-gray-600 mb-6">พิมพ์วันที่: {new Date().toLocaleString("th-TH")}</p>
                <div className="mb-4 border-b-2 border-black pb-2">
                  <h2 className="text-xl font-bold text-black">{medData.medName}</h2>
                  <div className="text-sm text-black">รหัส HosXP: {medData.hosxp || "-"} | หมายเหตุ: {medData.note || "-"}</div>
                </div>
                {medData.transactions.length === 0 ? <p className="text-sm text-gray-500 italic py-4">ไม่มีประวัติการทำรายการ</p> : (
                  <table className="w-full text-sm text-left border-collapse border border-gray-400">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-400 p-2 text-black font-bold">วันที่ทำรายการ</th>
                        <th className="border border-gray-400 p-2 text-center text-black font-bold">รับเข้า</th>
                        <th className="border border-gray-400 p-2 text-center text-black font-bold">ตัดจ่าย</th>
                        <th className="border border-gray-400 p-2 text-center text-black font-bold">ยอดยกไป (คงเหลือ)</th>
                        <th className="border border-gray-400 p-2 text-black font-bold">ผู้ดำเนินการ</th>
                        <th className="border border-gray-400 p-2 text-black font-bold">หมายเหตุ (EXP)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {medData.transactions.map((tx: any) => (
                        <tr key={tx.id} className="border border-gray-400">
                          <td className="border border-gray-400 p-2 text-black">{formatHistoryDate(tx.created_at)}</td>
                          <td className="border border-gray-400 p-2 text-center text-black font-medium">{tx.action === 'in' ? tx.amountText : '-'}</td>
                          <td className="border border-gray-400 p-2 text-center text-black font-medium">{tx.action === 'out' ? tx.amountText : '-'}</td>
                          <td className="border border-gray-400 p-2 text-center text-black font-bold">{tx.balanceText}</td>
                          <td className="border border-gray-400 p-2 text-black">{tx.staff_name}</td>
                          <td className="border border-gray-400 p-2 text-black text-xs">EXP: {tx.lotExp}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (showQRPrintView) {
    return (
      <div className="bg-white min-h-screen text-black print:p-0 p-4">
        <div className="max-w-5xl mx-auto">
          <div className="print:hidden flex justify-between items-center mb-6 bg-gray-100 p-4 rounded-xl">
            <div>
              <h1 className="text-xl font-bold">ตัวอย่างก่อนพิมพ์ QR Code (Print Preview)</h1>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowQRPrintView(false)} className="px-4 py-2 border rounded-lg font-medium hover:bg-gray-200">ปิด</button>
              <button onClick={() => window.print()} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium flex items-center gap-2"><Printer size={18}/> พิมพ์ QR Code</button>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 print:grid-cols-4 gap-4 print:gap-4 print-content">
            {qrPrintData.map((med) => (
              <div key={med.id} className="border-2 border-dashed border-gray-400 p-4 flex flex-col items-center justify-center text-center break-inside-avoid">
                <QRCodeSVG value={`${typeof window !== 'undefined' ? window.location.origin : ''}/medicine/${med.id}`} size={100} />
                <div className="mt-3 font-bold text-sm leading-tight text-black">{med.name}</div>
                <div className="text-xs text-gray-700 mt-1">รหัส: {med.hosxp_icode || "-"}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // หน้าหลัก (Main UI) - ข้อ 4: ปรับพื้นหลัง Glassmorphism
  // ----------------------------------------------------
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-2 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Tools */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-4 md:mb-8 bg-white/70 backdrop-blur-xl p-4 md:p-6 rounded-2xl shadow-sm border border-white/50">
          <div className="w-full flex justify-between items-start md:items-center">
            <div>
              <h1 className="text-xl md:text-3xl font-bold text-gray-800 leading-tight tracking-tight">
                ระบบคลังยา <br className="md:hidden" />
                <span className="text-base md:text-2xl font-semibold text-gray-600">(จัดล็อต EXP)</span>
              </h1>
              <p className="text-xs md:text-sm text-gray-500 mt-1">Lot & Expiry Date Management</p>
            </div>
            <div className="text-right md:hidden">
              <div className="text-[10px] font-medium text-gray-700 flex items-center justify-end gap-1 bg-white/80 px-2 py-1 rounded-full shadow-sm">
                <User size={12} className="text-gray-500" /> {session.name}
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap md:flex-nowrap items-center gap-2 w-full xl:w-auto mt-2 xl:mt-0">
            <button onClick={() => setIsQRModalOpen(true)} className="flex-1 md:flex-none flex justify-center items-center gap-1 md:gap-2 bg-indigo-50/80 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 px-2 md:px-3 py-2.5 md:py-2 rounded-xl font-medium transition-all text-xs md:text-sm">
              <QrCode size={16} /> <span className="hidden sm:inline">พิมพ์ QR ติดตู้</span><span className="sm:hidden">พิมพ์ QR</span>
            </button>
            <button onClick={() => setIsReportModalOpen(true)} className="flex-1 md:flex-none flex justify-center items-center gap-1 md:gap-2 bg-blue-50/80 text-blue-700 border border-blue-200 hover:bg-blue-100 px-2 md:px-3 py-2.5 md:py-2 rounded-xl font-medium transition-all text-xs md:text-sm">
              <FileText size={16} /> พิมพ์รายงาน
            </button>
            <button onClick={() => setIsImportModalOpen(true)} className="flex-1 md:flex-none flex justify-center items-center gap-1 md:gap-2 bg-amber-50/80 text-amber-700 border border-amber-200 hover:bg-amber-100 px-2 md:px-3 py-2.5 md:py-2 rounded-xl font-medium transition-all text-xs md:text-sm shadow-sm">
              <Upload size={16} /> นำเข้า Excel
            </button>
            <button onClick={openAddMedModal} className="flex-1 md:flex-none flex justify-center items-center gap-1 md:gap-2 bg-emerald-600/90 hover:bg-emerald-700 text-white px-3 py-2.5 md:px-4 md:py-2 rounded-xl font-medium transition-all text-xs md:text-sm shadow-md">
              <Plus size={16} /> เพิ่มยา
            </button>
            {session.isCentral && (
              <button onClick={() => setIsAdminModalOpen(true)} title="จัดการรหัสผ่าน" className="p-2.5 bg-white/80 text-gray-600 rounded-xl hover:bg-blue-100 hover:text-blue-700 transition-all shadow-sm shrink-0">
                <ShieldCheck size={20} />
              </button>
            )}
            <button onClick={onLogout} title="ออกจากระบบ" className="p-2.5 bg-white/80 text-gray-600 rounded-xl hover:bg-red-100 hover:text-red-700 transition-all shadow-sm shrink-0">
              <LogOut size={20} />
            </button>
          </div>
        </div>

        {/* Stats & Filters */}
        <div className="bg-white/60 backdrop-blur-md rounded-2xl shadow-sm border border-white/50 p-4 mb-4">
          <h2 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-1.5">
            <TrendingDown size={18} className="text-blue-500" /> สถิติการใช้ยา & วางแผนรอบเบิกสต็อก
          </h2>
          <div className="flex flex-wrap gap-2 mb-3">
            <button onClick={() => setGlobalPeriodMode('1m')} className={`text-xs px-3.5 py-1.5 rounded-full font-semibold transition-all ${globalPeriodMode === '1m' ? 'bg-blue-600 text-white shadow-md' : 'bg-white/80 text-gray-600 hover:bg-white'}`}>1 เดือน</button>
            <button onClick={() => setGlobalPeriodMode('2m')} className={`text-xs px-3.5 py-1.5 rounded-full font-semibold transition-all ${globalPeriodMode === '2m' ? 'bg-blue-600 text-white shadow-md' : 'bg-white/80 text-gray-600 hover:bg-white'}`}>2 เดือน</button>
            <button onClick={() => setGlobalPeriodMode('3m')} className={`text-xs px-3.5 py-1.5 rounded-full font-semibold transition-all ${globalPeriodMode === '3m' ? 'bg-blue-600 text-white shadow-md' : 'bg-white/80 text-gray-600 hover:bg-white'}`}>3 เดือน</button>
            <button onClick={() => setGlobalPeriodMode('custom')} className={`text-xs px-3.5 py-1.5 rounded-full font-semibold transition-all ${globalPeriodMode === 'custom' ? 'bg-blue-600 text-white shadow-md' : 'bg-white/80 text-gray-600 hover:bg-white'}`}>กำหนดเอง</button>
          </div>
          {globalPeriodMode === 'custom' && (
            <div className="flex items-center gap-2 bg-white/80 p-2 rounded-xl border border-white max-w-md shadow-sm">
              <CalendarRange size={16} className="text-blue-500" />
              <input type="date" className="text-sm bg-transparent outline-none w-full text-gray-700 font-medium" value={globalStartDate} onChange={(e) => setGlobalStartDate(e.target.value)} />
              <span className="text-gray-400">-</span>
              <input type="date" className="text-sm bg-transparent outline-none w-full text-gray-700 font-medium" value={globalEndDate} onChange={(e) => setGlobalEndDate(e.target.value)} />
            </div>
          )}
        </div>

        {/* หมวดยา */}
        <div className="bg-white/60 backdrop-blur-md rounded-2xl shadow-sm border border-white/50 p-4 md:p-5 mb-4 w-full">
          <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-gray-600">
            <LayoutGrid size={16} /> หมวดหมู่ตู้ยา
          </div>
          
          <div className="flex flex-wrap gap-2.5 mb-4">
            <button
              onClick={() => handleCategoryChange("all")}
              className={`px-3.5 py-1.5 rounded-xl text-sm font-semibold border transition-all ${
                selectedCategory === "all" ? "bg-gray-800 text-white border-gray-800 shadow-md" : "bg-white/80 text-gray-600 border-white hover:bg-white hover:shadow-sm"
              }`}
            >
              ทั้งหมด
            </button>
            {categoriesList.map((cat) => {
              const isActive = selectedCategory === cat.id;
              const colorClass = isActive ? "bg-gray-800 text-white border-gray-800 shadow-md" : `bg-white/80 hover:bg-white hover:shadow-sm border-white ${getCategoryColor(cat.id).split(' ')[1]}`;
              return (
                <div key={cat.id} className={`flex items-center gap-0.5 rounded-xl border transition-all ${colorClass}`}>
                  <button onClick={() => handleCategoryChange(cat.id)} className="pl-3.5 pr-2 py-1.5 text-sm font-semibold">
                    {cat.name}
                  </button>
                  <button
                    onClick={() => { setEditingCategoryId(cat.id); setCategoryNameInput(cat.name); }}
                    title="แก้ไขชื่อหมวดหมู่"
                    className={`p-1.5 mr-1 rounded-lg transition-colors ${isActive ? "text-gray-300 hover:text-white hover:bg-white/20" : "opacity-60 hover:opacity-100"}`}
                  >
                    <Edit size={14} />
                  </button>
                </div>
              );
            })}
            <button onClick={handleAddCategory} className="px-3 py-1.5 rounded-xl border-2 border-dashed border-gray-300/80 text-gray-500 hover:text-gray-700 hover:bg-white/50 text-sm font-medium flex items-center gap-1 transition-all">
              <Plus size={14} /> เพิ่มตู้ยา
            </button>
          </div>

          <div className="flex flex-col md:flex-row gap-3 mt-3 items-center">
            <div className="relative flex-1 w-full">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="ค้นหาชื่อยา, HosXP หรือหมายเหตุ..." className="w-full border-0 bg-white/80 rounded-xl pl-10 pr-4 py-3 outline-none focus:ring-2 focus:ring-blue-400 text-sm md:text-base shadow-sm font-medium" />
            </div>
            
            <div className="relative w-full md:w-auto shrink-0 flex items-center gap-2 border-0 bg-white/80 rounded-xl px-4 py-1.5 shadow-sm">
              <ArrowUpDown size={16} className="text-gray-500 shrink-0"/>
              <select 
                 className="w-full bg-transparent outline-none text-sm font-medium text-gray-700 py-1.5 cursor-pointer"
                 value={sortOrder}
                 onChange={(e) => setSortOrder(e.target.value as 'recent'|'alpha')}
              >
                <option value="recent">เรียงตามแก้ไขล่าสุด (ใหม่-เก่า)</option>
                <option value="alpha">เรียงตามตัวอักษร (A-Z, ก-ฮ)</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
           <div className="p-8 text-center text-gray-500 bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border border-white/50 font-medium">กำลังโหลด...</div>
        ) : filteredMedicines.length === 0 ? (
           <div className="p-8 text-center text-gray-500 bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border border-white/50 font-medium">ไม่พบรายการยาที่ตรงกับเงื่อนไข</div>
        ) : (
          <>
            {/* --- มุมมองตารางสำหรับ Desktop --- */}
            <div className="hidden md:block bg-white/70 backdrop-blur-xl rounded-2xl shadow-sm border border-white/50 overflow-hidden">
              <div className="overflow-x-auto pb-4">
                <table className="w-full text-left border-collapse min-w-[1050px]">
                  <thead>
                    <tr className="bg-white/50 border-b border-gray-100">
                      <th className="p-4 font-semibold text-gray-600 w-28">จัดการ</th>
                      <th className="p-4 font-semibold text-gray-600 w-1/4">รหัส/ชื่อยา</th>
                      <th className="p-4 font-semibold text-gray-600 text-center w-32">รับเข้า/ตัดจ่าย</th>
                      <th className="p-4 font-semibold text-gray-600">คงเหลือ (แยกตาม EXP)</th>
                      <th className="p-4 font-semibold text-gray-600 w-64">สถิติ & รอบเบิก (1 / 2 สัปดาห์)</th>
                      <th className="p-4 font-semibold text-gray-600 text-center w-32">QR Code</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMedicines.map((med) => {
                      const activeLots = (med.medicine_lots || []).filter((l: any) => l.current_stock > 0).sort((a: any, b: any) => new Date(a.exp_date).getTime() - new Date(b.exp_date).getTime());
                      const mainUnit = activeLots.length > 0 ? activeLots[0].unit_name : (med.medicine_lots?.[0]?.unit_name || 'หน่วย');
                      const medStats = calculateMedStats(med);
                      const isZero = activeLots.length === 0;

                      return (
                        <tr key={med.id} className={`border-b border-gray-50/50 hover:bg-white/80 transition-colors ${med.is_active === false ? 'opacity-50 grayscale-[50%]' : ''}`}>
                          <td className="p-4 align-top">
                            <div className="flex gap-2 mb-2">
                              <button onClick={() => openEditMedModal(med)} className="p-2 bg-white text-gray-600 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-colors shadow-sm"><Edit size={16} /></button>
                              <button onClick={() => handleDeleteMed(med.id)} className="p-2 bg-white text-gray-600 rounded-xl hover:bg-red-50 hover:text-red-600 transition-colors shadow-sm"><Trash2 size={16} /></button>
                            </div>
                            {/* ข้อ 8: ปุ่ม Switch สถานะยา */}
                            <div className="flex flex-col items-center justify-center pt-2 border-t border-gray-100/50">
                              <button
                                onClick={() => toggleMedStatus(med.id, med.is_active)}
                                title={med.is_active !== false ? 'เบิกได้' : 'คลังเป็น 0'}
                                className={`w-11 h-6 rounded-full relative transition-colors shadow-inner ${med.is_active !== false ? 'bg-emerald-500' : 'bg-red-500'}`}
                              >
                                <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all shadow-sm ${med.is_active !== false ? 'right-1' : 'left-1'}`}></div>
                              </button>
                              <span className="text-[10px] font-medium text-gray-500 mt-1">{med.is_active !== false ? 'เบิกได้' : 'คลังเป็น 0'}</span>
                            </div>
                          </td>
                          <td className="p-4 align-top">
                            <div onClick={() => openHistoryModal(med)} className="font-bold text-gray-800 text-lg cursor-pointer hover:text-blue-600 hover:underline w-fit mb-1.5">{med.name}</div>
                            <div className="text-xs text-gray-500 mb-2 leading-relaxed font-medium">
                              รหัส HosXP: <span className="font-semibold text-gray-700">{med.hosxp_icode || "-"}</span><br/>
                              {med.note && <span className="text-amber-700 bg-amber-50 px-1 rounded">หมายเหตุ: {med.note}</span>}
                            </div>
                            <div className={`text-xs font-semibold px-2.5 py-1 rounded-lg w-fit ${getCategoryColor(med.cabinet_category)}`}>
                              ตู้ยา: {getCategoryName(med.cabinet_category)}
                            </div>
                          </td>
                          <td className="p-4 align-top text-center">
                            <div className="flex justify-center gap-2 mt-1">
                              <button onClick={() => openStockModal(med, 'in')} disabled={med.is_active === false} className="p-3 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 shadow-sm transition-all hover:-translate-y-0.5 disabled:opacity-50" title="รับเข้า"><PackagePlus size={20} /></button>
                              <button onClick={() => openStockModal(med, 'out')} disabled={med.is_active === false} className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 shadow-sm transition-all hover:-translate-y-0.5 disabled:opacity-50" title="ตัดจ่าย"><PackageMinus size={20} /></button>
                            </div>
                          </td>
                          <td className="p-4 align-top">
                            {isZero ? <span className="text-red-500 text-sm font-bold px-3 py-1.5 bg-red-50 rounded-xl border border-red-100 shadow-sm">สต็อกหมด</span> : (
                              <div className="flex flex-col gap-2">
                                {activeLots.map((lot: any) => {
                                  const fullPacks = Math.floor(lot.current_stock / lot.pack_size);
                                  const remainder = lot.current_stock % lot.pack_size;
                                  return (
                                    <div key={lot.id} className="flex flex-col bg-white border border-gray-100 p-3 rounded-xl shadow-sm w-fit min-w-[140px]">
                                      <span className="text-xs font-bold text-rose-600 flex items-center gap-1.5 mb-1.5 border-b border-gray-50 pb-1.5"><CalendarDays size={14} /> EXP: {lot.exp_date}</span>
                                      <div className="flex items-baseline gap-1 text-base">
                                        <span className="font-bold text-emerald-700">{fullPacks}</span><span className="text-gray-400 text-xs font-semibold">x</span><span className="text-gray-700 font-bold">{lot.pack_size}</span>
                                        {remainder > 0 && <span className="text-amber-600 font-bold ml-1 text-xs">เศษ {remainder}</span>}
                                        <span className="text-gray-500 text-xs ml-1 font-medium">{lot.unit_name}</span>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </td>
                          <td className="p-4 align-top">
                            {/* ข้อ 6: ปรับ Format สถิติ */}
                            <div className="bg-white/80 p-3 rounded-xl border border-white shadow-sm text-xs space-y-2">
                              <div className="flex justify-between border-b border-gray-100 pb-1.5"><span className="text-gray-500 font-medium">ใช้รวม ({medStats.daysDiff} วัน):</span><span className="font-bold text-gray-800">{medStats.totalUsage} {mainUnit}</span></div>
                              {formatToPack(medStats.totalUsage, med) && <div className="text-[11px] font-bold text-blue-600 text-right">{formatToPack(medStats.totalUsage, med)}</div>}
                              
                              <div className="flex justify-between text-amber-800 pt-1"><span>รอบเบิก 1 สัปดาห์:</span><span className="font-bold">{medStats.target1Week} {mainUnit}</span></div>
                              {formatToPack(medStats.target1Week, med) && <div className="text-[11px] font-bold text-amber-600 text-right">{formatToPack(medStats.target1Week, med)}</div>}
                              
                              <div className="flex justify-between text-emerald-800 pt-1 border-t border-dashed border-gray-200"><span>รอบเบิก 2 สัปดาห์:</span><span className="font-bold">{medStats.target2Weeks} {mainUnit}</span></div>
                              {formatToPack(medStats.target2Weeks, med) && <div className="text-[11px] font-bold text-emerald-600 text-right">{formatToPack(medStats.target2Weeks, med)}</div>}
                            </div>
                          </td>
                          <td className="p-4 text-center align-top">
                            <div className="flex flex-col items-center justify-center p-2.5 bg-white rounded-xl border border-gray-100 shadow-sm mx-auto w-fit">
                              <QRCodeSVG value={`${typeof window !== 'undefined' ? window.location.origin : ''}/medicine/${med.id}`} size={64} />
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* --- มุมมองการ์ด (Card View) สำหรับ Mobile --- */}
            <div className="md:hidden flex flex-col gap-4">
              {filteredMedicines.map((med) => {
                const activeLots = (med.medicine_lots || []).filter((l: any) => l.current_stock > 0).sort((a: any, b: any) => new Date(a.exp_date).getTime() - new Date(b.exp_date).getTime());
                const mainUnit = activeLots.length > 0 ? activeLots[0].unit_name : (med.medicine_lots?.[0]?.unit_name || 'หน่วย');
                const medStats = calculateMedStats(med);
                const isZero = activeLots.length === 0;

                return (
                  <div key={med.id} className={`bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-white p-4 relative flex flex-col gap-3 ${med.is_active === false ? 'opacity-60 grayscale-[30%]' : ''}`}>
                    {/* Header: ชื่อยา + ปุ่มจัดการ */}
                    <div className="flex justify-between items-start border-b border-gray-100 pb-3">
                      <div>
                        <div onClick={() => openHistoryModal(med)} className="font-bold text-gray-800 text-lg cursor-pointer hover:text-blue-600 hover:underline">{med.name}</div>
                        <div className="text-xs text-gray-500 mt-1 font-medium">รหัส HosXP: {med.hosxp_icode || "-"}</div>
                        {med.note && <div className="text-xs text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded w-fit mt-1">หมายเหตุ: {med.note}</div>}
                        <div className={`text-[10px] mt-1.5 font-bold px-2 py-0.5 rounded-lg w-fit ${getCategoryColor(med.cabinet_category)}`}>ตู้ยา: {getCategoryName(med.cabinet_category)}</div>
                      </div>
                      <div className="flex flex-col gap-2 items-end">
                        <div className="flex gap-1.5">
                           <button onClick={() => openEditMedModal(med)} className="p-2 bg-white shadow-sm text-gray-600 rounded-lg hover:bg-blue-50"><Edit size={16} /></button>
                           <button onClick={() => handleDeleteMed(med.id)} className="p-2 bg-white shadow-sm text-gray-600 rounded-lg hover:bg-red-50"><Trash2 size={16} /></button>
                        </div>
                        {/* Switch Mobile */}
                        <div className="flex items-center gap-1.5 mt-1">
                           <span className="text-[10px] font-medium text-gray-500">{med.is_active !== false ? 'เบิกได้' : 'คลัง 0'}</span>
                           <button
                             onClick={() => toggleMedStatus(med.id, med.is_active)}
                             className={`w-9 h-5 rounded-full relative transition-colors shadow-inner ${med.is_active !== false ? 'bg-emerald-500' : 'bg-red-500'}`}
                           >
                             <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-[3px] transition-all shadow-sm ${med.is_active !== false ? 'right-[3px]' : 'left-[3px]'}`}></div>
                           </button>
                        </div>
                      </div>
                    </div>

                    {/* สต็อก */}
                    <div>
                       <div className="text-xs font-bold text-gray-500 mb-2">คงเหลือ (แยกตาม EXP):</div>
                       {isZero ? <span className="text-red-500 text-xs font-bold px-3 py-1.5 bg-red-50 rounded-xl border border-red-100 shadow-sm">สต็อกหมด</span> : (
                         <div className="flex flex-col gap-2">
                            {activeLots.map((lot: any) => {
                              const fullPacks = Math.floor(lot.current_stock / lot.pack_size);
                              const remainder = lot.current_stock % lot.pack_size;
                              return (
                                <div key={lot.id} className="flex justify-between items-center bg-white border border-gray-100 p-3 rounded-xl shadow-sm">
                                  <span className="text-[11px] font-bold text-rose-600 flex items-center gap-1"><CalendarDays size={14} /> EXP: {lot.exp_date}</span>
                                  <div className="flex items-baseline gap-1 text-sm">
                                    <span className="font-bold text-emerald-700">{fullPacks}</span><span className="text-gray-400 text-[10px] font-semibold">x</span><span className="text-gray-700 font-bold">{lot.pack_size}</span>
                                    {remainder > 0 && <span className="text-amber-600 font-bold ml-1 text-[10px]">เศษ {remainder}</span>}
                                    <span className="text-gray-500 text-[10px] ml-1 font-medium">{lot.unit_name}</span>
                                  </div>
                                </div>
                              )
                            })}
                         </div>
                       )}
                    </div>

                    {/* ปุ่มรับเข้า ตัดจ่าย */}
                    <div className="grid grid-cols-2 gap-2 mt-1">
                        <button onClick={() => openStockModal(med, 'in')} disabled={med.is_active === false} className="flex items-center justify-center gap-2 p-3 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 font-bold text-sm shadow-sm active:scale-95 transition-transform disabled:opacity-50"><PackagePlus size={18} /> รับเข้า</button>
                        <button onClick={() => openStockModal(med, 'out')} disabled={med.is_active === false} className="flex items-center justify-center gap-2 p-3 bg-red-50 text-red-700 rounded-xl border border-red-100 font-bold text-sm shadow-sm active:scale-95 transition-transform disabled:opacity-50"><PackageMinus size={18} /> ตัดจ่าย</button>
                    </div>

                    {/* สถิติ */}
                    <div className="bg-white/60 p-3 rounded-xl border border-white shadow-sm mt-1">
                      <div className="text-[10px] font-bold text-gray-500 mb-2">สถิติและเป้าหมายสต็อก:</div>
                      
                      <div className="flex justify-between text-xs mb-1"><span className="text-gray-600 font-medium">ใช้รวม ({medStats.daysDiff} วัน):</span><span className="font-bold">{medStats.totalUsage} {mainUnit}</span></div>
                      {formatToPack(medStats.totalUsage, med) && <div className="text-[10px] font-bold text-blue-600 text-right mb-2">{formatToPack(medStats.totalUsage, med)}</div>}
                      
                      <div className="flex justify-between text-xs mb-1"><span className="text-amber-700 font-medium">เบิก 1 สัปดาห์:</span><span className="font-bold text-amber-700">{medStats.target1Week} {mainUnit}</span></div>
                      {formatToPack(medStats.target1Week, med) && <div className="text-[10px] font-bold text-amber-600 text-right mb-2">{formatToPack(medStats.target1Week, med)}</div>}
                      
                      <div className="flex justify-between text-xs border-t border-dashed border-gray-200 pt-1"><span className="text-emerald-700 font-medium">เบิก 2 สัปดาห์:</span><span className="font-bold text-emerald-700">{medStats.target2Weeks} {mainUnit}</span></div>
                      {formatToPack(medStats.target2Weeks, med) && <div className="text-[10px] font-bold text-emerald-600 text-right">{formatToPack(medStats.target2Weeks, med)}</div>}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* Modal ต่างๆ (คงโครงสร้างเดิม) */}
        {isImportModalOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
            <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-white">
              <div className="flex justify-between items-center p-5 md:p-6 border-b bg-amber-50/80">
                <h2 className="text-lg md:text-xl font-bold flex items-center gap-2 text-amber-800"><Upload size={22} /> นำเข้าข้อมูลยาด้วยไฟล์ Excel</h2>
                <button onClick={() => { setIsImportModalOpen(false); setImportData([]); }} className="p-1 hover:bg-black/5 rounded-full transition-colors"><X size={22} className="text-gray-500" /></button>
              </div>
              <div className="p-5 md:p-6 flex-1 overflow-y-auto space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                  <div>
                    <label className="block text-sm font-bold mb-1.5 text-gray-700">อัปโหลดไฟล์ (.xlsx, .csv)</label>
                    <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-amber-100 file:text-amber-800 hover:file:bg-amber-200 transition-colors" />
                  </div>
                  <button onClick={handleDownloadTemplate} className="flex items-center gap-2 text-sm font-bold text-blue-700 bg-blue-100 px-4 py-2.5 rounded-xl hover:bg-blue-200 transition-colors">
                    <Download size={16} /> โหลดไฟล์แม่แบบ
                  </button>
                </div>
                <div className="bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
                  <div className="bg-gray-50 p-3 text-xs text-gray-600 text-center font-semibold border-b">* ชื่อยา และตู้ยา จำเป็นต้องมีข้อมูล / ส่วนอื่นๆ หากไม่ใส่ข้อมูล ระบบจะบันทึกเฉพาะชื่อยาไว้ให้</div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border-b">
                          <th className="p-3 border-r font-bold text-gray-700">ชื่อยา*</th>
                          <th className="p-3 border-r font-bold text-gray-700 text-center">ตู้ยา*</th>
                          <th className="p-3 border-r font-bold text-gray-700 text-center">รหัส/หมายเหตุ</th>
                          <th className="p-3 border-r font-bold text-gray-700 text-center">EXP</th>
                          <th className="p-3 font-bold text-gray-700 text-right">จำนวน</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importData.length === 0 ? <tr><td colSpan={5} className="p-8 text-center text-gray-400 italic font-medium">กรุณาเลือกไฟล์เพื่อดูตัวอย่างข้อมูล</td></tr> : (
                          importData.map((row) => (
                            <tr key={row.id} className={`border-b ${!row.isValid ? 'bg-red-50/50' : 'hover:bg-gray-50'}`}>
                              <td className="p-3 border-r"><span className={!row.name ? 'text-red-500 font-bold' : 'font-medium'}>{row.name || 'ไม่ได้ระบุ'}</span></td>
                              <td className="p-3 border-r text-center"><span className={!row.cabinet_category ? 'text-red-500 font-bold' : 'font-medium'}>{getCategoryName(row.cabinet_category) || '-'}</span></td>
                              <td className="p-3 border-r text-xs text-center text-gray-500">{row.hosxp_icode} {row.note ? `(note: ${row.note})` : ''}</td>
                              <td className="p-3 border-r text-center text-rose-600 font-medium">{row.exp || '-'}</td>
                              <td className="p-3 text-right">{row.amount > 0 ? <span className="font-bold text-emerald-700">{row.amount} <span className="text-xs text-gray-500 font-medium">{row.unit}</span></span> : '-'}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              <div className="p-4 border-t bg-gray-50/50 flex gap-3">
                <button type="button" onClick={() => { setIsImportModalOpen(false); setImportData([]); }} className="flex-1 bg-white border border-gray-200 shadow-sm p-3.5 rounded-xl font-bold text-gray-700 hover:bg-gray-50 transition-colors">ยกเลิก</button>
                <button type="button" onClick={executeImport} disabled={importData.length === 0 || isImporting} className="flex-1 bg-amber-600 hover:bg-amber-700 shadow-md text-white p-3.5 rounded-xl font-bold transition-colors disabled:opacity-50">
                  {isImporting ? 'กำลังนำเข้าข้อมูล...' : 'ยืนยันนำเข้าข้อมูล'}
                </button>
              </div>
            </div>
          </div>
        )}

        {isMedModalOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
            <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-white">
              <div className="flex justify-between items-center p-5 md:p-6 border-b bg-gray-50/50">
                <h2 className="text-lg md:text-xl font-bold text-gray-800">{isEditing ? 'แก้ไขข้อมูลยา' : 'เพิ่มรายการยาใหม่ (Master)'}</h2>
                <button onClick={() => setIsMedModalOpen(false)} className="p-1 hover:bg-black/5 rounded-full transition-colors"><X size={22} className="text-gray-500" /></button>
              </div>
              <form onSubmit={handleSaveMedicine} className="p-5 md:p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold mb-1.5 text-gray-700">ชื่อยา *</label>
                    <input type="text" required className="w-full border border-gray-200 bg-white/50 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 font-medium" value={medFormData.name} onChange={(e) => setMedFormData({ ...medFormData, name: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-1.5 text-gray-700">หมายเหตุ</label>
                    <input type="text" className="w-full border border-gray-200 bg-white/50 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 font-medium" value={medFormData.note} onChange={(e) => setMedFormData({ ...medFormData, note: e.target.value })} placeholder="เช่น แก้อักเสบ" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold mb-1.5 text-gray-700">รหัส HosXP</label>
                    <input type="text" className="w-full border border-gray-200 bg-white/50 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 font-medium" value={medFormData.hosxp_icode} onChange={(e) => setMedFormData({ ...medFormData, hosxp_icode: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-1.5 text-gray-700">หมวดหมู่ตู้ยา</label>
                    <select className="w-full border border-gray-200 rounded-xl p-3 bg-white/80 outline-none focus:ring-2 focus:ring-blue-500 font-semibold" value={medFormData.cabinet_category} onChange={(e) => setMedFormData({ ...medFormData, cabinet_category: e.target.value })}>
                      {categoriesList.map(cat => <option key={cat.id} value={cat.id.toString()}>{cat.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setIsMedModalOpen(false)} className="flex-1 bg-white border border-gray-200 shadow-sm p-3.5 rounded-xl font-bold text-gray-700 hover:bg-gray-50 transition-colors">ยกเลิก</button>
                  <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 shadow-md text-white p-3.5 rounded-xl font-bold transition-colors">{isEditing ? 'บันทึกการแก้ไข' : 'บันทึกยาใหม่'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {isReportModalOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
            <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-white">
              <div className="flex justify-between items-center p-5 border-b bg-blue-50/80 border-blue-100">
                <h2 className="text-lg font-bold flex items-center gap-2 text-blue-900"><FileText size={18} /> พิมพ์รายงาน Stock Card</h2>
                <button onClick={() => setIsReportModalOpen(false)} className="p-1 hover:bg-black/5 rounded-full transition-colors"><X size={20} className="text-blue-500" /></button>
              </div>
              <div className="p-6 space-y-4">
                {/* ข้อ 3: เพิ่มตัวเลือกตู้ยาในหน้าพิมพ์รายงาน */}
                <div>
                  <label className="block text-sm font-bold mb-2 text-gray-700">เลือกตู้ยา (Cabinet)</label>
                  <select className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 bg-white/80 font-medium" value={reportTargetCategory} onChange={(e) => { setReportTargetCategory(e.target.value === "all" ? "all" : Number(e.target.value)); setReportTargetId("all"); }}>
                    <option value="all">-- ทุกตู้ยา --</option>
                    {categoriesList.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2 text-gray-700">เลือกรายการที่ต้องการพิมพ์</label>
                  <select className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 bg-white/80 font-medium" value={reportTargetId} onChange={(e) => setReportTargetId(e.target.value)}>
                    <option value="all">-- พิมพ์ยาทั้งหมด (ตามตู้ที่เลือก) --</option>
                    {medicines.filter(m => reportTargetCategory === "all" || String(m.cabinet_category) === String(reportTargetCategory)).map(m => <option key={m.id} value={m.id}>{m.name} {m.hosxp_icode ? `(${m.hosxp_icode})` : ''}</option>)}
                  </select>
                </div>
                <div className="pt-4 flex gap-3">
                  <button onClick={() => setIsReportModalOpen(false)} className="flex-1 bg-white border border-gray-200 shadow-sm p-3.5 rounded-xl font-bold text-gray-700 hover:bg-gray-50 transition-colors">ยกเลิก</button>
                  <button onClick={handleGenerateReport} disabled={isGeneratingReport} className="flex-1 bg-blue-600 hover:bg-blue-700 shadow-md text-white p-3.5 rounded-xl font-bold transition-colors disabled:opacity-60 flex justify-center items-center gap-2">
                    {isGeneratingReport ? "กำลังดึงข้อมูล..." : <><Printer size={18}/> สร้าง PDF</>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {isQRModalOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
            <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-white">
              <div className="flex justify-between items-center p-5 border-b bg-indigo-50/80 border-indigo-100">
                <h2 className="text-lg font-bold flex items-center gap-2 text-indigo-900"><QrCode size={18} /> พิมพ์ QR ติดตู้ยา</h2>
                <button onClick={() => setIsQRModalOpen(false)} className="p-1 hover:bg-black/5 rounded-full transition-colors"><X size={20} className="text-indigo-500" /></button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold mb-2 text-gray-700">เลือกตู้ยา (Cabinet)</label>
                  <select className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500 bg-white/80 font-medium" value={qrTargetCategory} onChange={(e) => { setQrTargetCategory(e.target.value === "all" ? "all" : Number(e.target.value)); setQrTargetId("all"); }}>
                    <option value="all">-- ทุกตู้ยา --</option>
                    {categoriesList.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2 text-gray-700">เลือกรายการยาที่ต้องการพิมพ์ QR</label>
                  <select className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500 bg-white/80 font-medium" value={qrTargetId} onChange={(e) => setQrTargetId(e.target.value)}>
                    <option value="all">-- พิมพ์ทั้งหมด (ตามตู้ที่เลือก) --</option>
                    {medicines.filter(m => qrTargetCategory === "all" || String(m.cabinet_category) === String(qrTargetCategory)).map(m => <option key={m.id} value={m.id}>{m.name} {m.hosxp_icode ? `(${m.hosxp_icode})` : ''}</option>)}
                  </select>
                </div>
                <div className="pt-4 flex gap-3">
                  <button onClick={() => setIsQRModalOpen(false)} className="flex-1 bg-white border border-gray-200 shadow-sm p-3.5 rounded-xl font-bold text-gray-700 hover:bg-gray-50 transition-colors">ยกเลิก</button>
                  <button onClick={handleGenerateQRPrint} className="flex-1 bg-indigo-600 hover:bg-indigo-700 shadow-md text-white p-3.5 rounded-xl font-bold transition-colors flex justify-center items-center gap-2"><Printer size={18}/> สร้าง QR</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {isStockModalOpen && selectedMed && (
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
                <div className="font-bold text-gray-800 mb-2 border-b border-gray-100 pb-2 text-lg">{selectedMed.name}</div>
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
                          const l = (selectedMed.medicine_lots || []).find((x: any) => String(x.id) === e.target.value);
                          if(l) { setStockPackSize(l.pack_size.toString()); setStockUnitName(l.unit_name); }
                        }}>
                          <option value="">-- กรุณาเลือกล็อต --</option>
                          {(selectedMed.medicine_lots || []).map((lot: any) => {
                            const packs = Math.floor(lot.current_stock / lot.pack_size);
                            const remainder = lot.current_stock % lot.pack_size;
                            const unitString = lot.unit_name === "'s" ? "'" : ` ${lot.unit_name}`;
                            const remainderText = remainder > 0 ? ` เศษ ${remainder}` : "";
                            return <option key={lot.id} value={lot.id}>EXP: {lot.exp_date} (เหลือ: {packs}x{lot.pack_size}{unitString}{remainderText})</option>
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
                      {(selectedMed.medicine_lots || []).filter((l: any) => l.current_stock > 0).map((lot: any) => {
                        const packs = Math.floor(lot.current_stock / lot.pack_size);
                        const remainder = lot.current_stock % lot.pack_size;
                        const unitString = lot.unit_name === "'s" ? "'" : ` ${lot.unit_name}`;
                        const remainderText = remainder > 0 ? ` เศษ ${remainder}` : "";
                        return <option key={lot.id} value={lot.id}>EXP: {lot.exp_date} (เหลือ: {packs}x{lot.pack_size}{unitString}{remainderText})</option>
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

        {editingCategoryId !== null && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
            <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-white">
              <div className="flex justify-between items-center p-5 border-b bg-blue-50/80 border-blue-100">
                <h2 className="text-lg font-bold flex items-center gap-2 text-blue-900"><Tag size={18} /> แก้ไขชื่อตู้ยา</h2>
                <button onClick={() => { setEditingCategoryId(null); setCategoryNameInput(""); }} className="p-1 hover:bg-black/5 rounded-full transition-colors"><X size={20} className="text-blue-500" /></button>
              </div>
              <form onSubmit={handleRenameCategory} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold mb-1.5 text-gray-700">ชื่อหมวดหมู่ใหม่</label>
                  <input type="text" required autoFocus className="w-full border border-gray-200 bg-white/80 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 font-semibold shadow-sm" value={categoryNameInput} onChange={(e) => setCategoryNameInput(e.target.value)} />
                </div>
                <div className="pt-3 flex gap-3">
                  <button type="button" onClick={() => { setEditingCategoryId(null); setCategoryNameInput(""); }} className="flex-1 bg-white border border-gray-200 p-3 rounded-xl font-bold text-gray-700 hover:bg-gray-50 shadow-sm transition-colors">ยกเลิก</button>
                  <button type="submit" disabled={categoryBusy} className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 shadow-md text-white p-3 rounded-xl font-bold disabled:opacity-60 transition-colors">
                    <Check size={18} /> {categoryBusy ? "กำลังบันทึก..." : "บันทึก"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {isHistoryModalOpen && historyMed && (
          <div className="fixed inset-0 bg-gradient-to-br from-gray-50 via-white to-gray-50 flex flex-col z-50 overflow-y-auto w-full h-full backdrop-blur-sm">
            <div className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50 flex justify-between items-center p-4 sticky top-0 z-10 shadow-sm">
              <button onClick={() => { setIsHistoryModalOpen(false); setHistoryMed(null); setHistoryRows([]); }} className="flex items-center text-sm font-bold text-gray-600 hover:text-gray-900 bg-white border border-gray-200 px-3 py-1.5 rounded-lg shadow-sm transition-colors">
                <ArrowLeft size={16} className="mr-1.5"/> กลับหน้ารวม
              </button>
              <div className="flex items-center gap-1.5 text-xs font-bold text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full shadow-inner"><User size={14} /> {session.name}</div>
            </div>

            <div className="p-4 md:p-6 max-w-3xl mx-auto w-full space-y-4 pb-20">
              <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-5 md:p-7 shadow-lg border border-white">
                <div className="text-center mb-6">
                  <h1 className="text-2xl md:text-3xl font-black text-gray-800 tracking-tight">{historyMed.name}</h1>
                  <div className="flex justify-center gap-2 mt-3 flex-wrap">
                    {historyMed.note && <span className="px-3.5 py-1.5 bg-amber-50 border border-amber-100 rounded-full text-xs font-semibold text-amber-700 shadow-sm">หมายเหตุ: {historyMed.note}</span>}
                    <span className="px-3.5 py-1.5 bg-gray-50 border border-gray-200 rounded-full text-xs font-semibold text-gray-600 shadow-sm">รหัส: {historyMed.hosxp_icode || "-"}</span>
                    <span className="px-3.5 py-1.5 bg-blue-50 border border-blue-100 rounded-full text-xs font-bold text-blue-700 shadow-sm">ตู้ยา: {getCategoryName(historyMed.cabinet_category)}</span>
                  </div>
                </div>

                <div className="mb-6 bg-gradient-to-br from-gray-50 to-white rounded-2xl p-5 border border-gray-100 shadow-inner">
                  <h3 className="text-sm font-black flex items-center gap-2 mb-4 text-gray-700"><CalendarDays size={18} className="text-blue-500" /> สต็อกคงเหลือแบ่งตาม EXP</h3>
                  <div className="flex flex-wrap gap-3">
                    {(!historyMed.medicine_lots || historyMed.medicine_lots.filter((l: any) => l.current_stock > 0).length === 0) ? <div className="text-sm text-red-500 font-bold bg-red-50 px-4 py-2 rounded-xl border border-red-100 shadow-sm">สต็อกหมด</div> : (
                      historyMed.medicine_lots.filter((l: any) => l.current_stock > 0).sort((a: any, b: any) => new Date(a.exp_date).getTime() - new Date(b.exp_date).getTime()).map((lot: any) => {
                          const packs = Math.floor(lot.current_stock / lot.pack_size);
                          const remainder = lot.current_stock % lot.pack_size;
                          return (
                            <div key={lot.id} className="bg-white border border-gray-200 rounded-2xl p-3.5 shadow-sm min-w-[160px] hover:shadow-md transition-shadow">
                              <div className="text-[11px] md:text-xs font-bold text-rose-600 mb-2 border-b border-gray-50 pb-1.5">EXP: {lot.exp_date}</div>
                              <div className="flex items-baseline gap-1.5 text-lg">
                                <span className="font-black text-emerald-700">{packs}</span><span className="text-gray-400 text-sm font-semibold">x</span><span className="text-gray-700 text-base font-bold">{lot.pack_size}</span>
                                {remainder > 0 && <span className="text-amber-600 font-bold ml-1 text-xs">เศษ {remainder}</span>}<span className="text-gray-500 text-xs ml-0.5 font-medium">{lot.unit_name}</span>
                              </div>
                              <div className="text-[10px] font-semibold text-gray-400 mt-1">รวม {lot.current_stock} หน่วย</div>
                            </div>
                          )
                        })
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  <button onClick={() => openStockModal(historyMed, 'in')} disabled={historyMed.is_active === false} className="bg-gradient-to-b from-emerald-50 to-white text-emerald-700 hover:from-emerald-100 hover:to-emerald-50 border border-emerald-200 p-4 md:p-5 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all shadow-sm hover:shadow active:scale-95 disabled:opacity-50">
                    <PackagePlus size={28} className="text-emerald-500" /><span className="font-black text-sm md:text-base">รับเข้าสต็อก</span>
                  </button>
                  <button onClick={() => openStockModal(historyMed, 'out')} disabled={historyMed.is_active === false} className="bg-gradient-to-b from-red-50 to-white text-red-700 hover:from-red-100 hover:to-red-50 border border-red-200 p-4 md:p-5 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all shadow-sm hover:shadow active:scale-95 disabled:opacity-50">
                    <PackageMinus size={28} className="text-red-500" /><span className="font-black text-sm md:text-base">ตัดจ่ายสต็อก</span>
                  </button>
                </div>
              </div>

              <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-5 md:p-7 shadow-lg border border-white">
                <h3 className="text-sm font-black flex items-center gap-2 mb-5 text-gray-700 border-b border-gray-100 pb-3"><History size={18} className="text-blue-500" /> ประวัติการทำรายการล่าสุด</h3>
                <div className="space-y-3">
                  {historyLoading ? <div className="text-center text-gray-500 font-semibold py-8">กำลังโหลดข้อมูล...</div> : historyRows.length === 0 ? <div className="text-center text-gray-500 font-medium py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">ยังไม่มีประวัติการรับเข้า/ตัดจ่าย</div> : (
                    historyRows.map((row: any) => {
                      // ตรวจสอบสถานะรอรับเข้า (ข้อ 7)
                      const isPending = row.action === 'pending_in';
                      const isInc = row.action === 'in' || isPending;
                      const lotInfo = (historyMed.medicine_lots || []).find((l: any) => l.id.toString() === row.lot_id?.toString());
                      const pSize = lotInfo?.pack_size || 100;
                      const pUnit = lotInfo?.unit_name || 'หน่วย';
                      
                      // แปลงเป็น กล่อง x ขนาดบรรจุ (ข้อ 1)
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
                              <div className="text-[10px] md:text-[11px] font-semibold text-gray-500 flex items-center gap-1.5 mt-2"><CalendarDays size={12} className="text-gray-400" /> EXP: {row.exp_date || "-"}</div>
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
          </div>
        )}
      </div>
    </div>
  );
}

export default function StockCardPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [checkedSession, setCheckedSession] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) setSession(JSON.parse(raw));
    } catch { }
    setCheckedSession(true);
  }, []);

  const handleLogout = () => { localStorage.removeItem(SESSION_KEY); setSession(null); };

  if (!checkedSession) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400 font-medium">กำลังโหลด...</div>;
  if (!session) return <LoginScreen onLogin={setSession} />;

  return <StockCardApp session={session} onLogout={handleLogout} />;
}