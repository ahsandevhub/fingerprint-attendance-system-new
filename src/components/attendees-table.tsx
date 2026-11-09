"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Printer, CheckCircle2, LogIn, LogOut } from "lucide-react";

export function AttendeesTable({
  initialData,
  selectedDate,
}: {
  initialData: any[];
  selectedDate: string;
}) {
  const [data, setData] = useState(initialData);
  const supabase = createClient();

  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  useEffect(() => {
    // Listen for Realtime changes to attendees table
    const channel = supabase
      .channel("attendees-live-feed")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "attendees",
          filter: `att_date=eq.${selectedDate}`,
        },
        async () => {
          // Re-fetch data for the selected date
          const { data: refreshed } = await supabase
            .from("attendees")
            .select("*, profiles(name, phone), devices(device_name)")
            .eq("att_date", selectedDate)
            .order("in_time", { ascending: false });

          if (refreshed) {
            setData(refreshed);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDate, supabase]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center print:hidden">
        <div className="text-sm text-muted-foreground">
          মোট রেকর্ড: <span className="font-semibold text-foreground">{data.length}</span> টি
        </div>
        <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
          <Printer className="h-4 w-4" />
          উপস্থিতি শীট প্রিন্ট করুন
        </Button>
      </div>

      <div className="rounded-md border border-slate-100 dark:border-border/80 bg-white dark:bg-card overflow-hidden print:border-none shadow-sm">
        <Table>
          <TableHeader className="bg-slate-50/70 dark:bg-muted/30">
            <TableRow>
              <TableHead className="w-20 text-center font-bold">আইডি</TableHead>
              <TableHead className="font-bold">অনুষদ / কর্মীর নাম</TableHead>
              <TableHead className="font-bold">তারিখ</TableHead>
              <TableHead className="font-bold">প্রবেশের সময় (In)</TableHead>
              <TableHead className="font-bold">প্রস্থানের সময় (Out)</TableHead>
              <TableHead className="font-bold">টার্মিনাল</TableHead>
              <TableHead className="text-right font-bold print:hidden">অবস্থা</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  এই তারিখে কোন উপস্থিতির রেকর্ড নেই।
                </TableCell>
              </TableRow>
            ) : (
              data.map((row) => (
                <TableRow key={row.id} className="hover:bg-muted/40 transition-colors">
                  <TableCell className="font-mono text-center font-semibold text-xs">
                    #{row.user_id}
                  </TableCell>
                  <TableCell className="font-medium">
                    <div>{row.profiles?.name ?? `User #${row.user_id}`}</div>
                    <div className="text-xs text-muted-foreground font-mono">{row.profiles?.phone}</div>
                  </TableCell>
                  <TableCell className="text-xs">{row.att_date}</TableCell>
                  <TableCell className="text-xs font-mono font-medium text-emerald-600 dark:text-emerald-400">
                    <span className="flex items-center gap-1">
                      <LogIn className="h-3 w-3" />
                      {new Date(row.in_time).toLocaleTimeString()}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs font-mono font-medium">
                    {row.out_time ? (
                      <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                        <LogOut className="h-3 w-3" />
                        {new Date(row.out_time).toLocaleTimeString()}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">--:--:--</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {row.devices?.device_name ?? "মেইন গেট টার্মিনাল"}
                  </TableCell>
                  <TableCell className="text-right print:hidden">
                    <Badge variant={row.out_time ? "outline" : "default"} className="text-xs">
                      {row.out_time ? "প্রস্থান সম্পন্ন" : "উপস্থিত"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

