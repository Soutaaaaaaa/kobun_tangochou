import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** 管理者以外はトップへ戻す（データ自体もDB側で管理者しか読めない） */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (!data?.is_admin) redirect("/");
  return <>{children}</>;
}
