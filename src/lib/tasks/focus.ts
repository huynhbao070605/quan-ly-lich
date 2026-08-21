type SupabaseCountResponse = Promise<{
  count: number | null;
  error: Error | null;
}>;

type FocusQueryBuilder = {
  eq(column: string, value: string): FocusQueryBuilder;
  neq(column: string, value: string): FocusQueryBuilder;
  select(columns: string, options: { count: "exact"; head: true }): FocusQueryBuilder;
} & PromiseLike<Awaited<SupabaseCountResponse>>;

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

  const { count, error } = await query;

  if (error) {
    throw error;
  }

  return count ?? 0;
}
