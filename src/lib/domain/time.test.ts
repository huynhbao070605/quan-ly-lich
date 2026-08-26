import { expect, test } from "vitest";
import {
  formatVietnamDateInput,
  formatVietnamDateTime,
  formatVietnamTimeInput,
  isOverdue,
  vietnamDateTimeToUtcIso,
} from "./time";

test("định dạng thời gian theo múi giờ Việt Nam", () => {
  const date = new Date("2026-08-20T10:00:00+07:00");

  expect(formatVietnamDateTime(date)).toBe("10:00 20/08/2026");
});

test("chuyển ngày và giờ nhập vào theo múi giờ Việt Nam", () => {
  expect(vietnamDateTimeToUtcIso("2026-08-26", "09:30")).toBe(
    "2026-08-26T02:30:00.000Z",
  );
  expect(vietnamDateTimeToUtcIso("2026-08-26", "00:00")).toBe(
    "2026-08-25T17:00:00.000Z",
  );
});

test("hiển thị thời hạn đã lưu ngược lại thành input ngày giờ Việt Nam", () => {
  const date = new Date("2026-08-26T02:30:00.000Z");

  expect(formatVietnamDateInput(date)).toBe("2026-08-26");
  expect(formatVietnamTimeInput(date)).toBe("09:30");
});

test("DONE và CANCELLED không bao giờ được coi là quá hạn", () => {
  const now = new Date("2026-08-20T10:00:00+07:00");
  const dueAt = new Date("2026-08-20T09:00:00+07:00");

  expect(isOverdue({ dueAt, status: "DONE", now })).toBe(false);
  expect(isOverdue({ dueAt, status: "CANCELLED", now })).toBe(false);
  expect(isOverdue({ dueAt, status: "TODO", now })).toBe(true);
});
