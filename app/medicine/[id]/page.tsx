import { redirect } from "next/navigation";

export default function OldQrRedirect({ params }: { params: { id: string } }) {
  const medId = params?.id;

  // ถ้าไม่มีรหัสยา หรือรหัสเป็น undefined ให้เด้งกลับหน้าแรกปกติ
  if (!medId || medId === "undefined") {
    redirect("/");
  }

  // ส่งพุ่งไปที่หน้าหลัก พร้อมแนบ ?id= ตามหลักการของ QR Code ใหม่ทันที
  redirect(`/?id=${medId}`);
}