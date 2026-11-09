"use client";

import { useActionState } from "react";
import { loginAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Fingerprint, Lock, Phone } from "lucide-react";

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(
    async (prevState: any, formData: FormData) => {
      const res = await loginAction(formData);
      return res || prevState;
    },
    null
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50/60 via-slate-50 to-purple-50/40 dark:from-slate-950 dark:to-slate-900 p-4 sm:p-6">
      <Card className="w-full max-w-md shadow-2xl shadow-purple-500/10 border border-slate-100 dark:border-border/80 bg-white dark:bg-card rounded-3xl overflow-hidden p-2 sm:p-4">
        <CardHeader className="text-center space-y-2 pb-6">
          <div className="mx-auto h-16 w-16 bg-gradient-to-tr from-violet-600 to-purple-500 text-white rounded-2xl flex items-center justify-center mb-1 shadow-lg shadow-purple-500/25">
            <Fingerprint className="h-9 w-9 stroke-[2.2]" />
          </div>
          <CardTitle className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-foreground tracking-tight font-sans">
            ইউজিভি এফএএস লগইন
          </CardTitle>
          <CardDescription className="text-sm font-medium text-slate-500 dark:text-muted-foreground">
            অনুষদ ও কর্মীদের বায়োমেট্রিক উপস্থিতি পোর্টাল
          </CardDescription>
        </CardHeader>

        <form action={formAction}>
          <CardContent className="space-y-5 px-6 sm:px-8">
            {state?.error && (
              <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-sm rounded-2xl font-semibold text-center animate-in fade-in zoom-in-95">
                {state.error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                ফোন নম্বর বা ইমেল
              </label>
              <div className="relative flex items-center">
                <Phone className="absolute left-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                <Input
                  name="identifier"
                  placeholder="01700000000"
                  className="pl-10 h-11 rounded-2xl border-slate-200 dark:border-border bg-slate-50/60 dark:bg-muted/30 focus-visible:bg-white dark:focus-visible:bg-card text-sm font-medium"
                  defaultValue="01700000000"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                পাসওয়ার্ড
              </label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                <Input
                  type="password"
                  name="password"
                  placeholder="••••••••"
                  className="pl-10 h-11 rounded-2xl border-slate-200 dark:border-border bg-slate-50/60 dark:bg-muted/30 focus-visible:bg-white dark:focus-visible:bg-card text-sm font-medium"
                  required
                />
              </div>
            </div>
          </CardContent>

          <CardFooter className="px-6 sm:px-8 pt-4 pb-6">
            <Button
              type="submit"
              className="w-full h-11 rounded-2xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/25 text-sm transition-all"
              disabled={isPending}
            >
              {isPending ? "লগইন হচ্ছে..." : "লগইন করুন"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
