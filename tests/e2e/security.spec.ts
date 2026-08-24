import { expect, test } from "@playwright/test";

const hasCrossUserState = Boolean(
  process.env.E2E_USER_A_STATE &&
    process.env.E2E_USER_B_STATE &&
    process.env.E2E_USER_A_TASK_ID,
);

test.describe("cross-user security", () => {
  test.skip(
    !hasCrossUserState,
    "DEFERRED LIVE DB/RLS VERIFICATION: cross-user browser security requires two live auth states and a database task fixture.",
  );

  test("prevents User B from mutating User A task by direct navigation/action", async ({ browser }) => {
    const userATaskId = process.env.E2E_USER_A_TASK_ID;
    const userBContext = await browser.newContext({ storageState: process.env.E2E_USER_B_STATE });
    const page = await userBContext.newPage();

    await page.goto(`/app/cong-viec?taskId=${userATaskId}`);

    await expect(page.getByRole("dialog", { name: "Chi tiết công việc" })).toBeHidden();
    await expect(page.getByText(userATaskId ?? "")).toBeHidden();

    await userBContext.close();
  });
});
