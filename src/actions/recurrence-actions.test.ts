import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  createSeriesDomain: vi.fn(),
  ensureNextOccurrenceDomain: vi.fn(),
  revalidatePath: vi.fn(),
  requireUser: vi.fn(),
  updateOccurrenceOnlyDomain: vi.fn(),
}));

vi.mock("@/lib/auth/require-user", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/supabase/server", () => ({
  createServerClient: mocks.createServerClient,
}));
vi.mock("@/lib/recurrence/materialize", () => ({
  createRecurrenceSeries: mocks.createSeriesDomain,
  ensureNextOccurrence: mocks.ensureNextOccurrenceDomain,
  updateOccurrenceOnly: mocks.updateOccurrenceOnlyDomain,
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import {
  createRecurrenceSeries,
  ensureNextOccurrence,
  updateOccurrenceOnly,
} from "./recurrence-actions";

const taskId = "00000000-0000-4000-8000-000000000010";
const seriesId = "00000000-0000-4000-8000-000000000020";

describe("recurrence actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createServerClient.mockResolvedValue({ from: vi.fn() });
    mocks.requireUser.mockResolvedValue({ id: "server-user-id" });
    mocks.createSeriesDomain.mockResolvedValue({ id: seriesId });
    mocks.ensureNextOccurrenceDomain.mockResolvedValue({ id: taskId });
    mocks.updateOccurrenceOnlyDomain.mockResolvedValue({ id: taskId });
  });

  test("createRecurrenceSeries rejects invalid input before auth", async () => {
    const result = await createRecurrenceSeries("not-a-task-id", {
      frequency: "DAILY",
      interval: 1,
    });

    expect(result).toEqual({
      ok: false,
      message: "Thông tin lặp lại không hợp lệ.",
    });
    expect(mocks.requireUser).not.toHaveBeenCalled();
  });

  test("createRecurrenceSeries uses the authenticated server session", async () => {
    const result = await createRecurrenceSeries(taskId, {
      frequency: "DAILY",
      interval: 1,
    });

    expect(result).toEqual({ ok: true, data: { id: seriesId } });
    expect(mocks.requireUser).toHaveBeenCalledTimes(1);
    expect(mocks.createServerClient).toHaveBeenCalledTimes(1);
    expect(mocks.createSeriesDomain).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "server-user-id" }),
      taskId,
      expect.objectContaining({ frequency: "DAILY", interval: 1 }),
    );
  });

  test("ensureNextOccurrence revalidates calendar and task views", async () => {
    await ensureNextOccurrence(seriesId);

    expect(mocks.revalidatePath).toHaveBeenCalledWith("/app/lich");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/app/cong-viec");
  });

  test("updateOccurrenceOnly returns a Vietnamese failure on invalid patch", async () => {
    const result = await updateOccurrenceOnly(taskId, { title: "" });

    expect(result).toEqual({
      ok: false,
      message: "Thông tin lặp lại không hợp lệ.",
    });
  });
});
