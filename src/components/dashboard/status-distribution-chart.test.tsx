import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { StatusDistributionChart } from "./status-distribution-chart";

test("renders Vietnamese task status distribution labels and counts", () => {
  render(
    <StatusDistributionChart
      items={[
        { status: "TODO", label: "Cần làm", count: 2 },
        { status: "IN_PROGRESS", label: "Đang thực hiện", count: 1 },
        { status: "DONE", label: "Hoàn thành", count: 3 },
        { status: "CANCELLED", label: "Đã hủy", count: 0 },
      ]}
    />,
  );

  expect(screen.getByRole("heading", { name: "Theo trạng thái" })).toBeVisible();
  expect(screen.getByText("Cần làm")).toBeVisible();
  expect(screen.getByText("3")).toBeVisible();
  expect(screen.getByText("Đã hủy")).toBeVisible();
});
