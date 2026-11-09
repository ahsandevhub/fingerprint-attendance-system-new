import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId = Number(body.user_id || body.id);
    const templateData = String(body.template || "").trim();
    const deviceID = Number(body.deviceID || body.deviceId || 1);

    // A valid FPM10A template is exactly 512 bytes (1024 hex chars) and must not
    // contain UART packet headers (EF01FFFFFFFF), which indicate a broken extraction.
    if (
      !userId ||
      !/^[0-9A-Fa-f]{1024}$/.test(templateData) ||
      templateData.toUpperCase().includes("EF01FFFFFFFF")
    ) {
      return NextResponse.json(
        { success: false, error: "Invalid user_id or malformed 512-byte template" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // 1. Verify user exists
    const { data: user, error: userError } = await supabase
      .from("profiles")
      .select("id, name")
      .eq("id", userId)
      .maybeSingle();

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: "User profile not found" },
        { status: 404 }
      );
    }

    // 2. Insert or update template in PostgreSQL
    const { data: existingTemplate } = await supabase
      .from("fingerprint_templates")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (existingTemplate) {
      await supabase
        .from("fingerprint_templates")
        .update({
          template_data: templateData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingTemplate.id);
    } else {
      await supabase.from("fingerprint_templates").insert({
        user_id: userId,
        template_data: templateData,
        finger_index: 1,
      });
    }

    // 3. Mark enrollment queue as COMPLETED
    const nowIso = new Date().toISOString();
    await supabase
      .from("enrollment_queue")
      .update({
        status: "COMPLETED",
        current_message: `সফলভাবে ${user.name} এর টেমপ্লেট ডাটাবেজে সংরক্ষিত হয়েছে!`,
        updated_at: nowIso,
      })
      .eq("user_id", userId);

    // 4. Log footprint and touch device
    const clientIp = (req.headers.get("x-forwarded-for") || "127.0.0.1")
      .split(",")[0]
      .trim()
      .replace(/^::ffff:/, "");

    await Promise.all([
      supabase.from("footprints").insert({
        user_id: userId,
        type: "FINGERPRINT_DEVICE",
        details: {
          action: "ENROLL_TEMPLATE_SERVER",
          name: user.name,
          templateLength: templateData.length,
          deviceId: deviceID,
        },
        ip: clientIp,
        user_agent: req.headers.get("user-agent") || "ESP32",
      }),
      supabase
        .from("devices")
        .update({ last_seen_at: nowIso, ip_address: clientIp })
        .eq("id", deviceID),
    ]);

    return NextResponse.json({
      success: true,
      user_id: user.id,
      name: user.name,
      message: "Template successfully enrolled in server database",
    });
  } catch (err: any) {
    console.error("Error in /api/enroll-template:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

