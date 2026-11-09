import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Clock, Users, Cpu, FileText, ArrowUpRight } from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  const [
    { count: totalUsers },
    { count: presentToday },
    { count: totalDevices },
    { count: totalLogs },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("attendees").select("*", { count: "exact", head: true }).eq("att_date", today),
    supabase.from("devices").select("*", { count: "exact", head: true }),
    supabase.from("footprints").select("*", { count: "exact", head: true }),
  ]);

  const cards = [
    {
      title: "আজকের উপস্থিতি",
      value: presentToday ?? 0,
      description: "জন আজ বায়োমেট্রিক পাঞ্চ করেছেন",
      href: "/attendees",
      icon: Clock,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-950/40",
    },
    {
      title: "মোট ব্যবহারকারী",
      value: totalUsers ?? 0,
      description: "সিস্টেমে নিবন্ধিত অনুষদ ও স্টাফ",
      href: "/users",
      icon: Users,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950/40",
    },
    {
      title: "সক্রিয় টার্মিনাল",
      value: totalDevices ?? 0,
      description: "ফিঙ্গারপ্রিন্ট রিডার ডিভাইস",
      href: "/devices",
      icon: Cpu,
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-50 dark:bg-purple-950/40",
    },
    {
      title: "পদচিহ্ন (অডিট লগ)",
      value: totalLogs ?? 0,
      description: "সিস্টেম নিরাপত্তা ও কাজের ইতিহাস",
      href: "/footprints",
      icon: FileText,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-950/40",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">ফিঙ্গারপ্রিন্ট এটেন্ডেন্স সিস্টেম - স্বাগতম</h1>
        <p className="text-muted-foreground mt-1">
          বিশ্ববিদ্যালয় অনুষদ ও কর্মচারীদের উপস্থিতি পর্যবেক্ষণের জন্য আধুনিক নিয়ন্ত্রণ কক্ষ
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.title} href={card.href}>
              <Card className="hover:shadow-md hover:border-primary/50 transition-all cursor-pointer h-full group">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
                  <div className={`p-2 rounded-lg ${card.bg}`}>
                    <Icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold flex items-center justify-between">
                    <span>{card.value}</span>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors opacity-0 group-hover:opacity-100" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{card.description}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

