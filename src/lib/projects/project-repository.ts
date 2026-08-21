export type ProjectRecord = {
  id: string;
  user_id: string;
  name: string;
  color: string | null;
  icon: string | null;
  archived: boolean;
  created_at: string;
  updated_at: string;
};

export type ProjectSummaryRecord = ProjectRecord & {
  task_count: number;
  done_count: number;
};

type ProjectTaskSummary = {
  id: string;
  project_id: string | null;
  status: string;
};

type SupabaseSingleResult<T> = Promise<{ data: T | null; error: Error | null }>;
type SupabaseListResponse<T> = { data: T[] | null; error: Error | null };
type SupabaseListResult<T> = Promise<SupabaseListResponse<T>>;
type SupabaseDeleteResult = { error: Error | null };

type SupabaseQueryBuilder<T> = {
  delete(): SupabaseQueryBuilder<T>;
  eq(column: string, value: string | boolean): SupabaseQueryBuilder<T>;
  insert(value: Record<string, unknown>): SupabaseQueryBuilder<T>;
  is(column: string, value: null): SupabaseQueryBuilder<T>;
  order(column: string, options?: { ascending?: boolean }): SupabaseQueryBuilder<T>;
  select(columns?: string): SupabaseQueryBuilder<T>;
  single(): SupabaseSingleResult<T>;
  update(value: Record<string, unknown>): SupabaseQueryBuilder<T>;
} & PromiseLike<SupabaseListResult<T> | SupabaseDeleteResult>;

export type ProjectSupabaseClient = {
  from(table: "projects"): SupabaseQueryBuilder<ProjectRecord>;
  from(table: "tasks"): SupabaseQueryBuilder<ProjectTaskSummary>;
};

export type ProjectInput = {
  name: string;
  color?: string | null;
  icon?: string | null;
};

function assertSingle<T>(result: { data: T | null; error: Error | null }): T {
  if (result.error) {
    throw result.error;
  }

  if (result.data === null) {
    throw new Error("Project not found.");
  }

  return result.data;
}

export async function createProjectRecord(
  supabase: ProjectSupabaseClient,
  userId: string,
  input: ProjectInput,
): Promise<ProjectRecord> {
  const result = await supabase
    .from("projects")
    .insert({
      user_id: userId,
      name: input.name,
      color: input.color ?? null,
      icon: input.icon ?? null,
    })
    .select("*")
    .single();

  return assertSingle(result);
}

export async function archiveProjectRecord(
  supabase: ProjectSupabaseClient,
  userId: string,
  projectId: string,
): Promise<ProjectRecord> {
  const result = await supabase
    .from("projects")
    .update({ archived: true })
    .eq("user_id", userId)
    .eq("id", projectId)
    .select("*")
    .single();

  return assertSingle(result);
}

export async function deleteProjectRecord(
  supabase: ProjectSupabaseClient,
  userId: string,
  projectId: string,
): Promise<void> {
  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("user_id", userId)
    .eq("id", projectId);

  if (error) {
    throw error;
  }
}

export async function listProjectSummaries(
  supabase: ProjectSupabaseClient,
  userId: string,
): Promise<ProjectSummaryRecord[]> {
  const [{ data: projects, error: projectError }, { data: tasks, error: taskError }] =
    ((await Promise.all([
      supabase
        .from("projects")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabase.from("tasks").select("id, project_id, status").eq("user_id", userId),
    ])) as unknown) as [
      SupabaseListResponse<ProjectRecord>,
      SupabaseListResponse<ProjectTaskSummary>,
    ];

  if (projectError) throw projectError;
  if (taskError) throw taskError;

  return (projects ?? []).map((project: ProjectRecord) => {
    const projectTasks = (tasks ?? []).filter(
      (task: ProjectTaskSummary) => task.project_id === project.id,
    );

    return {
      ...project,
      task_count: projectTasks.length,
      done_count: projectTasks.filter((task: ProjectTaskSummary) => task.status === "DONE")
        .length,
    };
  });
}

export async function getProjectSummaryById(
  supabase: ProjectSupabaseClient,
  userId: string,
  projectId: string,
): Promise<ProjectSummaryRecord | null> {
  const projects = await listProjectSummaries(supabase, userId);

  return projects.find((project) => project.id === projectId) ?? null;
}
