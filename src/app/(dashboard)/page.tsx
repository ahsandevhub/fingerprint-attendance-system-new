import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  GraduationCap,
  Users,
  Clock,
  Cpu,
  FileText,
  ArrowUpRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Fingerprint,
  Radio,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  const [
    { count: totalUsers },
    { count: presentToday },
    { count: totalDevices },
    { count: totalLogs },
    { data: recentAttendees },
    { data: devices },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("attendees").select("*", { count: "exact", head: true }).eq("att_date", today),
    supabase.from("devices").select("*", { count: "exact", head: true }),
    supabase.from("footprints").select("*", { count: "exact", head: true }),
    supabase
      .from("attendees")
      .select("*, profiles(name, phone)")
      .order("id", { ascending: false })
      .limit(5),
    supabase.from("devices").select("*").limit(3),
  ]);

  const cards = [
    {
      title: "মোট ব্যবহারকারী",
      subTitle: "Students & Staff",
      value: totalUsers ?? 0,
      icon: GraduationCap,
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-50 dark:bg-purple-950/50",
      accent: "from-purple-500/10 to-transparent",
      href: "/users",
    },
    {
      title: "আজকের উপস্থিতি",
      subTitle: "Today's Attendance",
      value: presentToday ?? 0,
      icon: Users,
      color: "text-sky-600 dark:text-sky-400",
      bg: "bg-sky-50 dark:bg-sky-950/50",
      accent: "from-sky-500/10 to-transparent",
      href: "/attendees",
    },
    {
      title: "টার্মিনাল রিডার",
      subTitle: "Active Devices",
      value: totalDevices ?? 0,
      icon: Cpu,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-950/50",
      accent: "from-amber-500/10 to-transparent",
      href: "/devices",
    },
    {
      title: "কার্যক্রম লগ",
      subTitle: "Audit Logs",
      value: totalLogs ?? 0,
      icon: FileText,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950/50",
      accent: "from-emerald-500/10 to-transparent",
      href: "/footprints",
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-300">
      {/* Schoooli-Style Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-foreground font-sans">
            Welcome.
          </h1>
          <p className="text-slate-500 dark:text-muted-foreground text-sm sm:text-base mt-1.5 font-medium">
            Navigate the future of university biometric attendance with UGV FAS.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/attendees">
            <Button className="rounded-md px-4 py-2 h-auto text-sm font-semibold shadow-sm bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
              <Clock className="h-4 w-4" />
              আজকের উপস্থিতি দেখুন
            </Button>
          </Link>
        </div>
      </div>

      {/* Top 4 Stat Cards in Schoooli Design */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Link key={c.title} href={c.href} className="group">
              <Card className="rounded-md border border-slate-100 dark:border-border/80 bg-white dark:bg-card shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden relative p-5 h-full flex flex-col justify-between">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-500 dark:text-muted-foreground">
                      {c.subTitle}
                    </span>
                    <div className="text-3xl font-extrabold text-slate-900 dark:text-foreground mt-1 tracking-tight">
                      {c.value}
                    </div>
                  </div>
                  <div
                    className={`h-11 w-11 rounded-md ${c.bg} flex items-center justify-center ${c.color} shadow-sm group-hover:scale-105 transition-transform`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-50 dark:border-border/40 flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-400">
                  <span>{c.title}</span>
                  <ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Middle Row: Quick Action Banners & Hardware Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Banner 1: Terminal Status */}
        <div className="lg:col-span-2 rounded-md bg-white dark:bg-card border border-slate-100 dark:border-border/80 p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-foreground">
                বায়োমেট্রিক টার্মিনাল স্ট্যাটাস
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                ESP32 এবং FPM10A অপটিক্যাল সেন্সর লাইভ মনিটরিং
              </p>
            </div>
            <Link
              href="/devices"
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
            >
              সকল টার্মিনাল <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-2">
            {devices && devices.length > 0 ? (
              devices.map((d: any) => (
                <div
                  key={d.id}
                  className="rounded-md border border-slate-100 dark:border-border p-4 bg-slate-50/50 dark:bg-muted/20 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-md bg-purple-50 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center">
                      <Cpu className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-slate-900 dark:text-foreground">
                        {d.device_name}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {d.ip_address || "192.168.0.101"}
                      </div>
                    </div>
                  </div>
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                  </span>
                </div>
              ))
            ) : (
              <div className="col-span-2 text-center py-6 text-sm text-muted-foreground">
                কোন টার্মিনাল যুক্ত নেই।
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-border flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
              সার্ভার রিয়েলটাইম DSP ম্যাচিং ইঞ্জিন সচল
            </span>
            <Link href="/devices">
              <Button
                variant="outline"
                size="sm"
                className="rounded-md text-xs font-semibold border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-50"
              >
                ডিভাইস পরিচালনা করুন
              </Button>
            </Link>
          </div>
        </div>

        {/* Banner 2: Quick Enrollment Card in Purple Gradient */}
        <div className="rounded-md bg-gradient-to-br from-violet-600 to-indigo-700 text-white p-6 shadow-md shadow-purple-500/20 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />

          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-7 w-7 rounded-md bg-white/20 backdrop-blur-md flex items-center justify-center">
                <Fingerprint className="h-4 w-4" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-purple-200">
                দ্রুত নিবন্ধন
              </span>
            </div>

            <h3 className="text-xl font-extrabold text-white leading-tight">
              নতুন আঙুলের ছাপ নিবন্ধন করুন
            </h3>
            <p className="text-xs text-purple-100/80 mt-2">
              নতুন শিক্ষার্থী বা অনুষদ সদস্যের বায়োমেট্রিক আঙুলের ছাপ সার্ভারে সংরক্ষণ করতে ইউজার পেইজে যান।
            </p>
          </div>

          <div className="mt-6">
            <Link href="/users">
              <Button className="w-full bg-white text-violet-700 hover:bg-purple-50 font-bold rounded-md h-10 text-sm shadow-sm">
                ইউজার তালিকায় যান
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom Row: Recent Attendance Records */}
      <div className="rounded-md bg-white dark:bg-card border border-slate-100 dark:border-border/80 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-foreground">
              সর্বশেষ উপস্থিতি পাঞ্চ রেকর্ড
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              টার্মিনালে ফিঙ্গারপ্রিন্ট দিয়ে নিবন্ধিত সর্বশেষ উপস্থিতি
            </p>
          </div>
          <Link
            href="/attendees"
            className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
          >
            সম্পূর্ণ উপস্থিতি তালিকা <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-border text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                <th className="pb-3 font-bold">নাম</th>
                <th className="pb-3 font-bold">তারিখ</th>
                <th className="pb-3 font-bold">সময়</th>
                <th className="pb-3 font-bold text-center">স্ট্যাটাস</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-border">
              {recentAttendees && recentAttendees.length > 0 ? (
                recentAttendees.map((a: any) => (
                  <tr key={a.id} className="hover:bg-slate-50/50 dark:hover:bg-muted/20 transition-colors">
                    <td className="py-3.5 font-medium flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
                        {(a.profiles?.name || "U").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-foreground">
                          {a.profiles?.name || `ব্যবহারকারী #${a.user_id}`}
                        </div>
                        <div className="text-[11px] text-muted-foreground font-mono">
                          {a.profiles?.phone || `আইডি: #${a.user_id}`}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 text-xs text-slate-600 dark:text-slate-400 font-mono">
                      {a.att_date}
                    </td>
                    <td className="py-3.5 text-xs font-mono font-medium text-slate-900 dark:text-foreground">
                      {a.att_time}
                    </td>
                    <td className="py-3.5 text-center">
                      <Badge
                        variant="outline"
                        className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 text-[11px] font-semibold gap-1"
                      >
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                        উপস্থিত
                      </Badge>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-muted-foreground text-sm">
                    আজকের কোন উপস্থিতি পাওয়া যায়নি।
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
