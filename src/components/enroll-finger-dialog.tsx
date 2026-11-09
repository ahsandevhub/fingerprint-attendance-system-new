"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Fingerprint, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export function EnrollFingerDialog({
  userId,
  userName,
  open,
  onOpenChange,
  onComplete,
}: {
  userId: number;
  userName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}) {
  const [message, setMessage] = useState("টার্মিনালের উত্তরের জন্য অপেক্ষা করা হচ্ছে...");
  const [progress, setProgress] = useState(15);
  const [status, setStatus] = useState<"WAITING" | "SCANNING" | "COMPLETED" | "FAILED">("WAITING");
  const supabase = createClient();

  useEffect(() => {
    if (!open || !userId) return;

    setStatus("WAITING");
    setProgress(15);
    setMessage("ESP32 টার্মিনালে আঙুল রাখার সংকেত পাঠানো হয়েছে...");

    // Subscribe to live enrollment queue updates for this user
    const channel = supabase
      .channel(`enroll-progress-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "enrollment_queue",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as any;
          setMessage(row.current_message || "");

          const msgLower = (row.current_message || "").toLowerCase();

          if (msgLower.includes("1st scan") || msgLower.includes("finger found")) {
            setStatus("SCANNING");
            setProgress(35);
          } else if (msgLower.includes("remove")) {
            setStatus("SCANNING");
            setProgress(60);
          } else if (msgLower.includes("2nd scan") || msgLower.includes("same finger")) {
            setStatus("SCANNING");
            setProgress(85);
          } else if (row.status === "COMPLETED" || msgLower.includes("stored") || msgLower.includes("id:")) {
            setStatus("COMPLETED");
            setProgress(100);
            if (onComplete) onComplete();
          } else if (row.status === "FAILED" || msgLower.includes("fail") || msgLower.includes("error")) {
            setStatus("FAILED");
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [open, userId, supabase, onComplete]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Fingerprint className="h-5 w-5 text-primary" />
            বায়োমেট্রিক আঙুলের ছাপ নিবন্ধন
          </DialogTitle>
          <DialogDescription>
            {userName} (আইডি #{userId})-এর জন্য টার্মিনাল নির্দেশনা অনুসরণ করুন
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center space-y-6 py-6">
          <div className="relative flex items-center justify-center">
            {status === "COMPLETED" ? (
              <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 animate-in zoom-in">
                <CheckCircle2 className="h-10 w-10" />
              </div>
            ) : status === "FAILED" ? (
              <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center text-destructive animate-in zoom-in">
                <AlertCircle className="h-10 w-10" />
              </div>
            ) : (
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary relative">
                <Fingerprint className="h-10 w-10 animate-pulse" />
                <Loader2 className="h-24 w-24 absolute animate-spin text-primary/40 -inset-2" />
              </div>
            )}
          </div>

          <div className="text-center space-y-1">
            <div className="font-semibold text-base">{message}</div>
            <div className="text-xs text-muted-foreground">
              {status === "COMPLETED"
                ? "সফলভাবে সার্ভার ডাটাবেজে বায়োমেট্রিক টেমপ্লেট সংরক্ষিত হয়েছে!"
                : "টার্মিনালের LCD স্ক্রিন পর্যবেক্ষণ করুন এবং পর পর ২ বার একই আঙুল রাখুন"}
            </div>
          </div>

          <div className="w-full space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground font-mono">
              <span>প্রগ্রেস</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
