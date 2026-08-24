import { describe, expect, test } from "vitest";

import {
  createRecurrenceSeries,
  ensureNextOccurrence,
  removeFutureRecurrence,
  updateOccurrenceOnly,
  updateThisAndFuture,
  type RecurrenceMaterializeRepository,
  type RecurrenceSeriesRecord,
  type RecurringTaskRecord,
} from "./materialize";

const userId = "user-1";
const seriesId = "series-1";

function createTask(
  overrides: Partial<RecurringTaskRecord>,
): RecurringTaskRecord {
  return {
    id: "task-1",
    userId,
    projectId: null,
    title: "Gym",
    description: null,
    status: "TODO",
    priority: "MEDIUM",
    startAt: "2026-08-20T11:00:00.000Z",
    dueAt: "2026-08-20T12:00:00.000Z",
    allDay: false,
    important: false,
    urgent: false,
    eisenhowerOverride: false,
    recurrenceSeriesId: seriesId,
    occurrenceStartAt: "2026-08-20T11:00:00.000Z",
    recurrenceException: false,
    completedAt: null,
    reminderOffsets: [60, 0],
    ...overrides,
  };
}

function createRepository() {
  const series: RecurrenceSeriesRecord[] = [
    {
      id: seriesId,
      userId,
      sourceTaskId: "task-1",
      frequency: "DAILY",
      interval: 1,
      weekdays: null,
      monthDay: null,
      startsAt: "2026-08-20T11:00:00.000Z",
      endsAt: null,
    },
  ];
  const tasks: RecurringTaskRecord[] = [
    createTask({ id: "task-1" }),
  ];
  const createdOccurrences: RecurringTaskRecord[] = [];

  const repository: RecurrenceMaterializeRepository = {
    async createOccurrence(input) {
      const existing = tasks.find(
        (task) =>
          task.recurrenceSeriesId === input.recurrenceSeriesId &&
          task.occurrenceStartAt === input.occurrenceStartAt,
      );

      if (existing) {
        return existing;
      }

      const task = createTask({
        ...input,
        id: `task-${tasks.length + 1}`,
      });
      tasks.push(task);
      createdOccurrences.push(task);
      return task;
    },
    async createSeries(input) {
      const created = {
        id: `series-${series.length + 1}`,
        userId: input.userId,
        sourceTaskId: input.sourceTaskId,
        frequency: input.rule.frequency,
        interval: input.rule.interval,
        weekdays: input.rule.weekdays ?? null,
        monthDay: input.rule.monthDay ?? null,
        startsAt: input.startsAt,
        endsAt: input.rule.endsAt?.toISOString() ?? null,
      };
      series.push(created);
      return created;
    },
    async deleteFutureOccurrences(targetSeriesId, fromOccurrenceStartAt) {
      const before = tasks.length;
      const kept = tasks.filter(
        (task) =>
          task.recurrenceSeriesId !== targetSeriesId ||
          task.occurrenceStartAt === null ||
          task.occurrenceStartAt < fromOccurrenceStartAt ||
          task.status === "DONE",
      );
      tasks.splice(0, tasks.length, ...kept);
      return before - kept.length;
    },
    async getLatestOccurrence(targetSeriesId) {
      return tasks
        .filter((task) => task.recurrenceSeriesId === targetSeriesId)
        .toSorted((a, b) =>
          (b.occurrenceStartAt ?? "").localeCompare(a.occurrenceStartAt ?? ""),
        )[0] ?? null;
    },
    async getSeries(targetSeriesId) {
      return series.find((item) => item.id === targetSeriesId) ?? null;
    },
    async getTask(taskId) {
      return tasks.find((task) => task.id === taskId) ?? null;
    },
    async listFutureOccurrences(targetSeriesId, fromOccurrenceStartAt) {
      return tasks.filter(
        (task) =>
          task.recurrenceSeriesId === targetSeriesId &&
          task.occurrenceStartAt !== null &&
          task.occurrenceStartAt >= fromOccurrenceStartAt &&
          task.status !== "DONE",
      );
    },
    async updateSeries(targetSeriesId, patch) {
      const existing = series.find((item) => item.id === targetSeriesId);
      if (!existing) {
        throw new Error("Series not found.");
      }
      Object.assign(existing, patch);
      return existing;
    },
    async updateTask(taskId, patch) {
      const existing = tasks.find((task) => task.id === taskId);
      if (!existing) {
        throw new Error("Task not found.");
      }
      Object.assign(existing, patch);
      return existing;
    },
  };

  return { createdOccurrences, repository, series, tasks };
}

describe("recurrence materialization", () => {
  test("ensureNextOccurrence creates the next occurrence once and clones reminder offsets", async () => {
    const { createdOccurrences, repository, tasks } = createRepository();

    const first = await ensureNextOccurrence(repository, seriesId);
    const second = await ensureNextOccurrence(repository, seriesId);

    expect(first.occurrenceStartAt).toBe("2026-08-21T11:00:00.000Z");
    expect(second.id).toBe(first.id);
    expect(createdOccurrences).toHaveLength(1);
    expect(tasks).toHaveLength(2);
    expect(first).toMatchObject({
      dueAt: "2026-08-21T12:00:00.000Z",
      reminderOffsets: [60, 0],
      title: "Gym",
    });
  });

  test("createRecurrenceSeries anchors the source task to the new series", async () => {
    const { repository, tasks } = createRepository();

    const created = await createRecurrenceSeries(repository, "task-1", {
      frequency: "WEEKLY",
      interval: 1,
      weekdays: [4],
    });

    expect(created).toMatchObject({
      frequency: "WEEKLY",
      sourceTaskId: "task-1",
      startsAt: "2026-08-20T11:00:00.000Z",
    });
    expect(tasks[0]).toMatchObject({
      recurrenceSeriesId: created.id,
      occurrenceStartAt: "2026-08-20T11:00:00.000Z",
    });
  });

  test("updateOccurrenceOnly changes only the selected occurrence and marks it as an exception", async () => {
    const { repository, series, tasks } = createRepository();
    tasks.push(createTask({
      id: "task-2",
      occurrenceStartAt: "2026-08-21T11:00:00.000Z",
      startAt: "2026-08-21T11:00:00.000Z",
      dueAt: "2026-08-21T12:00:00.000Z",
    }));

    await updateOccurrenceOnly(repository, "task-1", {
      title: "Gym riêng",
      dueAt: "2026-08-20T13:00:00.000Z",
    });

    expect(tasks[0]).toMatchObject({
      title: "Gym riêng",
      dueAt: "2026-08-20T13:00:00.000Z",
      recurrenceException: true,
    });
    expect(tasks[1]).toMatchObject({
      title: "Gym",
      dueAt: "2026-08-21T12:00:00.000Z",
      recurrenceException: false,
    });
    expect(series[0].endsAt).toBeNull();
  });

  test("updateThisAndFuture splits the series without rewriting historical occurrences", async () => {
    const { repository, series, tasks } = createRepository();
    tasks.push(
      createTask({
        id: "task-2",
        occurrenceStartAt: "2026-08-21T11:00:00.000Z",
        startAt: "2026-08-21T11:00:00.000Z",
        dueAt: "2026-08-21T12:00:00.000Z",
      }),
      createTask({
        id: "task-3",
        occurrenceStartAt: "2026-08-22T11:00:00.000Z",
        startAt: "2026-08-22T11:00:00.000Z",
        dueAt: "2026-08-22T12:00:00.000Z",
      }),
    );

    const result = await updateThisAndFuture(repository, "task-2", {
      title: "Gym tối",
      startAt: "2026-08-21T12:00:00.000Z",
      dueAt: "2026-08-21T13:00:00.000Z",
    });

    expect(series[0].endsAt).toBe("2026-08-21T10:59:59.999Z");
    expect(result.newSeries.startsAt).toBe("2026-08-21T12:00:00.000Z");
    expect(tasks[0]).toMatchObject({
      recurrenceSeriesId: seriesId,
      title: "Gym",
    });
    expect(tasks[1]).toMatchObject({
      recurrenceSeriesId: result.newSeries.id,
      occurrenceStartAt: "2026-08-21T12:00:00.000Z",
      title: "Gym tối",
    });
    expect(tasks[2]).toMatchObject({
      recurrenceSeriesId: result.newSeries.id,
      title: "Gym tối",
    });
  });

  test("removeFutureRecurrence ends the series before the selected occurrence and removes open future tasks", async () => {
    const { repository, series, tasks } = createRepository();
    tasks.push(
      createTask({
        id: "task-2",
        occurrenceStartAt: "2026-08-21T11:00:00.000Z",
      }),
      createTask({
        id: "task-3",
        occurrenceStartAt: "2026-08-22T11:00:00.000Z",
        status: "DONE",
      }),
    );

    const removed = await removeFutureRecurrence(
      repository,
      seriesId,
      "2026-08-21T11:00:00.000Z",
    );

    expect(series[0].endsAt).toBe("2026-08-21T10:59:59.999Z");
    expect(removed).toBe(1);
    expect(tasks.map((task) => task.id)).toEqual(["task-1", "task-3"]);
  });
});
