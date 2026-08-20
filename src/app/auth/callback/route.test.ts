import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: mocks.createServerClient,
}));

import { GET } from "./route";

describe("auth callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("redirects a recovered-password session to the Vietnamese reset page", async () => {
    mocks.createServerClient.mockResolvedValue({
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
      },
    });

    const response = await GET(
      new Request("https://app.example.vn/auth/callback?code=recovery-code&type=recovery"),
    );

    expect(response.headers.get("location")).toBe(
      "https://app.example.vn/dat-lai-mat-khau",
    );
  });
});
