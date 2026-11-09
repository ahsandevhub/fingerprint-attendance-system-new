import { NextResponse } from "next/server";

/**
 * DEPRECATED: server-side template comparison was unreliable.
 * The FPM10A template format is proprietary, so a homemade matcher gave
 * false matches for any finger. Matching is now done by the sensor's own
 * algorithm on the ESP32 (templates are fetched from /api/templates).
 *
 * This endpoint always rejects, so outdated firmware fails safely
 * instead of logging attendance for the wrong person.
 */
export async function POST() {
  return NextResponse.json(
    {
      matched: false,
      res: 1004,
      msg: "Server-side matching disabled. Please update the terminal firmware.",
    },
    { status: 410 }
  );
}
