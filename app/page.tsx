"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Plus, PackagePlus, PackageMinus, X, Calculator, Edit, Trash2, CalendarDays,
  User, Users, Lock, LogOut, KeyRound, ShieldCheck, CheckCircle2, CircleDashed,
  Search, Tag, Check, LayoutGrid, History,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

/* =========================================================
   ตั้งค่ารายชื่อเจ้าหน้าที่ + บัญชีส่วนกลาง
   - เจ้าหน้าที่ 10 คนนี้ ต้องล็อกอินด้วยรหัสผ่าน (ตั้งรหัสเองในการเข้าใช้ครั้งแรก)
   - "บัญชีส่วนกลาง" ไม่ต้องใส่รหัสผ่าน กดเลือกแล้วเข้าระบบได้ทันที
   ========================================================= */
const STAFF_LIST = [
  "ศรีไพร", "จุฬารัตน์", "วิภาวรรณ", "ณัฏฐริกา", "ณัฐพร",
  "นทีทิพย์", "วรรณอาษา", "จุฑาภรณ์", "วีรากานต์", "มีนนรี",
];
const CENTRAL_ACCOUNT_NAME = "บัญชีส่วนกลาง";
const SESSION_KEY = "stockcard_session_v1";
const CATEGORY_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

type Session = { id: string; name: string; isCentral: boolean };

/* แฮชรหัสผ่านด้วย SHA-256 ฝั่ง client ก่อนส่งไปเทียบ/บันทึกใน Supabase
   หมายเหตุด้านความปลอดภัย: นี่เป็นการป้องกันแบบพื้นฐาน (ไม่มี salt, ไม่มี backend function)
   เหมาะกับระบบภายในองค์กรที่ความเสี่ยงต่ำ หากต้องการความปลอดภัยสูงขึ้นควรย้ายการตรวจสอบ
   รหัสผ่านไปทำที่ Supabase Edge Function หรือใช้ Supabase Auth แทน */
async function sha256Hex(text: string) {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/* =========================================================
   หน้าจอล็อกอิน / เลือกผู้ใช้
   ========================================================= */
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
        // ยังไม่มี record ของคนนี้ในตาราง -> สร้างให้อัตโนมัติ (ยังไม่มีรหัสผ่าน)
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800">ระบบคลังยา</h1>
          <p className="text-gray-500 mt-1">กรุณาเลือกชื่อเจ้าหน้าที่เพื่อเข้าสู่ระบบ</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-4">
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
          <Users size={18} /> {centralBusy ? "กำลังเข้าสู่ระบบ..." : `เข้าสู่ระบบด้วย${CENTRAL_ACCOUNT_NAME} (ไม่ต้องล็อกอิน)`}
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
                      className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
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
                        className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                        value={password2}
                        onChange={(e) => setPassword2(e.target.value)}
                      />
                    </div>
                  )}
                  {error && <p className="text-red-600 text-sm">{error}</p>}
                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full bg-blue-600 text-white p-2.5 rounded-lg font-medium disabled:opacity-60"
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

/* =========================================================
   หน้าจัดการรหัสผ่านเจ้าหน้าที่ (เฉพาะบัญชีส่วนกลางเท่านั้น)
   - ตั้ง/รีเซ็ตรหัสผ่านให้เจ้าหน้าที่แต่ละคนได้ โดยไม่ต้องรู้รหัสเดิม
   ========================================================= */
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
        <div className="flex justify-between items-center p-6 border-b bg-gray-50">
          <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800">
            <ShieldCheck size={22} className="text-gray-500" /> จัดการรหัสผ่านเจ้าหน้าที่
          </h2>
          <button onClick={onClose}><X size={24} className="text-gray-400" /></button>
        </div>

        <div className="p-6 overflow-y-auto space-y-2">
          {loading ? (
            <div className="text-center text-gray-500 py-8">กำลังโหลด...</div>
          ) : loadError ? (
            <div className="text-center text-red-600 py-8">{loadError}</div>
          ) : (
            STAFF_LIST.map((name) => {
              const row = rows[name];
              const hasPassword = !!row?.password_hash;
              return (
                <div key={name} className="flex items-center justify-between border border-gray-100 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <User size={16} className="text-gray-400" />
                    <span className="font-medium text-gray-800">{name}</span>
                    {hasPassword ? (
                      <span className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                        <CheckCircle2 size={12} /> ตั้งรหัสผ่านแล้ว
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                        <CircleDashed size={12} /> ยังไม่ได้ตั้งรหัส
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => openResetForm(name)}
                    className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800 px-3 py-1.5 rounded-lg hover:bg-blue-50"
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
                  className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">ยืนยันรหัสผ่านใหม่</label>
                <input
                  type="password"
                  required
                  className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                  value={newPassword2}
                  onChange={(e) => setNewPassword2(e.target.value)}
                />
              </div>
              {formError && <p className="text-red-600 text-sm">{formError}</p>}
              <button
                type="submit"
                disabled={busy}
                className="w-full bg-blue-600 text-white p-2.5 rounded-lg font-medium disabled:opacity-60"
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

/* =========================================================
   หน้าคลังยาเดิม (โค้ดตั้งต้น) — ปรับให้รับ session/onLogout
   และแสดงชื่อผู้ใช้ที่ล็อกอินอยู่ พร้อมปุ่มออกจากระบบ
   ========================================================= */
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

  const [stockExpDate, setStockExpDate] = useState("");
  const [stockPackSize, setStockPackSize] = useState("100");
  const [stockUnitName, setStockUnitName] = useState("'s");
  const [selectedLotId, setSelectedLotId] = useState("");

  const [inputMode, setInputMode] = useState<'base' | 'pack'>('base');
  const [inputAmount, setInputAmount] = useState("");
  const [inputPackCount, setInputPackCount] = useState("");

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

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">ระบบคลังยา (ระบบจัดล็อต EXP)</h1>
            <p className="text-gray-500 mt-1">Lot & Expiry Date Management</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium text-gray-700 flex items-center gap-1 justify-end">
                <User size={14} className="text-gray-400" /> {session.name}
              </div>
              {session.isCentral && <div className="text-xs text-gray-400">บัญชีส่วนกลาง</div>}
            </div>
            <button onClick={openAddMedModal} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
              <Plus size={20} /> เพิ่มรายการยาใหม่
            </button>
            {session.isCentral && (
              <button
                onClick={() => setIsAdminModalOpen(true)}
                title="จัดการรหัสผ่านเจ้าหน้าที่"
                className="p-2.5 bg-gray-100 text-gray-500 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors"
              >
                <ShieldCheck size={18} />
              </button>
            )}
            <button onClick={onLogout} title="ออกจากระบบ" className="p-2.5 bg-gray-100 text-gray-500 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors">
              <LogOut size={18} />
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
          <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-gray-500">
            <LayoutGrid size={16} /> หมวดหมู่ตู้ยา
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                selectedCategory === "all" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
              }`}
            >
              ทั้งหมด
            </button>
            {CATEGORY_IDS.map((id) => (
              <div
                key={id}
                className={`flex items-center gap-1 rounded-lg border transition-colors ${
                  selectedCategory === id ? "bg-blue-600 border-blue-600" : "bg-white border-gray-200 hover:border-blue-300"
                }`}
              >
                <button
                  onClick={() => setSelectedCategory(id)}
                  className={`pl-3 pr-1.5 py-1.5 text-sm font-medium ${selectedCategory === id ? "text-white" : "text-gray-600"}`}
                >
                  {categories[id] || `ตู้ยา ${id}`}
                </button>
                <button
                  onClick={() => { setEditingCategoryId(id); setCategoryNameInput(categories[id] || `ตู้ยา ${id}`); }}
                  title="แก้ไขชื่อหมวดหมู่"
                  className={`p-1.5 mr-1 rounded-md ${selectedCategory === id ? "text-white/80 hover:text-white hover:bg-white/10" : "text-gray-400 hover:text-blue-600 hover:bg-blue-50"}`}
                >
                  <Edit size={12} />
                </button>
              </div>
            ))}
          </div>

          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหาด้วยชื่อยา, รหัส HosXP หรือบาร์โค้ด..."
              className="w-full border rounded-lg pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="p-4 font-semibold text-gray-600">จัดการ</th>
                  <th className="p-4 font-semibold text-gray-600 text-center">QR Code</th>
                  <th className="p-4 font-semibold text-gray-600">รหัส/ชื่อยา</th>
                  <th className="p-4 font-semibold text-gray-600">คงเหลือ (แยกตาม EXP)</th>
                  <th className="p-4 font-semibold text-gray-600 text-center">รับเข้า/ตัดจ่าย</th>
                </tr>
              </thead>
              <tbody>
                {loading ? <tr><td colSpan={5} className="p-8 text-center text-gray-500">กำลังโหลด...</td></tr> :
                 filteredMedicines.length === 0 ? <tr><td colSpan={5} className="p-8 text-center text-gray-500">ไม่พบรายการยาที่ตรงกับเงื่อนไข</td></tr> :
                 filteredMedicines.map((med) => {
                   const activeLots = (med.medicine_lots || [])
                      .filter((l: any) => l.current_stock > 0)
                      .sort((a: any, b: any) => new Date(a.exp_date).getTime() - new Date(b.exp_date).getTime());

                   return (
                    <tr key={med.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="p-4">
                        <div className="flex gap-2">
                          <button onClick={() => openEditMedModal(med)} className="p-2 bg-gray-100 text-gray-600 rounded hover:bg-blue-100 hover:text-blue-600"><Edit size={16} /></button>
                          <button onClick={() => handleDeleteMed(med.id)} className="p-2 bg-gray-100 text-gray-600 rounded hover:bg-red-100 hover:text-red-600"><Trash2 size={16} /></button>
                        </div>
                      </td>
                      
                      <td className="p-4 text-center">
                        <div className="flex flex-col items-center justify-center p-2 bg-white rounded-lg border border-gray-200 shadow-sm mx-auto w-fit">
                          <QRCodeSVG 
                            value={`${typeof window !== 'undefined' ? window.location.origin : ''}/medicine/${med.id}`} 
                            size={64} 
                          />
                          <button 
                            onClick={() => window.print()} 
                            className="mt-2 px-2 py-1 bg-blue-50 text-blue-600 text-xs font-semibold rounded hover:bg-blue-100 transition-colors"
                          >
                            พิมพ์ QR
                          </button>
                        </div>
                      </td>

                      <td className="p-4">
                        <div
                          onClick={() => openHistoryModal(med)}
                          className="font-bold text-gray-800 text-lg cursor-pointer hover:text-blue-600 hover:underline w-fit"
                          title="ดูประวัติรับเข้า/ตัดจ่าย"
                        >
                          {med.name}
                        </div>
                        <div className="text-sm text-gray-500">บาร์โค้ด: {med.barcode || "-"}</div>
                        <div className="text-xs text-gray-400">ตู้ยา: {categories[Number(med.cabinet_category)] || med.cabinet_category || "-"}</div>
                      </td>

                      <td className="p-4">
                        {activeLots.length === 0 ? (
                          <span className="text-red-500 font-bold px-3 py-1 bg-red-50 rounded-lg">สต็อกหมด</span>
                        ) : (
                          <div className="flex flex-col gap-2">
                            {activeLots.map((lot: any) => {
                              const fullPacks = Math.floor(lot.current_stock / lot.pack_size);
                              const remainder = lot.current_stock % lot.pack_size;
                              return (
                                <div key={lot.id} className="flex flex-col bg-white border border-gray-200 p-2 rounded-lg shadow-sm w-fit">
                                  <span className="text-xs font-semibold text-rose-600 flex items-center gap-1 mb-1">
                                    <CalendarDays size={12} /> EXP: {lot.exp_date}
                                  </span>
                                  <div className="flex items-baseline gap-1 text-sm">
                                    <span className="font-bold text-emerald-700 text-base">{fullPacks}</span>
                                    <span className="text-gray-400 text-xs">x</span>
                                    <span className="text-gray-700 font-medium">{lot.pack_size}</span>
                                    {remainder > 0 && <span className="text-amber-600 font-bold ml-1">...เศษ {remainder}</span>}
                                    <span className="text-gray-600 text-xs ml-1">{lot.unit_name}</span>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </td>

                      <td className="p-4 text-center">
                        <div className="flex justify-center gap-2">
                          <button onClick={() => openStockModal(med, 'in')} className="p-3 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 shadow-sm" title="รับเข้า"><PackagePlus size={20} /></button>
                          <button onClick={() => openStockModal(med, 'out')} className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 shadow-sm" title="ตัดจ่าย"><PackageMinus size={20} /></button>
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
            <div className="bg-white rounded-xl shadow-lg w-full max-w-lg overflow-hidden">
              <div className="flex justify-between items-center p-6 border-b">
                <h2 className="text-xl font-bold">{isEditing ? 'แก้ไขข้อมูลยา' : 'เพิ่มรายการยาใหม่ (Master)'}</h2>
                <button onClick={() => setIsMedModalOpen(false)}><X size={24} className="text-gray-400" /></button>
              </div>
              <form onSubmit={handleSaveMedicine} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">ชื่อยา *</label>
                    <input type="text" required className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500" value={medFormData.name} onChange={(e) => setMedFormData({ ...medFormData, name: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">บาร์โค้ด</label>
                    <input type="text" className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500" value={medFormData.barcode} onChange={(e) => setMedFormData({ ...medFormData, barcode: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium mb-1">รหัส HosXP</label><input type="text" className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500" value={medFormData.hosxp_icode} onChange={(e) => setMedFormData({ ...medFormData, hosxp_icode: e.target.value })} /></div>
                  <div><label className="block text-sm font-medium mb-1">หมวดหมู่ตู้ยา</label><select className="w-full border rounded-lg p-2.5 bg-white" value={medFormData.cabinet_category} onChange={(e) => setMedFormData({ ...medFormData, cabinet_category: e.target.value })}>{CATEGORY_IDS.map(num => <option key={num} value={num.toString()}>{categories[num] || `ตู้ยา ${num}`}</option>)}</select></div>
                </div>
                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setIsMedModalOpen(false)} className="flex-1 border p-2.5 rounded-lg font-medium">ยกเลิก</button>
                  <button type="submit" className="flex-1 bg-blue-600 text-white p-2.5 rounded-lg font-medium">{isEditing ? 'บันทึกการแก้ไข' : 'บันทึกยาใหม่'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal รับเข้า/ตัดจ่าย */}
        {isStockModalOpen && selectedMed && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
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

        {/* Modal จัดการรหัสผ่านเจ้าหน้าที่ (เฉพาะบัญชีส่วนกลาง) */}
        {isAdminModalOpen && session.isCentral && (
          <AdminPasswordManager onClose={() => setIsAdminModalOpen(false)} />
        )}

        {/* Modal แก้ไขชื่อหมวดหมู่ตู้ยา */}
        {editingCategoryId !== null && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-sm overflow-hidden">
              <div className="flex justify-between items-center p-5 border-b bg-blue-50 border-blue-100">
                <h2 className="text-lg font-bold flex items-center gap-2 text-blue-900">
                  <Tag size={18} /> แก้ไขชื่อหมวดหมู่ตู้ยา {editingCategoryId}
                </h2>
                <button onClick={() => { setEditingCategoryId(null); setCategoryNameInput(""); }}>
                  <X size={22} className="text-gray-400" />
                </button>
              </div>
              <form onSubmit={handleRenameCategory} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">ชื่อหมวดหมู่</label>
                  <input
                    type="text"
                    required
                    autoFocus
                    className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                    value={categoryNameInput}
                    onChange={(e) => setCategoryNameInput(e.target.value)}
                  />
                </div>
                <div className="pt-2 flex gap-3">
                  <button type="button" onClick={() => { setEditingCategoryId(null); setCategoryNameInput(""); }} className="flex-1 border p-2.5 rounded-lg font-medium">ยกเลิก</button>
                  <button type="submit" disabled={categoryBusy} className="flex-1 flex items-center justify-center gap-1 bg-blue-600 text-white p-2.5 rounded-lg font-medium disabled:opacity-60">
                    <Check size={16} /> {categoryBusy ? "กำลังบันทึก..." : "บันทึก"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal ประวัติรับเข้า/ตัดจ่าย */}
        {isHistoryModalOpen && historyMed && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-lg overflow-hidden max-h-[85vh] flex flex-col">
              <div className="flex justify-between items-center p-6 border-b bg-gray-50">
                <h2 className="text-lg font-bold flex items-center gap-2 text-gray-800">
                  <History size={20} className="text-gray-500" /> ประวัติ: {historyMed.name}
                </h2>
                <button onClick={() => { setIsHistoryModalOpen(false); setHistoryMed(null); setHistoryRows([]); }}>
                  <X size={24} className="text-gray-400" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-2">
                {historyLoading ? (
                  <div className="text-center text-gray-500 py-8">กำลังโหลด...</div>
                ) : historyRows.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">ยังไม่มีประวัติการรับเข้า/ตัดจ่าย</div>
                ) : (
                  historyRows.map((row: any) => (
                    <div key={row.id} className="flex items-start justify-between border border-gray-100 rounded-lg p-3">
                      <div className="flex items-start gap-3">
                        {row.action === 'in' ? (
                          <PackagePlus size={18} className="text-emerald-600 mt-0.5" />
                        ) : (
                          <PackageMinus size={18} className="text-red-600 mt-0.5" />
                        )}
                        <div>
                          <div className={`text-sm font-bold ${row.action === 'in' ? 'text-emerald-700' : 'text-red-700'}`}>
                            {row.action === 'in' ? 'รับเข้า' : 'ตัดจ่าย'} {row.amount} หน่วย
                          </div>
                          <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                            <CalendarDays size={11} /> EXP ล็อต: {row.exp_date || "-"}
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">{formatHistoryDate(row.created_at)}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-full shrink-0">
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

/* =========================================================
   Component หลักที่ export — ตรวจ session ก่อนตัดสินใจว่าจะ
   แสดงหน้า Login หรือหน้าคลังยา และเก็บ session ไว้ใน
   localStorage เพื่อให้ "จำไว้จนกว่าจะออกจากระบบ"
   ========================================================= */
export default function StockCardPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [checkedSession, setCheckedSession] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) setSession(JSON.parse(raw));
    } catch {
      // ignore parse error, treat as ไม่ได้ล็อกอิน
    }
    setCheckedSession(true);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
  };

  if (!checkedSession) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">กำลังโหลด...</div>;
  }

  if (!session) {
    return <LoginScreen onLogin={setSession} />;
  }

  return <StockCardApp session={session} onLogout={handleLogout} />;
}