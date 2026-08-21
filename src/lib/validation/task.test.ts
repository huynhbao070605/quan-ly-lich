import { describe, expect, test } from "vitest";
import { createTaskSchema, taskFilterSchema, updateTaskSchema } from "./task";

const projectId = "00000000-0000-4000-8000-000000000001";
const tagId = "00000000-0000-4000-8000-000000000003";

describe("createTaskSchema", () => {
  test("accepts a minimal task with a valid title", () => {
    expect(createTaskSchema.safeParse({ title: "Nộp báo cáo" }).success).toBe(
      true,
    );
  });

  test("rejects a blank title", () => {
    expect(createTaskSchema.safeParse({ title: "" }).success).toBe(false);
    expect(createTaskSchema.safeParse({ title: "   " }).success).toBe(false);
  });

  test("rejects a title longer than 200 characters", () => {
    expect(
      createTaskSchema.safeParse({ title: "x".repeat(201) }).success,
    ).toBe(false);
  });

  test("rejects invalid status and priority values", () => {
    expect(
      createTaskSchema.safeParse({
        title: "Nộp báo cáo",
        status: "WAITING",
      }).success,
    ).toBe(false);

    expect(
      createTaskSchema.safeParse({
        title: "Nộp báo cáo",
        priority: "BLOCKER",
      }).success,
    ).toBe(false);
  });

  test("accepts optional task fields and tag IDs", () => {
    const result = createTaskSchema.safeParse({
      title: "Nộp báo cáo",
      projectId,
      description: "Chuẩn bị bản tóm tắt cuối tuần",
      status: "IN_PROGRESS",
      priority: "HIGH",
      startAt: "2026-08-21T08:00:00.000Z",
      dueAt: "2026-08-21T10:00:00.000Z",
      allDay: false,
      tagIds: [tagId],
      important: true,
      urgent: true,
      eisenhowerOverride: true,
    });

    expect(result.success).toBe(true);
  });
});

describe("updateTaskSchema", () => {
  test("accepts partial task fields without requiring a task ID", () => {
    const result = updateTaskSchema.safeParse({
      title: "Nộp báo cáo đã sửa",
      dueAt: "2026-08-22T10:00:00.000Z",
      tagIds: [tagId],
      important: false,
      urgent: true,
      eisenhowerOverride: true,
    });

    expect(result.success).toBe(true);
  });

  test("rejects invalid status and priority values", () => {
    expect(updateTaskSchema.safeParse({ status: "OPEN" }).success).toBe(false);
    expect(updateTaskSchema.safeParse({ priority: "P0" }).success).toBe(false);
  });
});

describe("taskFilterSchema", () => {
  test("accepts task field filters", () => {
    const result = taskFilterSchema.safeParse({
      projectId,
      description: "báo cáo",
      tagIds: [tagId],
      status: "TODO",
      priority: "URGENT",
      startAt: "2026-08-21T08:00:00.000Z",
      dueAt: "2026-08-21T10:00:00.000Z",
      allDay: true,
      important: true,
      urgent: false,
      eisenhowerOverride: false,
    });

    expect(result.success).toBe(true);
  });

  test("rejects invalid filter IDs and enum values", () => {
    expect(taskFilterSchema.safeParse({ projectId: "not-a-uuid" }).success)
      .toBe(false);
    expect(taskFilterSchema.safeParse({ status: "WAITING" }).success).toBe(
      false,
    );
    expect(taskFilterSchema.safeParse({ priority: "BLOCKER" }).success).toBe(
      false,
    );
  });
});
