"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import {
  Plus, PackagePlus, PackageMinus, X, CalendarDays,
  User, Lock, LogOut, KeyRound, Bell, Check,
  Search, Edit, Trash2, LayoutGrid, History,
  FileText, Printer, QrCode, ArrowLeft, Upload, ArrowUpDown, Clock, Users, UserPlus, MessageSquareText, Download
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

async function sha256Hex(t: string) { 
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t)); 
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join(""); 
}

const formatBoxString = (totalItems: number, packSize: number, unitName: string) => { 
  if (packSize <= 1 || totalItems === 0) return `${totalItems} ${unitName}`; 
  const packs = Math.floor(totalItems / packSize); 
  const rem = totalItems % packSize; 
  const unitStr = unitName === "'s" ? "เม็ด" : unitName;
  if (packs === 0) return `${rem} ${unitStr}`; 
  return `${packs} กล่อง × ${packSize} ${unitStr} ${rem > 0 ? `(เศษ ${rem} ${unitStr})` : ''}`; 
}

const SmartDateInput = ({ value, onChange, placeholder = "วว/ดด/ปปปป หรือ 150926", className, required }: any) => {
    const [display, setDisplay] = useState("");

    useEffect(() => {
        if (value) {
            const [y, m, d] = value.split('-');
            if (y && m && d && y.length === 4) {
                setDisplay(`${d}/${m}/${y}`);
            }
        } else {
            setDisplay("");
        }
    }, [value]);

    const handleBlur = () => {
        if (!display.trim()) {
            onChange("");
            return;
        }
        const digits = display.replace(/\D/g, '');
        let d="", m="", y="";
        
        if (digits.length === 6) {
            d = digits.slice(0, 2); 
            m = digits.slice(2, 4); 
            const yr2 = parseInt(digits.slice(4), 10);
            y = (yr2 > 40 ? 2500 + yr2 : 2000 + yr2).toString();
        } else if (digits.length === 8) {
            d = digits.slice(0, 2); 
            m = digits.slice(2, 4); 
            y = digits.slice(4);
        } else {
            const parts = display.split(/[-/]/);
            if (parts.length === 3) {
                d = parts[0].padStart(2, '0');
                m = parts[1].padStart(2, '0');
                y = parts[2];
                if (y.length === 2) {
                    const yr2 = parseInt(y, 10);
                    y = (yr2 > 40 ? 2500 + yr2 : 2000 + yr2).toString();
                }
            }
        }

        if (d && m && y && d !== "00" && m !== "00") {
            let parsedY = parseInt(y, 10);
            if (parsedY > 2400) {
                parsedY -= 543;
            }
            const paddedD = d.padStart(2, '0');
            const paddedM = m.padStart(2, '0');
            const isoDate = `${parsedY}-${paddedM}-${paddedD}`;
            onChange(isoDate);
        } else {
            setDisplay(display); 
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleBlur();
        }
    }

    return (
        <input 
          type="text" 
          value={display} 
          onChange={(e) => setDisplay(e.target.value)} 
          onBlur={handleBlur} 
          onKeyDown={handleKeyDown}
          placeholder={placeholder} 
          className={className}
          required={required}
        />
    );
};

function LoginScreen({ onLogin, staffList }: { onLogin: (s: Session) => void, staffList: string[] }) {
  const [selectedName, setSelectedName] = useState<string | null>(null); 
  const [staffRow, setStaffRow] = useState<any>(null); 
  const [loadingRow, setLoadingRow] = useState(false); 
  const [mode, setMode] = useState<"password" | "setPassword">("password"); 
  const [password, setPassword] = useState(""); 
  const [password2, setPassword2] = useState(""); 
  const [error, setError] = useState(""); 
  const [busy, setBusy] = useState(false); 

  const closeModal = () => { setSelectedName(null); setStaffRow(null); setPassword(""); setPassword2(""); setError(""); };

  const openStaffLogin = async (name: string) => { 
    setSelectedName(name); setError(""); setPassword(""); setPassword2(""); setLoadingRow(true); 
    try { 
      let { data, error } = await supabase.from("staff_accounts").select("*").eq("name", name).maybeSingle(); 
      if (error) throw error; 
      if (!data) { 
        const defaultHash = name === "Admin" ? await sha256Hex("1115") : ""; 
        const { data: inserted } = await supabase.from("staff_accounts").insert([{ name, password_hash: defaultHash, is_central: false }]).select().single(); 
        data = inserted; 
      } 
      setStaffRow(data); 
      setMode(data.password_hash ? "password" : "setPassword"); 
    } catch (e: any) { 
      setError("โหลดข้อมูลไม่สำเร็จ"); 
    } finally { setLoadingRow(false); } 
  };

  const handleSubmitPassword = async (e: React.FormEvent) => { 
    e.preventDefault(); 
    if (!staffRow) return; 
    setError(""); 
    if (mode === "setPassword") { 
      if (password.length < 4) return setError("อย่างน้อย 4 ตัวอักษร"); 
      if (password !== password2) return setError("รหัสไม่ตรงกัน"); 
    } 
    setBusy(true); 
    try { 
      const hash = await sha256Hex(password); 
      if (mode === "setPassword") { 
        const { data } = await supabase.from("staff_accounts").update({ password_hash: hash }).eq("id", staffRow.id).select().single(); 
        const session: Session = { id: data.id, name: data.name, isCentral: false }; 
        localStorage.setItem(SESSION_KEY, JSON.stringify(session)); 
        onLogin(session); 
      } else { 
        if (hash !== staffRow.password_hash) { setBusy(false); return setError("รหัสผ่านไม่ถูกต้อง"); } 
        const session: Session = { id: staffRow.id, name: staffRow.name, isCentral: false }; 
        localStorage.setItem(SESSION_KEY, JSON.stringify(session)); 
        onLogin(session); 
      } 
    } catch (e: any) { setError("เกิดข้อผิดพลาด"); } finally { setBusy(false); } 
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#eef2f5] to-[#f8fafc] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">ระบบคลังยา</h1>
          <p className="text-slate-500 mt-2 text-sm">กรุณาเลือกชื่อเจ้าหน้าที่เพื่อเข้าสู่ระบบ</p>
        </div>
        <div className="bg-white/60 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/80 p-5 mb-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {staffList.map((name) => (
              <button key={name} onClick={() => openStaffLogin(name)} className={`flex items-center gap-2 justify-center border rounded-2xl p-3.5 font-medium transition-all ${name === 'Admin' ? 'bg-amber-50/80 text-amber-800 border-amber-200 hover:bg-amber-100 font-bold' : 'bg-white/50 border-white/60 text-slate-700 hover:bg-white/90 hover:shadow-sm'}`}><User size={18} className={name === 'Admin' ? 'text-amber-600' : 'text-slate-400'} /> {name}</button>
            ))}
          </div>
        </div>
        {selectedName && (
          <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-white">
              <div className="flex justify-between items-center p-5 border-b border-white/50 bg-white/40"><h2 className="text-lg font-bold flex items-center gap-2 text-slate-800"><Lock size={18} /> {selectedName}</h2><button onClick={closeModal}><X size={22} className="text-slate-400 hover:text-slate-600" /></button></div>
              {loadingRow ? <div className="p-8 text-center text-slate-500">กำลังโหลด...</div> : (
                <form onSubmit={handleSubmitPassword} className="p-6 space-y-5">
                  {mode === "setPassword" && <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-xl p-3">การเข้าสู่ระบบครั้งแรก กรุณาตั้งรหัสผ่านใหม่เพื่อความปลอดภัย</p>}
                  <div><label className="block text-sm font-medium mb-1.5 text-slate-700">{mode === "setPassword" ? "ตั้งรหัสผ่านใหม่" : "รหัสผ่าน"}</label><input type="password" required autoFocus className="w-full bg-white/50 border border-white rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-400" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
                  {mode === "setPassword" && <div><label className="block text-sm font-medium mb-1.5 text-slate-700">ยืนยันรหัสผ่าน</label><input type="password" required className="w-full bg-white/50 border border-white rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-400" value={password2} onChange={(e) => setPassword2(e.target.value)} /></div>}
                  {error && <p className="text-red-500 text-sm">{error}</p>}
                  <button type="submit" disabled={busy} className="w-full bg-blue-500 hover:bg-blue-600 text-white p-3.5 rounded-xl font-medium shadow-lg transition-all">{busy ? "กำลังตรวจสอบ..." : mode === "setPassword" ? "ตั้งรหัสผ่าน" : "เข้าสู่ระบบ"}</button>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StockCardApp({ session, onLogout, staffList, refreshStaffList }: { session: Session | null; onLogout: () => void; staffList: string[]; refreshStaffList: () => void }) {
  const [medicines, setMedicines] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true); 
  const [sortOrder, setSortOrder] = useState<'recent' | 'alpha'>('alpha');
  const [isMedModalOpen, setIsMedModalOpen] = useState(false); 
  const [isEditing, setIsEditing] = useState(false); 
  const [medFormData, setMedFormData] = useState({ id: "", name: "", note: "", hosxp_icode: "", cabinet_category: "1", min_stock: "" });
  
  const [isStockModalOpen, setIsStockModalOpen] = useState(false); 
  const [selectedMed, setSelectedMed] = useState<any>(null); 
  const [stockAction, setStockAction] = useState<'in' | 'out'>('out'); 
  const [stockInMode, setStockInMode] = useState<'existing' | 'new'>('existing'); 
  const [txDate, setTxDate] = useState("");
  const [stockExpDate, setStockExpDate] = useState(""); 
  const [stockPackSize, setStockPackSize] = useState("100"); 
  const [stockUnitName, setStockUnitName] = useState("'s"); 
  const [selectedLotId, setSelectedLotId] = useState(""); 
  const [inputMode, setInputMode] = useState<'base' | 'pack'>('base'); 
  const [inputAmount, setInputAmount] = useState(""); 
  const [inputPackCount, setInputPackCount] = useState("");
  const [isPendingStock, setIsPendingStock] = useState(false); 
  const [expectedDate, setExpectedDate] = useState(""); 
  const [stockNote, setStockNote] = useState(""); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [categoriesList, setCategoriesList] = useState<{id: number, name: string}[]>([]); 
  const [selectedCategory, setSelectedCategory] = useState<number | "all">("all"); 
  const [searchTerm, setSearchTerm] = useState(""); 
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null); 
  const [categoryNameInput, setCategoryNameInput] = useState("");
  
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false); 
  const [historyMed, setHistoryMed] = useState<any>(null); 
  const [historyRows, setHistoryRows] = useState<any[]>([]); 
  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  
  const [isReportModalOpen, setIsReportModalOpen] = useState(false); 
  const [reportTargetCategory, setReportTargetCategory] = useState<number | "all">("all"); 
  const [reportTargetId, setReportTargetId] = useState("all"); 
  const [isGeneratingReport, setIsGeneratingReport] = useState(false); 
  const [showPrintView, setShowPrintView] = useState(false); 
  const [printData, setPrintData] = useState<any>({});
  
  const [isQRModalOpen, setIsQRModalOpen] = useState(false); 
  const [qrTargetCategory, setQrTargetCategory] = useState<number | "all">("all"); 
  const [qrTargetId, setQrTargetId] = useState("all"); 
  const [showQRPrintView, setShowQRPrintView] = useState(false); 
  const [qrPrintData, setQrPrintData] = useState<any[]>([]);
  const [baseUrl, setBaseUrl] = useState("");
  
  const [isImportModalOpen, setIsImportModalOpen] = useState(false); 
  const [importText, setImportText] = useState(""); 
  const [importing, setImporting] = useState(false);
  
  const [isChangePwdModalOpen, setIsChangePwdModalOpen] = useState(false); 
  const [oldPwd, setOldPwd] = useState(""); 
  const [newPwd, setNewPwd] = useState(""); 
  const [newPwd2, setNewPwd2] = useState(""); 
  const [pwdError, setPwdError] = useState("");
  
  const [isStaffAdminModalOpen, setIsStaffAdminModalOpen] = useState(false); 
  const [newStaffNameInput, setNewStaffNameInput] = useState(""); 
  const [staffRows, setStaffRows] = useState<any[]>([]);
  
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
  const [visitorListMode, setVisitorListMode] = useState<'pending'|'history'>('pending');

  const [isExpDashboardOpen, setIsExpDashboardOpen] = useState(false);
  const [expFilterDays, setExpFilterDays] = useState<number>(30); 

  const [qrVisitorLotId, setQrVisitorLotId] = useState("");
  const [qrVisitorInputMode, setQrVisitorInputMode] = useState<'base' | 'pack'>('base');
  const [qrVisitorAmount, setQrVisitorAmount] = useState("");
  const [qrVisitorPackCount, setQrVisitorPackCount] = useState("");
  const [qrVisitorName, setQrVisitorName] = useState("");
  const [qrVisitorSubmitting, setQrVisitorSubmitting] = useState(false);

  useEffect(() => {
    setBaseUrl(typeof window !== 'undefined' ? window.location.origin : '');
  }, []);

  const fetchMedicines = async () => { 
    try { 
      const { data, error } = await supabase.from("medicines").select(`*, medicine_lots (*)`).order("id", { ascending: false }); 
      if (error) throw error; 
      if (data) {
        setMedicines(data);
        
        if (typeof window !== 'undefined') {
           const params = new URLSearchParams(window.location.search);
           const scanId = params.get('id') || params.get('scan') || params.get('med');
           if (scanId) {
              const targetMed = data.find((m: any) => String(m.id) === String(scanId));
              if (targetMed) {
                 openHistoryModal(targetMed);
              }
              window.history.replaceState({}, document.title, window.location.pathname);
           }
        }
      }
      const { data: txData } = await supabase.from("stock_transactions").select("*").in("action", ["out","in"]); 
      if (txData) setAllTransactions(txData); 
    } catch (error) { 
      console.error(error); 
    } finally { 
      setLoading(false); 
    } 
  };
  
  const fetchCategories = async () => { 
    try { 
      const { data, error } = await supabase.from("cabinet_categories").select("*").order("id"); 
      if (error) throw error; 
      if (data && data.length > 0) setCategoriesList(data); 
    } catch (error) { 
      console.error(error); 
    } 
  };
  
  const fetchVisitorNotes = async () => { 
    try { 
      const { data } = await supabase.from("stock_transactions")
          .select("*")
          .in("status", ["visitor_note", "visitor_acknowledged"])
          .order("created_at", { ascending: false }); 
      if (data) setVisitorNotes(data); 
    } catch (error) { 
      console.error(error); 
    } 
  };
  
  const fetchStaffRows = async () => { 
    try { 
      const { data } = await supabase.from("staff_accounts").select("*").order("name"); 
      if (data) setStaffRows(data); 
    } catch (e) {} 
  };

  useEffect(() => { 
    fetchMedicines(); 
    fetchCategories(); 
    fetchVisitorNotes(); 
    fetchStaffRows(); 
    if (session) {
      const savedCat = localStorage.getItem(`saved_cat_${session.id}`); 
      if (savedCat) setSelectedCategory(savedCat === "all" ? "all" : Number(savedCat)); 
    }
  }, []);

  // Validation ป้องกันกรณีตู้ถูกลบไปแล้วแต่ใน localStorage ยังจำไว้อยู่
  useEffect(() => {
    if (categoriesList.length > 0 && selectedCategory !== "all") {
      const isCategoryExists = categoriesList.some(cat => String(cat.id) === String(selectedCategory));
      if (!isCategoryExists) {
        setSelectedCategory("all");
        if (session) {
          localStorage.removeItem(`saved_cat_${session.id}`);
        }
      }
    }
  }, [categoriesList, selectedCategory, session]);

  const handleSelectCategory = (catId: number | "all") => { 
    setSelectedCategory(catId); 
    if (session) {
      localStorage.setItem(`saved_cat_${session.id}`, String(catId)); 
    }
  };

  const handleAddCategory = async () => { 
    const newName = prompt("กรุณาระบุชื่อตู้ยาใหม่ (เช่น ตู้ยา 11):"); 
    if (!newName || !newName.trim()) return; 
    try { 
      const { data: existing } = await supabase.from("cabinet_categories").select("id").order("id", { ascending: false }).limit(1); 
      const nextId = (existing && existing.length > 0) ? existing[0].id + 1 : 1; 
      const { error } = await supabase.from("cabinet_categories").insert([{ id: nextId, name: newName.trim() }]); 
      if (error) throw error; 
      fetchCategories(); 
    } catch (error: any) { alert("เพิ่มตู้ยาไม่สำเร็จ: " + error.message); } 
  };

  const handleRenameCategory = async (e: React.FormEvent) => { 
    e.preventDefault(); 
    if (editingCategoryId === null) return; 
    const trimmed = categoryNameInput.trim(); 
    if (!trimmed) return; 
    try { 
      const { error } = await supabase.from("cabinet_categories").update({ name: trimmed }).eq("id", editingCategoryId); 
      if (error) throw error; 
      fetchCategories(); setEditingCategoryId(null); setCategoryNameInput(""); alert("เปลี่ยนชื่อตู้ยาสำเร็จ!"); 
    } catch (error: any) { alert("บันทึกชื่อหมวดหมู่ไม่สำเร็จ: " + error.message); } 
  };

  const getCategoryName = (id: string | number) => { 
    const cat = categoriesList?.find(c => String(c.id) === String(id)); 
    return cat ? cat.name : id; 
  };

  const handleChangePassword = async (e: React.FormEvent) => { 
    e.preventDefault(); 
    if (!session) return;
    setPwdError(""); 
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
  };

  const handleAdminResetStaffPwd = async (staffId: string, staffName: string) => { 
    const p = prompt(`ระบุรหัสผ่านใหม่สำหรับ ${staffName}:`); 
    if (!p || p.length < 4) return alert("รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร"); 
    try { 
      const hash = await sha256Hex(p); 
      const { error } = await supabase.from("staff_accounts").update({ password_hash: hash }).eq("id", staffId); 
      if (error) throw error; 
      alert(`เปลี่ยนรหัสผ่านของ ${staffName} สำเร็จ!`); fetchStaffRows(); 
    } catch (e: any) { alert("ไม่สำเร็จ: " + e.message); } 
  };

  const handleAdminDeleteStaff = async (staffId: string, staffName: string) => { 
    if (staffName === "Admin") return alert("ไม่สามารถลบบัญชี Admin หลักได้"); 
    if (!confirm(`ยืนยันการลบผู้ใช้ "${staffName}" ออกจากระบบ?`)) return; 
    try { 
      const { error } = await supabase.from("staff_accounts").delete().eq("id", staffId); 
      if (error) throw error; 
      alert(`ลบผู้ใช้ ${staffName} สำเร็จ!`); await fetchStaffRows(); refreshStaffList(); 
    } catch (e: any) { alert("ลบไม่สำเร็จ: " + e.message); } 
  };

  const handleAdminAddStaff = async (e: React.FormEvent) => { 
    e.preventDefault(); 
    const name = newStaffNameInput.trim(); 
    if (!name) return; 
    try { 
      const { error } = await supabase.from("staff_accounts").insert([{ name, password_hash: await sha256Hex("1234"), is_central: false }]); 
      if (error) throw error; 
      alert(`เพิ่มเจ้าหน้าที่ ${name} สำเร็จ! (รหัสผ่านเริ่มต้น: 1234)`); setNewStaffNameInput(""); await fetchStaffRows(); refreshStaffList(); 
    } catch (e: any) { alert("เพิ่มไม่สำเร็จ: " + e.message); } 
  };

  const handleAcknowledgeNote = async (id: string) => { 
    try { 
      const { error } = await supabase.from("stock_transactions").update({ status: "visitor_acknowledged" }).eq("id", id); 
      if (error) throw error; 
      fetchVisitorNotes(); 
    } catch (e: any) { alert("เกิดข้อผิดพลาด: " + e.message); } 
  };

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
      await supabase.from("stock_transactions").insert([{ medicine_id: String(visitorMedId), lot_id: String(visitorLotId), exp_date: lot.exp_date, action: 'out', amount: totalItems, staff_name: visitorName, status: 'visitor_note' }]); 
      alert("บันทึกโน้ตสำเร็จเรียบร้อย!"); 
      setIsVisitorMainModalOpen(false); setVisitorMedId(""); setVisitorLotId(""); setVisitorAmount(""); setVisitorPackCount(""); setVisitorName(""); setVisitorSearchTerm(""); 
      fetchVisitorNotes(); 
    } catch (error: any) { alert("บันทึกไม่สำเร็จ: " + error.message); } finally { setVisitorSubmitting(false); }
  };

  const handleQrVisitorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrVisitorLotId || !qrVisitorName || !historyMed) return alert("กรุณากรอกข้อมูลให้ครบถ้วน");
    let totalItems = 0;
    const lot = (historyMed.medicine_lots || []).find((l: any) => l.id.toString() === qrVisitorLotId);
    if (!lot) return alert("ไม่พบข้อมูลล็อต");
    if (qrVisitorInputMode === 'base') {
      totalItems = parseInt(qrVisitorAmount);
      if (!totalItems || totalItems <= 0) return alert("กรุณาระบุจำนวนให้ถูกต้อง");
    } else {
      const packs = parseFloat(qrVisitorPackCount);
      if (!packs || packs <= 0) return alert("กรุณาระบุจำนวนกล่องให้ถูกต้อง");
      totalItems = Math.round(packs * lot.pack_size);
    }
    
    // เอาการ Validation เช็คสต็อกออกไป เพื่อให้ Visitor บันทึกแจ้งจำนวนที่เบิกจริงได้เสมอ แม้ในระบบสต็อกจะหมดก็ตาม
    
    setQrVisitorSubmitting(true);
    try {
      await supabase.from("stock_transactions").insert([{
        medicine_id: String(historyMed.id),
        lot_id: String(qrVisitorLotId),
        exp_date: lot.exp_date,
        action: 'out',
        amount: totalItems,
        staff_name: qrVisitorName,
        status: 'visitor_note'
      }]);
      alert("บันทึกโน้ตผู้มาเยือนสำเร็จเรียบร้อย!");
      setQrVisitorLotId(""); setQrVisitorAmount(""); setQrVisitorPackCount(""); setQrVisitorName("");
      fetchVisitorNotes();
      const { data: freshMed } = await supabase.from("medicines").select(`*, medicine_lots (*)`).eq("id", historyMed.id).single();
      if (freshMed) setHistoryMed(freshMed);
    } catch (error: any) {
      alert("บันทึกไม่สำเร็จ: " + error.message);
    } finally {
      setQrVisitorSubmitting(false);
    }
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
          const name = parts[0]; const hosxp_icode = parts[1] || ""; const note = parts[2] || ""; const cabinet_category = parts[3] || "1"; const min_stock = parseInt(parts[4]) || 0; 
          await supabase.from("medicines").insert([{ name, hosxp_icode, note, cabinet_category, min_stock, is_available: true }]); 
          count++; 
        } 
      }
      alert(`นำเข้าสำเร็จ ${count} รายการ!`); setIsImportModalOpen(false); setImportText(""); fetchMedicines();
    } catch (e: any) { alert("นำเข้าไม่สำเร็จ: " + e.message); } finally { setImporting(false); }
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

  const handleSaveMedicine = async (e: React.FormEvent) => { 
    e.preventDefault(); 
    try { 
      const payload = { name: medFormData.name, note: medFormData.note, hosxp_icode: medFormData.hosxp_icode, cabinet_category: medFormData.cabinet_category, min_stock: parseInt(medFormData.min_stock) || 0, is_available: true }; 
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
    setMedFormData({ id: "", name: "", note: "", hosxp_icode: "", cabinet_category: categoriesList && categoriesList.length > 0 ? String(categoriesList[0].id) : "1", min_stock: "" }); 
    setIsMedModalOpen(true); 
  };

  const openEditMedModal = (med: any) => { 
    setIsEditing(true); 
    setMedFormData({ id: med.id, name: med.name, note: med.note || "", hosxp_icode: med.hosxp_icode || "", cabinet_category: med.cabinet_category || (categoriesList && categoriesList.length > 0 ? String(categoriesList[0].id) : "1"), min_stock: med.min_stock?.toString() || "0" }); 
    setIsMedModalOpen(true); 
  };

  const handleDeleteMed = async (id: string) => { 
    if (!confirm("ลบยานี้? (สต็อกทั้งหมดจะหายไป)")) return; 
    try { await supabase.from("medicines").delete().eq("id", id); fetchMedicines(); } catch (error: any) { alert("ลบไม่สำเร็จ: " + error.message); } 
  };

  const toggleAvailability = async (med: any) => { 
    try { 
      const newVal = med.is_available === false ? true : false; 
      const { error } = await supabase.from("medicines").update({ is_available: newVal }).eq("id", med.id); 
      if (error) throw error; 
      fetchMedicines(); 
    } catch (e: any) { alert("เปลี่ยนสถานะไม่สำเร็จ: " + e.message); } 
  };

  const handleUpdateStock = async (e: React.FormEvent) => {
    e.preventDefault(); 
    if (!session) return;
    let totalItems = 0; 
    setIsSubmitting(true);
    if (inputMode === 'base') { 
      totalItems = parseInt(inputAmount); 
      if (!totalItems || totalItems <= 0) { setIsSubmitting(false); return alert("ระบุจำนวนให้ถูกต้อง"); } 
    } else { 
      const packs = parseFloat(inputPackCount); 
      const size = (stockAction === 'out' || stockInMode === 'existing') ? (selectedMed.medicine_lots || []).find((l: any) => l.id.toString() === selectedLotId)?.pack_size : parseInt(stockPackSize); 
      if (!packs || packs <= 0 || !size || size <= 0) { setIsSubmitting(false); return alert("ระบุข้อมูลให้ครบถ้วน"); } 
      totalItems = Math.round(packs * size); 
    }
    
    // ดักวันที่กรณีรับเข้าล่วงหน้า
    if (stockAction === 'in' && isPendingStock && !expectedDate) {
       setIsSubmitting(false);
       return alert("กรุณาระบุวันที่คาดว่าจะเข้า (สำหรับรายการรับเข้าล่วงหน้า)");
    }
    
    try {
      const pending = stockAction === 'in' && isPendingStock; 
      let finalLotId = selectedLotId;
      if (stockAction === 'in') {
        if (stockInMode === 'existing') {
          if (!selectedLotId) throw new Error("กรุณาเลือกล็อตที่มีอยู่"); 
          const existingLot = (selectedMed.medicine_lots || []).find((l: any) => String(l.id) === String(selectedLotId)); 
          if (!existingLot) throw new Error("ไม่พบข้อมูลล็อต");
          if (!pending) { 
            const { error } = await supabase.from("medicine_lots").update({ current_stock: existingLot.current_stock + totalItems }).eq("id", existingLot.id); 
            if (error) throw error; 
          }
        } else {
          if (!stockExpDate) throw new Error("กรุณาระบุวันหมดอายุ (EXP)"); 
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
        if (!selectedLotId) throw new Error("กรุณาเลือกล็อตที่ต้องการตัดจ่าย"); 
        const lotToDeduct = (selectedMed.medicine_lots || []).find((l: any) => l.id.toString() === selectedLotId); 
        if (!lotToDeduct) throw new Error("ไม่พบข้อมูลล็อต"); 
        if (totalItems > lotToDeduct.current_stock) throw new Error(`สต็อกไม่พอ! ต้องการเบิก ${totalItems} แต่มีแค่ ${lotToDeduct.current_stock}`);
        const { error } = await supabase.from("medicine_lots").update({ current_stock: lotToDeduct.current_stock - totalItems }).eq("id", lotToDeduct.id); 
        if (error) throw error;
      }
      
      const expD = (selectedMed.medicine_lots || []).find((l:any) => String(l.id) === String(finalLotId))?.exp_date || stockExpDate;
      const txPayload: any = { 
         medicine_id: String(selectedMed.id), 
         lot_id: String(finalLotId), 
         exp_date: expD, 
         action: stockAction, 
         amount: totalItems, 
         staff_name: session.name, 
         status: pending ? 'pending' : 'completed', 
         edit_note: stockNote || null 
      };
      
      if (txDate) {
         // ดึงเวลาปัจจุบัน (ชั่วโมง นาที วินาที) ของเครื่องผู้ใช้งานมาใช้ร่วมกับวันที่เลือก
         const now = new Date();
         const hours = String(now.getHours()).padStart(2, '0');
         const minutes = String(now.getMinutes()).padStart(2, '0');
         const seconds = String(now.getSeconds()).padStart(2, '0');
         
         // ส่งค่าแบบ ISO String ที่ถูกต้องตาม Timezone ท้องถิ่น
         txPayload.created_at = `${txDate}T${hours}:${minutes}:${seconds}+07:00`;
      }
      if (pending) txPayload.expected_date = expectedDate || null;
      
      // อัปเดตการดักจับข้อผิดพลาดการ Insert Transaction เพื่อไม่ให้เงียบหาย
      const { error: txError } = await supabase.from("stock_transactions").insert([txPayload]);
      if (txError) {
         console.error("Transaction Error:", txError);
         throw new Error("อัปเดตสต็อกสำเร็จ แต่บันทึกประวัติล้มเหลว กรุณาตรวจสอบฐานข้อมูล! (" + txError.message + ")");
      }
      
      await fetchMedicines(); 
      setIsStockModalOpen(false); 
      if (isHistoryModalOpen && historyMed) { 
        const { data: freshMed } = await supabase.from("medicines").select(`*, medicine_lots (*)`).eq("id", historyMed.id).single(); 
        if (freshMed) { 
          setHistoryMed(freshMed); 
          const { data: txs } = await supabase.from("stock_transactions").select("*").eq("medicine_id", String(historyMed.id)).order("created_at", { ascending: false }); 
          // กรอง Visitor notes ออกจากประวัติรายการล่าสุดแบบเด็ดขาด
          setHistoryRows((txs || []).filter((r: any) => r.status !== 'visitor_note' && r.status !== 'visitor_acknowledged')); 
        }
      }
    } catch (error: any) { alert("อัปเดตสต็อกไม่สำเร็จ: " + error.message); } finally { setIsSubmitting(false); }
  };

  const handleConfirmPendingStock = async (row: any) => {
    if (!confirm(`ยืนยันว่าได้รับยาจำนวน ${row.amount} แล้ว และต้องการเพิ่มเข้าสต็อกใช่หรือไม่?`)) return;
    try {
      // ดึงสต็อกปัจจุบันของล็อตนั้นก่อน
      const { data: lotData, error: lotErr } = await supabase.from("medicine_lots").select("current_stock").eq("id", row.lot_id).single();
      if (lotErr) throw lotErr;

      // บวกสต็อกเพิ่ม
      const { error: updateLotErr } = await supabase.from("medicine_lots").update({ current_stock: lotData.current_stock + row.amount }).eq("id", row.lot_id);
      if (updateLotErr) throw updateLotErr;

      // เปลี่ยนสถานะ transaction เป็น completed
      const { error: txErr } = await supabase.from("stock_transactions").update({ status: 'completed' }).eq("id", row.id);
      if (txErr) throw txErr;

      alert("อัปเดตสต็อกเรียบร้อยแล้ว!");
      
      // รีเฟรชข้อมูล
      await fetchMedicines();
      const { data: freshMed } = await supabase.from("medicines").select(`*, medicine_lots (*)`).eq("id", historyMed.id).single(); 
      if (freshMed) { 
        setHistoryMed(freshMed); 
        const { data: txs } = await supabase.from("stock_transactions").select("*").eq("medicine_id", String(historyMed.id)).order("created_at", { ascending: false }); 
        setHistoryRows((txs || []).filter((r: any) => r.status !== 'visitor_note' && r.status !== 'visitor_acknowledged')); 
      }
    } catch (e: any) {
      alert("เกิดข้อผิดพลาด: " + e.message);
    }
  };

  const openStockModal = (med: any, action: 'in' | 'out') => { 
    setSelectedMed(med); 
    setStockAction(action); 
    setInputMode('base'); setInputAmount(""); setInputPackCount(""); 
    
    const todayStr = new Date().toLocaleDateString('en-CA'); 
    setTxDate(todayStr); 
    
    setStockExpDate(""); setSelectedLotId(""); setIsPendingStock(false); setExpectedDate(""); setStockNote(""); 
    if (action === 'in') { 
      if (med.medicine_lots && med.medicine_lots.length > 0) { 
        setStockInMode('existing'); 
        const firstLot = med.medicine_lots[0]; 
        setSelectedLotId(firstLot.id.toString()); setStockPackSize(firstLot.pack_size.toString()); setStockUnitName(firstLot.unit_name); 
      } else { 
        setStockInMode('new'); setStockPackSize("100"); setStockUnitName("'s"); 
      } 
    } else { 
      if (med.medicine_lots && med.medicine_lots.length > 0) { 
        const firstLot = med.medicine_lots[0]; setStockPackSize(firstLot.pack_size.toString()); setStockUnitName(firstLot.unit_name); 
      } else { 
        setStockPackSize("100"); setStockUnitName("'s"); 
      } 
    } 
    setIsStockModalOpen(true); 
  };

  const openHistoryModal = async (med: any) => { 
    setHistoryMed(med); setIsHistoryModalOpen(true); 
    try { 
      const { data, error } = await supabase.from("stock_transactions").select("*").eq("medicine_id", String(med.id)).order("created_at", { ascending: false }); 
      if (error) throw error; 
      // กรองโน้ตผู้มาเยือนออก เพื่อไม่ให้แสดงซ้ำในประวัติการทำรายการ (โชว์เฉพาะรายการตัดจ่าย/รับเข้าของระบบเท่านั้น)
      setHistoryRows((data || []).filter((r: any) => r.status !== 'visitor_note' && r.status !== 'visitor_acknowledged')); 
    } catch (error) { setHistoryRows([]); } 
  };
  
  const formatHistoryDate = (iso: string) => { 
    try { 
      return new Date(iso).toLocaleString("th-TH", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }); 
    } catch { return iso; } 
  };

  const handleGenerateReport = async () => { 
    setIsGeneratingReport(true); 
    try { 
      let query = supabase.from("stock_transactions").select("*").eq("status", "completed").order("created_at", { ascending: true }); 
      if (reportTargetId !== "all") query = query.eq("medicine_id", reportTargetId); 
      const { data: txData, error } = await query; 
      if (error) throw error; 
      
      const grouped: any = {}; 
      const medsToProcess = medicines.filter(m => reportTargetCategory === "all" || String(m.cabinet_category) === String(reportTargetCategory)).filter(m => reportTargetId === "all" || m.id.toString() === reportTargetId); 
      
      medsToProcess.forEach(med => { 
        const medTxs = (txData || []).filter(tx => tx.medicine_id.toString() === med.id.toString()); 
        let runningBal = 0; 
        let lotBalances: Record<string, { exp: string, qty: number, packSize: number, unitName: string }> = {};

        const processedTxs = medTxs.map(tx => { 
          const lotId = tx.lot_id?.toString() || 'unknown';
          const lotExp = tx.exp_date || 'N/A';
          const lotInfo = (med.medicine_lots || []).find((l: any) => l.id.toString() === lotId);
          const pSize = lotInfo?.pack_size || (med.medicine_lots?.[0]?.pack_size || 1);
          const pUnit = lotInfo?.unit_name || 'หน่วย';

          if (!lotBalances[lotId]) lotBalances[lotId] = { exp: lotExp, qty: 0, packSize: pSize, unitName: pUnit };
          if (tx.action === 'in') { runningBal += tx.amount; lotBalances[lotId].qty += tx.amount; } 
          else if (tx.action === 'out') { runningBal -= tx.amount; lotBalances[lotId].qty -= tx.amount; } 
          
          const formatPrintPack = (amt: number, size: number, unit: string) => { 
            const unitStr = unit === "'s" ? "เม็ด" : unit;
            if(size <= 1 || amt === 0) return `${amt} ${unitStr}`; 
            const p = Math.floor(amt / size); const r = amt % size; 
            return p === 0 ? `${r} ${unitStr}` : `${p} กล่อง × ${size} ${unitStr}${r > 0 ? ` (เศษ ${r} ${unitStr})` : ''}`; 
          }; 
          
          const activeLots = Object.values(lotBalances).filter(l => l.qty > 0);
          let lotBreakdown: string[] = [];
          if (activeLots.length > 0) {
            lotBreakdown = activeLots.map(l => {
              return `${l.exp}: ${formatPrintPack(l.qty, l.packSize, l.unitName)}`;
            });
          }
          return { ...tx, balanceAfter: runningBal, amountText: formatPrintPack(tx.amount, pSize, pUnit), balanceText: formatPrintPack(runningBal, pSize, pUnit), lotBreakdown }; 
        }); 
        grouped[med.id] = { medName: med.name, hosxp: med.hosxp_icode, note: med.note, transactions: processedTxs.reverse() }; 
      }); 
      
      setPrintData(grouped); setShowPrintView(true); setIsReportModalOpen(false); 
    } catch(e: any) { alert("เกิดข้อผิดพลาดในการดึงข้อมูลรายงาน: " + e.message); } finally { setIsGeneratingReport(false); } 
  };
  
  const handleExportExcel = () => {
    let csvContent = "\uFEFFตู้ยา,รหัสยา,ชื่อยา,ยอดคงเหลือรวม,หน่วยนับ,หมายเหตุ\n";
    categoriesList.forEach(cat => {
        const meds = medicines.filter(m => String(m.cabinet_category) === String(cat.id));
        meds.forEach(m => {
            let total = 0;
            let unit = "";
            (m.medicine_lots || []).forEach((l: any) => {
                total += l.current_stock;
                if (!unit) unit = l.unit_name === "'s" ? "เม็ด" : l.unit_name;
            });
            const safeName = `"${m.name.replace(/"/g, '""')}"`;
            const safeNote = `"${(m.note || '').replace(/"/g, '""')}"`;
            csvContent += `${cat.name},${m.hosxp_icode || '-'},${safeName},${total},${unit},${safeNote}\n`;
        });
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const dateStr = new Date().toLocaleDateString('th-TH').replace(/\//g, '-');
    link.setAttribute("download", `รายงานคงเหลือยา_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleGenerateQRPrint = () => { 
    let medsToPrint = medicines; 
    if (qrTargetCategory !== "all") medsToPrint = medsToPrint.filter(m => String(m.cabinet_category) === String(qrTargetCategory)); 
    if (qrTargetId !== "all") medsToPrint = medsToPrint.filter(m => m.id.toString() === qrTargetId); 
    setQrPrintData(medsToPrint); setShowQRPrintView(true); setIsQRModalOpen(false); 
  };

  const filteredVisitorNotes = visitorNotes.filter(n => 
      visitorListMode === 'pending' ? n.status === 'visitor_note' : n.status === 'visitor_acknowledged'
  );
  const pendingVisitorCount = visitorNotes.filter(n => n.status === 'visitor_note').length;

  if (showPrintView) return ( 
    <div className="bg-white min-h-screen text-black print:p-0 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="print:hidden flex justify-between mb-6 bg-gray-100 p-4 rounded-xl">
          <div><h1 className="text-xl font-bold">ตัวอย่างก่อนพิมพ์รายงาน</h1></div>
          <div className="flex gap-3">
            <button onClick={() => setShowPrintView(false)} className="px-4 py-2 border rounded-lg font-medium">ปิด</button>
            <button onClick={() => window.print()} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium flex gap-2"><Printer size={18}/> พิมพ์ PDF</button>
          </div>
        </div>
        <div className="print-content">
          {Object.values(printData).map((medData: any) => (
            <div key={medData.medName} style={{ pageBreakAfter: 'always' }} className="mb-10 pb-4">
              <h1 className="text-2xl font-bold text-center mb-2">รายงานประวัติการใช้ยา</h1>
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
                      <th className="border border-gray-400 p-2 text-center text-black font-bold min-w-[160px]">ยอดยกไป (คงเหลือ)</th>
                      <th className="border border-gray-400 p-2 text-black font-bold">ผู้ดำเนินการ</th>
                      <th className="border border-gray-400 p-2 text-black font-bold">หมายเหตุ (Exp)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {medData.transactions.map((tx: any) => (
                      <tr key={tx.id} className="border border-gray-400">
                        <td className="border border-gray-400 p-2 text-black align-top">{formatHistoryDate(tx.created_at)}</td>
                        <td className="border border-gray-400 p-2 text-center text-black font-medium align-top">{tx.action === 'in' ? tx.amountText : '-'}</td>
                        <td className="border border-gray-400 p-2 text-center text-red-600 font-bold align-top">{tx.action === 'out' ? tx.amountText : '-'}</td>
                        <td className="border border-gray-400 p-2 text-center align-top">
                           <div className="text-black font-bold">{tx.balanceText}</div>
                           {tx.lotBreakdown && tx.lotBreakdown.length > 0 && (
                             <div className="text-[10px] text-gray-700 font-medium mt-1 pt-1 border-t border-gray-300 text-left w-fit mx-auto leading-tight whitespace-nowrap">
                                {tx.lotBreakdown.map((txt: string, i: number) => <div key={i}>• {txt}</div>)}
                             </div>
                           )}
                        </td>
                        <td className="border border-gray-400 p-2 text-black align-top">{tx.staff_name}</td>
                        <td className="border border-gray-400 p-2 text-black text-xs align-top">{tx.lotExp !== 'N/A' ? tx.lotExp : ''} {tx.edit_note ? `[${tx.edit_note}]` : ''}</td>
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
  
  if (showQRPrintView) return ( 
    <div className="bg-white min-h-screen text-black print:p-0 p-4">
      <div className="max-w-5xl mx-auto">
        <div className="print:hidden flex justify-between mb-6 bg-gray-100 p-4 rounded-xl">
          <h1 className="text-xl font-bold">พิมพ์ QR Code</h1>
          <div className="flex gap-3"><button onClick={() => setShowQRPrintView(false)} className="px-4 py-2 border rounded-lg">ปิด</button><button onClick={() => window.print()} className="px-4 py-2 bg-blue-600 text-white rounded-lg flex gap-2"><Printer size={18}/> พิมพ์</button></div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {qrPrintData.map((med) => (
            <div key={med.id} className="border-2 border-dashed border-gray-400 p-4 flex flex-col items-center justify-center text-center">
              <QRCodeSVG value={`${baseUrl}/?id=${med.id}`} size={100} />
              <div className="mt-3 font-bold text-sm leading-tight text-black">{med.name}</div>
            </div>
          ))}
        </div>
      </div>
    </div> 
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#e0eaf5] via-[#f0f4f8] to-[#e8ebf2] p-2 md:p-8 font-sans">
      <div className="max-w-[1400px] mx-auto space-y-4 md:space-y-6">
        
        {/* Header - Glassmorphism */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white/70 backdrop-blur-xl p-4 md:p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/80">
          <div className="w-full xl:w-auto flex justify-between items-start md:items-center">
            <div><h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 leading-tight tracking-tight">ระบบคลังยา <br className="md:hidden" /><span className="text-base md:text-2xl font-semibold text-slate-500 opacity-80">(จัดล็อต EXP)</span></h1></div>
            <div className="text-right md:hidden">
              {session ? (
                <div className="text-[10px] font-medium text-slate-700 flex items-center justify-end gap-1 bg-white/80 px-3 py-1.5 rounded-full border border-white shadow-sm"><User size={12} className="text-slate-400" /> {session.name}</div>
              ) : (
                <div className="text-[10px] font-bold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200">โหมดสแกน QR (ผู้มาเยือน)</div>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto mt-2 xl:mt-0">
            {session ? (
              <>
                <button onClick={() => setIsVisitorMainModalOpen(true)} className="flex items-center justify-center gap-1.5 bg-amber-50/80 text-amber-700 border border-amber-200/50 hover:bg-amber-100 px-3 py-2 rounded-xl font-medium text-xs md:text-sm shadow-sm transition-all"><MessageSquareText size={16} /> โน้ตผู้มาเยือน</button>
                <button onClick={() => setIsExpDashboardOpen(true)} className="flex items-center justify-center gap-1.5 bg-rose-50/80 text-rose-700 border border-rose-200/50 hover:bg-rose-100 px-3 py-2 rounded-xl font-medium text-xs md:text-sm shadow-sm transition-all"><CalendarDays size={16} /> เช็คยาใกล้ EXP</button>
                <button onClick={() => setIsQRModalOpen(true)} className="flex items-center justify-center gap-1.5 bg-indigo-50/80 text-indigo-700 border border-indigo-200/50 hover:bg-indigo-100 px-3 py-2 rounded-xl font-medium text-xs md:text-sm shadow-sm transition-all"><QrCode size={16} /> พิมพ์ QR</button>
                <button onClick={() => setIsReportModalOpen(true)} className="flex items-center justify-center gap-1.5 bg-blue-50/80 text-blue-700 border border-blue-200/50 hover:bg-blue-100 px-3 py-2 rounded-xl font-medium text-xs md:text-sm shadow-sm transition-all"><FileText size={16} /> พิมพ์รายงาน</button>
                <button onClick={() => setIsImportModalOpen(true)} className="flex items-center justify-center gap-1.5 bg-amber-50/80 text-amber-700 border border-amber-200/50 hover:bg-amber-100 px-3 py-2 rounded-xl font-medium text-xs md:text-sm shadow-sm transition-all"><Upload size={16} /> นำเข้า</button>
                <button onClick={openAddMedModal} className="flex items-center justify-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white px-3.5 py-2 rounded-xl font-medium text-xs md:text-sm shadow-md shadow-emerald-200 transition-all"><Plus size={18} /> เพิ่มยา</button>
                {session.name === "Admin" && (<button onClick={() => setIsStaffAdminModalOpen(true)} title="จัดการเจ้าหน้าที่" className="flex items-center gap-1.5 bg-purple-50/80 text-purple-700 border border-purple-200 hover:bg-purple-100 px-3 py-2 rounded-xl font-medium text-xs md:text-sm shadow-sm transition-all"><Users size={16}/> จัดการเจ้าหน้าที่</button>)}
                <button onClick={() => setIsChangePwdModalOpen(true)} title="เปลี่ยนรหัสผ่าน" className="p-2 bg-white/50 border border-white text-slate-500 rounded-xl hover:bg-blue-50 hover:text-blue-500 shadow-sm transition-all"><KeyRound size={18} /></button>
                <button onClick={onLogout} title="ออกจากระบบ" className="p-2 bg-white/50 border border-white text-slate-500 rounded-xl hover:bg-red-50 hover:text-red-500 shadow-sm transition-all"><LogOut size={18} /></button>
              </>
            ) : (
              <div className="flex items-center justify-between w-full bg-amber-50 border border-amber-200 px-4 py-2 rounded-2xl text-xs font-bold text-amber-800">
                <span>⚠️ เข้าสู่ระบบผ่าน QR Code (ผู้มาเยือน) - บันทึกได้เฉพาะโน้ตผู้มาเยือน</span>
                <button onClick={onLogout} className="bg-white px-3 py-1 rounded-xl shadow-sm border border-amber-300 text-amber-900">เข้าสู่ระบบหลัก</button>
              </div>
            )}
          </div>
        </div>

        {/* แจ้งเตือนผู้มาเยือน (เฉพาะเมื่อ Login) */}
        {session && (visitorNotes.length > 0) && (
          <div className="bg-amber-50/80 backdrop-blur-xl rounded-3xl shadow-sm border border-amber-200/50 p-4 md:p-5 w-full transition-all">
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3 border-b border-amber-200/50 pb-3">
                <div className="flex items-center gap-2 text-sm font-bold text-amber-700">
                   <Bell size={18} /> แจ้งเตือน: โน้ตจากผู้มาเยือนที่สแกน QR {pendingVisitorCount > 0 ? `(${pendingVisitorCount})` : ''}
                </div>
                <select className="bg-white border border-amber-200 text-sm font-bold text-amber-800 p-2 rounded-xl outline-none shadow-sm" value={visitorListMode} onChange={(e) => setVisitorListMode(e.target.value as 'pending'|'history')}>
                   <option value="pending">รอตรวจสอบรับทราบ ({pendingVisitorCount})</option>
                   <option value="history">ประวัติที่รับทราบแล้ว</option>
                </select>
             </div>
             
             {filteredVisitorNotes.length === 0 ? (
                <div className="text-center py-6 text-amber-600/70 font-medium text-sm">ไม่มีรายการในหมวดหมู่นี้</div>
             ) : (
                 <div className="max-h-60 overflow-y-auto space-y-2.5 pr-2">
                    {filteredVisitorNotes.map(note => {
                       const med = medicines.find(m => m.id.toString() === note.medicine_id);
                       const medName = med?.name || 'ไม่ทราบชื่อยา';
                       const lotInfo = (med?.medicine_lots || []).find((l:any) => l.id.toString() === note.lot_id?.toString());
                       const pSize = lotInfo?.pack_size || 1; const pUnit = lotInfo?.unit_name || 'หน่วย';
                       const formattedAmount = formatBoxString(note.amount, pSize, pUnit);

                       return (
                         <div key={note.id} className="flex justify-between items-center bg-white/90 p-3.5 rounded-2xl border border-amber-100 shadow-sm opacity-95">
                            <div>
                               <div className="text-sm font-extrabold text-slate-800">{medName}</div>
                               <div className="text-xs text-slate-700 mt-1 font-medium">นำออก <span className="font-bold text-red-600">{formattedAmount}</span> (รวม {note.amount} {pUnit})</div>
                               <div className="text-[11px] font-bold text-rose-500 mt-1 flex items-center gap-1"><CalendarDays size={12}/> EXP: {note.exp_date}</div>
                               <div className="text-[10px] text-slate-500 mt-2 font-medium bg-slate-50 px-2 py-1 rounded-lg inline-block border border-slate-100">
                                  ผู้บันทึก: <span className="font-bold text-slate-700">{note.staff_name}</span> | {formatHistoryDate(note.created_at)}
                               </div>
                            </div>
                            {note.status === 'visitor_note' ? (
                               <button onClick={() => handleAcknowledgeNote(note.id)} title="รับทราบข้อความนี้" className="p-3 bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white border border-emerald-200 rounded-xl transition-all shadow-sm flex items-center justify-center"><Check size={22} /></button>
                            ) : (
                               <div className="px-3 py-1.5 bg-slate-100 text-slate-500 font-bold text-xs rounded-xl border border-slate-200 flex items-center gap-1"><Check size={14} /> รับทราบแล้ว</div>
                            )}
                         </div>
                       )
                    })}
                 </div>
             )}
          </div>
        )}

        {/* หมวดหมู่ */}
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/80 p-4 md:p-5 w-full">
          <div className="flex flex-wrap gap-2.5 mb-4">
            <button onClick={() => handleSelectCategory("all")} className={`px-4 py-2 rounded-2xl text-sm font-bold border transition-all ${selectedCategory === "all" ? "bg-slate-800 text-white shadow-md" : "bg-white/60 text-slate-600 hover:bg-white/90"}`}>ทั้งหมด</button>
            {categoriesList?.map((cat, index) => {
              const activeClass = selectedCategory === cat.id ? `${CAT_COLORS[index % CAT_COLORS.length]} ring-2 ring-blue-300 font-extrabold scale-105` : "bg-white/60 text-slate-600 hover:bg-white/90";
              return (
              <div key={cat.id} className={`flex items-center gap-0.5 rounded-2xl border px-1 transition-all ${activeClass}`}>
                <button onClick={() => handleSelectCategory(cat.id)} className="pl-3 pr-2 py-2 text-sm">{cat.name}</button>
                {session && (<button onClick={() => { setEditingCategoryId(cat.id); setCategoryNameInput(cat.name); }} className={`p-1 rounded-xl transition-colors ${selectedCategory === cat.id ? "text-slate-700" : "text-slate-400"}`}><Edit size={14} /></button>)}
              </div>
            )})}
            {session && (<button onClick={handleAddCategory} className="px-4 py-2 rounded-2xl border-2 border-dashed border-slate-300 text-slate-500 text-sm font-semibold flex gap-1.5"><Plus size={16} /> เพิ่มตู้</button>)}
          </div>
          <div className="flex flex-col md:flex-row gap-3 mt-4 items-center">
            <div className="relative flex-1 w-full"><Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" /><input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="ค้นหาชื่อยา..." className="w-full bg-white/50 border border-white rounded-2xl pl-11 pr-4 py-3 outline-none focus:ring-2 focus:ring-blue-400 text-slate-700" /></div>
            <select className="w-full md:w-auto bg-white/50 rounded-2xl px-4 py-3 text-sm" value={sortOrder} onChange={(e) => setSortOrder(e.target.value as 'recent'|'alpha')}><option value="alpha">เรียง (ก-ฮ)</option><option value="recent">แก้ไขล่าสุด</option></select>
          </div>
        </div>

        {/* รายการยา */}
        {loading ? (<div className="p-10 text-center text-slate-400 bg-white/60 backdrop-blur-xl rounded-3xl">กำลังโหลด...</div>) : filteredMedicines.length === 0 ? (<div className="p-10 text-center text-slate-400 bg-white/60 backdrop-blur-xl rounded-3xl">ไม่พบรายการ</div>) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
            {filteredMedicines.map((med) => {
              const activeLots = (med.medicine_lots || []).filter((l: any) => l.current_stock > 0).sort((a: any, b: any) => new Date(a.exp_date).getTime() - new Date(b.exp_date).getTime());
              const isAvail = med.is_available !== false;
              return (
                <div key={med.id} className={`bg-white/70 backdrop-blur-xl rounded-3xl shadow-sm border p-5 flex flex-col gap-3.5 transition-all ${!isAvail ? 'border-red-300/80 bg-red-50/70' : 'border-white/80 hover:shadow-md'}`}>
                  <div className="flex justify-between items-start border-b border-white/50 pb-3">
                    <div className="w-full">
                      <div onClick={() => openHistoryModal(med)} className="font-extrabold text-slate-800 text-lg cursor-pointer hover:text-blue-500 leading-tight">{med.name}</div>
                      <div className="text-xs text-slate-500 mt-1.5 flex flex-wrap gap-2 items-center">
                         <span>รหัส: <span className="font-bold">{med.hosxp_icode || "-"}</span></span>
                         <span>• ตู้: <span className="font-bold">{getCategoryName(med.cabinet_category)}</span></span>
                      </div>
                      {med.note && <div className="text-[11px] text-amber-700 font-medium bg-amber-50 border border-amber-100 px-2 py-1 rounded-lg mt-1.5 w-fit">หมายเหตุ: {med.note}</div>}
                    </div>
                    {session && (
                      <div className="flex flex-col gap-2 w-[72px] shrink-0 ml-2">
                        <div className="flex gap-1.5"><button onClick={() => openEditMedModal(med)} className="flex-1 p-2 bg-white/60 rounded-xl text-slate-500 shadow-sm"><Edit size={14}/></button><button onClick={() => handleDeleteMed(med.id)} className="flex-1 p-2 bg-white/60 rounded-xl text-slate-500 shadow-sm"><Trash2 size={14}/></button></div>
                        <button onClick={() => toggleAvailability(med)} className={`w-full py-1.5 text-[10px] font-bold rounded-xl shadow-sm ${isAvail ? 'bg-emerald-50 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{isAvail ? "เบิกได้" : "เป็น 0"}</button>
                      </div>
                    )}
                  </div>
                  <div>
                     <div className="text-[11px] font-bold text-slate-500 mb-2">คงเหลือ (ตาม EXP):</div>
                     {activeLots.length === 0 ? <span className="text-red-500 text-xs bg-red-50/80 px-4 py-1.5 rounded-xl border border-red-200">สต็อกหมด</span> : (
                       <div className="flex flex-col gap-2">
                          {activeLots.map((lot: any) => {
                            const p = Math.floor(lot.current_stock / lot.pack_size); const r = lot.current_stock % lot.pack_size;
                            return (
                              <div key={lot.id} className="flex justify-between items-center bg-white/50 border p-2.5 rounded-2xl">
                                <span className="text-[10px] font-bold text-rose-500">EXP: {lot.exp_date}</span>
                                <div className="flex items-baseline gap-1 text-sm"><span className="font-extrabold text-emerald-600">{p}</span><span className="text-slate-400 text-[9px]">x</span><span className="text-slate-700 font-bold">{lot.pack_size}</span>{r > 0 && <span className="text-amber-500 text-[9px] ml-1">เศษ {r}</span>}</div>
                              </div>
                            )
                          })}
                       </div>
                     )}
                  </div>
                  {session && (
                    <div className="grid grid-cols-2 gap-2 mt-auto pt-2">
                        <button onClick={() => openStockModal(med, 'in')} className="flex justify-center gap-1.5 p-2.5 bg-emerald-50/80 text-emerald-700 rounded-xl border border-emerald-100/50 font-bold text-xs shadow-sm hover:bg-emerald-100"><PackagePlus size={16} /> รับเข้า</button>
                        <button onClick={() => openStockModal(med, 'out')} className="flex justify-center gap-1.5 p-2.5 bg-red-50/80 text-red-700 rounded-xl border border-red-100/50 font-bold text-xs shadow-sm hover:bg-red-100"><PackageMinus size={16} /> ตัดจ่าย</button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* MODAL SECTION */}
        
        {/* Modal: แจ้งเตือนยาใกล้ EXP */}
        {isExpDashboardOpen && session && (
          <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-md flex items-center justify-center p-4 z-[80]">
            <div className="bg-white/95 backdrop-blur-xl border border-white rounded-3xl shadow-2xl w-full max-w-3xl p-6 relative flex flex-col h-full max-h-[85vh]">
                <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                  <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><CalendarDays className="text-rose-600" size={22}/> เช็คยาใกล้หมดอายุ (ที่ยังมีสต็อก)</h2>
                  <button onClick={() => setIsExpDashboardOpen(false)} className="p-1 hover:bg-slate-100 rounded-xl"><X size={20} className="text-slate-400"/></button>
                </div>

                <div className="flex flex-wrap gap-2 py-4 border-b border-slate-100 shrink-0">
                  {[
                    { label: "6 เดือน (180 วัน)", val: 180 }, { label: "2 เดือน (60 วัน)", val: 60 },
                    { label: "1 เดือน (30 วัน)", val: 30 }, { label: "15 วัน", val: 15 },
                    { label: "7 วัน", val: 7 }, { label: "2 วัน", val: 2 },
                    { label: "หมดอายุวันนี้ (0 วัน)", val: 0 },
                  ].map(tab => (
                    <button key={tab.val} onClick={() => setExpFilterDays(tab.val)} className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${expFilterDays === tab.val ? 'bg-rose-600 text-white border-rose-600 shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-2">
                  {(() => {
                      const today = new Date();
                      today.setHours(0,0,0,0);
                      const matchedLots: any[] = [];
                      medicines.forEach(med => {
                        (med.medicine_lots || []).forEach((lot: any) => {
                            if (lot.current_stock > 0 && lot.exp_date) {
                              const expDate = new Date(lot.exp_date);
                              expDate.setHours(0,0,0,0);
                              const diffTime = expDate.getTime() - today.getTime();
                              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                              let isMatch = false;
                              if (expFilterDays === 180 && diffDays <= 180 && diffDays >= 0) isMatch = true;
                              else if (expFilterDays === 60 && diffDays <= 60 && diffDays >= 0) isMatch = true;
                              else if (expFilterDays === 30 && diffDays <= 30 && diffDays >= 0) isMatch = true;
                              else if (expFilterDays === 15 && diffDays <= 15 && diffDays >= 0) isMatch = true;
                              else if (expFilterDays === 7 && diffDays <= 7 && diffDays >= 0) isMatch = true;
                              else if (expFilterDays === 2 && diffDays <= 2 && diffDays >= 0) isMatch = true;
                              else if (expFilterDays === 0 && diffDays === 0) isMatch = true;
                              if (isMatch) matchedLots.push({ ...med, lot, diffDays });
                            }
                        });
                      });
                      matchedLots.sort((a, b) => a.diffDays - b.diffDays);
                      if (matchedLots.length === 0) return <div className="text-center py-12 text-slate-400 font-medium">ไม่พบรายการยาที่ใกล้หมดอายุในเงื่อนไขนี้ 🎉</div>;
                      return matchedLots.map((item, idx) => {
                        const fullPacks = Math.floor(item.lot.current_stock / item.lot.pack_size);
                        const remainder = item.lot.current_stock % item.lot.pack_size;
                        const unitStr = item.lot.unit_name === "'s" ? "เม็ด" : item.lot.unit_name;
                        return (
                          <div key={`${item.id}-${item.lot.id}-${idx}`} className="flex flex-col md:flex-row md:justify-between md:items-center bg-white border border-rose-100 p-4 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                              <div className="mb-2 md:mb-0">
                                <div className="font-extrabold text-slate-800 text-sm md:text-base">{item.name} <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full ml-1">ตู้: {getCategoryName(item.cabinet_category)}</span></div>
                                <div className="text-xs text-slate-600 mt-1.5 font-medium">คงเหลือ: <span className="font-bold text-emerald-600">{fullPacks > 0 ? `${fullPacks} กล่อง × ${item.lot.pack_size} ${unitStr}` : ''} {remainder > 0 ? `(เศษ ${remainder} ${unitStr})` : ''}</span> <span className="text-blue-500 ml-1">(รวม {item.lot.current_stock} {unitStr})</span></div>
                                <div className="text-[11px] font-bold text-rose-600 mt-1.5 flex items-center gap-1"><CalendarDays size={12}/> วันหมดอายุ (EXP): {item.lot.exp_date}</div>
                              </div>
                              <div className="shrink-0 text-left md:text-right">
                                <span className={`px-4 py-1.5 rounded-full text-xs font-bold shadow-sm inline-block ${item.diffDays <= 7 ? 'bg-red-500 text-white animate-pulse border border-red-600' : 'bg-amber-100 text-amber-800 border border-amber-200'}`}>
                                    {item.diffDays === 0 ? 'หมดอายุวันนี้!' : `เหลืออีก ${item.diffDays} วัน`}
                                </span>
                              </div>
                          </div>
                        );
                      });
                  })()}
                </div>
            </div>
          </div>
        )}

        {/* Modal: แก้ไขชื่อตู้ยา */}
        {editingCategoryId !== null && session && (
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
        {isStaffAdminModalOpen && session && session.name === "Admin" && (
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
                            <button onClick={() => handleAdminResetStaffPwd(st.id, st.name)} className="bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm flex items-center gap-1"><KeyRound size={12}/> เปลี่ยนรหัสผ่าน</button>
                            {st.name !== 'Admin' && (<button onClick={() => handleAdminDeleteStaff(st.id, st.name)} title="ลบผู้ใช้" className="bg-red-50 border border-red-200 hover:bg-red-500 hover:text-white text-red-600 p-2 rounded-xl transition-all shadow-sm"><Trash2 size={14}/></button>)}
                         </div>
                      </div>
                   ))}
                </div>
             </div>
          </div>
        )}

        {/* Modal: Change Password */}
        {isChangePwdModalOpen && session && (
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

        {/* Modal: เพิ่ม/แก้ไข ข้อมูลยา */}
        {isMedModalOpen && session && (
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

        {/* Modal: นำเข้าข้อมูล (Import) */}
        {isImportModalOpen && session && (
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

        {/* Modal: Report */}
        {isReportModalOpen && session && (
          <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-md flex items-center justify-center p-4 z-[60]">
            <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-white">
              <div className="flex justify-between items-center p-5 border-b border-white/50 bg-blue-50/50"><h2 className="text-lg font-bold flex items-center gap-2 text-blue-800"><FileText size={20} /> พิมพ์รายงาน/ดาวน์โหลด</h2><button onClick={() => setIsReportModalOpen(false)} className="p-1 hover:bg-white/60 rounded-xl"><X size={20} className="text-blue-400" /></button></div>
              <div className="p-6 space-y-5">
                <div className="bg-green-50 border border-green-200 p-4 rounded-2xl shadow-sm mb-4">
                   <h3 className="text-sm font-bold text-green-800 mb-2">รายงานสรุปยอดคงเหลือประจำเดือน</h3>
                   <p className="text-xs text-green-700 mb-3">ดาวน์โหลดไฟล์ Excel (.csv) แจกแจงรายการยาทั้งหมด แยกตามตู้ พร้อมยอดคงเหลือล่าสุดเพื่อนำไปเช็คสต็อก</p>
                   <button onClick={handleExportExcel} className="w-full bg-green-600 hover:bg-green-700 text-white p-3 rounded-xl font-bold shadow-md flex justify-center items-center gap-2 transition-colors"><Download size={18}/> ดาวน์โหลด Excel (CSV)</button>
                </div>

                <div className="border-t border-slate-200 pt-5">
                   <h3 className="text-sm font-bold text-slate-700 mb-3">พิมพ์รายงาน Stock Card (PDF)</h3>
                   <div className="space-y-3">
                      <div><label className="block text-xs font-medium mb-1.5 text-slate-600">เลือกตู้ยา (Cabinet)</label><select className="w-full bg-white border border-slate-200 rounded-xl p-3 outline-none" value={reportTargetCategory} onChange={(e) => { setReportTargetCategory(e.target.value === "all" ? "all" : Number(e.target.value)); setReportTargetId("all"); }}><option value="all">-- ทุกตู้ยา --</option>{categoriesList?.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}</select></div>
                      <div><label className="block text-xs font-medium mb-1.5 text-slate-600">เลือกรายการยาที่ต้องการพิมพ์</label><select className="w-full bg-white border border-slate-200 rounded-xl p-3 outline-none" value={reportTargetId} onChange={(e) => setReportTargetId(e.target.value)}><option value="all">-- พิมพ์ทั้งหมด (ตามตู้) --</option>{medicines.filter(m => reportTargetCategory === "all" || String(m.cabinet_category) === String(reportTargetCategory)).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></div>
                      <button onClick={handleGenerateReport} disabled={isGeneratingReport} className="w-full bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-xl font-bold shadow-md transition-colors flex justify-center items-center gap-2 mt-2">{isGeneratingReport ? "รอสักครู่..." : <><Printer size={18}/> สร้าง PDF</>}</button>
                   </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal: QR Code */}
        {isQRModalOpen && session && (
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

        {/* Modal: Stock In/Out */}
        {isStockModalOpen && selectedMed && session && (
          <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-md flex items-center justify-center p-4 z-[70]">
            <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-white flex flex-col max-h-[90vh]">
              <div className={`flex justify-between items-center p-5 border-b border-white/50 ${stockAction === 'in' ? 'bg-emerald-50/60' : 'bg-red-50/60'}`}>
                <h2 className={`text-lg font-bold flex items-center gap-2 ${stockAction === 'in' ? 'text-emerald-700' : 'text-red-700'}`}>{stockAction === 'in' ? <PackagePlus size={22} /> : <PackageMinus size={22} />}{stockAction === 'in' ? 'รับเข้าสต็อก' : 'ตัดจ่ายสต็อก'}</h2>
                <button onClick={() => setIsStockModalOpen(false)}><X size={24} className="text-slate-400 hover:text-slate-600" /></button>
              </div>
              <form onSubmit={handleUpdateStock} className="p-6 space-y-4 overflow-y-auto">
                <div className="font-extrabold text-slate-800 mb-2 border-b border-slate-100 pb-3">{selectedMed.name}</div>
                
                <div>
                   <label className="block text-sm font-bold text-slate-700 mb-1.5">วันที่ทำรายการ *</label>
                   <SmartDateInput 
                      value={txDate} 
                      onChange={setTxDate} 
                      placeholder="วว/ดด/ปปปป หรือคลิกเพื่อพิมพ์"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-400 shadow-sm"
                      required
                   />
                </div>

                {stockAction === 'in' ? (
                  <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100/50 space-y-3 shadow-inner">
                    <div className="bg-white/80 p-3 rounded-xl border border-emerald-200/50 shadow-sm flex flex-col gap-2">
                      <label className="flex items-center gap-2.5 cursor-pointer">
                        <input type="checkbox" className="w-4 h-4 text-emerald-500 rounded border-slate-300 focus:ring-emerald-400" checked={isPendingStock} onChange={(e) => setIsPendingStock(e.target.checked)} />
                        <span className="text-sm font-bold text-emerald-700">เป็นรายการรับเข้าล่วงหน้า</span>
                      </label>
                      {isPendingStock && (<div className="pl-6.5 mt-1"><label className="block text-xs font-medium text-emerald-600 mb-1">คาดว่าจะเข้าวันที่ *</label><SmartDateInput value={expectedDate} onChange={setExpectedDate} className="w-full border border-emerald-200/50 rounded-lg p-2.5 text-sm bg-white" required /></div>)}
                    </div>
                    <div className="flex gap-2 bg-white/60 p-1 rounded-xl border border-emerald-200/50">
                      <button type="button" onClick={() => setStockInMode('existing')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${stockInMode === 'existing' ? 'bg-emerald-100/80 text-emerald-700 shadow-sm' : 'text-slate-500 hover:bg-white'}`}>เลือกล็อตเดิม</button>
                      <button type="button" onClick={() => setStockInMode('new')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${stockInMode === 'new' ? 'bg-emerald-100/80 text-emerald-700 shadow-sm' : 'text-slate-500 hover:bg-white'}`}>+ เพิ่มล็อตใหม่</button>
                    </div>
                    {stockInMode === 'existing' ? (
                      <div><label className="block text-sm font-bold text-emerald-700 mb-1.5">เลือกล็อต (EXP) *</label><select required className="w-full bg-white border border-emerald-200/50 rounded-xl p-3 font-medium outline-none" value={selectedLotId} onChange={(e) => { setSelectedLotId(e.target.value); const l = (selectedMed.medicine_lots || []).find((x: any) => String(x.id) === e.target.value); if(l) { setStockPackSize(l.pack_size.toString()); setStockUnitName(l.unit_name); }}}><option value="">-- กรุณาเลือกล็อต --</option>{(selectedMed.medicine_lots || []).map((lot: any) => { const packs = Math.floor(lot.current_stock / lot.pack_size); const remainder = lot.current_stock % lot.pack_size; const unitString = lot.unit_name === "'s" ? "'" : ` ${lot.unit_name}`; const remainderText = remainder > 0 ? ` เศษ ${remainder}` : ""; return <option key={lot.id} value={lot.id}>EXP: {lot.exp_date} (เหลือ: {packs}x{lot.pack_size}{unitString}{remainderText})</option> })}</select></div>
                    ) : (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-bold text-emerald-700 mb-1.5">วันหมดอายุ (EXP) *</label>
                          <SmartDateInput value={stockExpDate} onChange={setStockExpDate} placeholder="วว/ดด/ปปปป หรือ 150926" className="w-full bg-white border border-emerald-200/50 rounded-xl p-3 outline-none" required />
                        </div>
                        <div><label className="block text-sm font-bold text-emerald-700 mb-1.5">ขนาดบรรจุต่อกล่อง *</label><input type="number" required min="1" className="w-full bg-white border border-emerald-200/50 rounded-xl p-3 outline-none" value={stockPackSize} onChange={(e) => setStockPackSize(e.target.value)} /></div>
                        <div>
                          <label className="block text-sm font-bold text-emerald-700 mb-1.5">หน่วยนับ *</label>
                          <div className="grid grid-cols-3 gap-2">{["'s", "vial", "amp", "bottle", "box", "ชิ้น", "อัน", "กระปุก", "ตลับ"].map((u) => (<button key={u} type="button" onClick={() => setStockUnitName(u)} className={`py-2 px-2 text-xs font-bold rounded-xl border transition-all ${stockUnitName === u ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-white text-slate-700 hover:bg-emerald-50'}`}>{u === "'s" ? "'s (เม็ด)" : u}</button>))}</div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-red-50/50 p-4 rounded-2xl border border-red-100/50 shadow-inner">
                    <label className="block text-sm font-bold text-red-700 mb-2">เลือกล็อต EXP ที่ต้องการหักสต็อก *</label>
                    <select required className="w-full bg-white border border-red-200/50 rounded-xl p-3.5 font-medium outline-none" value={selectedLotId} onChange={(e) => setSelectedLotId(e.target.value)}><option value="">-- กรุณาเลือกล็อต --</option>{(selectedMed.medicine_lots || []).filter((l: any) => l.current_stock > 0).map((lot: any) => { const packs = Math.floor(lot.current_stock / lot.pack_size); const remainder = lot.current_stock % lot.pack_size; const unitString = lot.unit_name === "'s" ? "'" : ` ${lot.unit_name}`; const remainderText = remainder > 0 ? ` เศษ ${remainder}` : ""; return <option key={lot.id} value={lot.id}>EXP: {lot.exp_date} (เหลือ: {packs}x{lot.pack_size}{unitString}{remainderText})</option> })}</select>
                  </div>
                )}
                
                <div className="mt-5 space-y-3">
                  <div>
                    <div className="flex bg-slate-100/80 p-1.5 rounded-xl mb-3 shadow-inner"><button type="button" className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${inputMode === 'base' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`} onClick={() => setInputMode('base')}>กรอกเป็นเม็ด/ชิ้น</button><button type="button" className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${inputMode === 'pack' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`} onClick={() => setInputMode('pack')}>กรอกเป็นกล่อง/แพ็ค</button></div>
                    {inputMode === 'base' ? (<div><label className="block text-sm font-medium mb-1.5 text-slate-600">ระบุจำนวน (ชิ้นย่อย)</label><input type="number" required min="1" className="w-full bg-white border border-slate-200 rounded-xl p-3.5 text-lg font-extrabold text-center outline-none" value={inputAmount} onChange={(e) => setInputAmount(e.target.value)} /></div>) : (<div><label className="block text-sm font-medium mb-1.5 text-slate-600">ระบุจำนวน (กล่อง/แพ็ค)</label><input type="number" step="0.1" required min="0.1" className="w-full bg-white border border-slate-200 rounded-xl p-3.5 text-lg font-extrabold text-center outline-none" value={inputPackCount} onChange={(e) => setInputPackCount(e.target.value)} /></div>)}
                  </div>
                  <div>
                     <label className="block text-sm font-medium mb-1.5 text-slate-600">หมายเหตุเพิ่มเติม (ถ้ามี)</label>
                     <input type="text" className="w-full bg-white border border-slate-200 rounded-xl p-3 outline-none text-sm" placeholder="เช่น ยืมวอร์ด, แลกเปลี่ยนยา" value={stockNote} onChange={(e) => setStockNote(e.target.value)} />
                  </div>
                </div>
                <div className="pt-4 flex gap-3"><button type="button" onClick={() => setIsStockModalOpen(false)} className="flex-1 bg-white border border-slate-200 p-3.5 rounded-xl font-bold text-slate-600">ยกเลิก</button><button type="submit" disabled={isSubmitting} className={`flex-1 text-white p-3.5 rounded-xl font-bold text-lg shadow-md transition-colors disabled:opacity-60 ${stockAction === 'in' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-red-500 hover:bg-red-600'}`}>{isSubmitting ? 'กำลังบันทึก...' : 'ยืนยัน'}</button></div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: History / Detail ยา */}
        {isHistoryModalOpen && historyMed && (
          <div className="fixed inset-0 bg-slate-50 flex flex-col z-50 overflow-y-auto w-full h-full">
            <div className="bg-white/85 backdrop-blur-md border-b border-slate-200 flex justify-between items-center p-4 sticky top-0 z-10 shadow-sm">
              <button onClick={() => { setIsHistoryModalOpen(false); setHistoryMed(null); setHistoryRows([]); }} className="flex items-center text-sm font-bold text-slate-600 hover:text-blue-600"><ArrowLeft size={18} className="mr-1.5"/> กลับหน้ารวม</button>
              {session ? (
                <div className="text-xs font-bold text-slate-700 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm flex items-center gap-1.5"><User size={14} className="text-slate-400"/> {session.name}</div>
              ) : (
                <div className="text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200 shadow-sm">โหมดสแกน QR (ผู้มาเยือน)</div>
              )}
            </div>
            
            <div className="p-4 md:p-6 max-w-3xl mx-auto w-full space-y-4 pb-20">
              
              {/* ชื่อยาและหัวข้อ */}
              <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 text-center">
                 <h1 className="text-2xl font-extrabold text-slate-800">{historyMed.name}</h1>
                 <p className="text-xs text-slate-500 mt-1">รหัส HosXP: <span className="font-bold">{historyMed.hosxp_icode || "-"}</span> | ตู้: <span className="font-bold">{getCategoryName(historyMed.cabinet_category)}</span></p>
                 {historyMed.note && <div className="text-xs font-medium text-amber-700 mt-2 bg-amber-50 border border-amber-100 px-3 py-1.5 rounded-xl inline-block">หมายเหตุ: {historyMed.note}</div>}
              </div>

              {/* ส่วนแสดงสต็อกคงเหลือแบ่งตาม EXP */}
              <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
                <div className="flex items-center gap-2 font-bold text-slate-700 mb-3 text-sm"><CalendarDays size={18} className="text-slate-500"/> สต็อกคงเหลือแบ่งตาม EXP</div>
                
                {(!historyMed.medicine_lots || historyMed.medicine_lots.filter((l:any) => l.current_stock > 0).length === 0) ? (
                   <div className="text-sm text-red-500 py-2">ไม่มีสต็อกคงเหลือในขณะนี้</div>
                ) : (
                   <div className="space-y-3">
                      {historyMed.medicine_lots.filter((l:any) => l.current_stock > 0).map((lot: any) => {
                         const p = Math.floor(lot.current_stock / lot.pack_size);
                         const r = lot.current_stock % lot.pack_size;
                         const unitStr = lot.unit_name === "'s" ? "เม็ด" : lot.unit_name;
                         return (
                           <div key={lot.id} className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex flex-col gap-1.5">
                              <div className="text-rose-600 font-extrabold text-sm">EXP: {lot.exp_date}</div>
                              <div className="flex items-baseline gap-1.5 text-lg font-extrabold text-slate-800">
                                 <span className="text-emerald-600">{p}</span>
                                 <span className="text-slate-400 text-xs">x</span>
                                 <span className="text-slate-700">{lot.pack_size}</span>
                                 <span className="text-xs font-semibold text-slate-500">{unitStr}</span>
                              </div>
                              <div className="text-xs text-slate-400 font-medium">รวมทั้งหมด {lot.current_stock} หน่วย</div>
                           </div>
                         );
                      })}
                   </div>
                )}
              </div>

              {/* เงื่อนไขแสดงปุ่มรับเข้า/ตัดจ่าย (เฉพาะผู้ที่ Login) หรือ ฟอร์มโน้ตผู้มาเยือน (สำหรับคนสแกน QR) */}
              {session ? (
                <div className="grid grid-cols-2 gap-3">
                   <button onClick={() => openStockModal(historyMed, 'in')} className="flex items-center justify-center gap-2 py-4 bg-emerald-50/80 text-emerald-700 border border-emerald-200/60 rounded-3xl font-bold shadow-sm hover:bg-emerald-100 transition-all"><PackagePlus size={20}/> รับเข้าสต็อก</button>
                   <button onClick={() => openStockModal(historyMed, 'out')} className="flex items-center justify-center gap-2 py-4 bg-red-50/80 text-red-700 border border-red-200/60 rounded-3xl font-bold shadow-sm hover:bg-red-100 transition-all"><PackageMinus size={20}/> ตัดจ่ายสต็อก</button>
                </div>
              ) : (
                <div className="bg-amber-50/90 border border-amber-200 rounded-3xl p-5 shadow-sm space-y-3">
                   <h3 className="text-sm font-bold text-amber-800 flex items-center gap-2"><MessageSquareText size={18}/> บันทึกโน้ตผู้มาเยือน (แจ้งว่ายังไม่ได้รับเข้า)</h3>
                   <form onSubmit={handleQrVisitorSubmit} className="space-y-3">
                      <div>
                         <label className="block text-xs font-bold text-slate-700 mb-1">เลือกล็อต EXP *</label>
                         <select required className="w-full bg-white border border-amber-200 rounded-xl p-3 text-sm font-medium outline-none shadow-sm" value={qrVisitorLotId} onChange={(e) => setQrVisitorLotId(e.target.value)}>
                            <option value="">-- เลือกล็อต EXP --</option>
                            {(historyMed.medicine_lots || []).filter((l: any) => l.current_stock > 0).map((lot: any) => {
                               const packs = Math.floor(lot.current_stock / lot.pack_size); const rem = lot.current_stock % lot.pack_size;
                               const unitStr = lot.unit_name === "'s" ? "'" : ` ${lot.unit_name}`;
                               return <option key={lot.id} value={lot.id}>EXP: {lot.exp_date} ({packs} กล่อง × {lot.pack_size}{unitStr} {rem > 0 ? `+ เศษ ${rem}` : ''} | เหลือรวม: {lot.current_stock})</option>
                            })}
                         </select>
                      </div>
                      <div>
                         <div className="flex bg-slate-100/80 p-1 rounded-xl mb-2 shadow-inner">
                           <button type="button" className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${qrVisitorInputMode === 'base' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`} onClick={() => setQrVisitorInputMode('base')}>กรอกเป็นเม็ด/ชิ้น</button>
                           <button type="button" className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${qrVisitorInputMode === 'pack' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`} onClick={() => setQrVisitorInputMode('pack')}>กรอกเป็นกล่อง/แพ็ค</button>
                         </div>
                         {qrVisitorInputMode === 'base' ? (
                           <input type="number" required min="1" placeholder="จำนวน (ชิ้นย่อย)" className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none shadow-sm" value={qrVisitorAmount} onChange={(e) => setQrVisitorAmount(e.target.value)} />
                         ) : (
                           <input type="number" step="0.1" required min="0.1" placeholder="จำนวน (กล่อง/แพ็ค)" className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none shadow-sm" value={qrVisitorPackCount} onChange={(e) => setQrVisitorPackCount(e.target.value)} />
                         )}
                      </div>
                      <div>
                         <label className="block text-xs font-bold text-slate-700 mb-1">ชื่อผู้บันทึก *</label>
                         <input type="text" required placeholder="ชื่อของคุณ" className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-medium outline-none shadow-sm" value={qrVisitorName} onChange={(e) => setQrVisitorName(e.target.value)} />
                      </div>
                      <button type="submit" disabled={qrVisitorSubmitting} className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold p-3.5 rounded-xl shadow-md transition-all disabled:opacity-60">{qrVisitorSubmitting ? 'กำลังบันทึก...' : 'บันทึกโน้ตแจ้งเตือน'}</button>
                   </form>
                </div>
              )}

              {/* โน้ตผู้มาเยือนสำหรับยานี้ (เอาไว้แจ้งเตือน และมีปุ่มรับทราบเหมือนหน้าหลัก) */}
              <div className="bg-amber-50/70 border border-amber-200/60 rounded-3xl p-5 shadow-sm mt-4">
                 <h3 className="text-sm font-bold text-amber-800 mb-3 flex items-center gap-2"><MessageSquareText size={18}/> โน้ตผู้มาเยือนสำหรับยานี้ (รอตรวจสอบ)</h3>
                 {visitorNotes.filter(n => n.medicine_id?.toString() === historyMed.id?.toString() && n.status === 'visitor_note').length === 0 ? (
                    <div className="text-xs text-amber-600/70 py-2">ไม่มีโน้ตผู้มาเยือนที่รอตรวจสอบสำหรับยานี้</div>
                 ) : (
                    <div className="max-h-56 overflow-y-auto space-y-2.5 pr-1">
                       {visitorNotes.filter(n => n.medicine_id?.toString() === historyMed.id?.toString() && n.status === 'visitor_note').map(note => (
                          <div key={note.id} className="bg-white/90 border border-amber-100 p-3.5 rounded-2xl flex justify-between items-center text-xs shadow-sm">
                             <div>
                                <div className="font-bold text-slate-800">แจ้งเบิก <span className="text-red-600">{note.amount} ชิ้น</span> (EXP: {note.exp_date})</div>
                                <div className="text-[10px] text-slate-500 mt-1 font-medium">ผู้บันทึก: <span className="font-bold text-slate-700">{note.staff_name}</span> | {formatHistoryDate(note.created_at)}</div>
                             </div>
                             {session ? (
                                <button onClick={() => handleAcknowledgeNote(note.id)} title="รับทราบข้อความนี้" className="px-3 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white border border-emerald-200 rounded-xl font-bold transition-all shadow-sm flex items-center gap-1.5">
                                   <Check size={16} /> รับทราบ
                                </button>
                             ) : (
                                <span className="text-[10px] font-bold px-2.5 py-1 rounded-xl bg-amber-100 text-amber-800">รอตรวจสอบ</span>
                             )}
                          </div>
                       ))}
                    </div>
                 )}
              </div>

              {/* ประวัติการทำรายการล่าสุด */}
              <div className="space-y-3 pt-2">
                <h3 className="font-bold flex items-center gap-2 text-slate-700 text-sm px-1"><History size={18} /> ประวัติการทำรายการล่าสุด</h3>
                {historyRows.length === 0 ? (
                   <div className="text-center py-10 text-slate-400 text-sm bg-white rounded-3xl border border-slate-100">ยังไม่มีประวัติการทำรายการ</div>
                ) : (
                   historyRows.map((row: any) => {
                      const lotInfo = (historyMed.medicine_lots || []).find((l:any) => String(l.id) === String(row.lot_id));
                      const pSize = lotInfo?.pack_size || 100;
                      const uName = lotInfo?.unit_name || "'s";
                      const formattedText = formatBoxString(row.amount, pSize, uName);
                      const isPending = row.status === 'pending';

                      return (
                         <div key={row.id} className={`bg-white border ${isPending ? 'border-amber-300' : 'border-slate-200/70'} rounded-3xl p-4 shadow-sm flex items-start justify-between gap-3`}>
                           <div className="flex items-start gap-3">
                              <div className={`p-2.5 rounded-2xl shrink-0 mt-0.5 ${row.action === 'in' ? (isPending ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700') : 'bg-red-100 text-red-700'}`}>
                                 {row.action === 'in' ? (isPending ? <Clock size={18}/> : <PackagePlus size={18}/>) : <PackageMinus size={18}/>}
                              </div>
                              <div>
                                 <div className={`text-sm font-extrabold ${row.action === 'in' ? (isPending ? 'text-amber-700' : 'text-emerald-700') : 'text-red-700'}`}>
                                    {row.action === 'in' ? (isPending ? 'รอรับเข้าล่วงหน้า' : 'รับเข้า') : 'ตัดจ่าย'} {formattedText}
                                 </div>
                                 <div className="text-xs text-slate-500 font-medium mt-0.5">
                                    (รวมทั้งหมด {row.amount} {uName === "'s" ? "เม็ด" : uName})
                                 </div>
                                 <div className="text-xs text-rose-500 font-bold mt-1.5 flex items-center gap-1">
                                    <CalendarDays size={12}/> EXP: {row.exp_date || "-"}
                                 </div>
                                 {isPending && row.expected_date && (
                                    <div className="text-[11px] text-amber-800 font-bold mt-1.5 bg-amber-100 px-2 py-1 rounded-lg inline-block">
                                      กำหนดเข้า: {row.expected_date}
                                    </div>
                                 )}
                                 <div className="text-[10px] text-slate-400 mt-1.5 font-medium">
                                    {formatHistoryDate(row.created_at)} {row.edit_note ? `[${row.edit_note}]` : ''}
                                 </div>
                              </div>
                           </div>
                           <div className="flex flex-col items-end gap-2 shrink-0">
                              <div className="text-[11px] font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-full border border-slate-200 flex items-center gap-1">
                                 <User size={10} className="text-slate-400"/> {row.staff_name}
                              </div>
                              {session && isPending && (
                                <button onClick={() => handleConfirmPendingStock(row)} className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-bold rounded-xl shadow-sm transition-all flex items-center gap-1 mt-1">
                                  <Check size={14}/> ได้รับยาแล้ว
                                </button>
                              )}
                           </div>
                         </div>
                      );
                   })
                )}
              </div>

            </div>
          </div>
        )}
        
        {/* Modal: Visitor Note Main Page */}
        {isVisitorMainModalOpen && session && (
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
      </div>
    </div>
  );
}

export default function StockCardPage() {
  const [session, SessionState] = useState<Session | null>(null); 
  const [checkedSession, setCheckedSession] = useState(false);
  const [staffList, setStaffList] = useState<string[]>(DEFAULT_STAFF_LIST);
  const [isVisitorMode, setIsVisitorMode] = useState(false);

  const fetchStaffNames = async () => {
    try {
      const { data } = await supabase.from("staff_accounts").select("name").order("name");
      if (data && data.length > 0) {
        const names = data.map(d => d.name);
        setStaffList(Array.from(new Set([...DEFAULT_STAFF_LIST, ...names])));
      }
    } catch (e) {}
  };

  useEffect(() => { 
    try { 
      const raw = localStorage.getItem(SESSION_KEY); 
      if (raw) SessionState(JSON.parse(raw)); 
    } catch {} 
    
    if (typeof window !== 'undefined') {
       const params = new URLSearchParams(window.location.search);
       if (params.get('id') || params.get('scan') || params.get('med')) {
          setIsVisitorMode(true);
       }
    }

    fetchStaffNames();
    setCheckedSession(true); 
  }, []);

  const handleLogout = () => { 
    localStorage.removeItem(SESSION_KEY); 
    SessionState(null); 
    setIsVisitorMode(false);
  };

  if (!checkedSession) return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400">กำลังโหลด...</div>;

  if (!session && !isVisitorMode) {
     return <LoginScreen onLogin={SessionState} staffList={staffList} />;
  }

  return <StockCardApp session={session} onLogout={handleLogout} staffList={staffList} refreshStaffList={fetchStaffNames} />;
}