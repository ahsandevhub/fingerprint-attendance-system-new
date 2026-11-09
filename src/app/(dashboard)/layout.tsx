import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/navbar";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get current user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, name, status")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  const userName = profile?.name || user.user_metadata?.name || "ইউজার";
  const userId = profile?.id || 1;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/50 dark:bg-slate-950">
      <Navbar userName={userName} userId={userId} />
      <main className="flex-1 container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}

