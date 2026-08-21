import type {
  CreateTaskInput,
  TaskPriority,
  TaskStatus,
  UpdateTaskInput,
} from "@/lib/validation/task";

export type TaskRecord = {
  id: string;
  user_id: string;
  project_id: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  start_at: string | null;
  due_at: string | null;
  all_day: boolean;
  important: boolean;
  urgent: boolean;
  eisenhower_override: boolean;
  focus_date: string | null;
  focus_position: number | null;
  kanban_position: number;
  recurrence_id: string | null;
  recurrence_instance_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

type SupabaseMutationResult<T> = Promise<{ data: T | null; error: Error | null }>;
type SupabaseDeleteResult = { error: Error | null };
type SupabaseListResult<T> = { data: T[] | null; error: Error | null };
type SupabaseRpcResult = Promise<{ data: unknown; error: Error | null }>;

type SupabaseQueryBuilder<T> = {
  delete(): SupabaseQueryBuilder<T>;
  eq(column: string, value: string): SupabaseQueryBuilder<T>;
  in(column: string, values: string[]): SupabaseQueryBuilder<T>;
  insert(value: Record<string, unknown> | Array<Record<string, unknown>>): SupabaseQueryBuilder<T>;
  maybeSingle(): SupabaseMutationResult<T>;
  select(columns?: string): SupabaseQueryBuilder<T>;
  single(): SupabaseMutationResult<T>;
  update(value: Record<string, unknown>): SupabaseQueryBuilder<T>;
} & PromiseLike<SupabaseDeleteResult | SupabaseListResult<T>>;

export type TaskSupabaseClient = {
  from(table: "tasks"): SupabaseQueryBuilder<TaskRecord>;
  from(table: "projects"): SupabaseQueryBuilder<{ id: string }>;
  from(table: "tags"): SupabaseQueryBuilder<{ id: string }>;
  rpc(
    fn: "sync_task_tags",
    args: { p_task_id: string; p_tag_ids: string[] },
  ): SupabaseRpcResult;
};

type TaskDerivedInput = {
  important?: boolean;
  urgent?: boolean;
  eisenhowerOverride?: boolean;
  completedAt?: string | null;
  focusDate?: string | null;
  focusPosition?: number | null;
};

export type TaskRepositoryCreateInput = CreateTaskInput & TaskDerivedInput;
export type TaskMutationInput = TaskRepositoryCreateInput | TaskRepositoryUpdateInput;
export type TaskRepositoryUpdateInput = UpdateTaskInput & TaskDerivedInput;

function toTaskRow(
  input: TaskMutationInput | TaskRepositoryUpdateInput,
): Record<string, unknown> {
  const row: Record<string, unknown> = {};

  if ("title" in input && input.title !== undefined) row.title = input.title;
  if ("projectId" in input && input.projectId !== undefined) {
    row.project_id = input.projectId;
  }
  if ("description" in input && input.description !== undefined) {
    row.description = input.description;
  }
  if ("status" in input && input.status !== undefined) row.status = input.status;
  if ("priority" in input && input.priority !== undefined) {
    row.priority = input.priority;
  }
  if ("startAt" in input && input.startAt !== undefined) row.start_at = input.startAt;
  if ("dueAt" in input && input.dueAt !== undefined) row.due_at = input.dueAt;
  if ("allDay" in input && input.allDay !== undefined) row.all_day = input.allDay;
  if ("important" in input && input.important !== undefined) {
    row.important = input.important;
  }
  if ("urgent" in input && input.urgent !== undefined) row.urgent = input.urgent;
  if ("eisenhowerOverride" in input && input.eisenhowerOverride !== undefined) {
    row.eisenhower_override = input.eisenhowerOverride;
  }
  if ("focusDate" in input && input.focusDate !== undefined) {
    row.focus_date = input.focusDate;
  }
  if ("focusPosition" in input && input.focusPosition !== undefined) {
    row.focus_position = input.focusPosition;
  }
  if ("completedAt" in input && input.completedAt !== undefined) {
    row.completed_at = input.completedAt;
  }

  return row;
}

function assertTaskResult<T>(result: { data: T | null; error: Error | null }): T {
  if (result.error) {
    throw result.error;
  }

  if (result.data === null) {
    throw new Error("Task not found.");
  }

  return result.data;
}

async function assertOwnedProjectIfPresent(
  supabase: TaskSupabaseClient,
  userId: string,
  projectId: string | null | undefined,
): Promise<void> {
  if (projectId === undefined || projectId === null) {
    return;
  }

  const { data, error } = await supabase
    .from("projects")
    .select("id")
    .eq("user_id", userId)
    .eq("id", projectId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data === null) {
    throw new Error("Project not found.");
  }
}

async function assertOwnedTags(
  supabase: TaskSupabaseClient,
  userId: string,
  tagIds: string[] | undefined,
): Promise<void> {
  if (tagIds === undefined) {
    return;
  }

  const uniqueTagIds = [...new Set(tagIds)];
  if (uniqueTagIds.length === 0) {
    return;
  }

  const result = (await supabase
    .from("tags")
    .select("id")
    .eq("user_id", userId)
    .in("id", uniqueTagIds)) as SupabaseListResult<{ id: string }>;

  if (result.error) {
    throw result.error;
  }

  if ((result.data ?? []).length !== uniqueTagIds.length) {
    throw new Error("Tag not found.");
  }
}

async function syncTaskTags(
  supabase: TaskSupabaseClient,
  taskId: string,
  tagIds: string[] | undefined,
): Promise<void> {
  if (tagIds === undefined) {
    return;
  }

  const { error } = await supabase.rpc("sync_task_tags", {
    p_task_id: taskId,
    p_tag_ids: [...new Set(tagIds)],
  });

  if (error) {
    throw error;
  }
}

export async function createTaskRecord(
  supabase: TaskSupabaseClient,
  userId: string,
  input: TaskRepositoryCreateInput,
): Promise<TaskRecord> {
  await assertOwnedProjectIfPresent(supabase, userId, input.projectId);
  await assertOwnedTags(supabase, userId, input.tagIds);

  const result = await supabase
    .from("tasks")
    .insert({ ...toTaskRow(input), user_id: userId })
    .select("*")
    .single();

  const task = assertTaskResult(result);
  await syncTaskTags(supabase, task.id, input.tagIds);
  return task;
}

export async function updateTaskRecord(
  supabase: TaskSupabaseClient,
  userId: string,
  taskId: string,
  input: TaskRepositoryUpdateInput,
): Promise<TaskRecord> {
  await assertOwnedProjectIfPresent(supabase, userId, input.projectId);
  await assertOwnedTags(supabase, userId, input.tagIds);

  const row = toTaskRow(input);
  let task: TaskRecord;

  if (Object.keys(row).length === 0) {
    const existingTask = await getTaskRecordById(supabase, userId, taskId);
    if (existingTask === null) {
      throw new Error("Task not found.");
    }
    task = existingTask;
  } else {
    const result = await supabase
      .from("tasks")
      .update(row)
      .eq("user_id", userId)
      .eq("id", taskId)
      .select("*")
      .single();

    task = assertTaskResult(result);
  }

  await syncTaskTags(supabase, taskId, input.tagIds);
  return task;
}

export async function deleteTaskRecord(
  supabase: TaskSupabaseClient,
  userId: string,
  taskId: string,
): Promise<void> {
  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("user_id", userId)
    .eq("id", taskId);

  if (error) {
    throw error;
  }
}

export async function getTaskRecordById(
  supabase: TaskSupabaseClient,
  userId: string,
  taskId: string,
): Promise<TaskRecord | null> {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", userId)
    .eq("id", taskId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}
