"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import {
  Plus, PackagePlus, PackageMinus, X, Calculator, Edit, Trash2, CalendarDays,
  User, Users, Lock, LogOut, KeyRound, ShieldCheck, CheckCircle2, CircleDashed,
  Search, Tag, Check, LayoutGrid, History, TrendingDown, CalendarRange,
  FileText, Printer
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

const STAFF_LIST = [
  "ศรีไพร", "จุฬารัตน์", "วิภาวรรณ", "ณัฏฐริกา", "ณัฐพร",
  "นทีทิพย์", "วรรณอาษา", "จุฑาภรณ์", "วีรากานต์", "มีนนรี",
];
const CENTRAL_ACCOUNT_NAME = "บัญชีส่วนกลาง";
const SESSION_KEY = "stockcard_session_v1";
const CATEGORY_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

type Session = { id: string; name: string; isCentral: boolean };

async function sha256Hex(text: string) {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

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
    setSelectedName(null);
    setStaffRow(null);
    setPassword("");
    setPassword2("");
    setError("");
  };

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
        const { data: inserted, error: insErr } = await supabase
          .from("staff_accounts")
          .insert([{ name, is_central: false }])
          .select()
          .single();
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
    setCentralError("");
    try {
      let { data, error } = await supabase
        .from("staff_accounts")
        .select("*")
        .eq("name", CENTRAL_ACCOUNT_NAME)
        .maybeSingle();
      if (error) throw error;

      if (!data) {
        const { data: inserted, error: insErr } = await supabase
          .from("staff_accounts")
          .insert([{ name: CENTRAL_ACCOUNT_NAME, is_central: true }])
          .select()
          .single();
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
      if (mode === "setPassword") {
        const hash = await sha256Hex(password);
        const { data, error } = await supabase
          .from("staff_accounts")
          .update({ password_hash: hash })
          .eq("id", staffRow.id)
          .select()
          .single();
        if (error) throw error;

        const session: Session = { id: data.id, name: data.name, isCentral: false };
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        onLogin(session);
      } else {
        const hash = await sha256Hex(password);
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 md:p-6">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800">ระบบคลังยา</h1>
          <p className="text-gray-500 mt-1">กรุณาเลือกชื่อเจ้าหน้าที่เพื่อเข้าสู่ระบบ</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6 mb-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {STAFF_LIST.map((name) => (
              <button
                key={name}
                onClick={() => openStaffLogin(name)}
                className="flex items-center gap-2 justify-center border border-gray-200 rounded-lg p-3 font-medium text-gray-700 hover:border-blue-400 hover:bg-blue-50 transition-colors"
              >
                <User size={16} className="text-gray-400" /> {name}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleCentralLogin}
          disabled={centralBusy}
          className="w-full flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-900 text-white p-3.5 rounded-xl font-medium disabled:opacity-60 transition-colors"
        >
          <Users size={18} /> {centralBusy ? "กำลังเข้าสู่ระบบ..." : `เข้าสู่ระบบด้วย${CENTRAL_ACCOUNT_NAME}`}
        </button>
        {centralError && <p className="text-red-600 text-sm mt-3 text-center">{centralError}</p>}

        {selectedName && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-sm overflow-hidden">
              <div className="flex justify-between items-center p-5 border-b bg-blue-50 border-blue-100">
                <h2 className="text-lg font-bold flex items-center gap-2 text-blue-900">
                  <Lock size={18} /> {selectedName}
                </h2>
                <button onClick={closeModal}>
                  <X size={22} className="text-gray-400" />
                </button>
              </div>

              {loadingRow ? (
                <div className="p-8 text-center text-gray-500">กำลังโหลด...</div>
              ) : (
                <form onSubmit={handleSubmitPassword} className="p-6 space-y-4">
                  {mode === "setPassword" && (
                    <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg p-3">
                      ยังไม่เคยตั้งรหัสผ่าน กรุณาตั้งรหัสผ่านใหม่สำหรับใช้เข้าสู่ระบบครั้งถัดไป
                    </p>
                  )}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {mode === "setPassword" ? "ตั้งรหัสผ่านใหม่" : "รหัสผ่าน"}
                    </label>
                    <input
                      type="password"
                      required
                      autoFocus
                      className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  {mode === "setPassword" && (
                    <div>
                      <label className="block text-sm font-medium mb-1">ยืนยันรหัสผ่าน</label>
                      <input
                        type="password"
                        required
                        className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500"
                        value={password2}
                        onChange={(e) => setPassword2(e.target.value)}
                      />
                    </div>
                  )}
                  {error && <p className="text-red-600 text-sm">{error}</p>}
                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full bg-blue-600 text-white p-3 rounded-lg font-medium disabled:opacity-60"
                  >
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
    setLoading(true);
    setLoadError("");
    try {
      const { data, error } = await supabase
        .from("staff_accounts")
        .select("*")
        .in("name", STAFF_LIST);
      if (error) throw error;
      const map: Record<string, any> = {};
      (data || []).forEach((row: any) => { map[row.name] = row; });
      setRows(map);
    } catch (e: any) {
      setLoadError("โหลดรายชื่อเจ้าหน้าที่ไม่สำเร็จ: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStaffRows(); }, []);

  const openResetForm = (name: string) => {
    setEditingName(name);
    setNewPassword("");
    setNewPassword2("");
    setFormError("");
  };

  const closeResetForm = () => {
    setEditingName(null);
    setNewPassword("");
    setNewPassword2("");
    setFormError("");
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingName) return;
    if (newPassword.length < 4) return setFormError("รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร");
    if (newPassword !== newPassword2) return setFormError("รหัสผ่านทั้งสองช่องไม่ตรงกัน");

    setBusy(true);
    setFormError("");
    try {
      const hash = await sha256Hex(newPassword);
      const { error } = await supabase
        .from("staff_accounts")
        .upsert({ name: editingName, password_hash: hash, is_central: false }, { onConflict: "name" });
      if (error) throw error;
      closeResetForm();
      fetchStaffRows();
    } catch (e: any) {
      setFormError("บันทึกไม่สำเร็จ: " + e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-lg overflow-hidden max-h-[85vh] flex flex-col">
        <div className="flex justify-between items-center p-5 border-b bg-gray-50">
          <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800">
            <ShieldCheck size={22} className="text-gray-500" /> จัดการรหัสผ่านเจ้าหน้าที่
          </h2>
          <button onClick={onClose}><X size={24} className="text-gray-400" /></button>
        </div>

        <div className="p-4 md:p-6 overflow-y-auto space-y-2">
          {loading ? (
            <div className="text-center text-gray-500 py-8">กำลังโหลด...</div>
          ) : loadError ? (
            <div className="text-center text-red-600 py-8">{loadError}</div>
          ) : (
            STAFF_LIST.map((name) => {
              const row = rows[name];
              const hasPassword = !!row?.password_hash;
              return (
                <div key={name} className="flex flex-col sm:flex-row sm:items-center justify-between border border-gray-100 rounded-lg p-3 gap-3">
                  <div className="flex items-center gap-2">
                    <User size={16} className="text-gray-400" />
                    <span className="font-medium text-gray-800">{name}</span>
                    {hasPassword ? (
                      <span className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                        <CheckCircle2 size={12} /> ตั้งรหัสแล้ว
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                        <CircleDashed size={12} /> ยังไม่ได้ตั้งรหัส
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => openResetForm(name)}
                    className="flex items-center justify-center gap-1 text-sm font-medium text-blue-600 border sm:border-none border-blue-100 py-2 sm:py-1.5 rounded-lg hover:bg-blue-50 w-full sm:w-auto"
                  >
                    <KeyRound size={14} /> {hasPassword ? "รีเซ็ตรหัสผ่าน" : "ตั้งรหัสผ่าน"}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {editingName && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-sm overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b bg-blue-50 border-blue-100">
              <h2 className="text-lg font-bold flex items-center gap-2 text-blue-900">
                <KeyRound size={18} /> ตั้งรหัสผ่านให้ {editingName}
              </h2>
              <button onClick={closeResetForm}><X size={22} className="text-gray-400" /></button>
            </div>
            <form onSubmit={handleSavePassword} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">รหัสผ่านใหม่</label>
                <input
                  type="password"
                  required
                  autoFocus
                  className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">ยืนยันรหัสผ่านใหม่</label>
                <input
                  type="password"
                  required
                  className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500"
                  value={newPassword2}
                  onChange={(e) => setNewPassword2(e.target.value)}
                />
              </div>
              {formError && <p className="text-red-600 text-sm">{formError}</p>}
              <button
                type="submit"
                disabled={busy}
                className="w-full bg-blue-600 text-white p-3 rounded-lg font-medium disabled:opacity-60"
              >
                {busy ? "กำลังบันทึก..." : "บันทึกรหัสผ่านใหม่"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StockCardApp({ session, onLogout }: { session: Session; onLogout: () => void }) {
  const [medicines, setMedicines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isMedModalOpen, setIsMedModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [medFormData, setMedFormData] = useState({
    id: "", name: "", barcode: "", hosxp_icode: "", cabinet_category: "1", min_stock: ""
  });

  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [selectedMed, setSelectedMed] = useState<any>(null);
  const [stockAction, setStockAction] = useState<'in' | 'out'>('in');
  const [stockExpDate, setStockExpDate] = useState("");
  const [stockPackSize, setStockPackSize] = useState("100");
  const [stockUnitName, setStockUnitName] = useState("'s");
  const [selectedLotId, setSelectedLotId] = useState("");
  const [inputMode, setInputMode] = useState<'base' | 'pack'>('base');
  const [inputAmount, setInputAmount] = useState("");
  const [inputPackCount, setInputPackCount] = useState("");

  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [categories, setCategories] = useState<Record<number, string>>(
    Object.fromEntries(CATEGORY_IDS.map((id) => [id, `ตู้ยา ${id}`]))
  );
  const [selectedCategory, setSelectedCategory] = useState<number | "all">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [categoryNameInput, setCategoryNameInput] = useState("");
  const [categoryBusy, setCategoryBusy] = useState(false);

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyMed, setHistoryMed] = useState<any>(null);
  const [historyRows, setHistoryRows] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // States สำหรับสถิติหน้าแรก
  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const [globalPeriodMode, setGlobalPeriodMode] = useState<'1m' | '2m' | '3m' | 'custom'>('1m');
  const [globalStartDate, setGlobalStartDate] = useState("");
  const [globalEndDate, setGlobalEndDate] = useState("");

  // States สำหรับ Print Report (Stock Card)
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportTargetId, setReportTargetId] = useState("all");
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [showPrintView, setShowPrintView] = useState(false);
  const [printData, setPrintData] = useState<any>({});

  const fetchMedicines = async () => {
    try {
      const { data, error } = await supabase
        .from("medicines")
        .select(`*, medicine_lots (*)`)
        .order("id", { ascending: false });

      if (error) throw error;
      if (data) setMedicines(data);

      const { data: txData } = await supabase
        .from("stock_transactions")
        .select("*")
        .eq("action", "out");
      if (txData) setAllTransactions(txData);

    } catch (error) {
      console.error("Error fetching medicines:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase.from("cabinet_categories").select("*").order("id");
      if (error) throw error;
      if (data && data.length > 0) {
        setCategories((prev) => {
          const next = { ...prev };
          data.forEach((row: any) => { next[row.id] = row.name; });
          return next;
        });
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  useEffect(() => { fetchMedicines(); fetchCategories(); }, []);

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

  const handleRenameCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCategoryId === null) return;
    const trimmed = categoryNameInput.trim();
    if (!trimmed) return;
    setCategoryBusy(true);
    try {
      const { error } = await supabase
        .from("cabinet_categories")
        .upsert({ id: editingCategoryId, name: trimmed }, { onConflict: "id" });
      if (error) throw error;
      setCategories((prev) => ({ ...prev, [editingCategoryId]: trimmed }));
      setEditingCategoryId(null);
      setCategoryNameInput("");
    } catch (error: any) {
      alert("บันทึกชื่อหมวดหมู่ไม่สำเร็จ: " + error.message);
    } finally {
      setCategoryBusy(false);
    }
  };

  const filteredMedicines = medicines
    .filter((med) => selectedCategory === "all" || String(med.cabinet_category) === String(selectedCategory))
    .filter((med) => {
      const term = searchTerm.trim().toLowerCase();
      if (!term) return true;
      return (
        (med.name || "").toLowerCase().includes(term) ||
        (med.hosxp_icode || "").toLowerCase().includes(term) ||
        (med.barcode || "").toLowerCase().includes(term)
      );
    })
    .sort((a, b) => (a.name || "").localeCompare(b.name || "", "th"));

  const handleSaveMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: medFormData.name,
        barcode: medFormData.barcode === "" ? null : medFormData.barcode,
        hosxp_icode: medFormData.hosxp_icode,
        cabinet_category: medFormData.cabinet_category,
        min_stock: parseInt(medFormData.min_stock) || 0,
      };

      if (isEditing) {
        const { error } = await supabase.from("medicines").update(payload).eq("id", medFormData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("medicines").insert([payload]);
        if (error) throw error;
      }
      setIsMedModalOpen(false);
      fetchMedicines();
    } catch (error: any) { alert("บันทึกไม่สำเร็จ: " + error.message); }
  };

  const openAddMedModal = () => {
    setIsEditing(false);
    setMedFormData({ id: "", name: "", barcode: "", hosxp_icode: "", cabinet_category: "1", min_stock: "" });
    setIsMedModalOpen(true);
  };

  const openEditMedModal = (med: any) => {
    setIsEditing(true);
    setMedFormData({
      id: med.id, name: med.name, barcode: med.barcode || "", hosxp_icode: med.hosxp_icode || "",
      cabinet_category: med.cabinet_category || "1", min_stock: med.min_stock?.toString() || "0"
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

  const logTransaction = async (opts: { lot_id: string; exp_date: string; action: 'in' | 'out'; amount: number }) => {
    try {
      const { error } = await supabase.from("stock_transactions").insert([{
        medicine_id: String(selectedMed.id),
        lot_id: String(opts.lot_id),
        exp_date: opts.exp_date,
        action: opts.action,
        amount: opts.amount,
        staff_name: session.name,
      }]);
      if (error) throw error;
    } catch (error: any) {
      console.error("Error logging stock transaction:", error);
      alert("อัปเดตสต็อกสำเร็จ แต่บันทึกประวัติไม่สำเร็จ: " + (error?.message || "ไม่ทราบสาเหตุ"));
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
        ? (selectedMed.medicine_lots || []).find((l: any) => l.id === selectedLotId)?.pack_size
        : parseInt(stockPackSize);

      if (!packs || packs <= 0 || !size || size <= 0) return alert("กรุณาระบุข้อมูลให้ครบถ้วน");
      totalItems = Math.round(packs * size);
    }

    try {
      if (stockAction === 'in') {
        if (!stockExpDate) return alert("กรุณาระบุวันหมดอายุ (EXP)");

        const existingLot = (selectedMed.medicine_lots || []).find(
          (l: any) => l.exp_date === stockExpDate && l.pack_size === parseInt(stockPackSize) && l.unit_name === stockUnitName
        );

        if (existingLot) {
          const { error } = await supabase.from("medicine_lots").update({ current_stock: existingLot.current_stock + totalItems }).eq("id", existingLot.id);
          if (error) throw error;
          await logTransaction({ lot_id: existingLot.id, exp_date: existingLot.exp_date, action: 'in', amount: totalItems });
        } else {
          const { data: newLot, error } = await supabase.from("medicine_lots").insert([{
            medicine_id: selectedMed.id, exp_date: stockExpDate, pack_size: parseInt(stockPackSize), unit_name: stockUnitName, current_stock: totalItems
          }]).select().single();
          if (error) throw error;
          await logTransaction({ lot_id: newLot.id, exp_date: newLot.exp_date, action: 'in', amount: totalItems });
        }
      } else {
        if (!selectedLotId) return alert("กรุณาเลือกล็อตที่ต้องการตัดจ่าย");
        const lotToDeduct = (selectedMed.medicine_lots || []).find((l: any) => l.id === selectedLotId);

        if (!lotToDeduct) return alert("ไม่พบข้อมูลล็อต");
        if (totalItems > lotToDeduct.current_stock) {
          return alert(`สต็อกในล็อตนี้ไม่พอ! ต้องการเบิก ${totalItems} แต่มีแค่ ${lotToDeduct.current_stock}`);
        }
        const { error } = await supabase.from("medicine_lots").update({ current_stock: lotToDeduct.current_stock - totalItems }).eq("id", lotToDeduct.id);
        if (error) throw error;
        await logTransaction({ lot_id: lotToDeduct.id, exp_date: lotToDeduct.exp_date, action: 'out', amount: totalItems });
      }

      setIsStockModalOpen(false);
      fetchMedicines();
    } catch (error: any) {
      alert("อัปเดตสต็อกไม่สำเร็จ: " + error.message);
    }
  };

  const openStockModal = (med: any, action: 'in' | 'out') => {
    setSelectedMed(med);
    setStockAction(action);
    setInputMode('base');
    setInputAmount(""); setInputPackCount(""); setStockExpDate(""); setSelectedLotId("");
    if (med.medicine_lots && med.medicine_lots.length > 0) {
      setStockPackSize(med.medicine_lots[0].pack_size.toString());
      setStockUnitName(med.medicine_lots[0].unit_name);
    } else {
      setStockPackSize("100"); setStockUnitName("'s");
    }
    setIsStockModalOpen(true);
  };

  const openHistoryModal = async (med: any) => {
    setHistoryMed(med);
    setIsHistoryModalOpen(true);
    setHistoryLoading(true);
    try {
      const { data, error } = await supabase
        .from("stock_transactions")
        .select("*")
        .eq("medicine_id", String(med.id))
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

  const calculateMedStats = (med: any) => {
    if (!globalStartDate || !globalEndDate) return { totalUsage: 0, target1Week: 0, target2Weeks: 0, daysDiff: 0 };
    const start = new Date(globalStartDate);
    const end = new Date(globalEndDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    let daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff < 1) daysDiff = 1;

    const medTx = allTransactions.filter(tx => {
      const txDate = new Date(tx.created_at);
      return String(tx.medicine_id) === String(med.id) && txDate >= start && txDate <= end;
    });

    const totalUsage = medTx.reduce((sum, tx) => sum + tx.amount, 0);
    const dailyRate = totalUsage / daysDiff;
    const target1Week = Math.ceil(dailyRate * 7 * 1.15);
    const target2Weeks = Math.ceil(dailyRate * 14 * 1.15);

    return { totalUsage, target1Week, target2Weeks, daysDiff };
  };

  const formatToPack = (total: number, med: any) => {
    const activeLots = (med.medicine_lots || []).filter((l: any) => l.current_stock > 0);
    const packSize = activeLots.length > 0 ? activeLots[0].pack_size : (med.medicine_lots?.[0]?.pack_size || 100);
    const unitName = activeLots.length > 0 ? activeLots[0].unit_name : (med.medicine_lots?.[0]?.unit_name || 'หน่วย');

    if (packSize <= 1 || total === 0) return null;
    const packs = Math.floor(total / packSize);
    const remainder = total % packSize;
    
    if (packs === 0) return null;
    let text = `≈ ${packs} กล่อง`;
    if (remainder > 0) text += ` ${remainder} ${unitName}`;
    return text;
  };

  // ----------------------------------------------------
  // ฟังก์ชันสร้างข้อมูลสำหรับรายงาน Stock Card PDF
  // ----------------------------------------------------
  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    try {
      let query = supabase.from("stock_transactions").select("*").order("created_at", { ascending: false });
      if (reportTargetId !== "all") {
        query = query.eq("medicine_id", reportTargetId);
      }
      
      const { data: txData, error } = await query;
      if (error) throw error;

      const grouped: any = {};
      const medsToProcess = reportTargetId === "all" ? medicines : medicines.filter(m => m.id.toString() === reportTargetId);
      
      medsToProcess.forEach(med => {
         // คำนวณสต็อกปัจจุบันรวมทั้งหมดของยาตัวนี้
         let currentTotalStock = (med.medicine_lots || []).reduce((sum: number, lot: any) => sum + lot.current_stock, 0);
         const medTxs = (txData || []).filter(tx => tx.medicine_id.toString() === med.id.toString());
         
         // คำนวณ Balance ย้อนหลังจากสต็อกปัจจุบัน (ย้อนกลับเพื่อหาอดีต)
         let runningBal = currentTotalStock;
         const processedTxs = medTxs.map(tx => {
             const balanceAfter = runningBal; // ยอดยกไป หลังจากทำรายการนี้
             // คำนวณหา ยอดยกมา ก่อนหน้าทำรายการนี้
             if (tx.action === 'in') runningBal -= tx.amount;
             if (tx.action === 'out') runningBal += tx.amount;
             
             // ดึงข้อมูลหน่วยและขนาดแพ็คเพื่อแสดงในรายงาน
             const lotInfo = (med.medicine_lots || []).find((l: any) => l.id.toString() === tx.lot_id?.toString());
             const pUnit = lotInfo?.unit_name || 'หน่วย';
             
             return { ...tx, balanceAfter, pUnit, lotExp: tx.exp_date };
         });

         grouped[med.id] = {
            medName: med.name,
            hosxp: med.hosxp_icode,
            barcode: med.barcode,
            transactions: processedTxs.reverse() // กลับเป็นจากอดีต->ปัจจุบัน
         };
      });

      setPrintData(grouped);
      setShowPrintView(true);
      setIsReportModalOpen(false);
    } catch(e: any) {
      alert("เกิดข้อผิดพลาดในการดึงข้อมูลรายงาน: " + e.message);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // ----------------------------------------------------
  // มุมมองสำหรับหน้า Print (ซ่อนส่วนอื่นๆ ทั้งหมด)
  // ----------------------------------------------------
  if (showPrintView) {
    return (
      <div className="bg-white min-h-screen text-black print:p-0 p-8">
        <div className="max-w-5xl mx-auto">
          <div className="print:hidden flex justify-between items-center mb-6 bg-gray-100 p-4 rounded-xl">
            <div>
              <h1 className="text-xl font-bold">ตัวอย่างก่อนพิมพ์ (Print Preview)</h1>
              <p className="text-sm text-gray-500">กดปุ่ม พิมพ์ / Save PDF เพื่อบันทึกไฟล์</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowPrintView(false)} className="px-4 py-2 border rounded-lg font-medium hover:bg-gray-200">ปิด</button>
              <button onClick={() => window.print()} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium flex items-center gap-2"><Printer size={18}/> พิมพ์ / Save PDF</button>
            </div>
          </div>

          <div className="print-content">
            <h1 className="text-2xl font-bold text-center mb-2">รายงานประวัติการใช้ยา (Stock Card)</h1>
            <p className="text-center text-sm text-gray-600 mb-8">พิมพ์วันที่: {new Date().toLocaleString("th-TH")}</p>

            {Object.values(printData).map((medData: any) => (
              <div key={medData.medName} className="mb-10 page-break-after-avoid">
                <div className="mb-3 border-b-2 border-black pb-2">
                  <h2 className="text-xl font-bold">{medData.medName}</h2>
                  <div className="text-sm">รหัส HosXP: {medData.hosxp || "-"} | บาร์โค้ด: {medData.barcode || "-"}</div>
                </div>
                
                {medData.transactions.length === 0 ? (
                  <p className="text-sm text-gray-500 italic py-4">ไม่มีประวัติการทำรายการ</p>
                ) : (
                  <table className="w-full text-sm text-left border-collapse border border-gray-400">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-400 p-2">วันที่ทำรายการ</th>
                        <th className="border border-gray-400 p-2 text-center">รับเข้า</th>
                        <th className="border border-gray-400 p-2 text-center">ตัดจ่าย</th>
                        <th className="border border-gray-400 p-2 text-center">ยอดยกไป (คงเหลือ)</th>
                        <th className="border border-gray-400 p-2">ผู้ดำเนินการ</th>
                        <th className="border border-gray-400 p-2">หมายเหตุ (EXP)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {medData.transactions.map((tx: any, idx: number) => (
                        <tr key={tx.id} className="border border-gray-400">
                          <td className="border border-gray-400 p-2">{formatHistoryDate(tx.created_at)}</td>
                          <td className="border border-gray-400 p-2 text-center text-emerald-700 font-medium">
                            {tx.action === 'in' ? `${tx.amount} ${tx.pUnit}` : '-'}
                          </td>
                          <td className="border border-gray-400 p-2 text-center text-red-700 font-medium">
                            {tx.action === 'out' ? `${tx.amount} ${tx.pUnit}` : '-'}
                          </td>
                          <td className="border border-gray-400 p-2 text-center font-bold">
                            {tx.balanceAfter} {tx.pUnit}
                          </td>
                          <td className="border border-gray-400 p-2">{tx.staff_name}</td>
                          <td className="border border-gray-400 p-2 text-gray-600 text-xs">EXP: {tx.lotExp}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ))}
          </div>
        </div>

        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            body { background: white; margin: 0; padding: 0; }
            .print\\:hidden { display: none !important; }
            table { page-break-inside: auto; }
            tr { page-break-inside: avoid; page-break-after: auto; }
            .page-break-after-avoid { page-break-after: auto; }
          }
        `}} />
      </div>
    );
  }

  // ----------------------------------------------------
  // หน้าหลัก (Main UI)
  // ----------------------------------------------------
  return (
    <div className="min-h-screen bg-gray-50 p-2 md:p-8">
      <div className="max-w-7xl mx-auto">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 md:mb-8 bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="w-full flex justify-between items-start md:items-center">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-800 leading-tight">
                ระบบคลังยา <br className="md:hidden" />
                <span className="text-base md:text-2xl font-semibold text-gray-600">(จัดล็อต EXP)</span>
              </h1>
              <p className="text-xs md:text-sm text-gray-500 mt-1">Lot & Expiry Date Management</p>
            </div>
            
            <div className="text-right md:hidden">
              <div className="text-[10px] font-medium text-gray-700 flex items-center justify-end gap-1 bg-gray-100 px-2 py-1 rounded-full">
                <User size={12} className="text-gray-500" /> {session.name}
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap md:flex-nowrap items-center gap-2 w-full md:w-auto mt-2 md:mt-0">
            {/* ปุ่มรายงาน Stock Card (ย้ายมาอยู่ด้านบน) */}
            <button onClick={() => setIsReportModalOpen(true)} className="flex-1 md:flex-none flex justify-center items-center gap-1.5 md:gap-2 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 px-3 py-2.5 md:px-4 md:py-2 rounded-lg font-medium transition-colors text-sm md:text-base">
              <FileText size={18} /> พิมพ์รายงาน
            </button>
            <button onClick={openAddMedModal} className="flex-1 md:flex-none flex justify-center items-center gap-1.5 md:gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2.5 md:px-4 md:py-2 rounded-lg font-medium transition-colors text-sm md:text-base shadow-sm">
              <Plus size={18} /> เพิ่มรายการยา
            </button>
            {session.isCentral && (
              <button onClick={() => setIsAdminModalOpen(true)} title="จัดการรหัสผ่าน" className="p-2.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-blue-100 hover:text-blue-700 transition-colors shrink-0">
                <ShieldCheck size={20} />
              </button>
            )}
            <button onClick={onLogout} title="ออกจากระบบ" className="p-2.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-red-100 hover:text-red-700 transition-colors shrink-0">
              <LogOut size={20} />
            </button>
          </div>
        </div>

        <div className="bg-blue-50/60 rounded-xl shadow-sm border border-blue-100 p-4 mb-4">
          <h2 className="text-sm font-bold text-blue-900 mb-3 flex items-center gap-1.5">
            <TrendingDown size={18} /> สถิติการใช้ยา & วางแผนรอบเบิกสต็อก (1 สัปดาห์ / 2 สัปดาห์)
          </h2>
          
          <div className="flex flex-wrap gap-2 mb-3">
            <button onClick={() => setGlobalPeriodMode('1m')} className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${globalPeriodMode === '1m' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border text-gray-600'}`}>1 เดือน</button>
            <button onClick={() => setGlobalPeriodMode('2m')} className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${globalPeriodMode === '2m' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border text-gray-600'}`}>2 เดือน</button>
            <button onClick={() => setGlobalPeriodMode('3m')} className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${globalPeriodMode === '3m' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border text-gray-600'}`}>3 เดือน</button>
            <button onClick={() => setGlobalPeriodMode('custom')} className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${globalPeriodMode === 'custom' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border text-gray-600'}`}>กำหนดเอง</button>
          </div>

          {globalPeriodMode === 'custom' && (
            <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-blue-100 max-w-md">
              <CalendarRange size={16} className="text-blue-500" />
              <input type="date" className="text-sm bg-transparent outline-none w-full text-gray-700" value={globalStartDate} onChange={(e) => setGlobalStartDate(e.target.value)} />
              <span className="text-gray-400">-</span>
              <input type="date" className="text-sm bg-transparent outline-none w-full text-gray-700" value={globalEndDate} onChange={(e) => setGlobalEndDate(e.target.value)} />
            </div>
          )}
          <p className="text-[11px] text-blue-700 mt-2">* ระบบคำนวณเป้าหมายสต็อกสำรองสำหรับรอบเบิก 1 สัปดาห์ และ 2 สัปดาห์ (รวมเผื่อ Safety Stock 15% แล้ว) แสดงในตารางด้านล่าง</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 md:p-4 mb-4 w-full overflow-hidden">
          <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-gray-500">
            <LayoutGrid size={16} /> หมวดหมู่ตู้ยา
          </div>
          
          <div className="flex overflow-x-auto pb-3 -mb-1 gap-2 snap-x" style={{ scrollbarWidth: 'thin' }}>
            <button
              onClick={() => setSelectedCategory("all")}
              className={`shrink-0 snap-start px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                selectedCategory === "all" ? "bg-blue-600 text-white border-blue-600 shadow-sm" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              }`}
            >
              ทั้งหมด
            </button>
            {CATEGORY_IDS.map((id) => (
              <div
                key={id}
                className={`shrink-0 snap-start flex items-center gap-0.5 rounded-lg border transition-colors ${
                  selectedCategory === id ? "bg-blue-600 border-blue-600 shadow-sm" : "bg-white border-gray-200 hover:bg-gray-50"
                }`}
              >
                <button
                  onClick={() => setSelectedCategory(id)}
                  className={`pl-3 pr-2 py-1.5 text-sm font-medium whitespace-nowrap ${selectedCategory === id ? "text-white" : "text-gray-600"}`}
                >
                  {categories[id] || `ตู้ยา ${id}`}
                </button>
                <button
                  onClick={() => { setEditingCategoryId(id); setCategoryNameInput(categories[id] || `ตู้ยา ${id}`); }}
                  title="แก้ไขชื่อหมวดหมู่"
                  className={`p-1.5 mr-1 rounded-md transition-colors ${selectedCategory === id ? "text-white/80 hover:text-white hover:bg-white/20" : "text-gray-400 hover:text-blue-600 hover:bg-blue-50"}`}
                >
                  <Edit size={14} />
                </button>
              </div>
            ))}
          </div>

          <div className="relative mt-2">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหาชื่อยา, HosXP หรือบาร์โค้ด..."
              className="w-full border rounded-lg pl-10 pr-4 py-2.5 md:py-3 text-sm md:text-base outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50/50"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto pb-4">
            <table className="w-full text-left border-collapse min-w-[1050px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="p-3 md:p-4 font-semibold text-gray-600 w-24">จัดการ</th>
                  <th className="p-3 md:p-4 font-semibold text-gray-600 w-1/4">รหัส/ชื่อยา</th>
                  <th className="p-3 md:p-4 font-semibold text-gray-600 text-center w-32">รับเข้า/ตัดจ่าย</th>
                  <th className="p-3 md:p-4 font-semibold text-gray-600">คงเหลือ (แยกตาม EXP)</th>
                  <th className="p-3 md:p-4 font-semibold text-gray-600 w-56">สถิติ & รอบเบิก (1 / 2 สัปดาห์)</th>
                  <th className="p-3 md:p-4 font-semibold text-gray-600 text-center w-32">QR Code</th>
                </tr>
              </thead>
              <tbody>
                {loading ? <tr><td colSpan={6} className="p-8 text-center text-gray-500">กำลังโหลด...</td></tr> :
                 filteredMedicines.length === 0 ? <tr><td colSpan={6} className="p-8 text-center text-gray-500">ไม่พบรายการยาที่ตรงกับเงื่อนไข</td></tr> :
                 filteredMedicines.map((med) => {
                   const activeLots = (med.medicine_lots || [])
                      .filter((l: any) => l.current_stock > 0)
                      .sort((a: any, b: any) => new Date(a.exp_date).getTime() - new Date(b.exp_date).getTime());
                   
                   const mainUnit = activeLots.length > 0 ? activeLots[0].unit_name : (med.medicine_lots?.[0]?.unit_name || 'หน่วย');
                   const medStats = calculateMedStats(med);

                   return (
                    <tr key={med.id} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors">
                      <td className="p-3 md:p-4 align-top">
                        <div className="flex gap-2">
                          <button onClick={() => openEditMedModal(med)} className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-blue-100 hover:text-blue-700 transition-colors"><Edit size={16} /></button>
                          <button onClick={() => handleDeleteMed(med.id)} className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-red-100 hover:text-red-700 transition-colors"><Trash2 size={16} /></button>
                        </div>
                      </td>
                      
                      <td className="p-3 md:p-4 align-top">
                        <div
                          onClick={() => openHistoryModal(med)}
                          className="font-bold text-gray-800 text-base md:text-lg cursor-pointer hover:text-blue-600 hover:underline w-fit mb-1"
                          title="ดูประวัติ"
                        >
                          {med.name}
                        </div>
                        {/* แสดง HosXP พร้อมกับ Barcode */}
                        <div className="text-[11px] md:text-xs text-gray-500 mb-1 leading-snug">
                          บาร์โค้ด: {med.barcode || "-"} <br/> 
                          รหัส HosXP: <span className="font-semibold text-gray-700">{med.hosxp_icode || "-"}</span>
                        </div>
                        <div className="text-[10px] md:text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md w-fit">ตู้ยา: {categories[Number(med.cabinet_category)] || med.cabinet_category || "-"}</div>
                      </td>

                      <td className="p-3 md:p-4 align-top text-center">
                        <div className="flex justify-center gap-2 mt-1">
                          <button onClick={() => openStockModal(med, 'in')} className="p-2.5 md:p-3 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 shadow-sm transition-colors" title="รับเข้า"><PackagePlus size={20} /></button>
                          <button onClick={() => openStockModal(med, 'out')} className="p-2.5 md:p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 shadow-sm transition-colors" title="ตัดจ่าย"><PackageMinus size={20} /></button>
                        </div>
                      </td>

                      <td className="p-3 md:p-4 align-top">
                        {activeLots.length === 0 ? (
                          <span className="text-red-500 text-sm font-bold px-3 py-1 bg-red-50 rounded-lg border border-red-100">สต็อกหมด</span>
                        ) : (
                          <div className="flex flex-col gap-2">
                            {activeLots.map((lot: any) => {
                              const fullPacks = Math.floor(lot.current_stock / lot.pack_size);
                              const remainder = lot.current_stock % lot.pack_size;
                              return (
                                <div key={lot.id} className="flex flex-col bg-white border border-gray-200 p-2 md:p-2.5 rounded-lg shadow-sm w-fit min-w-[140px]">
                                  <span className="text-[10px] md:text-xs font-semibold text-rose-600 flex items-center gap-1 mb-1 border-b border-gray-50 pb-1">
                                    <CalendarDays size={12} /> EXP: {lot.exp_date}
                                  </span>
                                  <div className="flex items-baseline gap-1 text-sm md:text-base">
                                    <span className="font-bold text-emerald-700">{fullPacks}</span>
                                    <span className="text-gray-400 text-xs">x</span>
                                    <span className="text-gray-700 font-medium">{lot.pack_size}</span>
                                    {remainder > 0 && <span className="text-amber-600 font-bold ml-1 text-xs">...เศษ {remainder}</span>}
                                    <span className="text-gray-500 text-[10px] md:text-xs ml-1">{lot.unit_name}</span>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </td>

                      <td className="p-3 md:p-4 align-top">
                        <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-200 text-xs space-y-1.5">
                          <div className="flex justify-between border-b pb-1">
                            <span className="text-gray-500">ใช้รวม ({medStats.daysDiff} วัน):</span>
                            <span className="font-bold text-gray-800">{medStats.totalUsage} {mainUnit}</span>
                          </div>
                          {formatToPack(medStats.totalUsage, med) && (
                            <div className="text-[10px] font-medium text-blue-600 text-right">{formatToPack(medStats.totalUsage, med)}</div>
                          )}
                          <div className="flex justify-between text-amber-800 pt-0.5">
                            <span>รอบเบิก 1 สัปดาห์:</span>
                            <span className="font-bold">{medStats.target1Week} {mainUnit}</span>
                          </div>
                          {formatToPack(medStats.target1Week, med) && (
                            <div className="text-[10px] font-medium text-amber-700 text-right">{formatToPack(medStats.target1Week, med)}</div>
                          )}
                          <div className="flex justify-between text-emerald-800 pt-0.5 border-t border-dashed">
                            <span>รอบเบิก 2 สัปดาห์:</span>
                            <span className="font-bold">{medStats.target2Weeks} {mainUnit}</span>
                          </div>
                          {formatToPack(medStats.target2Weeks, med) && (
                            <div className="text-[10px] font-medium text-emerald-700 text-right">{formatToPack(medStats.target2Weeks, med)}</div>
                          )}
                        </div>
                      </td>

                      <td className="p-3 md:p-4 text-center align-top">
                        <div className="flex flex-col items-center justify-center p-2 bg-white rounded-lg border border-gray-200 shadow-sm mx-auto w-fit">
                          <QRCodeSVG 
                            value={`${typeof window !== 'undefined' ? window.location.origin : ''}/medicine/${med.id}`} 
                            size={64} 
                          />
                          <button 
                            onClick={() => window.print()} 
                            className="mt-2 px-2 py-1 bg-blue-50 text-blue-600 text-[10px] md:text-xs font-semibold rounded hover:bg-blue-100 transition-colors w-full"
                          >
                            พิมพ์ QR
                          </button>
                        </div>
                      </td>

                    </tr>
                   )
                 })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal เพิ่ม/แก้ไข ยา */}
        {isMedModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
              <div className="flex justify-between items-center p-5 md:p-6 border-b bg-gray-50">
                <h2 className="text-lg md:text-xl font-bold text-gray-800">{isEditing ? 'แก้ไขข้อมูลยา' : 'เพิ่มรายการยาใหม่ (Master)'}</h2>
                <button onClick={() => setIsMedModalOpen(false)} className="p-1 hover:bg-gray-200 rounded-md transition-colors"><X size={22} className="text-gray-500" /></button>
              </div>
              <form onSubmit={handleSaveMedicine} className="p-5 md:p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5 text-gray-700">ชื่อยา *</label>
                    <input type="text" required className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500" value={medFormData.name} onChange={(e) => setMedFormData({ ...medFormData, name: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5 text-gray-700">บาร์โค้ด</label>
                    <input type="text" className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500" value={medFormData.barcode} onChange={(e) => setMedFormData({ ...medFormData, barcode: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium mb-1.5 text-gray-700">รหัส HosXP</label><input type="text" className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500" value={medFormData.hosxp_icode} onChange={(e) => setMedFormData({ ...medFormData, hosxp_icode: e.target.value })} /></div>
                  <div><label className="block text-sm font-medium mb-1.5 text-gray-700">หมวดหมู่ตู้ยา</label><select className="w-full border border-gray-300 rounded-lg p-2.5 bg-white outline-none focus:ring-2 focus:ring-blue-500" value={medFormData.cabinet_category} onChange={(e) => setMedFormData({ ...medFormData, cabinet_category: e.target.value })}>{CATEGORY_IDS.map(num => <option key={num} value={num.toString()}>{categories[num] || `ตู้ยา ${num}`}</option>)}</select></div>
                </div>
                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setIsMedModalOpen(false)} className="flex-1 border border-gray-300 p-3 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors">ยกเลิก</button>
                  <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl font-medium transition-colors">{isEditing ? 'บันทึกการแก้ไข' : 'บันทึกยาใหม่'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal เลือกเงื่อนไขออกรายงาน PDF */}
        {isReportModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
              <div className="flex justify-between items-center p-5 border-b bg-blue-50 border-blue-100">
                <h2 className="text-lg font-bold flex items-center gap-2 text-blue-900">
                  <FileText size={18} /> พิมพ์รายงาน Stock Card
                </h2>
                <button onClick={() => setIsReportModalOpen(false)} className="p-1 hover:bg-blue-100 rounded-md transition-colors"><X size={20} className="text-blue-500" /></button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">เลือกรายการที่ต้องการพิมพ์</label>
                  <select 
                    className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    value={reportTargetId}
                    onChange={(e) => setReportTargetId(e.target.value)}
                  >
                    <option value="all">-- พิมพ์ยาทั้งหมด --</option>
                    {medicines.map(m => (
                      <option key={m.id} value={m.id}>{m.name} {m.hosxp_icode ? `(${m.hosxp_icode})` : ''}</option>
                    ))}
                  </select>
                </div>
                <div className="pt-4 flex gap-3">
                  <button onClick={() => setIsReportModalOpen(false)} className="flex-1 border border-gray-300 p-3 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors">ยกเลิก</button>
                  <button onClick={handleGenerateReport} disabled={isGeneratingReport} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl font-medium transition-colors disabled:opacity-60 flex justify-center items-center gap-2">
                    {isGeneratingReport ? "กำลังดึงข้อมูล..." : <><Printer size={18}/> สร้าง PDF</>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal รับเข้า/ตัดจ่าย */}
        {isStockModalOpen && selectedMed && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden">
              <div className={`flex justify-between items-center p-6 border-b ${stockAction === 'in' ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                <h2 className={`text-lg font-bold flex items-center gap-2 ${stockAction === 'in' ? 'text-emerald-800' : 'text-red-800'}`}>
                  {stockAction === 'in' ? <PackagePlus size={22} /> : <PackageMinus size={22} />}
                  {stockAction === 'in' ? 'รับเข้าสต็อก (ระบุ EXP)' : 'ตัดจ่ายสต็อก (เลือก EXP)'}
                </h2>
                <button onClick={() => setIsStockModalOpen(false)}><X size={24} className="text-gray-400" /></button>
              </div>

              <form onSubmit={handleUpdateStock} className="p-6 space-y-4">
                <div className="font-bold text-gray-800 mb-2 border-b pb-2">{selectedMed.name}</div>

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
                      {(selectedMed.medicine_lots || []).filter((l: any) => l.current_stock > 0).map((lot: any) => (
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

        {isAdminModalOpen && session.isCentral && (
          <AdminPasswordManager onClose={() => setIsAdminModalOpen(false)} />
        )}

        {editingCategoryId !== null && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
              <div className="flex justify-between items-center p-5 border-b bg-blue-50 border-blue-100">
                <h2 className="text-lg font-bold flex items-center gap-2 text-blue-900">
                  <Tag size={18} /> แก้ไขชื่อตู้ยา {editingCategoryId}
                </h2>
                <button onClick={() => { setEditingCategoryId(null); setCategoryNameInput(""); }} className="p-1 hover:bg-blue-100 rounded-md transition-colors">
                  <X size={20} className="text-blue-500" />
                </button>
              </div>
              <form onSubmit={handleRenameCategory} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-gray-700">ชื่อหมวดหมู่ใหม่</label>
                  <input
                    type="text"
                    required
                    autoFocus
                    className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500"
                    value={categoryNameInput}
                    onChange={(e) => setCategoryNameInput(e.target.value)}
                  />
                </div>
                <div className="pt-2 flex gap-3">
                  <button type="button" onClick={() => { setEditingCategoryId(null); setCategoryNameInput(""); }} className="flex-1 border border-gray-300 p-2.5 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors">ยกเลิก</button>
                  <button type="submit" disabled={categoryBusy} className="flex-1 flex items-center justify-center gap-1 bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-xl font-medium disabled:opacity-60 transition-colors">
                    <Check size={16} /> {categoryBusy ? "กำลังบันทึก..." : "บันทึก"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal ประวัติการทำรายการ (แสดงในรูปแบบแพ็คด้วย) */}
        {isHistoryModalOpen && historyMed && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden max-h-[85vh] flex flex-col">
              <div className="flex justify-between items-center p-5 md:p-6 border-b bg-gray-50">
                <h2 className="text-lg font-bold flex items-center gap-2 text-gray-800">
                  <History size={20} className="text-gray-500" /> ประวัติ: {historyMed.name}
                </h2>
                <button onClick={() => { setIsHistoryModalOpen(false); setHistoryMed(null); setHistoryRows([]); }} className="p-1 hover:bg-gray-200 rounded-md transition-colors">
                  <X size={22} className="text-gray-500" />
                </button>
              </div>

              <div className="p-4 md:p-6 overflow-y-auto space-y-3">
                {historyLoading ? (
                  <div className="text-center text-gray-500 py-8">กำลังโหลด...</div>
                ) : historyRows.length === 0 ? (
                  <div className="text-center text-gray-500 py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">ยังไม่มีประวัติการรับเข้า/ตัดจ่าย</div>
                ) : (
                  historyRows.map((row: any) => {
                    const isInc = row.action === 'in';
                    const lotInfo = (historyMed.medicine_lots || []).find((l: any) => l.id.toString() === row.lot_id?.toString());
                    const pSize = lotInfo?.pack_size || 100;
                    const pUnit = lotInfo?.unit_name || 'หน่วย';
                    const fPacks = Math.floor(row.amount / pSize);
                    const fRem = row.amount % pSize;

                    return (
                      <div key={row.id} className="flex items-start justify-between border border-gray-100 bg-white rounded-xl p-3 md:p-4 shadow-sm">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg mt-0.5 ${isInc ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                            {isInc ? <PackagePlus size={18} /> : <PackageMinus size={18} />}
                          </div>
                          <div>
                            <div className={`text-sm md:text-base font-bold ${isInc ? 'text-emerald-700' : 'text-red-700'}`}>
                              {isInc ? 'รับเข้า' : 'ตัดจ่าย'} {row.amount} {pUnit}
                            </div>
                            <div className="text-xs font-medium text-blue-600 mt-0.5">
                              (≈ {fPacks} กล่อง {fRem > 0 ? `เศษ ${fRem}` : ''})
                            </div>
                            <div className="text-xs md:text-sm text-gray-500 flex items-center gap-1 mt-1">
                              <CalendarDays size={12} /> EXP: {row.exp_date || "-"}
                            </div>
                            <div className="text-[10px] md:text-xs text-gray-400 mt-1">{formatHistoryDate(row.created_at)}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] md:text-xs font-medium text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full shrink-0">
                          <User size={12} /> {row.staff_name}
                        </div>
                      </div>
                    )
                  })
                )}
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

  const handleLogout = () => {
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
  };

  if (!checkedSession) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">กำลังโหลด...</div>;
  if (!session) return <LoginScreen onLogin={setSession} />;

  return <StockCardApp session={session} onLogout={handleLogout} />;
}