"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { addDeviceAction, deleteDeviceAction, pingDeviceAction } from "@/lib/actions/devices";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Cpu, WifiOff, Plus, Trash2, MapPin, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export function DevicesManager({ devices: initialDevices }: { devices: any[] }) {
  const [devices, setDevices] = useState(initialDevices);
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [isPinging, setIsPinging] = useState(false);
  
  // High-frequency 1s clock tick so online/offline badge updates precisely in real-time
  const [currentTime, setCurrentTime] = useState(Date.now());
  const serverOffsetRef = useRef(0);

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    setDevices(initialDevices);
  }, [initialDevices]);

  // Tick every 1 second to recalculate live freshness
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now() + serverOffsetRef.current);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fast background polling every 3s to guarantee freshness even if WebSocket drops
  const fetchLiveDevices = useCallback(async () => {
    try {
      const res = await fetch("/api/devices", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (data.serverTime) {
        serverOffsetRef.current = data.serverTime - Date.now();
      }
      if (Array.isArray(data.devices)) {
        setDevices(data.devices);
      }
    } catch {
      // silent fallback
    }
  }, []);

  useEffect(() => {
    fetchLiveDevices();
    const interval = setInterval(fetchLiveDevices, 3000);
    return () => clearInterval(interval);
  }, [fetchLiveDevices]);

  // Realtime subscription for instant 0ms push notifications
  useEffect(() => {
    const channel = supabase
      .channel("devices-live-status")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "devices" },
        (payload: any) => {
          if (payload.eventType === "UPDATE") {
            setDevices((prev) =>
              prev.map((d) => (d.id === payload.new.id ? { ...d, ...payload.new } : d))
            );
          } else if (payload.eventType === "INSERT") {
            fetchLiveDevices();
          } else if (payload.eventType === "DELETE") {
            setDevices((prev) => prev.filter((d) => d.id === payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, fetchLiveDevices]);

  // Manual Ping on demand
  const handleManualPing = async () => {
    setIsPinging(true);
    try {
      await Promise.all(
        devices.map(async (d) => {
          const rawIp = d.ip_address || (d.id === 1 ? "192.168.0.101" : "");
          const ip = (rawIp || "").replace(/^::ffff:/, "").trim();
          if (!ip) return;
          const res = await pingDeviceAction(d.id, ip);
          if (res?.isOnline && res.lastSeenAt) {
            setDevices((prev) =>
              prev.map((item) => (item.id === d.id ? { ...item, last_seen_at: res.lastSeenAt } : item))
            );
          }
        })
      );
      await fetchLiveDevices();
      toast.success("ডিভাইস স্ট্যাটাস চেক সম্পন্ন হয়েছে।");
    } catch {
      toast.error("ডিভাইস স্ট্যাটাস চেক করতে সমস্যা হয়েছে।");
    } finally {
      setIsPinging(false);
    }
  };

  const handleAddDevice = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);
    const form = new FormData(e.currentTarget);
    const res = await addDeviceAction(form);
    setIsPending(false);

    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success("নতুন ডিভাইস সফলভাবে যুক্ত করা হয়েছে!");
      setIsOpen(false);
      fetchLiveDevices();
    }
  };

  const handleDeleteDevice = async (deviceId: number, name: string) => {
    if (confirm(`আপনি কি নিশ্চিত যে "${name}" ডিভাইসটি মুছে ফেলতে চান?`)) {
      await deleteDeviceAction(deviceId);
      toast.success("ডিভাইস মুছে ফেলা হয়েছে।");
      fetchLiveDevices();
    }
  };

  const getStatusBadge = (d: any) => {
    // Heartbeat sent every 10s -> offline threshold is 25s
    const diff = d.last_seen_at ? Math.max(0, currentTime - new Date(d.last_seen_at).getTime()) : Infinity;
    const isOnline = diff < 25000;

    if (isOnline) {
      const secondsAgo = Math.round(diff / 1000);
      return (
        <Badge
          variant="outline"
          className="text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 gap-1.5 text-xs font-medium"
          title={`সর্বশেষ হার্টবিট: ${secondsAgo} সেকেন্ড আগে`}
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          অনলাইন (সংযুক্ত)
        </Badge>
      );
    }

    return (
      <Badge
        variant="outline"
        className="text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 gap-1.5 text-xs"
        title={d.last_seen_at ? `সর্বশেষ দেখা গেছে: ${new Date(d.last_seen_at).toLocaleTimeString()}` : "কখনও সংযুক্ত হয়নি"}
      >
        <WifiOff className="h-3 w-3 text-rose-500" />
        অফলাইন (সংযোগ নেই)
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">ফিঙ্গারপ্রিন্ট টার্মিনাল ডিভাইসসমূহ</h1>
          <p className="text-muted-foreground text-sm mt-1">
            বিশ্ববিদ্যালয় ক্যাম্পাসে সংযুক্ত সকল ESP32 ও FPM10A বায়োমেট্রিক হার্ডওয়্যার
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualPing}
            disabled={isPinging}
            className="gap-1.5 text-xs rounded-xl h-10 px-4 font-semibold border-slate-200 dark:border-border"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isPinging ? "animate-spin" : ""}`} />
            স্ট্যাটাস রিফ্রেশ
          </Button>

          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-semibold transition-all bg-primary text-primary-foreground shadow-md shadow-primary/25 hover:bg-primary/90 h-10 px-5 cursor-pointer">
              <Plus className="h-4 w-4" />
              নতুন ডিভাইস যুক্ত করুন
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-3xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">নতুন ফিঙ্গারপ্রিন্ট টার্মিনাল কনফিগার করুন</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddDevice} className="space-y-4 pt-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold">টার্মিনালের নাম *</label>
                  <Input name="device_name" placeholder="যেমন: সিএসই ডিপার্টমেন্ট রিডার" required className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold">ম্যাক অ্যাড্রেস (MAC Address) *</label>
                  <Input name="mac_address" placeholder="যেমন: F0:24:F9:0C:4F:B4" required className="rounded-xl" />
                  <p className="text-[11px] text-muted-foreground">
                    ESP32 স্টার্টআপে সিরিয়াল মনিটরে বা LCD তে ম্যাক অ্যাড্রেস দেখায়।
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold">আইপি অ্যাড্রেস (IP Address)</label>
                  <Input name="ip_address" placeholder="যেমন: 192.168.0.101" className="rounded-xl" />
                  <p className="text-[11px] text-muted-foreground">ESP32 LCD স্ক্রিনে প্রদর্শিত IP অ্যাড্রেস লিখুন।</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold">স্থাপিত স্থান (Placement Location)</label>
                  <Input name="placed_on" placeholder="যেমন: রুম ৩০২, ৩য় তলা" className="rounded-xl" />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={isPending} className="rounded-xl font-bold h-11 px-5 shadow-md shadow-primary/20">
                    {isPending ? "যুক্ত হচ্ছে..." : "ডিভাইস সংরক্ষণ করুন"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-100 dark:border-border/80 bg-white dark:bg-card overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-20 font-bold">ডিভাইস আইডি</TableHead>
              <TableHead className="font-bold">টার্মিনালের নাম</TableHead>
              <TableHead className="font-bold">ম্যাক অ্যাড্রেস (MAC)</TableHead>
              <TableHead className="font-bold">আইপি অ্যাড্রেস</TableHead>
              <TableHead className="font-bold">স্থাপিত স্থান (Location)</TableHead>
              <TableHead className="font-bold">যুক্ত করেছেন</TableHead>
              <TableHead className="font-bold text-center">লাইভ স্ট্যাটাস</TableHead>
              <TableHead className="text-right font-bold">অ্যাকশন</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {devices?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                  বর্তমানে কোন টার্মিনাল ডিভাইস যুক্ত নেই। ওপরের বোতাম ক্লিক করে যোগ করুন।
                </TableCell>
              </TableRow>
            ) : (
              devices?.map((d) => (
                <TableRow key={d.id} className="hover:bg-muted/40 transition-colors">
                  <TableCell className="font-mono font-bold text-xs">#{d.id}</TableCell>
                  <TableCell className="font-medium flex items-center gap-2">
                    <Cpu className="h-4 w-4 text-primary" />
                    {d.device_name}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{d.mac_address}</TableCell>
                  <TableCell className="font-mono text-xs font-medium text-primary">
                    {(d.ip_address || "192.168.0.101").replace(/^::ffff:/, "")}
                  </TableCell>
                  <TableCell className="text-sm">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                      {d.placed_on}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs">{d.profiles?.name || "সিস্টেম অ্যাডমিন"}</TableCell>
                  <TableCell className="text-center">{getStatusBadge(d)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteDevice(d.id, d.device_name)}
                      className="text-destructive hover:bg-destructive/10 h-8 w-8"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
