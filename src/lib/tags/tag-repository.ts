export type TagRecord = {
  id: string;
  user_id: string;
  name: string;
  color: string | null;
  created_at: string;
};

type SupabaseSingleResult<T> = Promise<{ data: T | null; error: Error | null }>;
type SupabaseDeleteResult = { error: Error | null };
type SupabaseListResult<T> = { data: T[] | null; error: Error | null };

type SupabaseQueryBuilder<T> = {
  delete(): SupabaseQueryBuilder<T>;
  eq(column: string, value: string): SupabaseQueryBuilder<T>;
  insert(value: Record<string, unknown>): SupabaseQueryBuilder<T>;
  maybeSingle(): SupabaseSingleResult<T>;
  order(column: string, options?: { ascending?: boolean }): SupabaseQueryBuilder<T>;
  select(columns?: string): SupabaseQueryBuilder<T>;
  single(): SupabaseSingleResult<T>;
} & PromiseLike<SupabaseDeleteResult | SupabaseListResult<T>>;

export type TagSupabaseClient = {
  from(table: "tags"): SupabaseQueryBuilder<TagRecord>;
};

export type TagInput = {
  name: string;
  color?: string | null;
};

function assertSingle<T>(result: { data: T | null; error: Error | null }): T {
  if (result.error) {
    throw result.error;
  }

  if (result.data === null) {
    throw new Error("Tag not found.");
  }

  return result.data;
}

export async function createTagRecord(
  supabase: TagSupabaseClient,
  userId: string,
  input: TagInput,
): Promise<TagRecord> {
  const result = await supabase
    .from("tags")
    .insert({
      user_id: userId,
      name: input.name,
      color: input.color ?? null,
    })
    .select("*")
    .single();

  return assertSingle(result);
}

export async function deleteTagRecord(
  supabase: TagSupabaseClient,
  userId: string,
  tagId: string,
): Promise<void> {
  const result = await supabase
    .from("tags")
    .delete()
    .eq("user_id", userId)
    .eq("id", tagId)
    .select("id")
    .maybeSingle();

  assertSingle(result);
}

export async function listTagRecords(
  supabase: TagSupabaseClient,
  userId: string,
): Promise<TagRecord[]> {
  const result = (await supabase
    .from("tags")
    .select("*")
    .eq("user_id", userId)
    .order("name", { ascending: true })) as SupabaseListResult<TagRecord>;

  if (result.error) {
    throw result.error;
  }

  return result.data ?? [];
}
