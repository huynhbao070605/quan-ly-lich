import { expect, test } from "vitest";
import { formatVietnamDateTime, isOverdue } from "./time";

test("định dạng thời gian theo múi giờ Việt Nam", () => {
  const date = new Date("2026-08-20T10:00:00+07:00");

  expect(formatVietnamDateTime(date)).toBe("10:00 20/08/2026");
});

test("DONE và CANCELLED không bao giờ được coi là quá hạn", () => {
  const now = new Date("2026-08-20T10:00:00+07:00");
  const dueAt = new Date("2026-08-20T09:00:00+07:00");

  expect(isOverdue({ dueAt, status: "DONE", now })).toBe(false);
  expect(isOverdue({ dueAt, status: "CANCELLED", now })).toBe(false);
  expect(isOverdue({ dueAt, status: "TODO", now })).toBe(true);
});
