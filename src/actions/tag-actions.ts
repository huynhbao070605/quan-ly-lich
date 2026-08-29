"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth/require-user";
import { createServerClient } from "@/lib/supabase/server";
import {
  createTagRecord,
  deleteTagRecord,
  type TagRecord,
  type TagSupabaseClient,
} from "@/lib/tags/tag-repository";

type TagActionSuccess<T> = {
  ok: true;
  data: T;
};

type TagActionFailure = {
  ok: false;
  message: string;
};

export type TagActionResult<T> = TagActionSuccess<T> | TagActionFailure;

const tagSchema = z.object({
  name: z.string().trim().min(1).max(100),
  color: z.string().trim().max(32).nullable().optional(),
});

const tagIdSchema = z.uuid();

function toTagClient(): Promise<TagSupabaseClient> {
  return createServerClient() as unknown as Promise<TagSupabaseClient>;
}

function mapTagError(error: unknown): TagActionFailure {
  if (error instanceof Error && error.message === "Tag not found.") {
    return {
      ok: false,
      message: "Không tìm thấy thẻ.",
    };
  }

  return {
    ok: false,
    message: "Không thể cập nhật thẻ. Vui lòng thử lại.",
  };
}

export async function createTag(input: unknown): Promise<TagActionResult<TagRecord>> {
  const parsed = tagSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Tên thẻ phải có từ 1 đến 100 ký tự.",
    };
  }

  try {
    const user = await requireUser();
    const supabase = await toTagClient();
    const data = await createTagRecord(supabase, user.id, parsed.data);

    revalidatePath("/app/cong-viec");

    return { ok: true, data };
  } catch (error) {
    return mapTagError(error);
  }
}

export async function deleteTag(tagId: string): Promise<TagActionResult<null>> {
  const parsedTagId = tagIdSchema.safeParse(tagId);

  if (!parsedTagId.success) {
    return {
      ok: false,
      message: "Mã thẻ không hợp lệ.",
    };
  }

  try {
    const user = await requireUser();
    const supabase = await toTagClient();
    await deleteTagRecord(supabase, user.id, parsedTagId.data);

    revalidatePath("/app/cong-viec");

    return { ok: true, data: null };
  } catch (error) {
    return mapTagError(error);
  }
}
