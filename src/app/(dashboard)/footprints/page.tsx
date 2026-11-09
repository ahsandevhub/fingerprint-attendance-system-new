import { createClient } from "@/lib/supabase/server";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileText, ShieldAlert } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function FootprintsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("footprints")
    .select("*, profiles(name, phone)")
    .order("created_at", { ascending: false })
    .limit(100);

  if (type) {
    query = query.eq("type", type);
  }

  const { data: logs } = await query;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">পদচিহ্ন (অডিট ও সিকিউরিটি লগ)</h1>
        <p className="text-muted-foreground text-sm mt-1">
          সিস্টেমের সকল বায়োমেট্রিক পাঞ্চ, লগইন, ব্যবহারকারী পরিবর্তন এবং নিরাপত্তা ইভেন্টের রেকর্ড
        </p>
      </div>

      <div className="rounded-3xl border border-slate-100 dark:border-border/80 bg-white dark:bg-card overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-slate-50/70 dark:bg-muted/30">
            <TableRow>
              <TableHead className="w-16 font-bold">লগ আইডি</TableHead>
              <TableHead className="font-bold">সময়</TableHead>
              <TableHead className="font-bold">সংশ্লিষ্ট ইউজার</TableHead>
              <TableHead className="font-bold">ইভেন্ট টাইপ</TableHead>
              <TableHead className="font-bold">আইপি অ্যাড্রেস</TableHead>
              <TableHead className="font-bold">বিস্তারিত ডেটা</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  কোন অডিট লগ রেকর্ড পাওয়া যায়নি।
                </TableCell>
              </TableRow>
            ) : (
              logs?.map((l) => (
                <TableRow key={l.id} className="hover:bg-muted/40 transition-colors">
                  <TableCell className="font-mono text-xs">#{l.id}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(l.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-xs font-medium">
                    {l.profiles ? (
                      <div>
                        <span>{l.profiles.name}</span>
                        <span className="text-muted-foreground block text-[10px] font-mono">#{l.user_id}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground italic">সিস্টেম / অতিথি</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        l.type.includes("SUCCESS") || l.type.includes("ATTENDENCE")
                          ? "outline"
                          : l.type.includes("FAIL")
                          ? "destructive"
                          : "secondary"
                      }
                      className="font-mono text-[11px]"
                    >
                      {l.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {l.ip || "127.0.0.1"}
                  </TableCell>
                  <TableCell className="text-xs font-mono max-w-sm truncate text-muted-foreground">
                    {JSON.stringify(l.details)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

