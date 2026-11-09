"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { createUserAction, toggleUserStatusAction, queueFingerprintEnrollmentAction } from "@/lib/actions/users";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { EnrollFingerDialog } from "@/components/enroll-finger-dialog";
import { UserPlus, Fingerprint, Power, CheckCircle2, AlertCircle, RefreshCw, Plus } from "lucide-react";
import { toast } from "sonner";

export function UsersManager({
  users,
  devices,
  initialTemplates = [],
}: {
  users: any[];
  devices: any[];
  initialTemplates?: any[];
}) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [enrollTarget, setEnrollTarget] = useState<{ id: number; name: string } | null>(null);
  const [isPending, setIsPending] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  // Compute initial registered user IDs from initialTemplates and user join data
  const [registeredUserIds, setRegisteredUserIds] = useState<Set<number>>(() => {
    const ids = new Set<number>();
    initialTemplates.forEach((t) => {
      if (t.user_id) ids.add(t.user_id);
    });
    users.forEach((u) => {
      if (u.fingerprint_templates && u.fingerprint_templates.length > 0) {
        ids.add(u.id);
      }
    });
    return ids;
  });

  const refreshFingerprints = useCallback(async () => {
    try {
      const { data } = await supabase.from("fingerprint_templates").select("user_id");
      if (data) {
        setRegisteredUserIds(new Set(data.map((t: any) => t.user_id)));
      }
    } catch {
      // silent fallback
    }
  }, [supabase]);

  // Realtime subscription: update fingerprint status dynamically whenever enrolled/deleted
  useEffect(() => {
    const channel = supabase
      .channel("templates-live-status")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "fingerprint_templates" },
        (payload: any) => {
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const uid = payload.new?.user_id;
            if (uid) {
              setRegisteredUserIds((prev) => new Set([...prev, uid]));
            }
          } else if (payload.eventType === "DELETE") {
            const uid = payload.old?.user_id;
            if (uid) {
              setRegisteredUserIds((prev) => {
                const next = new Set(prev);
                next.delete(uid);
                return next;
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const handleCreateUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);
    const form = new FormData(e.currentTarget);
    const res = await createUserAction(form);
    setIsPending(false);

    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success("ব্যবহারকারী সফলভাবে যোগ করা হয়েছে!");
      setIsAddOpen(false);
      if (res?.userId) {
        setEnrollTarget({ id: res.userId, name: form.get("name") as string });
      }
    }
  };

  const handleToggleStatus = async (user: any) => {
    await toggleUserStatusAction(user.id, user.status);
    toast.success(`${user.name}-এর স্ট্যাটাস পরিবর্তন করা হয়েছে।`);
  };

  const handleStartEnrollment = async (user: any) => {
    const selectedDeviceId = devices[0]?.id || 1;
    await queueFingerprintEnrollmentAction(user.id, selectedDeviceId);
    setEnrollTarget({ id: user.id, name: user.name });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">ব্যবহারকারী ব্যবস্থাপনা</h1>
          <p className="text-muted-foreground text-sm mt-1">
            অনুষদ ও কর্মচারীদের তালিকা, অ্যাক্সেস নিয়ন্ত্রণ এবং আঙুলের ছাপ নিবন্ধন
          </p>
        </div>

        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-semibold transition-all bg-primary text-primary-foreground shadow-md shadow-primary/25 hover:bg-primary/90 h-11 px-5 cursor-pointer">
            <UserPlus className="h-4 w-4" />
            নতুন ব্যবহারকারী যোগ করুন
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">নতুন সদস্য যোগ করুন</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateUser} className="space-y-4 pt-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold">পুরো নাম *</label>
                <Input name="name" placeholder="যেমন: ড. মোঃ জাহিদ হাসান" required className="rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold">ফোন নম্বর *</label>
                  <Input name="phone" placeholder="017xxxxxxxx" required className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold">ইমেল</label>
                  <Input type="email" name="email" placeholder="zahid@ugv.edu.bd" className="rounded-xl" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold">বায়োমেট্রিক ডিভাইস নির্বাচন করুন</label>
                <Select
                  name="deviceId"
                  defaultValue={devices[0]?.id || 1}
                >
                  {devices.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.device_name} ({d.placed_on})
                    </option>
                  ))}
                </Select>
              </div>

              <div className="border border-slate-100 dark:border-border rounded-2xl p-4 space-y-3 bg-slate-50/60 dark:bg-muted/20">
                <div className="text-sm font-bold text-slate-800 dark:text-foreground">অনুমতি ও এক্সেস কন্ট্রোল</div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <label className="flex items-center gap-2.5 cursor-pointer font-medium select-none">
                    <Checkbox name="see_all_presence" defaultChecked />
                    সকল উপস্থিতি দেখতে পারবে
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer font-medium select-none">
                    <Checkbox name="see_users" defaultChecked />
                    ব্যবহারকারীদের দেখতে পারবে
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer font-medium select-none">
                    <Checkbox name="add_user" />
                    নতুন ইউজার তৈরি করতে পারবে
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer font-medium select-none">
                    <Checkbox name="see_all_logs" />
                    অডিট লগ দেখতে পারবে
                  </label>
                </div>
              </div>

              <DialogFooter>
                <Button type="submit" disabled={isPending} className="rounded-xl h-11 px-5 font-bold shadow-md shadow-primary/20">
                  {isPending ? "সংরক্ষণ হচ্ছে..." : "যোগ করুন এবং আঙুলের ছাপ নিন"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-3xl border border-slate-100 dark:border-border/80 bg-white dark:bg-card overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-slate-50/70 dark:bg-muted/30">
            <TableRow className="border-b border-slate-100 dark:border-border">
              <TableHead className="w-16 font-bold text-xs uppercase tracking-wider">আইডি</TableHead>
              <TableHead className="font-bold text-xs uppercase tracking-wider">নাম ও পদবী</TableHead>
              <TableHead className="font-bold text-xs uppercase tracking-wider">যোগাযোগ</TableHead>
              <TableHead className="font-bold text-xs uppercase tracking-wider text-center">স্ট্যাটাস</TableHead>
              <TableHead className="font-bold text-xs uppercase tracking-wider">পারমিশন</TableHead>
              <TableHead className="font-bold text-xs uppercase tracking-wider text-center">ফিঙ্গারপ্রিন্ট স্ট্যাটাস</TableHead>
              <TableHead className="text-right font-bold text-xs uppercase tracking-wider">অ্যাকশন</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-slate-100 dark:divide-border/60">
            {users.map((u) => {
              const isRegistered = registeredUserIds.has(u.id);

              return (
                <TableRow key={u.id} className="hover:bg-muted/40 transition-colors">
                  <TableCell className="font-mono font-semibold text-xs">#{u.id}</TableCell>
                  <TableCell>
                    <div className="font-medium">{u.name}</div>
                    <div className="text-xs text-muted-foreground">
                      নিবন্ধনের তারিখ: {new Date(u.created_at).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs font-mono">
                    <div>{u.phone}</div>
                    <div className="text-muted-foreground">{u.email || "ইমেল নেই"}</div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={u.status === "ACTIVE" ? "default" : "destructive"} className="text-xs">
                      {u.status === "ACTIVE" ? "সক্রিয়" : "নিষ্ক্রিয়"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs space-x-1">
                    {u.add_user && <Badge variant="outline" className="text-[10px]">Add User</Badge>}
                    {u.see_all_presence && <Badge variant="outline" className="text-[10px]">Presence</Badge>}
                    {u.see_all_logs && <Badge variant="outline" className="text-[10px]">Logs</Badge>}
                  </TableCell>
                  
                  {/* Fingerprint Status Badge */}
                  <TableCell className="text-center">
                    {isRegistered ? (
                      <Badge
                        variant="outline"
                        className="text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 gap-1.5 text-xs font-medium"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        নিবন্ধিত
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 gap-1.5 text-xs font-medium"
                      >
                        <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                        নিবন্ধিত নয়
                      </Badge>
                    )}
                  </TableCell>

                  {/* Actions Column with dynamic Update vs Add Fingerprint */}
                  <TableCell className="text-right space-x-2">
                    {isRegistered ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStartEnrollment(u)}
                        className="h-8 gap-1.5 text-xs text-amber-700 hover:text-amber-800 dark:text-amber-400 border-amber-300 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                        title="আঙুলের ছাপ পরিবর্তন বা পুনরায় নিবন্ধন করুন"
                      >
                        <RefreshCw className="h-3.5 w-3.5 text-amber-600" />
                        আপডেট করুন
                      </Button>
                    ) : (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleStartEnrollment(u)}
                        className="h-8 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                        title="নতুন আঙুলের ছাপ স্ক্যান করুন"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <Fingerprint className="h-3.5 w-3.5" />
                        আঙুলের ছাপ যোগ করুন
                      </Button>
                    )}

                    <Button
                      variant={u.status === "ACTIVE" ? "destructive" : "secondary"}
                      size="sm"
                      onClick={() => handleToggleStatus(u)}
                      className="h-8 text-xs"
                      title={u.status === "ACTIVE" ? "ব্যবহারকারী নিষ্ক্রিয় করুন" : "ব্যবহারকারী সক্রিয় করুন"}
                    >
                      <Power className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {enrollTarget && (
        <EnrollFingerDialog
          userId={enrollTarget.id}
          userName={enrollTarget.name}
          open={Boolean(enrollTarget)}
          onOpenChange={(open) => {
            if (!open) {
              setEnrollTarget(null);
              refreshFingerprints();
            }
          }}
          onComplete={refreshFingerprints}
        />
      )}
    </div>
  );
}
