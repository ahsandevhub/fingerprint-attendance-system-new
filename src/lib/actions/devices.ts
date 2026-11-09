"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

export async function addDeviceAction(formData: FormData) {
  const device_name = formData.get("device_name") as string;
  const mac_address = formData.get("mac_address") as string;
  const placed_on = formData.get("placed_on") as string;

  if (!device_name || !mac_address) {
    return { error: "টার্মিনালের নাম ও ম্যাক অ্যাড্রেস আবশ্যক।" };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let adminProfileId = 1;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();
    if (profile) adminProfileId = profile.id;
  }

  const adminClient = createAdminClient();

  const { data: device, error } = await adminClient
    .from("devices")
    .insert({
      device_name,
      mac_address: mac_address.trim().toUpperCase(),
      placed_on: placed_on || "Main Entrance",
      added_by: adminProfileId,
    })
    .select("id")
    .single();

  if (error || !device) {
    return { error: error?.message || "ডিভাইস যোগ করতে ব্যর্থ হয়েছে।" };
  }

  // Log footprint
  const reqHeaders = await headers();
  await adminClient.from("footprints").insert({
    user_id: adminProfileId,
    type: "FINGERPRINT_DEVICE",
    details: { action: "ADD_DEVICE", device_name, mac_address, deviceId: device.id },
    ip: reqHeaders.get("x-forwarded-for") || "127.0.0.1",
    user_agent: reqHeaders.get("user-agent") || "Browser",
  });

  revalidatePath("/devices");
  return { success: true, deviceId: device.id };
}

export async function deleteDeviceAction(deviceId: number) {
  const adminClient = createAdminClient();
  await adminClient.from("devices").delete().eq("id", deviceId);
  revalidatePath("/devices");
  return { success: true };
}

export async function pingDeviceAction(deviceId: number, ipAddress: string) {
  if (!ipAddress) return { isOnline: false };

  const cleanIp = ipAddress.trim().replace(/^::ffff:/, "");

  try {
    const res = await fetch(`http://${cleanIp}/`, {
      signal: AbortSignal.timeout(1500),
      cache: "no-store",
    });

    if (res.ok || res.status < 400) {
      const adminClient = createAdminClient();
      const nowIso = new Date().toISOString();
      await adminClient
        .from("devices")
        .update({ last_seen_at: nowIso, ip_address: cleanIp })
        .eq("id", deviceId);

      return { isOnline: true, lastSeenAt: nowIso };
    }
  } catch (err) {
    // Unreachable or powered off
  }

  return { isOnline: false };
}


