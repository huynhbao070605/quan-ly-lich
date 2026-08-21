import { describe, expect, it } from "vitest";
import {
  calculateRemindAt,
  recalculateReminderRows,
} from "./calculate";

describe("calculateRemindAt", () => {
  it("calculates reminder time before due date", () => {
    const dueAt = new Date("2026-08-25T10:00:00Z");

    const result = calculateRemindAt(dueAt, 60);

    expect(result.toISOString()).toBe("2026-08-25T09:00:00.000Z");
  });

  it("supports zero offset", () => {
    const dueAt = new Date("2026-08-25T10:00:00Z");

    const result = calculateRemindAt(dueAt, 0);

    expect(result.toISOString()).toBe("2026-08-25T10:00:00.000Z");
  });
});


describe("recalculateReminderRows", () => {
  it("creates reminder rows from offsets", () => {
    const dueAt = new Date("2026-08-25T10:00:00Z");

    const result = recalculateReminderRows(dueAt, [
      60,
      1440,
    ]);

    expect(result).toHaveLength(2);

    expect(result[0].remindAt.toISOString())
      .toBe("2026-08-25T09:00:00.000Z");

    expect(result[1].remindAt.toISOString())
      .toBe("2026-08-24T10:00:00.000Z");
  });
});