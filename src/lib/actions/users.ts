"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

export async function createUserAction(formData: FormData) {
  const name = formData.get("name") as string;
  const phone = formData.get("phone") as string;
  const email = formData.get("email") as string;
  const deviceId = Number(formData.get("deviceId") || 1);

  const add_user = formData.get("add_user") === "on";
  const see_users = formData.get("see_users") === "on";
  const see_all_logs = formData.get("see_all_logs") === "on";
  const add_device = formData.get("add_device") === "on";
  const update_password = formData.get("update_password") === "on";
  const see_all_presence = formData.get("see_all_presence") === "on";

  if (!name || !phone) {
    return { error: "নাম ও ফোন নম্বর আবশ্যক।" };
  }

  const supabase = await createClient();
  const adminClient = createAdminClient();

  // Insert profile
  const { data: profile, error } = await adminClient
    .from("profiles")
    .insert({
      name,
      phone,
      email: email || null,
      status: "ACTIVE",
      add_user,
      see_users,
      see_all_logs,
      add_device,
      update_password,
      see_all_presence,
    })
    .select("id")
    .single();

  if (error || !profile) {
    return { error: error?.message || "ব্যবহারকারী যোগ করতে ব্যর্থ হয়েছে।" };
  }

  // Queue hardware biometric enrollment for this user ID on the selected device
  await adminClient.from("enrollment_queue").insert({
    device_id: deviceId,
    user_id: profile.id,
    status: "PENDING",
    current_message: "বায়োমেট্রিক স্ক্যানারের সংকেতের জন্য অপেক্ষারত...",
  });

  // Log footprint
  const reqHeaders = await headers();
  await adminClient.from("footprints").insert({
    user_id: profile.id,
    type: "ADD_USER",
    details: { name, phone, deviceId, profileId: profile.id },
    ip: reqHeaders.get("x-forwarded-for") || "127.0.0.1",
    user_agent: reqHeaders.get("user-agent") || "Browser",
  });

  revalidatePath("/users");
  return { success: true, userId: profile.id };
}

export async function toggleUserStatusAction(userId: number, currentStatus: string) {
  const newStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
  const adminClient = createAdminClient();

  await adminClient
    .from("profiles")
    .update({ status: newStatus })
    .eq("id", userId);

  const reqHeaders = await headers();
  await adminClient.from("footprints").insert({
    user_id: userId,
    type: "USER_STATUS",
    details: { oldStatus: currentStatus, newStatus },
    ip: reqHeaders.get("x-forwarded-for") || "127.0.0.1",
    user_agent: reqHeaders.get("user-agent") || "Browser",
  });

  revalidatePath("/users");
  return { success: true };
}

export async function queueFingerprintEnrollmentAction(userId: number, deviceId: number = 1) {
  const adminClient = createAdminClient();

  await adminClient.from("enrollment_queue").insert({
    device_id: deviceId,
    user_id: userId,
    status: "PENDING",
    current_message: "বায়োমেট্রিক ডিভাইসে আঙুল রাখার অনুরোধ পাঠানো হয়েছে...",
  });

  revalidatePath("/users");
  return { success: true };
}

