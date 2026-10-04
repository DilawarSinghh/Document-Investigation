import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase";
import { AppShell } from "@/components/AppShell";

export default async function AppPage() {
  const sb = supabaseServer();
  const { data } = await sb.auth.getUser();
  if (!data.user) redirect("/login");
  return <AppShell />;
}
