"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth/require-user";
import { createServerClient } from "@/lib/supabase/server";

const updateProfileSchema = z.object({
  displayName: z.string().trim().min(1).max(80),
});

export type ProfileActionResult = {
  ok: boolean;
  message: string;
};

export async function updateProfile(input: unknown): Promise<ProfileActionResult> {
  const parsed = updateProfileSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Tên hiển thị phải có từ 1 đến 80 ký tự.",
    };
  }

  const user = await requireUser();
  const supabase = await createServerClient();
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: parsed.data.displayName })
    .eq("id", user.id);

  if (error) {
    return {
      ok: false,
      message: "Không thể cập nhật hồ sơ. Vui lòng thử lại.",
    };
  }

  revalidatePath("/app/cai-dat");

  return {
    ok: true,
    message: "Đã cập nhật hồ sơ.",
  };
}
