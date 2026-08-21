"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth/require-user";
import {
  archiveProjectRecord,
  createProjectRecord,
  deleteProjectRecord,
  type ProjectRecord,
  type ProjectSupabaseClient,
} from "@/lib/projects/project-repository";
import { createServerClient } from "@/lib/supabase/server";

type ProjectActionSuccess<T> = {
  ok: true;
  data: T;
};

type ProjectActionFailure = {
  ok: false;
  message: string;
};

export type ProjectActionResult<T> = ProjectActionSuccess<T> | ProjectActionFailure;

const projectSchema = z.object({
  name: z.string().trim().min(1).max(100),
  color: z.string().trim().max(32).nullable().optional(),
  icon: z.string().trim().max(64).nullable().optional(),
});

const projectIdSchema = z.uuid();

function toProjectClient(): Promise<ProjectSupabaseClient> {
  return createServerClient() as unknown as Promise<ProjectSupabaseClient>;
}

function mapProjectError(error: unknown): ProjectActionFailure {
  if (error instanceof Error && error.message === "Project not found.") {
    return {
      ok: false,
      message: "Không tìm thấy dự án.",
    };
  }

  return {
    ok: false,
    message: "Không thể cập nhật dự án. Vui lòng thử lại.",
  };
}

export async function createProject(
  input: unknown,
): Promise<ProjectActionResult<ProjectRecord>> {
  const parsed = projectSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Tên dự án phải có từ 1 đến 100 ký tự.",
    };
  }

  try {
    const user = await requireUser();
    const supabase = await toProjectClient();
    const data = await createProjectRecord(supabase, user.id, parsed.data);

    revalidatePath("/app/du-an");

    return { ok: true, data };
  } catch (error) {
    return mapProjectError(error);
  }
}

export async function archiveProject(
  projectId: string,
): Promise<ProjectActionResult<ProjectRecord>> {
  const parsedProjectId = projectIdSchema.safeParse(projectId);

  if (!parsedProjectId.success) {
    return {
      ok: false,
      message: "Mã dự án không hợp lệ.",
    };
  }

  try {
    const user = await requireUser();
    const supabase = await toProjectClient();
    const data = await archiveProjectRecord(supabase, user.id, parsedProjectId.data);

    revalidatePath("/app/du-an");

    return { ok: true, data };
  } catch (error) {
    return mapProjectError(error);
  }
}

export async function deleteProject(projectId: string): Promise<ProjectActionResult<null>> {
  const parsedProjectId = projectIdSchema.safeParse(projectId);

  if (!parsedProjectId.success) {
    return {
      ok: false,
      message: "Mã dự án không hợp lệ.",
    };
  }

  try {
    const user = await requireUser();
    const supabase = await toProjectClient();
    await deleteProjectRecord(supabase, user.id, parsedProjectId.data);

    revalidatePath("/app/du-an");

    return { ok: true, data: null };
  } catch (error) {
    return mapProjectError(error);
  }
}
