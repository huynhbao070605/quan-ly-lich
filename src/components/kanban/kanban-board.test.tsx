import { expect, test } from "vitest";

import { getPriorityBreakdown } from "./kanban-board";
import type { KanbanTask } from "./task-card";

const baseTask: KanbanTask = {
  id: "task-1",
  title: "Nộp báo cáo",
  status: "TODO",
  priority: "LOW",
  dueAt: null,
  project: null,
  position: 0,
};

test("builds Kanban priority distribution from the displayed task dataset", () => {
  const data = getPriorityBreakdown([
    baseTask,
    { ...baseTask, id: "task-2", priority: "MEDIUM" },
    { ...baseTask, id: "task-3", priority: "HIGH" },
    { ...baseTask, id: "task-4", priority: "URGENT" },
    { ...baseTask, id: "task-5", priority: "URGENT" },
  ]);

  expect(data).toEqual([
    expect.objectContaining({ priority: "LOW", label: "Thấp", count: 1 }),
    expect.objectContaining({ priority: "MEDIUM", label: "Trung bình", count: 1 }),
    expect.objectContaining({ priority: "HIGH", label: "Cao", count: 1 }),
    expect.objectContaining({ priority: "URGENT", label: "Khẩn cấp", count: 2 }),
  ]);
});
