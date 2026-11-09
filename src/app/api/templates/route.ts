import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createHash } from "crypto";

export const dynamic = "force-dynamic";

/**
 * GET /api/templates?v=<cachedVersion>
 *
 * Serves the fingerprint templates stored in PostgreSQL to the ESP32 terminal.
 * The terminal keeps them only in RAM and lets the FPM10A's own matching
 * algorithm compare the live scan against each one (1:1 in sensor RAM).
 * Nothing is written to the sensor's flash.
 *
 * Plain-text response (easy to stream on a microcontroller):
 *   V:<version>
 *   <user_id>:<1024 hex chars>
 *   ...
 *   END
 * If the device's cached version is current, the response is:
 *   V:<version>
 *   UNCHANGED
 *   END
 */
export async function GET(req: NextRequest) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("fingerprint_templates")
    .select("user_id, template_data, updated_at, profiles!inner(status)")
    .eq("profiles.status", "ACTIVE")
    .order("user_id", { ascending: true });

  if (error) {
    return new NextResponse(`ERROR:${error.message}\nEND\n`, {
      status: 500,
      headers: { "Content-Type": "text/plain" },
    });
  }

  // Only serve well-formed 512-byte templates
  const rows = (data || []).filter((r) => /^[0-9A-Fa-f]{1024}$/.test(r.template_data));

  const version = createHash("sha1")
    .update(rows.map((r) => `${r.user_id}:${r.updated_at}`).join("|"))
    .digest("hex")
    .slice(0, 12);

  const cached = req.nextUrl.searchParams.get("v");
  let body = `V:${version}\n`;

  if (cached === version) {
    body += "UNCHANGED\n";
  } else {
    for (const r of rows) {
      body += `${r.user_id}:${r.template_data.toUpperCase()}\n`;
    }
  }
  body += "END\n";

  return new NextResponse(body, {
    headers: { "Content-Type": "text/plain", "Cache-Control": "no-store" },
  });
}

