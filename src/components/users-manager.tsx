"use client";

import { useState } from "react";
import { createUserAction, toggleUserStatusAction, queueFingerprintEnrollmentAction } from "@/lib/actions/users";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { EnrollFingerDialog } from "@/components/enroll-finger-dialog";
import { UserPlus, Fingerprint, Power, Check, X } from "lucide-react";
import { toast } from "sonner";

export function UsersManager({
  users,
  devices,
}: {
  users: any[];
  devices: any[];
}) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [enrollTarget, setEnrollTarget] = useState<{ id: number; name: string } | null>(null);
  const [isPending, setIsPending] = useState(false);

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
    await queueFingerprintEnrollmentAction(user.id, 1);
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
          <DialogTrigger className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2 cursor-pointer">
            <UserPlus className="h-4 w-4" />
            নতুন ব্যবহারকারী যোগ করুন
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>নতুন সদস্য যোগ করুন</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateUser} className="space-y-4 pt-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">পুরো নাম *</label>
                <Input name="name" placeholder="যেমন: ড. মোঃ জাহিদ হাসান" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">ফোন নম্বর *</label>
                  <Input name="phone" placeholder="017xxxxxxxx" required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">ইমেল</label>
                  <Input type="email" name="email" placeholder="zahid@ugv.edu.bd" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">বায়োমেট্রিক ডিভাইস নির্বাচন করুন</label>
                <select
                  name="deviceId"
                  className="w-full border rounded-md p-2 bg-background text-sm"
                  defaultValue={devices[0]?.id || 1}
                >
                  {devices.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.device_name} ({d.placed_on})
                    </option>
                  ))}
                </select>
              </div>

              <div className="border rounded-md p-4 space-y-3 bg-muted/20">
                <div className="text-sm font-semibold">অনুমতি ও এক্সেস কন্ট্রোল</div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" name="see_all_presence" defaultChecked />
                    সকল উপস্থিতি দেখতে পারবে
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" name="see_users" defaultChecked />
                    ব্যবহারকারীদের দেখতে পারবে
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" name="add_user" />
                    নতুন ইউজার তৈরি করতে পারবে
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" name="see_all_logs" />
                    অডিট লগ দেখতে পারবে
                  </label>
                </div>
              </div>

              <DialogFooter>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "সংরক্ষণ হচ্ছে..." : "যোগ করুন এবং আঙুলের ছাপ নিন"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border bg-card overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-16 font-bold">আইডি</TableHead>
              <TableHead className="font-bold">নাম ও পদবী</TableHead>
              <TableHead className="font-bold">যোগাযোগ</TableHead>
              <TableHead className="font-bold text-center">স্ট্যাটাস</TableHead>
              <TableHead className="font-bold">পারমিশন</TableHead>
              <TableHead className="text-right font-bold">অ্যাকশন</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id} className="hover:bg-muted/40 transition-colors">
                <TableCell className="font-mono font-semibold text-xs">#{u.id}</TableCell>
                <TableCell>
                  <div className="font-medium">{u.name}</div>
                  <div className="text-xs text-muted-foreground">নিবন্ধনের তারিখ: {new Date(u.created_at).toLocaleDateString()}</div>
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
                <TableCell className="text-right space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleStartEnrollment(u)}
                    className="h-8 gap-1.5 text-xs"
                    title="নতুন ফিঙ্গারপ্রিন্ট রেকর্ড করুন"
                  >
                    <Fingerprint className="h-3.5 w-3.5 text-primary" />
                    ফিঙ্গারপ্রিন্ট
                  </Button>
                  <Button
                    variant={u.status === "ACTIVE" ? "destructive" : "secondary"}
                    size="sm"
                    onClick={() => handleToggleStatus(u)}
                    className="h-8 text-xs"
                  >
                    <Power className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {enrollTarget && (
        <EnrollFingerDialog
          userId={enrollTarget.id}
          userName={enrollTarget.name}
          open={Boolean(enrollTarget)}
          onOpenChange={(open) => {
            if (!open) setEnrollTarget(null);
          }}
        />
      )}
    </div>
  );
}

