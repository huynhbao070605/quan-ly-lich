import { describe, expect, test } from "vitest";

describe("Supabase environment contract", () => {
  test("documented public variables exist in .env.example", async () => {
    const fs = await import("node:fs/promises");
    const text = await fs.readFile(".env.example", "utf8");

    expect(text).toContain("NEXT_PUBLIC_SUPABASE_URL=");
    expect(text).toContain("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=");
    expect(text).toContain("SUPABASE_SERVICE_ROLE_KEY=");
  });
});
