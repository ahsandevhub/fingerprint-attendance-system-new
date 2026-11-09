import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { matchTemplates } from "@/lib/biometrics/matcher";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const probeTemplate = String(body.template || "").trim();
    const deviceID = Number(body.deviceID || body.deviceId || 1);

    if (!probeTemplate || probeTemplate.length < 64) {
      return NextResponse.json(
        { matched: false, res: 1004, error: "Invalid template data" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // 1. Fetch all registered fingerprint templates joined with user profiles
    const { data: registeredTemplates, error: dbError } = await supabase
      .from("fingerprint_templates")
      .select("id, user_id, template_data, profiles(id, name, status)");

    if (dbError || !registeredTemplates || registeredTemplates.length === 0) {
      return NextResponse.json({
        matched: false,
        res: 1004,
        msg: "No registered templates in database",
        score: 0,
      });
    }

    // 2. Perform 1:N biometric comparison across all candidates
    let bestMatch: {
      userId: number;
      name: string;
      status: string;
      score: number;
    } | null = null;

    for (const item of registeredTemplates) {
      const profile = item.profiles as any;
      if (!profile || profile.status !== "ACTIVE") continue;

      const result = matchTemplates(probeTemplate, item.template_data);

      if (!bestMatch || result.score > bestMatch.score) {
        bestMatch = {
          userId: profile.id,
          name: profile.name,
          status: profile.status,
          score: result.score,
        };
      }
    }

    // Check if best match passes biometric confidence threshold (>= 35%)
    if (!bestMatch || bestMatch.score < 35) {
      return NextResponse.json({
        matched: false,
        res: 1004,
        msg: "Fingerprint not recognized",
        score: bestMatch ? bestMatch.score : 0,
      });
    }

    // 3. Matched! Now compute attendance record for today (in-time / out-time)
    const today = new Date().toISOString().split("T")[0];
    const nowIso = new Date().toISOString();

    const { data: existingRecord } = await supabase
      .from("attendees")
      .select("id, in_time")
      .eq("user_id", bestMatch.userId)
      .eq("att_date", today)
      .maybeSingle();

    if (!existingRecord) {
      // First swipe of the day -> Check-in
      await supabase.from("attendees").insert({
        user_id: bestMatch.userId,
        att_date: today,
        in_time: nowIso,
        out_time: null,
        device_id: deviceID,
      });
    } else {
      // Subsequent swipe -> Check-out update
      await supabase
        .from("attendees")
        .update({
          out_time: nowIso,
          device_id: deviceID,
        })
        .eq("id", existingRecord.id);
    }

    // 4. Log audit footprint and touch device last_seen_at
    const clientIp = (req.headers.get("x-forwarded-for") || "127.0.0.1")
      .split(",")[0]
      .trim()
      .replace(/^::ffff:/, "");

    await Promise.all([
      supabase.from("footprints").insert({
        user_id: bestMatch.userId,
        type: "FINGER_ATTENDENCE",
        details: {
          id: bestMatch.userId,
          name: bestMatch.name,
          deviceID,
          matchScore: bestMatch.score,
          time: nowIso,
          mode: "SERVER_BIOMETRIC_MATCH",
        },
        ip: clientIp,
        user_agent: req.headers.get("user-agent") || "ESP32-HTTPClient",
      }),
      supabase
        .from("devices")
        .update({ last_seen_at: nowIso, ip_address: clientIp })
        .eq("id", deviceID),
    ]);

    // 5. Return success (code 1001) matching ESP32 firmware expectations
    return NextResponse.json({
      matched: true,
      res: 1001,
      id: String(bestMatch.userId),
      name: bestMatch.name,
      score: bestMatch.score,
    });
  } catch (err: any) {
    console.error("Error in /api/match-fingerprint:", err);
    return NextResponse.json({ matched: false, res: 1004, error: err.message }, { status: 500 });
  }
}

