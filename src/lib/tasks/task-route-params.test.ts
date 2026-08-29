import { describe, expect, test } from "vitest";

import { parseTaskRouteParams } from "./task-route-params";

const projectId = "00000000-0000-4000-8000-000000000020";
const tagId = "00000000-0000-4000-8000-000000000030";
const taskId = "00000000-0000-4000-8000-000000000010";

describe("parseTaskRouteParams", () => {
  test("maps valid URL values to server query filters and a detail deep link", () => {
    expect(
      parseTaskRouteParams({
        query: "  báo cáo  ",
        projectId,
        tagId,
        priority: "HIGH",
        status: "IN_PROGRESS",
        taskId,
      }),
    ).toEqual({
      filters: {
        query: "báo cáo",
        projectId,
        tagIds: [tagId],
        priority: "HIGH",
        status: "IN_PROGRESS",
      },
      initialTaskId: taskId,
    });
  });

  test("ignores invalid IDs, enum values, and duplicate array parameters", () => {
    expect(
      parseTaskRouteParams({
        projectId: "not-a-uuid",
        priority: "BLOCKER",
        status: ["TODO", "DONE"],
        taskId: "not-a-uuid",
      }),
    ).toEqual({ filters: {}, initialTaskId: null });
  });
});
