import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
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
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Fixed Left Sidebar on desktop */}
      <Sidebar className="hidden lg:flex" />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar userName={userName} userId={userId} />
        
        <main className="flex-1 p-6 sm:p-8 lg:p-10 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
