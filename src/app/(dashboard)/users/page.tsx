import { createClient } from "@/lib/supabase/server";
import { UsersManager } from "@/components/users-manager";

export default async function UsersPage() {
  const supabase = await createClient();

  const [{ data: users }, { data: devices }] = await Promise.all([
    supabase.from("profiles").select("*").order("id", { ascending: true }),
    supabase.from("devices").select("*").order("id", { ascending: true }),
  ]);

  return <UsersManager users={users || []} devices={devices || []} />;
}

