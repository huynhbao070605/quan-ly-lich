import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function expectNoSeriousOrCriticalViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  const blockingViolations = results.violations.filter((violation) =>
    ["serious", "critical"].includes(violation.impact ?? ""),
  );

  expect(blockingViolations).toEqual([]);
}

test("login page has no serious or critical axe violations", async ({ page }) => {
  await page.goto("/dang-nhap");

  await expect(page.getByRole("heading", { name: "Đăng nhập" })).toBeVisible();
  await expectNoSeriousOrCriticalViolations(page);
});

test.describe("authenticated accessibility baseline", () => {
  test.skip(
    !process.env.E2E_AUTH_STATE,
    "DEFERRED LIVE AUTH E2E: task list, dashboard and settings axe checks require a real authenticated browser state.",
  );

  test.use({ storageState: process.env.E2E_AUTH_STATE });

  for (const path of ["/app/cong-viec", "/app/tong-quan", "/app/cai-dat"]) {
    test(`${path} has no serious or critical axe violations`, async ({ page }) => {
      await page.goto(path);

      await expectNoSeriousOrCriticalViolations(page);
    });
  }
});
