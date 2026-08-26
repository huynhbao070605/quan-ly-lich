import {
  TasksWorkspace,
  type TasksWorkspaceTask,
} from "@/components/tasks/tasks-workspace";
import { requireUser } from "@/lib/auth/require-user";
import {
  listProjectSummaries,
  type ProjectSupabaseClient,
} from "@/lib/projects/project-repository";
import { createServerClient } from "@/lib/supabase/server";
import { listTagRecords, type TagSupabaseClient } from "@/lib/tags/tag-repository";
import { listTasks } from "@/lib/tasks/task-queries";
import {
  parseTaskRouteParams,
  type TaskRouteSearchParams,
} from "@/lib/tasks/task-route-params";
import type { SubtaskRecord } from "@/lib/tasks/subtask-repository";

type RawTask = {
  id: string;
  title: string;
  description: string | null;
  status: TasksWorkspaceTask["status"];
  priority: TasksWorkspaceTask["priority"];
  project_id: string | null;
  start_at: string | null;
  due_at: string | null;
  all_day: boolean;
  important: boolean;
  urgent: boolean;
  eisenhower_override: boolean;
  projects: { id: string; name: string } | null;
  task_tags?: Array<{ tags: { id: string; name: string } | null }>;
  task_reminders?: Array<{ offset_minutes: number }>;
  subtasks?: SubtaskRecord[];
};

type SettingsRow = {
  default_reminder_offsets_minutes: number[];
};

type TasksPageProps = {
  searchParams: Promise<TaskRouteSearchParams>;
};

function mapTask(task: RawTask): TasksWorkspaceTask {
  const tags =
    task.task_tags
      ?.map((item) => item.tags)
      .filter((tag): tag is { id: string; name: string } => tag !== null) ?? [];

  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    projectId: task.project_id,
    project: task.projects,
    startAt: task.start_at,
    dueAt: task.due_at,
    allDay: task.all_day,
    important: task.important,
    urgent: task.urgent,
    eisenhowerOverride: task.eisenhower_override,
    reminderOffsets: [...new Set(
      (task.task_reminders ?? []).map((reminder) => reminder.offset_minutes),
    )].toSorted((a, b) => b - a),
    tagIds: tags.map((tag) => tag.id),
    tags,
    subtasks: task.subtasks ?? [],
  };
}

export default async function TasksPage({ searchParams }: TasksPageProps) {
  const user = await requireUser();
  const supabase = await createServerClient();
  const { filters, initialTaskId } = parseTaskRouteParams(await searchParams);
  const [taskResult, projects, tags, settingsResult] = await Promise.all([
    listTasks(supabase as never, user.id, filters) as unknown as Promise<{
      data: RawTask[] | null;
    }>,
    listProjectSummaries(
      supabase as unknown as ProjectSupabaseClient,
      user.id,
    ),
    listTagRecords(supabase as unknown as TagSupabaseClient, user.id),
    supabase
      .from("user_settings")
      .select("default_reminder_offsets_minutes")
      .eq("user_id", user.id)
      .maybeSingle() as unknown as Promise<{ data: SettingsRow | null }>,
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">Công việc</h1>
        <p className="mt-1 text-sm text-slate-600">
          Xem và lọc toàn bộ công việc từ cùng một nguồn dữ liệu.
        </p>
      </div>

      <TasksWorkspace
        defaultReminderOffsets={settingsResult.data?.default_reminder_offsets_minutes ?? [1440, 0]}
        filterValues={{
          projectId: filters.projectId ?? undefined,
          priority: filters.priority,
          query: filters.query,
          status: filters.status,
          tagId: filters.tagIds?.[0],
        }}
        initialTaskId={initialTaskId}
        projects={projects.map((project) => ({ id: project.id, name: project.name }))}
        tags={tags.map((tag) => ({ id: tag.id, name: tag.name }))}
        tasks={(taskResult.data ?? []).map(mapTask)}
      />
    </div>
  );
}
