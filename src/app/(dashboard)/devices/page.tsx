import { createClient } from "@/lib/supabase/server";
import { DevicesManager } from "@/components/devices-manager";

export const dynamic = "force-dynamic";

export default async function DevicesPage() {
  const supabase = await createClient();

  const { data: devices } = await supabase
    .from("devices")
    .select("*, profiles(name)")
    .order("id", { ascending: true });

  return <DevicesManager devices={devices || []} />;
}
