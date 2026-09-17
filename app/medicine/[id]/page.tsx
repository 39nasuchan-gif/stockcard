import { redirect } from "next/navigation";

export default function MedicineRedirect({ params }: { params: { id: string } }) {
  const resolvedParams = params;
  const medId = resolvedParams?.id;

  // ถ้าไม่มีรหัสยา หรือรหัสเป็น undefined ให้เด้งกลับหน้าแรก
  if (!medId || medId === "undefined") {
    redirect("/");
  }

  // ส่งต่อรหัสยาเดิม ไปเปิดที่หน้าหลัก (ระบบหน้าหลักของคุณรองรับการสแกนนี้อยู่แล้ว)
  redirect(`/?id=${medId}`);
}