import { expect, test } from "@playwright/test";

import { authStatePath } from "./helpers/auth";

test.describe("cross-view task consistency", () => {
  test.skip(
    !authStatePath,
    "DEFERRED LIVE AUTH E2E: cross-view workflow requires a real authenticated browser state and database.",
  );

  test.use({ storageState: authStatePath });

  test("keeps Kanban status and task list status consistent", async ({ page }) => {
    await page.goto("/app/kanban");
    await page.getByText("Nộp báo cáo").dragTo(page.getByText("Đang thực hiện"));

    await page.goto("/app/cong-viec");
    await page.getByText("Nộp báo cáo").click();

    await expect(page.getByLabel("Trạng thái")).toHaveValue("IN_PROGRESS");
  });

  test("preserves manual Eisenhower quadrant after later priority changes", async ({ page }) => {
    await page.goto("/app/cong-viec");
    await page.getByText("Nộp báo cáo").click();
    await page.getByLabel("Ưu tiên").selectOption("HIGH");
    await page.getByLabel("Quan trọng").check();
    await page.getByRole("button", { name: "Lưu thay đổi" }).click();

    await page.goto("/app/eisenhower");
    await page.getByText("Nộp báo cáo").dragTo(page.getByRole("region", { name: "Lên lịch" }));

    await page.goto("/app/cong-viec");
    await page.getByText("Nộp báo cáo").click();
    await page.getByLabel("Ưu tiên").selectOption("LOW");
    await page.getByRole("button", { name: "Lưu thay đổi" }).click();

    await page.goto("/app/eisenhower");
    await expect(page.getByRole("region", { name: "Lên lịch" }).getByText("Nộp báo cáo")).toBeVisible();
  });

  test("keeps Calendar, Daily Plan and Weekly Plan placement consistent", async ({ page }) => {
    test.skip(
      !process.env.E2E_DATABASE_ASSERTIONS,
      "DEFERRED LIVE DB/RLS VERIFICATION: reminder row recalculation needs database assertions.",
    );

    await page.goto("/app/lich");
    await page.getByText("Nộp báo cáo").click();
    await page.getByLabel("Ngày").fill("2026-08-25");
    await page.getByRole("button", { name: "Lưu thay đổi" }).click();

    await page.goto("/app/ke-hoach-ngay");
    await expect(page.getByText("Nộp báo cáo")).toBeVisible();

    await page.goto("/app/ke-hoach-tuan");
    await expect(page.getByText("Nộp báo cáo")).toBeVisible();
  });
});
