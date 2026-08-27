import { describe, expect, it } from "vitest";
import { nextOccurrence } from "./next-occurrence";
import type { RecurrenceRule } from "./types";


describe("nextOccurrence - DAILY", () => {
  it("returns next day with same time", () => {
    const rule: RecurrenceRule = {
      frequency: "DAILY",
      interval: 1,
    };

    const current = new Date("2026-08-25T10:00:00Z");

    const result = nextOccurrence(
      rule,
      current,
      "Asia/Ho_Chi_Minh",
    );

    expect(result?.toISOString())
      .toBe("2026-08-26T10:00:00.000Z");
  });


  it("supports daily interval", () => {
    const rule: RecurrenceRule = {
      frequency: "DAILY",
      interval: 2,
    };

    const current = new Date("2026-08-25T10:00:00Z");

    const result = nextOccurrence(
      rule,
      current,
      "Asia/Ho_Chi_Minh",
    );

    expect(result?.toISOString())
      .toBe("2026-08-27T10:00:00.000Z");
  });
});


describe("nextOccurrence - WEEKLY", () => {
  it("finds next configured weekday", () => {
    const rule: RecurrenceRule = {
      frequency: "WEEKLY",
      interval: 1,
      weekdays: [3], // Wednesday
    };

    const current = new Date("2026-08-24T10:00:00Z"); 
    // Monday

    const result = nextOccurrence(
      rule,
      current,
      "Asia/Ho_Chi_Minh",
    );

    expect(result?.toISOString())
      .toBe("2026-08-26T10:00:00.000Z");
  });

  it("uses Asia Ho Chi Minh weekdays for all-day weekly tasks", () => {
    const rule: RecurrenceRule = {
      frequency: "WEEKLY",
      interval: 1,
      weekdays: [1],
    };

    const current = new Date("2026-08-23T17:00:00.000Z");

    const result = nextOccurrence(
      rule,
      current,
      "Asia/Ho_Chi_Minh",
    );

    expect(result?.toISOString())
      .toBe("2026-08-30T17:00:00.000Z");
  });

  it("supports multiple Asia Ho Chi Minh weekdays in one weekly rule", () => {
    const rule: RecurrenceRule = {
      frequency: "WEEKLY",
      interval: 1,
      weekdays: [1, 3, 5],
    };

    const current = new Date("2026-08-23T17:00:00.000Z");

    const result = nextOccurrence(
      rule,
      current,
      "Asia/Ho_Chi_Minh",
    );

    expect(result?.toISOString())
      .toBe("2026-08-25T17:00:00.000Z");
  });
});


describe("nextOccurrence - MONTHLY", () => {
  it("moves to last valid day when month has no target day", () => {
    const rule: RecurrenceRule = {
      frequency: "MONTHLY",
      interval: 1,
      monthDay: 31,
    };

    const current = new Date("2026-01-31T10:00:00Z");

    const result = nextOccurrence(
      rule,
      current,
      "Asia/Ho_Chi_Minh",
    );

    expect(result?.toISOString())
      .toBe("2026-02-28T10:00:00.000Z");
  });

  it("keeps monthly recurrence on the Asia Ho Chi Minh calendar day", () => {
    const rule: RecurrenceRule = {
      frequency: "MONTHLY",
      interval: 1,
      monthDay: 31,
    };

    const current = new Date("2026-01-30T17:00:00.000Z");

    const result = nextOccurrence(
      rule,
      current,
      "Asia/Ho_Chi_Minh",
    );

    expect(result?.toISOString())
      .toBe("2026-02-27T17:00:00.000Z");
  });
});


describe("nextOccurrence - YEARLY", () => {
  it("handles leap day in non leap year", () => {
    const rule: RecurrenceRule = {
      frequency: "YEARLY",
      interval: 1,
      monthDay: 29,
    };

    const current = new Date("2028-02-29T10:00:00Z");

    const result = nextOccurrence(
      rule,
      current,
      "Asia/Ho_Chi_Minh",
    );

    expect(result?.toISOString())
      .toBe("2029-02-28T10:00:00.000Z");
  });
});
