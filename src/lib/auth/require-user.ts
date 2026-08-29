import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

import { createServerClient } from "@/lib/supabase/server";

export async function requireUser(): Promise<User> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/dang-nhap");
  }

  return user;
}
