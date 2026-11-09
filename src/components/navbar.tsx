"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import {
  Home,
  Clock,
  Users,
  Cpu,
  FileText,
  LogOut,
  Fingerprint
} from "lucide-react";

const navItems = [
  { href: "/", label: "হোম", icon: Home },
  { href: "/attendees", label: "উপস্থিতি", icon: Clock },
  { href: "/users", label: "ব্যবহারকারীরা", icon: Users },
  { href: "/devices", label: "ডিভাইসসমূহ", icon: Cpu },
  { href: "/footprints", label: "পদচিহ্ন (লগ)", icon: FileText },
];

export function Navbar({ userName, userId }: { userName: string; userId: number }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between mx-auto px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-primary tracking-tight">
            <Fingerprint className="h-6 w-6" />
            UGV FAS
          </Link>
          <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-md transition-colors ${isActive
                    ? "bg-primary text-primary-foreground font-medium shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right text-xs hidden sm:block">
            <div className="font-semibold">{userName}</div>
            <div className="text-muted-foreground font-mono">আইডি: #{userId}</div>
          </div>
          <form action={logoutAction}>
            <Button variant="outline" size="sm" type="submit" className="gap-1.5 text-destructive hover:bg-destructive/10">
              <LogOut className="h-4 w-4" />
              লগআউট
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}

