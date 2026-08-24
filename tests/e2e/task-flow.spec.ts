import { expect, test } from "@playwright/test";

import { authStatePath } from "./helpers/auth";

test.describe("core task workflow", () => {
  test.skip(
    !authStatePath,
    "DEFERRED LIVE AUTH E2E: core task workflow requires a real authenticated browser state and database.",
  );

  test.use({ storageState: authStatePath });

  test("creates a task with Quick Add and shows it in Công việc", async ({ page }) => {
    await page.goto("/app/cong-viec");

    await page.getByRole("button", { name: "Công việc mới" }).click();
    await page.getByLabel("Tên công việc").fill("Nộp báo cáo");
    await page.getByRole("button", { name: "Tạo công việc" }).click();

    await expect(page.getByText("Nộp báo cáo")).toBeVisible();
  });

  test("marks a task done and updates dashboard counts", async ({ page }) => {
    await page.goto("/app/cong-viec");
    await page.getByText("Nộp báo cáo").click();
    await page.getByLabel("Trạng thái").selectOption("DONE");
    await page.getByRole("button", { name: "Lưu thay đổi" }).click();

    await page.goto("/app/tong-quan");
    await expect(page.getByText("Hoàn thành")).toBeVisible();
  });
});
