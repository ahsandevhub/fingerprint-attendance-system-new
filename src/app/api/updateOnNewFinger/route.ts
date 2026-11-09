import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const id = Number(body.id);
    const msg = String(body.msg || "");
    const isDone = Boolean(body.isDone);

    const supabase = createAdminClient();

    // Update enrollment status
    await supabase
      .from("enrollment_queue")
      .update({
        current_message: msg,
        status: isDone ? "COMPLETED" : "SCANNING",
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", id);

    // If successfully done, log footprint
    if (isDone) {
      await supabase.from("footprints").insert({
        user_id: id,
        type: "FINGERPRINT_DEVICE",
        details: { message: msg, completed: true },
        ip: req.headers.get("x-forwarded-for") || "127.0.0.1",
        user_agent: req.headers.get("user-agent") || "ESP32",
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Error in /api/updateOnNewFinger:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

