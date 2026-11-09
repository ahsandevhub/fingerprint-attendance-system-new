import { createClient } from "@/lib/supabase/server";
import { UsersManager } from "@/components/users-manager";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const supabase = await createClient();

  const [{ data: users }, { data: devices }, { data: templates }] = await Promise.all([
    supabase
      .from("profiles")
      .select("*, fingerprint_templates(id, updated_at)")
      .order("id", { ascending: true }),
    supabase.from("devices").select("*").order("id", { ascending: true }),
    supabase.from("fingerprint_templates").select("id, user_id, updated_at"),
  ]);

  return (
    <UsersManager
      users={users || []}
      devices={devices || []}
      initialTemplates={templates || []}
    />
  );
}
