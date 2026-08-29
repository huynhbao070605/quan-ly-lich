import { TASK_STATUS_LABELS } from "@/lib/domain/constants";
import { isInVietnamDay, isOverdue, nextVietnamDayStartUtc } from "@/lib/domain/time";
import type { TaskPriority, TaskStatus } from "@/lib/validation/task";

export type DashboardTaskRecord = {
  id: string;
  user_id: string;
  project_id: string | null;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_at: string | null;
  completed_at: string | null;
};

export type DashboardProjectRecord = {
  id: string;
  user_id: string;
  name: string;
  color: string | null;
  archived: boolean;
};

export type DashboardTaskSummary = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueAt: string | null;
  projectId: string | null;
};

export type DashboardProjectProgress = {
  id: string;
  name: string;
  color: string | null;
  taskCount: number;
  doneCount: number;
  completionPercentage: number;
};

export type DashboardStatusBreakdownItem = {
  status: TaskStatus;
  label: string;
  count: number;
};

export type DashboardSummary = {
  todayCount: number;
  inProgressCount: number;
  overdueCount: number;
  completionPercentage: number;
  todayTasks: DashboardTaskSummary[];
  upcomingTasks: DashboardTaskSummary[];
  overdueTasks: DashboardTaskSummary[];
  projectProgress: DashboardProjectProgress[];
  statusBreakdown: DashboardStatusBreakdownItem[];
};

type SupabaseListResponse<T> = { data: T[] | null; error: Error | null };

type DashboardQueryBuilder<T> = {
  eq(column: string, value: string | boolean): DashboardQueryBuilder<T>;
  order(column: string, options?: { ascending?: boolean }): DashboardQueryBuilder<T>;
  select(columns?: string): DashboardQueryBuilder<T>;
} & PromiseLike<SupabaseListResponse<T>>;

export type DashboardSupabaseClient = {
  from(table: "projects"): DashboardQueryBuilder<DashboardProjectRecord>;
  from(table: "tasks"): DashboardQueryBuilder<DashboardTaskRecord>;
};

const OPEN_STATUSES = new Set<TaskStatus>(["TODO", "IN_PROGRESS"]);
const STATUS_ORDER: TaskStatus[] = ["TODO", "IN_PROGRESS", "DONE", "CANCELLED"];

function assertList<T>(result: SupabaseListResponse<T>): T[] {
  if (result.error) {
    throw result.error;
  }

  return result.data ?? [];
}

function completionPercentage(doneCount: number, taskCount: number): number {
  if (taskCount === 0) {
    return 0;
  }

  return Math.round((doneCount / taskCount) * 100);
}

function toTaskSummary(task: DashboardTaskRecord): DashboardTaskSummary {
  return {
    id: task.id,
    title: task.title,
    status: task.status,
    priority: task.priority,
    dueAt: task.due_at,
    projectId: task.project_id,
  };
}

function sortByDueAt(a: DashboardTaskRecord, b: DashboardTaskRecord): number {
  return new Date(a.due_at ?? 0).getTime() - new Date(b.due_at ?? 0).getTime();
}

function isOpenTask(task: DashboardTaskRecord): boolean {
  return OPEN_STATUSES.has(task.status);
}

export async function getDashboardSummary(
  supabase: DashboardSupabaseClient,
  userId: string,
  now: Date = new Date(),
): Promise<DashboardSummary> {
  const [{ data: tasksData, error: tasksError }, { data: projectsData, error: projectsError }] =
    await Promise.all([
      supabase
        .from("tasks")
        .select("id, user_id, project_id, title, status, priority, due_at, completed_at")
        .eq("user_id", userId)
        .order("due_at", { ascending: true }),
      supabase
        .from("projects")
        .select("id, user_id, name, color, archived")
        .eq("user_id", userId)
        .eq("archived", false)
        .order("created_at", { ascending: false }),
    ]);

  const tasks = assertList({ data: tasksData, error: tasksError });
  const projects = assertList({ data: projectsData, error: projectsError });
  const tomorrowStart = nextVietnamDayStartUtc(now);

  const activeTasks = tasks.filter((task) => task.status !== "CANCELLED");
  const openTasks = activeTasks.filter(isOpenTask);
  const doneCount = activeTasks.filter((task) => task.status === "DONE").length;
  const todayTasks = openTasks
    .filter((task) => task.due_at !== null && isInVietnamDay(new Date(task.due_at), now))
    .sort(sortByDueAt);
  const overdueTasks = openTasks
    .filter((task) =>
      isOverdue({
        dueAt: task.due_at ? new Date(task.due_at) : null,
        status: task.status,
        now,
      }),
    )
    .sort(sortByDueAt);
  const upcomingTasks = openTasks
    .filter((task) => task.due_at !== null && new Date(task.due_at) >= tomorrowStart)
    .sort(sortByDueAt)
    .slice(0, 5);

  return {
    todayCount: todayTasks.length,
    inProgressCount: tasks.filter((task) => task.status === "IN_PROGRESS").length,
    overdueCount: overdueTasks.length,
    completionPercentage: completionPercentage(doneCount, activeTasks.length),
    todayTasks: todayTasks.map(toTaskSummary),
    upcomingTasks: upcomingTasks.map(toTaskSummary),
    overdueTasks: overdueTasks.map(toTaskSummary),
    projectProgress: projects.map((project) => {
      const projectTasks = activeTasks.filter((task) => task.project_id === project.id);
      const projectDoneCount = projectTasks.filter((task) => task.status === "DONE").length;

      return {
        id: project.id,
        name: project.name,
        color: project.color,
        taskCount: projectTasks.length,
        doneCount: projectDoneCount,
        completionPercentage: completionPercentage(projectDoneCount, projectTasks.length),
      };
    }),
    statusBreakdown: STATUS_ORDER.map((status) => ({
      status,
      label: TASK_STATUS_LABELS[status],
      count: tasks.filter((task) => task.status === status).length,
    })),
  };
}
