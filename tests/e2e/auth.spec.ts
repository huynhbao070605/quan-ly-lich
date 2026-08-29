import { expect, test } from "@playwright/test";

import {
  hasLiveAuthCredentials,
  hasPublicSupabaseEnv,
  signInWithEmail,
} from "./helpers/auth";

test("redirects unauthenticated users from the dashboard to login", async ({ page }) => {
  test.skip(
    !hasPublicSupabaseEnv(),
    "DEFERRED LIVE AUTH E2E: protected redirect needs Supabase public URL/key configured.",
  );

  await page.goto("/app/tong-quan");

  await expect(page).toHaveURL(/\/dang-nhap$/);
  await expect(page.getByRole("heading", { name: "Đăng nhập" })).toBeVisible();
});

test("shows Google OAuth as an available login option without automating credentials", async ({ page }) => {
  await page.goto("/dang-nhap");

  await expect(page.getByRole("button", { name: "Tiếp tục với Google" })).toBeVisible();
});

test("Google OAuth button starts OAuth or shows a controlled Vietnamese error", async ({ page }) => {
  test.skip(
    !hasPublicSupabaseEnv(),
    "CONFIGURATION REQUIRED: Google OAuth trigger needs Supabase public URL/key.",
  );

  await page.goto("/dang-nhap");
  await page.getByRole("button", { name: "Tiếp tục với Google" }).click();
  await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => undefined);

  if (page.url().includes("accounts.google.com")) {
    await expect(page).toHaveURL(/accounts\.google\.com/);
    return;
  }

  await expect(page.getByRole("alert")).toContainText(
    "Không thể đăng nhập bằng Google. Vui lòng thử lại sau.",
  );
});

test("signs in with email against a live Supabase auth environment", async ({ page }) => {
  test.skip(
    !hasLiveAuthCredentials(),
    "DEFERRED LIVE AUTH E2E: requires live Supabase auth credentials.",
  );

  await signInWithEmail(page);

  await expect(page).toHaveURL(/\/app\/tong-quan$/);
});
