import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { TaskFilters } from "./task-filters";

describe("TaskFilters", () => {
  test("submits GET filters with loaded options and current values", () => {
    render(
      <TaskFilters
        projects={[{ id: "project-1", name: "Công việc" }]}
        tags={[{ id: "tag-1", name: "Gấp" }]}
        values={{
          query: "báo cáo",
          projectId: "project-1",
          tagId: "tag-1",
          priority: "HIGH",
          status: "IN_PROGRESS",
        }}
      />,
    );

    const form = screen.getByRole("form", { name: "Lọc công việc" });
    expect(form).toHaveAttribute("method", "get");
    expect(form).toHaveAttribute("action", "/app/cong-viec");
    expect(screen.getByLabelText("Tìm kiếm")).toHaveValue("báo cáo");
    expect(screen.getByLabelText("Dự án")).toHaveValue("project-1");
    expect(screen.getByLabelText("Thẻ")).toHaveValue("tag-1");
    expect(screen.getByLabelText("Ưu tiên")).toHaveValue("HIGH");
    expect(screen.getByLabelText("Trạng thái")).toHaveValue("IN_PROGRESS");
    expect(screen.getByRole("button", { name: "Lọc" })).toBeVisible();
  });
});
