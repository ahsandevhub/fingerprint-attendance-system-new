import { createClient } from "@/lib/supabase/server";
import { AttendeesTable } from "@/components/attendees-table";
import { Input } from "@/components/ui/input";
import { Calendar } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AttendeesPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  const today = new Date().toISOString().split("T")[0];
  const targetDate = date || today;

  const supabase = await createClient();

  const { data: attendees } = await supabase
    .from("attendees")
    .select("*, profiles(name, phone), devices(device_name)")
    .eq("att_date", targetDate)
    .order("in_time", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">দৈনিক বায়োমেট্রিক উপস্থিতি</h1>
          <p className="text-muted-foreground text-sm mt-1">
            ফিঙ্গারপ্রিন্ট ডিভাইসের মাধ্যমে নিবন্ধিত অনুষদ ও কর্মীদের স্বয়ংক্রিয় উপস্থিতি তালিকা
          </p>
        </div>

        <form method="GET" className="flex items-center gap-2">
          <div className="relative">
            <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              name="date"
              defaultValue={targetDate}
              className="pl-9 w-44"
              aria-label="তারিখ নির্বাচন করুন"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 transition-colors shadow-sm"
          >
            ফিল্টার
          </button>
        </form>
      </div>

      {/* Header specifically for printouts */}
      <div className="hidden print:block text-center space-y-1 mb-6">
        <h2 className="text-2xl font-bold">University of Global Village (UGV)</h2>
        <p className="text-base font-semibold">Faculty & Staff Attendance Sheet</p>
        <p className="text-sm text-muted-foreground">Date: {targetDate}</p>
      </div>

      <AttendeesTable initialData={attendees || []} selectedDate={targetDate} />
    </div>
  );
}

