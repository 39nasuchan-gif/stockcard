import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    // 1. ดึงค่าจาก Environment Variables
    const CHANNEL_ACCESS_TOKEN = Deno.env.get('HxkuCqWAiAXXtFoiP7uAfaJs92Q4vslxjkmgzn+x7A312/c+/jWMSPbNDrJPMCWNy8bdPiZHj3cZMC2jUWwg9xtrYHg4JE1x77cmduyPeQAvFIr3okMfRHVMOSXvE9Hsdi9hFUm0OF61OoecIhvLXAdB04t89/1O/w1cDnyilFU=') ?? '';
    const TARGET_LINE_ID = Deno.env.get('C8f6c4a8932ea08e82b6ed282d2ae383b') ?? '';
    const SUPABASE_URL = Deno.env.get('https://supabase.com/dashboard/project/wamnjeohtjkfgjatjbib/settings/api-keys') ?? '';
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('sb_publishable__qYndhkhr0VVu_QfxMapFg_2M1ineNE') ?? '';

    if (!CHANNEL_ACCESS_TOKEN || !TARGET_LINE_ID) {
       throw new Error("Missing LINE credentials");
    }

    // 2. เชื่อมต่อ Supabase
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 3. ดึงข้อมูลยาและล็อตทั้งหมด
    const { data: medicines, error } = await supabaseClient
      .from('medicines')
      .select('*, medicine_lots(*)')

    if (error) throw error;

    const today = new Date();
    today.setHours(0,0,0,0);
    let alertItems: string[] = [];

    // 4. ค้นหายาที่ตรงเงื่อนไข
    medicines.forEach((med: any) => {
      (med.medicine_lots || []).forEach((lot: any) => {
        if (lot.current_stock > 0 && lot.exp_date) {
          const expDate = new Date(lot.exp_date);
          expDate.setHours(0,0,0,0);
          const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

          // กรองแจ้งเตือนเฉพาะยาที่ใกล้หมดอายุ
          if ([30, 15, 7, 2, 0].includes(diffDays)) {
            const unit = lot.unit_name === "'s" ? "เม็ด" : lot.unit_name;
            const statusText = diffDays === 0 ? 'หมดอายุวันนี้!' : `อีก ${diffDays} วัน`;
            alertItems.push(`💊 ${med.name}\n- EXP: ${lot.exp_date} (${statusText})\n- คงเหลือ: ${lot.current_stock} ${unit}\n-------------------`);
          }
        }
      });
    });

    // 5. ถ้ามียาใกล้หมดอายุ ให้ยิงเข้า LINE
    if (alertItems.length > 0) {
      const messageText = `🚨 สรุปรายการยาใกล้หมดอายุประจำวัน 🚨\n\n` + alertItems.join('\n');

      const lineRes = await fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`
        },
        body: JSON.stringify({
          to: TARGET_LINE_ID,
          messages: [{ type: 'text', text: messageText }]
        })
      });

      const lineData = await lineRes.json();
      return new Response(JSON.stringify({ success: true, lineData }), { headers: { "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: true, message: "วันนี้ไม่มียาใกล้หมดอายุในเกณฑ์ที่กำหนด" }), { headers: { "Content-Type": "application/json" } });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
})