import { z } from "zod";

import type { TaskListFilters } from "./task-queries";

export type TaskRouteSearchParams = Record<
  string,
  string | string[] | undefined
>;

type ParsedTaskRouteParams = {
  filters: TaskListFilters;
  initialTaskId: string | null;
};

const idSchema = z.uuid();
const prioritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);
const statusSchema = z.enum(["TODO", "IN_PROGRESS", "DONE", "CANCELLED"]);

function singleValue(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export function parseTaskRouteParams(
  searchParams: TaskRouteSearchParams,
): ParsedTaskRouteParams {
  const filters: TaskListFilters = {};
  const query = singleValue(searchParams.query)?.trim();
  const projectId = idSchema.safeParse(singleValue(searchParams.projectId));
  const tagId = idSchema.safeParse(singleValue(searchParams.tagId));
  const priority = prioritySchema.safeParse(singleValue(searchParams.priority));
  const status = statusSchema.safeParse(singleValue(searchParams.status));
  const taskId = idSchema.safeParse(singleValue(searchParams.taskId));

  if (query) filters.query = query;
  if (projectId.success) filters.projectId = projectId.data;
  if (tagId.success) filters.tagIds = [tagId.data];
  if (priority.success) filters.priority = priority.data;
  if (status.success) filters.status = status.data;

  return {
    filters,
    initialTaskId: taskId.success ? taskId.data : null,
  };
}
