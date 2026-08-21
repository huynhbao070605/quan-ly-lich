"use server";

import { z } from "zod";

import { requireUser } from "@/lib/auth/require-user";
import { createServerClient } from "@/lib/supabase/server";

export type GlobalSearchTask = {
  id: string;
  title: string;
  description: string | null;
  projectName: string | null;
  tagNames: string[];
};

export type GlobalSearchProject = {
  id: string;
  name: string;
};

export type GlobalSearchResults = {
  tasks: GlobalSearchTask[];
  projects: GlobalSearchProject[];
};

type SearchActionSuccess = {
  ok: true;
  data: GlobalSearchResults;
};

type SearchActionFailure = {
  ok: false;
  message: string;
};

export type SearchActionResult = SearchActionSuccess | SearchActionFailure;

type SearchTaskRow = {
  id: string;
  title: string;
  description: string | null;
  projects: { id: string; name: string } | null;
  task_tags: Array<{ tags: { id: string; name: string } | null }>;
};

type SearchProjectRow = GlobalSearchProject;

type SearchTagRow = {
  id: string;
};

type SearchTaskTagRow = {
  tasks: SearchTaskRow | null;
};

type SearchListResult<T> = Promise<{ data: T[] | null; error: Error | null }>;

type SearchQueryBuilder<T> = {
  eq(column: string, value: string): SearchQueryBuilder<T>;
  ilike(column: string, pattern: string): SearchQueryBuilder<T>;
  in(column: string, values: string[]): SearchQueryBuilder<T>;
  limit(count: number): SearchListResult<T>;
  or(expression: string): SearchQueryBuilder<T>;
  order(column: string, options?: { ascending?: boolean }): SearchQueryBuilder<T>;
  select(columns: string): SearchQueryBuilder<T>;
};

type SearchSupabaseClient = {
  from(table: "projects"): SearchQueryBuilder<SearchProjectRow>;
  from(table: "tags"): SearchQueryBuilder<SearchTagRow>;
  from(table: "task_tags"): SearchQueryBuilder<SearchTaskTagRow>;
  from(table: "tasks"): SearchQueryBuilder<SearchTaskRow>;
};

const searchQuerySchema = z.string().trim().max(100);
const emptyResults: GlobalSearchResults = { tasks: [], projects: [] };
const taskSelect = "id,title,description,projects(id,name),task_tags(tags(id,name))";
const taskResultLimit = 20;

function toSearchClient(): Promise<SearchSupabaseClient> {
  return createServerClient() as unknown as Promise<SearchSupabaseClient>;
}

function toSearchTask(task: SearchTaskRow): GlobalSearchTask {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    projectName: task.projects?.name ?? null,
    tagNames: task.task_tags.flatMap((taskTag) =>
      taskTag.tags === null ? [] : [taskTag.tags.name],
    ),
  };
}

function mergeTasks(...taskGroups: GlobalSearchTask[][]): GlobalSearchTask[] {
  const tasks = new Map<string, GlobalSearchTask>();

  for (const task of taskGroups.flat()) {
    tasks.set(task.id, task);
  }

  return [...tasks.values()].slice(0, taskResultLimit);
}

export async function searchGlobal(query: unknown): Promise<SearchActionResult> {
  const parsed = searchQuerySchema.safeParse(query);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Từ khóa tìm kiếm không hợp lệ.",
    };
  }

  if (parsed.data.length === 0) {
    return { ok: true, data: emptyResults };
  }

  try {
    const user = await requireUser();
    const supabase = await toSearchClient();
    const pattern = `%${parsed.data}%`;

    const [directTasksResult, projectsResult, tagsResult] = await Promise.all([
      supabase
        .from("tasks")
        .select(taskSelect)
        .eq("user_id", user.id)
        .or(`title.ilike.${pattern},description.ilike.${pattern}`)
        .order("updated_at", { ascending: false })
        .limit(taskResultLimit),
      supabase
        .from("projects")
        .select("id,name")
        .eq("user_id", user.id)
        .ilike("name", pattern)
        .order("updated_at", { ascending: false })
        .limit(taskResultLimit),
      supabase
        .from("tags")
        .select("id")
        .eq("user_id", user.id)
        .ilike("name", pattern)
        .limit(taskResultLimit),
    ]);

    if (directTasksResult.error) throw directTasksResult.error;
    if (projectsResult.error) throw projectsResult.error;
    if (tagsResult.error) throw tagsResult.error;

    const projectIds = (projectsResult.data ?? []).map((project) => project.id);
    const tagIds = (tagsResult.data ?? []).map((tag) => tag.id);
    const [projectTasksResult, tagTasksResult] = await Promise.all([
      projectIds.length === 0
        ? Promise.resolve({ data: [] as SearchTaskRow[], error: null })
        : supabase
            .from("tasks")
            .select(taskSelect)
            .eq("user_id", user.id)
            .in("project_id", projectIds)
            .order("updated_at", { ascending: false })
            .limit(taskResultLimit),
      tagIds.length === 0
        ? Promise.resolve({ data: [] as SearchTaskTagRow[], error: null })
        : supabase
            .from("task_tags")
            .select(`tasks!inner(${taskSelect})`)
            .in("tag_id", tagIds)
            .eq("tasks.user_id", user.id)
            .limit(taskResultLimit),
    ]);

    if (projectTasksResult.error) throw projectTasksResult.error;
    if (tagTasksResult.error) throw tagTasksResult.error;

    return {
      ok: true,
      data: {
        tasks: mergeTasks(
          (directTasksResult.data ?? []).map(toSearchTask),
          (projectTasksResult.data ?? []).map(toSearchTask),
          (tagTasksResult.data ?? []).flatMap((taskTag) =>
            taskTag.tasks === null ? [] : [toSearchTask(taskTag.tasks)],
          ),
        ),
        projects: projectsResult.data ?? [],
      },
    };
  } catch {
    return {
      ok: false,
      message: "Không thể tìm kiếm. Vui lòng thử lại.",
    };
  }
}
