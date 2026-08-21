import type { TaskFilterInput, TaskPriority, TaskStatus } from "@/lib/validation/task";
import { nextVietnamDayStartUtc, vietnamDayStartUtc } from "@/lib/domain/time";

export type TaskQueryOperation =
  | { type: "eq"; column: string; value: string | boolean }
  | { type: "gte"; column: string; value: string }
  | { type: "in"; column: string; values: string[] }
  | { type: "lt"; column: string; value: string }
  | { type: "notIn"; column: string; values: string[] }
  | { type: "or"; expression: string };

export type TaskListFilters = TaskFilterInput & {
  now?: Date;
  overdue?: boolean;
  query?: string;
  today?: boolean;
  upcoming?: boolean;
};

type TaskQueryBuilder<T> = {
  eq(column: string, value: string | boolean): TaskQueryBuilder<T>;
  gte(column: string, value: string): TaskQueryBuilder<T>;
  in(column: string, values: string[]): TaskQueryBuilder<T>;
  lt(column: string, value: string): TaskQueryBuilder<T>;
  not(column: string, operator: string, value: string): TaskQueryBuilder<T>;
  or(expression: string): TaskQueryBuilder<T>;
  order(column: string, options?: { ascending?: boolean }): TaskQueryBuilder<T>;
  select(columns?: string): TaskQueryBuilder<T>;
};

export type TaskQueryClient<T> = {
  from(table: "tasks"): TaskQueryBuilder<T>;
};

function addOperation(
  operations: TaskQueryOperation[],
  operation: TaskQueryOperation | false | undefined,
) {
  if (operation) {
    operations.push(operation);
  }
}

function textSearchOperation(query: string): TaskQueryOperation | undefined {
  const trimmed = query.trim();

  if (trimmed.length === 0) {
    return undefined;
  }

  return {
    type: "or",
    expression: `title.ilike.%${trimmed}%,description.ilike.%${trimmed}%`,
  };
}

export function buildSearchTasksQuery(
  userId: string,
  query: string,
): TaskQueryOperation[] {
  const operations: TaskQueryOperation[] = [
    { type: "eq", column: "user_id", value: userId },
  ];

  addOperation(operations, textSearchOperation(query));

  return operations;
}

export function buildListTasksQuery(
  userId: string,
  filters: TaskListFilters = {},
): TaskQueryOperation[] {
  const operations: TaskQueryOperation[] = [
    { type: "eq", column: "user_id", value: userId },
  ];

  addOperation(
    operations,
    filters.projectId !== undefined && filters.projectId !== null
      ? { type: "eq", column: "project_id", value: filters.projectId }
      : undefined,
  );
  addOperation(
    operations,
    filters.priority
      ? { type: "eq", column: "priority", value: filters.priority }
      : undefined,
  );
  addOperation(
    operations,
    filters.status ? { type: "eq", column: "status", value: filters.status } : undefined,
  );
  addOperation(
    operations,
    filters.tagIds && filters.tagIds.length > 0
      ? { type: "in", column: "task_tags.tag_id", values: filters.tagIds }
      : undefined,
  );
  addOperation(operations, filters.query ? textSearchOperation(filters.query) : undefined);

  const now = filters.now ?? new Date();
  const todayStart = vietnamDayStartUtc(now);
  const tomorrowStart = nextVietnamDayStartUtc(now);

  if (filters.today) {
    operations.push(
      { type: "gte", column: "due_at", value: todayStart.toISOString() },
      { type: "lt", column: "due_at", value: tomorrowStart.toISOString() },
    );
  }

  if (filters.upcoming) {
    operations.push({
      type: "gte",
      column: "due_at",
      value: tomorrowStart.toISOString(),
    });
  }

  if (filters.overdue) {
    operations.push(
      { type: "lt", column: "due_at", value: now.toISOString() },
      { type: "notIn", column: "status", values: ["DONE", "CANCELLED"] },
    );
  }

  return operations;
}

export function applyTaskQueryOperations<T>(
  query: TaskQueryBuilder<T>,
  operations: TaskQueryOperation[],
): TaskQueryBuilder<T> {
  return operations.reduce((builder, operation) => {
    switch (operation.type) {
      case "eq":
        return builder.eq(operation.column, operation.value);
      case "gte":
        return builder.gte(operation.column, operation.value);
      case "in":
        return builder.in(operation.column, operation.values);
      case "lt":
        return builder.lt(operation.column, operation.value);
      case "notIn":
        return builder.not(operation.column, "in", `(${operation.values.join(",")})`);
      case "or":
        return builder.or(operation.expression);
    }
  }, query);
}

export function listTasks<T>(
  supabase: TaskQueryClient<T>,
  userId: string,
  filters: TaskListFilters = {},
) {
  return applyTaskQueryOperations(
    supabase.from("tasks").select("*, projects(*), task_tags(tags(*))"),
    buildListTasksQuery(userId, filters),
  ).order("due_at", { ascending: true });
}

export function searchTasks<T>(
  supabase: TaskQueryClient<T>,
  userId: string,
  query: string,
) {
  return applyTaskQueryOperations(
    supabase.from("tasks").select("*, projects(*), task_tags(tags(*))"),
    buildSearchTasksQuery(userId, query),
  ).order("updated_at", { ascending: false });
}

export type { TaskPriority, TaskStatus };
