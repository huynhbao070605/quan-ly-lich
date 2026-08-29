type SupabaseCountResponse = Promise<{
  count: number | null;
  error: Error | null;
}>;
type SupabaseListResponse<T> = Promise<{
  data: T[] | null;
  error: Error | null;
}>;

type FocusQueryBuilder = {
  eq(column: string, value: string): FocusQueryBuilder;
  neq(column: string, value: string): FocusQueryBuilder;
  order(column: string, options?: { ascending?: boolean }): FocusQueryBuilder;
  select(columns: string, options?: { count: "exact"; head: true }): FocusQueryBuilder;
} & PromiseLike<
  Awaited<SupabaseCountResponse> | Awaited<SupabaseListResponse<{ id: string }>>
>;

export type FocusSupabaseClient = {
  from(table: "tasks"): FocusQueryBuilder;
};

export async function countFocusTasks(
  supabase: FocusSupabaseClient,
  userId: string,
  date: string,
  excludeTaskId?: string,
): Promise<number> {
  let query = supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("focus_date", date);

  if (excludeTaskId) {
    query = query.neq("id", excludeTaskId);
  }

  const { count, error } = (await query) as Awaited<SupabaseCountResponse>;

  if (error) {
    throw error;
  }

  return count ?? 0;
}

export async function listFocusTaskIds(
  supabase: FocusSupabaseClient,
  userId: string,
  date: string,
): Promise<string[]> {
  const result = (await supabase
    .from("tasks")
    .select("id")
    .eq("user_id", userId)
    .eq("focus_date", date)
    .order("focus_position", { ascending: true })) as Awaited<
    SupabaseListResponse<{ id: string }>
  >;

  if (result.error) {
    throw result.error;
  }

  return (result.data ?? []).map((task) => task.id);
}
