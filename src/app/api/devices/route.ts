import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data: devices, error } = await supabase
      .from("devices")
      .select("*, profiles(name)")
      .order("id", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      devices: devices || [],
      serverTime: Date.now(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

