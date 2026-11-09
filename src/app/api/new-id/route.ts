import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = createAdminClient();

    // Check for pending enrollment jobs
    const { data: job, error } = await supabase
      .from("enrollment_queue")
      .select("id, device_id, user_id")
      .eq("status", "PENDING")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error || !job) {
      return NextResponse.json({ deviceId: 0, id: 0 });
    }

    // Mark as SCANNING so it's not grabbed repeatedly
    await supabase
      .from("enrollment_queue")
      .update({
        status: "SCANNING",
        current_message: "Hardware requested scan...",
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.id);

    return NextResponse.json({
      deviceId: job.device_id,
      id: job.user_id,
    });
  } catch (err: any) {
    console.error("Error in /api/new-id:", err);
    return NextResponse.json({ deviceId: 0, id: 0 });
  }
}

