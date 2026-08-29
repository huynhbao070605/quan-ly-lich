import { describe, expect, test } from "vitest";

import {
  getPriorityPresentation,
  getStatusPresentation,
} from "./task-display";

describe("task display semantics", () => {
  test("gives every status a Vietnamese label and distinct semantic class", () => {
    expect(getStatusPresentation("TODO")).toMatchObject({
      label: "Cần làm",
      tone: "neutral",
    });
    expect(getStatusPresentation("IN_PROGRESS")).toMatchObject({
      label: "Đang thực hiện",
      tone: "active",
    });
    expect(getStatusPresentation("DONE")).toMatchObject({
      label: "Hoàn thành",
      tone: "success",
    });
    expect(getStatusPresentation("CANCELLED")).toMatchObject({
      label: "Đã hủy",
      tone: "muted",
    });
  });

  test("gives every priority a distinct chart color and badge class", () => {
    const colors = [
      getPriorityPresentation("LOW").chartColor,
      getPriorityPresentation("MEDIUM").chartColor,
      getPriorityPresentation("HIGH").chartColor,
      getPriorityPresentation("URGENT").chartColor,
    ];

    expect(new Set(colors)).toHaveLength(4);
    expect(getPriorityPresentation("URGENT").label).toBe("Khẩn cấp");
  });
});
