import { expect, test } from "@playwright/test";

const viewports = [
  { height: 844, name: "mobile", width: 390 },
  { height: 1180, name: "tablet", width: 820 },
  { height: 900, name: "desktop", width: 1440 },
];

test.describe("responsive public routes", () => {
  for (const viewport of viewports) {
    test(`login page has no horizontal overflow at ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto("/dang-nhap");

      const metrics = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));

      expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);
    });
  }
});

test.describe("responsive authenticated shell", () => {
  test.skip(
    !process.env.E2E_AUTH_STATE,
    "DEFERRED LIVE AUTH E2E: dashboard responsive checks require a real authenticated browser state.",
  );

  test.use({ storageState: process.env.E2E_AUTH_STATE });

  test("mobile bottom nav is visible and desktop sidebar is hidden at 390px", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/app/tong-quan");

    await expect(page.getByLabel("Điều hướng di động")).toBeVisible();
    await expect(page.getByLabel("Điều hướng chính")).toBeHidden();
  });

  test("desktop sidebar is visible and the document does not overflow at 1440px", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/app/tong-quan");

    await expect(page.getByLabel("Điều hướng chính")).toBeVisible();
    await expect(page.getByLabel("Điều hướng di động")).toBeHidden();

    const metrics = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));

    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);
  });
});
