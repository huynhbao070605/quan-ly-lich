"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth/require-user";
import { createServerClient } from "@/lib/supabase/server";

const appearanceSchema = z.object({
  theme: z.enum(["light", "dark", "system"]),
});

export type AppearanceTheme = z.infer<typeof appearanceSchema>["theme"];

export type SettingsActionResult = {
  ok: boolean;
  message: string;
};

export async function updateAppearance({
  theme,
}: {
  theme: AppearanceTheme;
}): Promise<SettingsActionResult> {
  const parsed = appearanceSchema.safeParse({ theme });

  if (!parsed.success) {
    return {
      ok: false,
      message: "Giao diện đã chọn không hợp lệ.",
    };
  }

  const user = await requireUser();
  const supabase = await createServerClient();
  const { error } = await supabase
    .from("user_settings")
    .update({ theme: parsed.data.theme })
    .eq("user_id", user.id);

  if (error) {
    return {
      ok: false,
      message: "Không thể cập nhật giao diện. Vui lòng thử lại.",
    };
  }

  revalidatePath("/app/cai-dat");

  return {
    ok: true,
    message: "Đã lưu tùy chọn giao diện.",
  };
}
