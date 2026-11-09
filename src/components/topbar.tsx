"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/lib/actions/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search,
  Bell,
  Menu,
  X,
  LogOut,
  Fingerprint,
  User,
  Radio,
  Sparkles,
} from "lucide-react";
import { navItems } from "@/components/sidebar";

export function Topbar({
  userName,
  userId,
}: {
  userName: string;
  userId: number;
}) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-white/80 dark:bg-card/80 backdrop-blur-xl border-b border-slate-100 dark:border-border h-20 px-6 sm:px-8 flex items-center justify-between transition-colors">
        {/* Left Section: Mobile menu toggle + Search Bar */}
        <div className="flex items-center gap-4 flex-1 max-w-md">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileOpen(true)}
            className="lg:hidden h-10 w-10 rounded-md"
            aria-label="Open Menu"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search anything here..."
              className="w-full bg-slate-50/80 dark:bg-muted/50 border-slate-200/60 dark:border-border/60 pl-10 pr-4 py-2 rounded-full text-sm focus-visible:ring-primary/20 focus-visible:bg-white dark:focus-visible:bg-card transition-all"
            />
          </div>
        </div>

        {/* Right Section: Status, Notifications, and Profile */}
        <div className="flex items-center gap-3 sm:gap-5">
          {/* Hardware Live Indicator */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
            <Radio className="h-3.5 w-3.5 animate-pulse text-emerald-600 dark:text-emerald-400" />
            <span>সিস্টেম লাইভ</span>
          </div>

          {/* Notifications Button */}
          <button
            type="button"
            className="relative h-10 w-10 rounded-full bg-slate-50 dark:bg-muted/40 hover:bg-slate-100 dark:hover:bg-muted border border-slate-200/50 dark:border-border/60 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-colors"
            title="নোটিফিকেশন"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary ring-2 ring-white dark:ring-card" />
          </button>

          {/* User Profile Card */}
          <div className="flex items-center gap-3 pl-2 sm:pl-3 border-l border-slate-200/60 dark:border-border/60">
            <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-violet-600 to-purple-500 text-white font-bold text-sm flex items-center justify-center shadow-sm">
              {userName ? userName.charAt(0).toUpperCase() : "U"}
            </div>

            <div className="hidden sm:block text-left leading-tight">
              <div className="font-bold text-sm text-slate-900 dark:text-foreground">
                {userName}
              </div>
              <div className="text-[11px] text-muted-foreground font-medium">
                Admin • #{userId}
              </div>
            </div>

            {/* Logout Form */}
            <form action={logoutAction} className="ml-1 sm:ml-2">
              <Button
                variant="ghost"
                size="icon"
                type="submit"
                className="h-9 w-9 rounded-full text-slate-400 hover:text-destructive hover:bg-destructive/10 transition-colors"
                title="লগআউট"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setIsMobileOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-72 bg-white dark:bg-card p-6 shadow-2xl flex flex-col justify-between animate-in slide-in-from-left duration-200">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <Link
                  href="/"
                  onClick={() => setIsMobileOpen(false)}
                  className="flex items-center gap-3"
                >
                  <div className="h-10 w-10 rounded-md bg-gradient-to-tr from-violet-600 to-purple-500 flex items-center justify-center text-white">
                    <Fingerprint className="h-5 w-5" />
                  </div>
                  <span className="font-bold text-xl tracking-tight">UGV FAS</span>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsMobileOpen(false)}
                  className="rounded-md"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <nav className="space-y-1.5">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsMobileOpen(false)}
                      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-md text-sm font-semibold transition-colors ${
                        isActive
                          ? "bg-primary text-white shadow-md shadow-primary/25"
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <form action={logoutAction}>
                <Button
                  variant="outline"
                  type="submit"
                  className="w-full gap-2 text-destructive border-destructive/20 hover:bg-destructive/10 rounded-md"
                >
                  <LogOut className="h-4 w-4" />
                  লগআউট
                </Button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

