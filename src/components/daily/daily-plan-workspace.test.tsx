import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  removeFocus: vi.fn(),
  reorderFocus: vi.fn(),
  setFocus: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));
vi.mock("@/actions/focus-actions", () => ({
  removeFocus: mocks.removeFocus,
  reorderFocus: mocks.reorderFocus,
  setFocus: mocks.setFocus,
}));

import { DailyPlanWorkspace, type DailyWorkspaceTask } from "./daily-plan-workspace";

const focusTask: DailyWorkspaceTask = {
  id: "00000000-0000-4000-8000-000000000010",
  title: "Nộp báo cáo",
  status: "TODO",
  priority: "HIGH",
  startAt: null,
  dueAt: "2026-08-21T08:00:00.000Z",
  allDay: false,
  completedAt: null,
  focusDate: "2026-08-21",
  focusPosition: 1,
  project: null,
};

const candidateTask: DailyWorkspaceTask = {
  ...focusTask,
  id: "00000000-0000-4000-8000-000000000011",
  title: "Gọi khách hàng",
  priority: "MEDIUM",
  focusDate: null,
  focusPosition: null,
};

describe("DailyPlanWorkspace", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.setFocus.mockResolvedValue({ ok: true, data: null });
    mocks.removeFocus.mockResolvedValue({ ok: true, data: null });
    mocks.reorderFocus.mockResolvedValue({ ok: true, data: null });
  });

  test("adds and removes Today's Focus tasks through Focus actions", async () => {
    const user = userEvent.setup();
    render(
      <DailyPlanWorkspace
        date="2026-08-21"
        groups={{
          focus: [focusTask],
          overdue: [],
          today: [candidateTask],
          allDay: [],
          completed: [],
        }}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Thêm Gọi khách hàng vào trọng tâm" }),
    );
    expect(mocks.setFocus).toHaveBeenCalledWith(candidateTask.id, "2026-08-21", 2);

    await user.click(
      screen.getByRole("button", { name: "Xóa Nộp báo cáo khỏi trọng tâm" }),
    );
    expect(mocks.removeFocus).toHaveBeenCalledWith(focusTask.id);
  });

  test("reorders Today's Focus using the complete ordered ID set", async () => {
    const user = userEvent.setup();
    render(
      <DailyPlanWorkspace
        date="2026-08-21"
        groups={{
          focus: [focusTask, { ...candidateTask, focusDate: "2026-08-21", focusPosition: 2 }],
          overdue: [],
          today: [],
          allDay: [],
          completed: [],
        }}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Đưa Gọi khách hàng lên" }),
    );

    expect(mocks.reorderFocus).toHaveBeenCalledWith("2026-08-21", [
      candidateTask.id,
      focusTask.id,
    ]);
  });
});
