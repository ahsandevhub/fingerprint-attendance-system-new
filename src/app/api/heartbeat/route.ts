import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const deviceID = Number(body.deviceID || body.deviceId || 0);
    const rawMac = String(body.mac || "").trim().toUpperCase();
    const cleanMac = rawMac.replace(/[:-]/g, "");
    const ip = String(body.ip || req.headers.get("x-forwarded-for") || "").trim();

    const supabase = createAdminClient();
    const nowIso = new Date().toISOString();

    let targetDeviceId: number | null = null;

    // 1. Try matching by deviceID
    if (deviceID > 0) {
      const { data } = await supabase
        .from("devices")
        .select("id")
        .eq("id", deviceID)
        .maybeSingle();
      if (data) targetDeviceId = data.id;
    }

    // 2. Try matching by normalized MAC address (ignoring colons and dashes)
    if (!targetDeviceId && cleanMac) {
      const { data: allDevices } = await supabase
        .from("devices")
        .select("id, mac_address");
      if (allDevices) {
        const found = allDevices.find(
          (d) => (d.mac_address || "").replace(/[:-]/g, "").toUpperCase() === cleanMac
        );
        if (found) targetDeviceId = found.id;
      }
    }

    // 3. Fallback: if only 1 device is registered
    if (!targetDeviceId) {
      const { data: allDevices } = await supabase.from("devices").select("id");
      if (allDevices && allDevices.length === 1) {
        targetDeviceId = allDevices[0].id;
      }
    }

    if (targetDeviceId) {
      await supabase
        .from("devices")
        .update({
          last_seen_at: nowIso,
          ...(ip ? { ip_address: ip } : {}),
        })
        .eq("id", targetDeviceId);
    }

    return NextResponse.json({
      success: true,
      matchedDeviceId: targetDeviceId,
      serverTime: nowIso,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const deviceID = Number(searchParams.get("deviceID") || 0);
  const nowIso = new Date().toISOString();

  const supabase = createAdminClient();
  let targetId = deviceID > 0 ? deviceID : null;

  if (!targetId) {
    const { data: allDevices } = await supabase.from("devices").select("id");
    if (allDevices && allDevices.length === 1) {
      targetId = allDevices[0].id;
    }
  }

  if (targetId) {
    await supabase
      .from("devices")
      .update({ last_seen_at: nowIso })
      .eq("id", targetId);
  }

  return NextResponse.json({ success: true, serverTime: nowIso });
}
