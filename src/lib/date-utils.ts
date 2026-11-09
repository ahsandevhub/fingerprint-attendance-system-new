/**
 * Utility functions for handling Bangladesh Standard Time (BST / GMT+6, Asia/Dhaka)
 */

export const DHAKA_TIMEZONE = "Asia/Dhaka";

/**
 * Returns the current date (or provided date) formatted as YYYY-MM-DD in Asia/Dhaka timezone.
 */
export function getDhakaDate(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: DHAKA_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * Formats an ISO timestamp or Date object into 12-hour time (hh:mm:ss AM/PM) in Asia/Dhaka.
 */
export function formatDhakaTime(isoStr?: string | Date | null): string {
  if (!isoStr) return "--:--:--";
  try {
    const d = typeof isoStr === "string" ? new Date(isoStr) : isoStr;
    if (isNaN(d.getTime())) return "--:--:--";
    return d.toLocaleTimeString("en-US", {
      timeZone: DHAKA_TIMEZONE,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  } catch {
    return "--:--:--";
  }
}

/**
 * Formats an ISO timestamp or Date object into human-readable date & time in Asia/Dhaka.
 */
export function formatDhakaDateTime(isoStr?: string | Date | null): string {
  if (!isoStr) return "-";
  try {
    const d = typeof isoStr === "string" ? new Date(isoStr) : isoStr;
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleString("en-US", {
      timeZone: DHAKA_TIMEZONE,
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  } catch {
    return "-";
  }
}
