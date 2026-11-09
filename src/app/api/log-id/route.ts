import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDhakaDate } from "@/lib/date-utils";

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

    // 2. Compute attendance record for today in Bangladesh Time (GMT+6)
    const today = getDhakaDate();
    const nowIso = new Date().toISOString();

    const { data: existingRecord } = await supabase
      .from("attendees")
      .select("id, in_time, out_time")
      .eq("user_id", id)
      .eq("att_date", today)
      .maybeSingle();

    const rawIp = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const clientIp = rawIp.split(",")[0].trim().replace(/^::ffff:/, "");

    // Update device heartbeat and last seen
    await supabase
      .from("devices")
      .update({ last_seen_at: nowIso, ip_address: clientIp })
      .eq("id", deviceID);

    // Case A: First scan of the day -> Check-in
    if (!existingRecord) {
      await Promise.all([
        supabase.from("attendees").insert({
          user_id: id,
          att_date: today,
          in_time: nowIso,
          out_time: null,
          device_id: deviceID,
        }),
        supabase.from("footprints").insert({
          user_id: id,
          type: "FINGER_ATTENDENCE",
          details: {
            id,
            name: user.name,
            deviceID,
            action: "CHECK_IN",
            time: nowIso,
            date: today,
          },
          ip: clientIp,
          user_agent: req.headers.get("user-agent") || "ESP32-HTTPClient",
        }),
      ]);

      return NextResponse.json({
        res: 1001,
        type: "IN",
        id: String(user.id),
        name: user.name,
        msg: `In: ${user.name}`,
      });
    }

    // Case B: Second scan of the day -> Checkout
    if (!existingRecord.out_time) {
      await Promise.all([
        supabase
          .from("attendees")
          .update({
            out_time: nowIso,
            device_id: deviceID,
          })
          .eq("id", existingRecord.id),
        supabase.from("footprints").insert({
          user_id: id,
          type: "FINGER_ATTENDENCE",
          details: {
            id,
            name: user.name,
            deviceID,
            action: "CHECK_OUT",
            time: nowIso,
            date: today,
          },
          ip: clientIp,
          user_agent: req.headers.get("user-agent") || "ESP32-HTTPClient",
        }),
      ]);

      return NextResponse.json({
        res: 1001,
        type: "OUT",
        id: String(user.id),
        name: user.name,
        msg: `Out: ${user.name}`,
      });
    }

    // Case C: Third or subsequent scan on the same day -> Reject!
    // Both in_time and out_time are already recorded.
    await supabase.from("footprints").insert({
      user_id: id,
      type: "FINGER_REJECTED",
      details: {
        id,
        name: user.name,
        deviceID,
        reason: "Already checked out for today",
        time: nowIso,
        date: today,
      },
      ip: clientIp,
      user_agent: req.headers.get("user-agent") || "ESP32-HTTPClient",
    });

    return NextResponse.json({
      res: 1005,
      type: "REJECTED",
      msg: "Already checked out",
      id: String(user.id),
      name: user.name,
    });
  } catch (err: any) {
    console.error("Error in /api/log-id:", err);
    return NextResponse.json({ res: 1004, error: err.message }, { status: 500 });
  }
}

