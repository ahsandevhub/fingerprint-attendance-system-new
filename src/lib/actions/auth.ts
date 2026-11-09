"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

export async function loginAction(formData: FormData) {
  const identifier = formData.get("identifier") as string; // phone or email
  const password = formData.get("password") as string;

  if (!identifier || !password) {
    return { error: "ফোন/ইমেল এবং পাসওয়ার্ড প্রদান করুন।" };
  }

  const supabase = await createClient();
  const adminClient = createAdminClient();

  // Find user by phone or email in profiles
  const { data: profile, error: profileErr } = await adminClient
    .from("profiles")
    .select("id, name, phone, email, status, auth_user_id")
    .or(`phone.eq.${identifier},email.eq.${identifier}`)
    .maybeSingle();

  if (profileErr || !profile) {
    return { error: "কোন ব্যবহারকারী পাওয়া যায়নি।" };
  }

  if (profile.status !== "ACTIVE") {
    return { error: "আপনার অ্যাকাউন্টটি বর্তমানে নিষ্ক্রিয় (Inactive)। অ্যাডমিনের সাথে যোগাযোগ করুন।" };
  }

  // Handle Supabase Auth: If the user doesn't have an auth.users record yet, provision one automatically with email
  const userEmail = profile.email || `${profile.phone}@ugv.edu.bd`;

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: userEmail,
    password: password,
  });

  if (authError) {
    // If auth record doesn't exist yet, create it with this initial password and link it
    const { data: createdUser, error: createError } = await adminClient.auth.admin.createUser({
      email: userEmail,
      password: password,
      email_confirm: true,
      user_metadata: { profile_id: profile.id, name: profile.name },
    });

    if (createError) {
      // If error is invalid credentials
      return { error: "ভুল পাসওয়ার্ড বা তথ্য।" };
    }

    // Link profile to auth user
    await adminClient
      .from("profiles")
      .update({ auth_user_id: createdUser.user.id })
      .eq("id", profile.id);

    // Sign in now
    const { error: secondTryError } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password: password,
    });

    if (secondTryError) {
      return { error: "লগইন ব্যর্থ হয়েছে।" };
    }
  }

  // Record login footprint
  const reqHeaders = await headers();
  await adminClient.from("footprints").insert({
    user_id: profile.id,
    type: "LOGIN_SUCCESS",
    details: { name: profile.name, phone: profile.phone },
    ip: reqHeaders.get("x-forwarded-for") || "127.0.0.1",
    user_agent: reqHeaders.get("user-agent") || "Browser",
  });

  redirect("/");
}

export async function logoutAction() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const adminClient = createAdminClient();
    const reqHeaders = await headers();
    await adminClient.from("footprints").insert({
      type: "LOGOUT_SUCCESS",
      details: { email: user.email },
      ip: reqHeaders.get("x-forwarded-for") || "127.0.0.1",
      user_agent: reqHeaders.get("user-agent") || "Browser",
    });
  }

  await supabase.auth.signOut();
  redirect("/login");
}

