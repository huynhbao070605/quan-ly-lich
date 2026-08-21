"use client";

import { Plus, Tag } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { overrideEisenhower, resetEisenhower } from "@/actions/eisenhower-actions";
import {
  addSubtask,
  deleteSubtask,
  reorderSubtasks,
  toggleSubtask,
} from "@/actions/subtask-actions";
import { createTag } from "@/actions/tag-actions";
import { createTask, deleteTask, updateTask } from "@/actions/task-actions";
import { quadrantFromFlags } from "@/lib/tasks/eisenhower";
import type { SubtaskRecord } from "@/lib/tasks/subtask-repository";
import type { CreateTaskInput, UpdateTaskInput } from "@/lib/validation/task";

import { QuickAddTask } from "./quick-add-task";
import { TaskDetailSheet } from "./task-detail-sheet";
import { TaskFilters } from "./task-filters";
import type { TaskListItem } from "./task-list";
import { TaskViews } from "./task-views";

type Option = { id: string; name: string };

export type TasksWorkspaceTask = Omit<
  TaskListItem,
  "description" | "dueAt" | "project" | "tags"
> & {
  description: string | null;
  dueAt: string | null;
  project: Option | null;
  tags: Option[];
  projectId: string | null;
  startAt: string | null;
  allDay: boolean;
  important: boolean;
  urgent: boolean;
  eisenhowerOverride: boolean;
  tagIds: string[];
  subtasks: SubtaskRecord[];
};

type TasksWorkspaceProps = {
  filterValues?: {
    projectId?: string;
    priority?: TasksWorkspaceTask["priority"];
    query?: string;
    status?: TasksWorkspaceTask["status"];
    tagId?: string;
  };
  initialTaskId: string | null;
  projects: Option[];
  tags: Option[];
  tasks: TasksWorkspaceTask[];
};

export function TasksWorkspace({
  filterValues,
  initialTaskId,
  projects,
  tags,
  tasks,
}: TasksWorkspaceProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [newTagName, setNewTagName] = useState("");
  const [selection, setSelection] = useState({
    initialTaskId,
    selectedTaskId: initialTaskId,
  });
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showTagForm, setShowTagForm] = useState(false);
  const selectedTaskId =
    selection.initialTaskId === initialTaskId ? selection.selectedTaskId : initialTaskId;
  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? null;

  function selectTask(selectedTaskId: string | null) {
    setSelection({ initialTaskId, selectedTaskId });
  }

  async function refreshOnSuccess<T>(
    promise: Promise<{ ok: true; data: T } | { ok: false; message: string }>,
  ): Promise<boolean> {
    const result = await promise;
    if (!result.ok) {
      setError(result.message);
      return false;
    }

    setError(null);
    router.refresh();
    return true;
  }

  async function handleCreate(input: CreateTaskInput) {
    if (await refreshOnSuccess(createTask(input))) {
      setShowQuickAdd(false);
    }
  }

  async function handleUpdate(taskId: string, input: UpdateTaskInput) {
    await refreshOnSuccess(updateTask(taskId, input));
  }

  async function handleDelete(taskId: string) {
    if (await refreshOnSuccess(deleteTask(taskId))) {
      selectTask(null);
    }
  }

  async function handleCreateTag() {
    const name = newTagName.trim();
    if (name.length === 0) return;

    if (await refreshOnSuccess(createTag({ name }))) {
      setNewTagName("");
      setShowTagForm(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-end gap-2">
        <button
          className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          onClick={() => setShowTagForm((visible) => !visible)}
          type="button"
        >
          <Tag aria-hidden="true" className="size-4" />
          Thẻ mới
        </button>
        <button
          className="inline-flex items-center justify-center gap-2 rounded-md bg-teal-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-700"
          onClick={() => setShowQuickAdd((visible) => !visible)}
          type="button"
        >
          <Plus aria-hidden="true" className="size-4" />
          Công việc mới
        </button>
      </div>

      {showTagForm ? (
        <form
          className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row sm:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            void handleCreateTag();
          }}
        >
          <label className="min-w-0 flex-1 space-y-1">
            <span className="text-sm font-medium text-slate-700">Tên thẻ</span>
            <input
              className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950"
              onChange={(event) => setNewTagName(event.target.value)}
              value={newTagName}
            />
          </label>
          <button
            className="inline-flex h-10 items-center justify-center rounded-md bg-teal-600 px-4 text-sm font-semibold text-white hover:bg-teal-700"
            type="submit"
          >
            Tạo thẻ
          </button>
        </form>
      ) : null}

      {showQuickAdd ? <QuickAddTask onCreate={handleCreate} projects={projects} /> : null}

      {error ? (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700" role="status">
          {error}
        </p>
      ) : null}

      <TaskFilters projects={projects} tags={tags} values={filterValues} />
      <TaskViews onSelectTask={selectTask} tasks={tasks} />

      {selectedTask ? (
        <TaskDetailSheet
          key={selectedTask.id}
          onAddSubtask={async (taskId, title) => {
            await refreshOnSuccess(addSubtask(taskId, title));
          }}
          onClose={() => selectTask(null)}
          onDelete={handleDelete}
          onDeleteSubtask={async (subtaskId) => {
            await refreshOnSuccess(deleteSubtask(subtaskId));
          }}
          onEisenhowerChange={async (taskId, value) => {
            if (value.manual) {
              await refreshOnSuccess(
                overrideEisenhower(
                  taskId,
                  quadrantFromFlags({
                    important: value.important,
                    urgent: value.urgent,
                  }),
                ),
              );
            } else {
              await refreshOnSuccess(resetEisenhower(taskId));
            }
          }}
          onReorderSubtasks={async (taskId, orderedIds) => {
            await refreshOnSuccess(reorderSubtasks(taskId, orderedIds));
          }}
          onToggleSubtask={async (subtaskId, completed) => {
            await refreshOnSuccess(toggleSubtask(subtaskId, completed));
          }}
          onUpdate={handleUpdate}
          open
          projects={projects}
          subtasks={selectedTask.subtasks}
          tags={tags}
          task={selectedTask}
        />
      ) : null}
    </div>
  );
}
