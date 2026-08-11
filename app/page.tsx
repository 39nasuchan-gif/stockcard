"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Plus, PackagePlus, PackageMinus, X, Calculator, Edit, Trash2, CalendarDays,
  User, Users, Lock, LogOut, KeyRound, ShieldCheck, CheckCircle2, CircleDashed,
  Search, Tag, Check, LayoutGrid, History,
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

  const fetchMedicines = async () => {
    try {
      const { data, error } = await supabase
        .from("medicines")
        .select(`*, medicine_lots (*)`)
        .order("id", { ascending: false });

      if (error) throw error;
      if (data) setMedicines(data);
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

  return (
    <div className="min-h-screen bg-gray-50 p-2 md:p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* === ส่วนหัว (Header) ปรับให้รองรับมือถือ === */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 md:mb-8 bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="w-full flex justify-between items-start md:items-center">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-800 leading-tight">
                ระบบคลังยา <br className="md:hidden" />
                <span className="text-base md:text-2xl font-semibold text-gray-600">(จัดล็อต EXP)</span>
              </h1>
              <p className="text-xs md:text-sm text-gray-500 mt-1">Lot & Expiry Date Management</p>
            </div>
            
            {/* แสดงชื่อผู้ใช้มุมขวาบนในมือถือ */}
            <div className="text-right md:hidden">
              <div className="text-[10px] font-medium text-gray-700 flex items-center justify-end gap-1 bg-gray-100 px-2 py-1 rounded-full">
                <User size={12} className="text-gray-500" /> {session.name}
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap md:flex-nowrap items-center gap-2 w-full md:w-auto mt-2 md:mt-0">
            <button onClick={openAddMedModal} className="flex-1 md:flex-none flex justify-center items-center gap-1 md:gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2.5 md:px-4 md:py-2 rounded-lg font-medium transition-colors text-sm md:text-base shadow-sm">
              <Plus size={18} /> เพิ่มรายการยาใหม่
            </button>
            {session.isCentral && (
              <button
                onClick={() => setIsAdminModalOpen(true)}
                title="จัดการรหัสผ่านเจ้าหน้าที่"
                className="p-2.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-blue-100 hover:text-blue-700 transition-colors shrink-0"
              >
                <ShieldCheck size={20} />
              </button>
            )}
            <button onClick={onLogout} title="ออกจากระบบ" className="p-2.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-red-100 hover:text-red-700 transition-colors shrink-0">
              <LogOut size={20} />
            </button>
          </div>
        </div>

        {/* === หมวดหมู่ตู้ยา ปรับให้เลื่อนซ้ายขวาได้ในมือถือ === */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 md:p-4 mb-4 w-full overflow-hidden">
          <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-gray-500">
            <LayoutGrid size={16} /> หมวดหมู่ตู้ยา
          </div>
          
          {/* กรอบหมวดหมู่ เลื่อนซ้ายขวาได้ (Horizontal Scroll) */}
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

        {/* === ตารางรายชื่อยา === */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="p-3 md:p-4 font-semibold text-gray-600 w-24">จัดการ</th>
                  <th className="p-3 md:p-4 font-semibold text-gray-600 text-center w-32">QR Code</th>
                  <th className="p-3 md:p-4 font-semibold text-gray-600">รหัส/ชื่อยา</th>
                  <th className="p-3 md:p-4 font-semibold text-gray-600">คงเหลือ (แยกตาม EXP)</th>
                </tr>
              </thead>
              <tbody>
                {loading ? <tr><td colSpan={4} className="p-8 text-center text-gray-500">กำลังโหลด...</td></tr> :
                 filteredMedicines.length === 0 ? <tr><td colSpan={4} className="p-8 text-center text-gray-500">ไม่พบรายการยาที่ตรงกับเงื่อนไข</td></tr> :
                 filteredMedicines.map((med) => {
                   const activeLots = (med.medicine_lots || [])
                      .filter((l: any) => l.current_stock > 0)
                      .sort((a: any, b: any) => new Date(a.exp_date).getTime() - new Date(b.exp_date).getTime());

                   return (
                    <tr key={med.id} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors">
                      <td className="p-3 md:p-4 align-top">
                        <div className="flex gap-2">
                          <button onClick={() => openEditMedModal(med)} className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-blue-100 hover:text-blue-700 transition-colors"><Edit size={16} /></button>
                          <button onClick={() => handleDeleteMed(med.id)} className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-red-100 hover:text-red-700 transition-colors"><Trash2 size={16} /></button>
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

                      <td className="p-3 md:p-4 align-top">
                        <div
                          onClick={() => openHistoryModal(med)}
                          className="font-bold text-gray-800 text-base md:text-lg cursor-pointer hover:text-blue-600 hover:underline w-fit mb-1"
                          title="ดูประวัติ"
                        >
                          {med.name}
                        </div>
                        <div className="text-xs md:text-sm text-gray-500 mb-0.5">บาร์โค้ด: {med.barcode || "-"}</div>
                        <div className="text-[10px] md:text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md w-fit">ตู้ยา: {categories[Number(med.cabinet_category)] || med.cabinet_category || "-"}</div>
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

        {/* Modal จัดการรหัสผ่านเจ้าหน้าที่ (เฉพาะบัญชีส่วนกลาง) */}
        {isAdminModalOpen && session.isCentral && (
          <AdminPasswordManager onClose={() => setIsAdminModalOpen(false)} />
        )}

        {/* Modal แก้ไขชื่อหมวดหมู่ตู้ยา */}
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

        {/* Modal ประวัติการใช้งาน */}
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
                  historyRows.map((row: any) => (
                    <div key={row.id} className="flex items-start justify-between border border-gray-100 bg-white rounded-xl p-3 md:p-4 shadow-sm">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg mt-0.5 ${row.action === 'in' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                          {row.action === 'in' ? <PackagePlus size={18} /> : <PackageMinus size={18} />}
                        </div>
                        <div>
                          <div className={`text-sm md:text-base font-bold ${row.action === 'in' ? 'text-emerald-700' : 'text-red-700'}`}>
                            {row.action === 'in' ? 'รับเข้า' : 'ตัดจ่าย'} {row.amount} หน่วย
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
                  ))
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