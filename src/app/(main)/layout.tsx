import { redirect } from "next/navigation";
import ProgressProvider from "@/components/ProgressProvider";
import { createClient } from "@/lib/supabase/server";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("username,is_admin").eq("id", user.id).maybeSingle();
  const username = profile?.username ?? (user.user_metadata?.username as string | undefined) ?? "";

  return (
    <ProgressProvider userId={user.id} username={username} isAdmin={!!profile?.is_admin}>
      {children}
    </ProgressProvider>
  );
}
