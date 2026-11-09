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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-950 dark:to-slate-900 p-4">
      <Card className="w-full max-w-md shadow-xl border-slate-200 dark:border-slate-800">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-2">
            <Fingerprint className="w-6 h-6" />
          </div>
          <CardTitle className="text-2xl font-bold">ইউজিভি এফএএস লগইন</CardTitle>
          <CardDescription>
            অনুষদ ও কর্মীদের ফিঙ্গারপ্রিন্ট উপস্থিতি পোর্টাল
          </CardDescription>
        </CardHeader>
        <form action={formAction}>
          <CardContent className="space-y-4">
            {state?.error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-md font-medium text-center">
                {state.error}
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">ফোন নম্বর বা ইমেল</label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  name="identifier"
                  placeholder="01700000000"
                  className="pl-9"
                  defaultValue="01700000000"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">পাসওয়ার্ড</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="password"
                  name="password"
                  placeholder="••••••••"
                  className="pl-9"
                  required
                />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "লগইন হচ্ছে..." : "লগইন করুন"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

