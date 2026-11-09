"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Clock,
  Cpu,
  FileText,
  Fingerprint,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Server,
} from "lucide-react";

export const navItems = [
  {
    href: "/",
    label: "ড্যাশবোর্ড",
    subLabel: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/attendees",
    label: "উপস্থিতি",
    subLabel: "Attendance",
    icon: Clock,
  },
  {
    href: "/users",
    label: "ব্যবহারকারী",
    subLabel: "Users & Staff",
    icon: Users,
  },
  {
    href: "/devices",
    label: "টার্মিনাল ডিভাইস",
    subLabel: "Biometric Hardware",
    icon: Cpu,
  },
  {
    href: "/footprints",
    label: "পদচিহ্ন (লগ)",
    subLabel: "Audit Trail",
    icon: FileText,
  },
];

export function Sidebar({ className = "" }: { className?: string }) {
  const pathname = usePathname();

  return (
    <aside
      className={`w-72 bg-white dark:bg-card border-r border-slate-100 dark:border-border flex flex-col justify-between p-6 shrink-0 h-screen sticky top-0 ${className}`}
    >
      <div className="space-y-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group px-2">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-violet-600 to-purple-500 flex items-center justify-center text-white shadow-md shadow-purple-500/25 group-hover:scale-105 transition-transform">
            <Fingerprint className="h-6 w-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="font-extrabold text-2xl tracking-tight text-slate-900 dark:text-foreground flex items-center gap-1.5 font-sans">
              UGV <span className="text-primary font-black">FAS</span>
            </div>
            <p className="text-[11px] text-muted-foreground font-medium -mt-1 tracking-wide">
              Smart Biometric System
            </p>
          </div>
        </Link>

        {/* Navigation list */}
        <nav className="space-y-1.5">
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-3 mb-2">
            প্রধান মেনু
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? "bg-primary/10 text-primary dark:bg-primary/20 shadow-sm shadow-primary/5"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-foreground hover:bg-slate-50 dark:hover:bg-accent/40"
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={`p-2 rounded-xl transition-colors ${
                      isActive
                        ? "bg-primary text-white shadow-sm shadow-primary/20"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-primary/10 group-hover:text-primary"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="leading-tight">{item.label}</div>
                    <div className="text-[11px] text-muted-foreground font-normal leading-tight">
                      {item.subLabel}
                    </div>
                  </div>
                </div>

                <ChevronRight
                  className={`h-4 w-4 transition-transform duration-200 ${
                    isActive
                      ? "text-primary translate-x-0 opacity-100"
                      : "text-slate-300 dark:text-slate-600 -translate-x-1 opacity-0 group-hover:opacity-100 group-hover:translate-x-0"
                  }`}
                />
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Promo / System Info Card */}
      <div className="space-y-4">
        <div className="relative overflow-hidden rounded-3xl p-5 bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 text-white shadow-xl shadow-purple-500/20">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none" />
          
          <div className="flex items-center gap-2 mb-2">
            <div className="h-7 w-7 rounded-lg bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="text-[11px] font-bold tracking-wider uppercase text-purple-200">
              UGV FAS v2.0
            </span>
          </div>

          <h4 className="font-bold text-sm leading-snug text-white">
            ক্লাউড বায়োমেট্রিক সার্ভার
          </h4>
          <p className="text-xs text-purple-100/80 mt-1 mb-3.5">
            রাস্পবেরি পাই ও ESP32 রিয়েলটাইম হার্ডওয়্যার সংযুক্ত।
          </p>

          <div className="flex items-center justify-between bg-black/20 backdrop-blur-md rounded-xl px-3 py-2 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              সক্রিয়
            </span>
            <span className="text-purple-200 text-[11px]">192.168.0.106</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
