import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  revalidatePath: vi.fn(),
  requireUser: vi.fn(),
}));

vi.mock("@/lib/auth/require-user", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/supabase/server", () => ({ createServerClient: mocks.createServerClient }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import {
  setDefaultReminderOffsets,
  setTaskReminderOffsets,
} from "./reminder-actions";

const taskId = "00000000-0000-4000-8000-000000000010";

type Operation =
  | { method: "delete" | "maybeSingle" | "select" | "insert" | "update"; table: string; value?: unknown }
  | { method: "eq" | "gte" | "is"; table: string; column: string; value: unknown }
  | { method: "from"; table: string };

function createReminderClient() {
  const operations: Operation[] = [];

  function builder(table: string) {
    return {
      delete() {
        operations.push({ method: "delete", table });
        return this;
      },
      eq(column: string, value: unknown) {
        operations.push({ method: "eq", table, column, value });
        return this;
      },
      gte(column: string, value: unknown) {
        operations.push({ method: "gte", table, column, value });
        return this;
      },
      insert(value: unknown) {
        operations.push({ method: "insert", table, value });
        return Promise.resolve({ error: null });
      },
      is(column: string, value: unknown) {
        operations.push({ method: "is", table, column, value });
        return this;
      },
      maybeSingle() {
        operations.push({ method: "maybeSingle", table });
        return Promise.resolve({
          data: table === "tasks"
            ? { id: taskId, due_at: "2026-08-25T10:00:00.000Z" }
            : null,
          error: null,
        });
      },
      select(value?: string) {
        operations.push({ method: "select", table, value });
        return this;
      },
      update(value: unknown) {
        operations.push({ method: "update", table, value });
        return this;
      },
      then(resolve: (value: { error: Error | null }) => unknown) {
        return Promise.resolve({ error: null }).then(resolve);
      },
    };
  }

  return {
    client: {
      from(table: string) {
        operations.push({ method: "from", table });
        return builder(table);
      },
    },
    operations,
  };
}

describe("reminder actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-24T00:00:00.000Z"));
    mocks.requireUser.mockResolvedValue({ id: "server-user-id" });
  });

  test("setTaskReminderOffsets replaces only untriggered future reminders and recalculates rows", async () => {
    const { client, operations } = createReminderClient();
    mocks.createServerClient.mockResolvedValue(client);

    const result = await setTaskReminderOffsets(taskId, [4320, 60, 0]);

    expect(result).toEqual({ ok: true, data: null });
    expect(operations).toContainEqual({
      method: "is",
      table: "task_reminders",
      column: "triggered_at",
      value: null,
    });
    expect(operations).toContainEqual({
      method: "gte",
      table: "task_reminders",
      column: "remind_at",
      value: "2026-08-24T00:00:00.000Z",
    });
    expect(operations).toContainEqual({
      method: "insert",
      table: "task_reminders",
      value: [
        {
          user_id: "server-user-id",
          task_id: taskId,
          offset_minutes: 4320,
          remind_at: "2026-08-22T10:00:00.000Z",
        },
        {
          user_id: "server-user-id",
          task_id: taskId,
          offset_minutes: 60,
          remind_at: "2026-08-25T09:00:00.000Z",
        },
        {
          user_id: "server-user-id",
          task_id: taskId,
          offset_minutes: 0,
          remind_at: "2026-08-25T10:00:00.000Z",
        },
      ],
    });
  });

  test("setDefaultReminderOffsets updates only the authenticated user's settings", async () => {
    const { client, operations } = createReminderClient();
    mocks.createServerClient.mockResolvedValue(client);

    const result = await setDefaultReminderOffsets([0, 1440, 1440]);

    expect(result).toEqual({ ok: true, data: null });
    expect(operations).toContainEqual({
      method: "update",
      table: "user_settings",
      value: { default_reminder_offsets_minutes: [1440, 0] },
    });
    expect(operations).toContainEqual({
      method: "eq",
      table: "user_settings",
      column: "user_id",
      value: "server-user-id",
    });
  });
});
