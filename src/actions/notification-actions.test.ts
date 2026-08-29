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
  deleteNotification,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "./notification-actions";

const notificationId = "00000000-0000-4000-8000-000000000010";

type Operation =
  | { method: "delete" | "order" | "select" | "update"; table: string; value?: unknown }
  | { method: "eq" | "is"; table: string; column: string; value: unknown }
  | { method: "from"; table: string };

function createNotificationClient() {
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
      is(column: string, value: unknown) {
        operations.push({ method: "is", table, column, value });
        return this;
      },
      order(column: string) {
        operations.push({ method: "order", table, value: column });
        return Promise.resolve({ data: [], error: null });
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

describe("notification actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-24T02:00:00.000Z"));
    mocks.requireUser.mockResolvedValue({ id: "server-user-id" });
  });

  test("listNotifications scopes reads to the authenticated user", async () => {
    const { client, operations } = createNotificationClient();
    mocks.createServerClient.mockResolvedValue(client);

    await listNotifications();

    expect(operations).toContainEqual({
      method: "eq",
      table: "notifications",
      column: "user_id",
      value: "server-user-id",
    });
  });

  test("markNotificationRead scopes update to the authenticated user and notification id", async () => {
    const { client, operations } = createNotificationClient();
    mocks.createServerClient.mockResolvedValue(client);

    await markNotificationRead(notificationId);

    expect(operations).toContainEqual({
      method: "update",
      table: "notifications",
      value: { read_at: "2026-08-24T02:00:00.000Z" },
    });
    expect(operations).toContainEqual({
      method: "eq",
      table: "notifications",
      column: "user_id",
      value: "server-user-id",
    });
    expect(operations).toContainEqual({
      method: "eq",
      table: "notifications",
      column: "id",
      value: notificationId,
    });
  });

  test("markAllNotificationsRead only updates unread notifications for the authenticated user", async () => {
    const { client, operations } = createNotificationClient();
    mocks.createServerClient.mockResolvedValue(client);

    await markAllNotificationsRead();

    expect(operations).toContainEqual({
      method: "is",
      table: "notifications",
      column: "read_at",
      value: null,
    });
    expect(operations).toContainEqual({
      method: "eq",
      table: "notifications",
      column: "user_id",
      value: "server-user-id",
    });
  });

  test("deleteNotification scopes deletion to the authenticated user", async () => {
    const { client, operations } = createNotificationClient();
    mocks.createServerClient.mockResolvedValue(client);

    await deleteNotification(notificationId);

    expect(operations).toContainEqual({
      method: "delete",
      table: "notifications",
    });
    expect(operations).toContainEqual({
      method: "eq",
      table: "notifications",
      column: "user_id",
      value: "server-user-id",
    });
    expect(operations).toContainEqual({
      method: "eq",
      table: "notifications",
      column: "id",
      value: notificationId,
    });
  });
});
