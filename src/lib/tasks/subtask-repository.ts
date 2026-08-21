export type SubtaskRecord = {
  id: string;
  task_id: string;
  title: string;
  completed: boolean;
  position: number;
  created_at: string;
  updated_at: string;
};

type ParentTaskRecord = {
  id: string;
};

type SupabaseSingleResult<T> = Promise<{ data: T | null; error: Error | null }>;
type SupabaseListResult<T> = Promise<{ data: T[] | null; error: Error | null }>;
type SupabaseDeleteResult = { error: Error | null };

type SupabaseQueryBuilder<T> = {
  delete(): SupabaseQueryBuilder<T>;
  eq(column: string, value: string | boolean | number): SupabaseQueryBuilder<T>;
  in(column: string, values: string[]): SupabaseQueryBuilder<T>;
  insert(value: Record<string, unknown>): SupabaseQueryBuilder<T>;
  maybeSingle(): SupabaseSingleResult<T>;
  order(column: string, options?: { ascending?: boolean }): SupabaseQueryBuilder<T>;
  select(columns?: string): SupabaseQueryBuilder<T>;
  single(): SupabaseSingleResult<T>;
  update(value: Record<string, unknown>): SupabaseQueryBuilder<T>;
} & PromiseLike<SupabaseDeleteResult | { data: T[] | null; error: Error | null }>;

export type SubtaskSupabaseClient = {
  from(table: "subtasks"): SupabaseQueryBuilder<SubtaskRecord>;
  from(table: "tasks"): SupabaseQueryBuilder<ParentTaskRecord>;
};

export type SubtaskInput = {
  title: string;
};

export type SubtaskPositionUpdate = {
  id: string;
  position: number;
};

function assertSingle<T>(result: { data: T | null; error: Error | null }): T {
  if (result.error) {
    throw result.error;
  }

  if (result.data === null) {
    throw new Error("Subtask not found.");
  }

  return result.data;
}

export async function addSubtaskRecord(
  supabase: SubtaskSupabaseClient,
  taskId: string,
  input: SubtaskInput,
): Promise<SubtaskRecord> {
  const result = await supabase
    .from("subtasks")
    .insert({
      task_id: taskId,
      title: input.title,
    })
    .select("*")
    .single();

  return assertSingle(result);
}

export async function toggleSubtaskRecord(
  supabase: SubtaskSupabaseClient,
  subtaskId: string,
  completed: boolean,
): Promise<SubtaskRecord> {
  const result = await supabase
    .from("subtasks")
    .update({ completed })
    .eq("id", subtaskId)
    .select("*")
    .single();

  return assertSingle(result);
}

export async function reorderSubtaskRecords(
  supabase: SubtaskSupabaseClient,
  taskId: string,
  positions: SubtaskPositionUpdate[],
): Promise<SubtaskRecord[]> {
  await Promise.all(
    positions.map(({ id, position }) =>
      supabase.from("subtasks").update({ position }).eq("task_id", taskId).eq("id", id),
    ),
  );

  const result = (await supabase
    .from("subtasks")
    .select("*")
    .eq("task_id", taskId)
    .order("position", { ascending: true })) as unknown as Awaited<
    SupabaseListResult<SubtaskRecord>
  >;

  if (result.error) {
    throw result.error;
  }

  return result.data ?? [];
}

export async function deleteSubtaskRecord(
  supabase: SubtaskSupabaseClient,
  subtaskId: string,
): Promise<void> {
  const result = await supabase
    .from("subtasks")
    .delete()
    .eq("id", subtaskId)
    .select("id")
    .maybeSingle();

  assertSingle(result);
}

export async function getTaskRecordBySubtaskId(
  supabase: SubtaskSupabaseClient,
  userId: string,
  subtaskId: string,
): Promise<ParentTaskRecord | null> {
  const result = await supabase
    .from("subtasks")
    .select("task_id, tasks!inner(id)")
    .eq("id", subtaskId)
    .eq("tasks.user_id", userId)
    .maybeSingle();

  if (result.error) {
    throw result.error;
  }

  return result.data === null ? null : { id: result.data.task_id };
}
