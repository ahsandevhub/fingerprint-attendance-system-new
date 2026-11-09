import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const id = Number(body.id);
    const deviceID = Number(body.deviceID || 1);

    if (!id) {
      return NextResponse.json({ res: 1004, error: "Invalid ID" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 1. Fetch user by id
    const { data: user, error: userError } = await supabase
      .from("profiles")
      .select("id, name, status")
      .eq("id", id)
      .maybeSingle();

    if (userError || !user) {
      // res = 1003 tells ESP32 the fingerprint is unknown / can be removed
      return NextResponse.json({ res: 1003, msg: "User not found", id: String(id) });
    }

    if (user.status !== "ACTIVE") {
      // res = 1002 informs ESP32 that the account is inactive
      return NextResponse.json({
        res: 1002,
        id: String(user.id),
        name: user.name,
      });
    }

    // 2. Compute attendance record for today (YYYY-MM-DD)
    const today = new Date().toISOString().split("T")[0];
    const nowIso = new Date().toISOString();

    const { data: existingRecord } = await supabase
      .from("attendees")
      .select("id, in_time")
      .eq("user_id", id)
      .eq("att_date", today)
      .maybeSingle();

    if (!existingRecord) {
      // First swipe -> inTime check-in
      await supabase.from("attendees").insert({
        user_id: id,
        att_date: today,
        in_time: nowIso,
        out_time: null,
        device_id: deviceID,
      });
    } else {
      // Subsequent swipes -> outTime checkout update
      await supabase
        .from("attendees")
        .update({
          out_time: nowIso,
          device_id: deviceID,
        })
        .eq("id", existingRecord.id);
    }

    // 3. Log audit footprint and touch device last_seen_at
    const rawIp = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const clientIp = rawIp.split(",")[0].trim().replace(/^::ffff:/, "");
    await Promise.all([
      supabase.from("footprints").insert({
        user_id: id,
        type: "FINGER_ATTENDENCE",
        details: {
          id,
          name: user.name,
          deviceID,
          time: nowIso,
        },
        ip: clientIp,
        user_agent: req.headers.get("user-agent") || "ESP32-HTTPClient",
      }),
      supabase
        .from("devices")
        .update({ last_seen_at: nowIso, ip_address: clientIp })
        .eq("id", deviceID),
    ]);

    // 4. Return success response (code 1001) matching ESP32 firmware expectations
    return NextResponse.json({
      res: 1001,
      id: String(user.id),
      name: user.name,
    });
  } catch (err: any) {
    console.error("Error in /api/log-id:", err);
    return NextResponse.json({ res: 1004, error: err.message }, { status: 500 });
  }
}

