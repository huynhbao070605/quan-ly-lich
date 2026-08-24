"use server";

import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/require-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";

export type AccountActionResult = {
  ok: boolean;
  message: string;
};

export async function signOut(): Promise<AccountActionResult> {
  const supabase = await createServerClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    return {
      ok: false,
      message: "Không thể đăng xuất. Vui lòng thử lại sau.",
    };
  }

  redirect("/dang-nhap");
}

export async function deleteCurrentAccount(
  confirmation: string,
): Promise<AccountActionResult> {
  if (confirmation !== "DELETE") {
    return {
      ok: false,
      message: "Vui lòng nhập DELETE để xác nhận.",
    };
  }

  const user = await requireUser();
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);

  if (error) {
    return {
      ok: false,
      message: "Không thể xóa tài khoản. Vui lòng thử lại sau.",
    };
  }

  const supabase = await createServerClient();
  await supabase.auth.signOut();

  return {
    ok: true,
    message: "Tài khoản đã được xóa.",
  };
}
