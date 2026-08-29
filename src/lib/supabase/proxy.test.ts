import { NextRequest } from "next/server";
import { beforeEach, describe, expect, test, vi } from "vitest";

const { mockCreateServerClient } = vi.hoisted(() => ({
  mockCreateServerClient: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: mockCreateServerClient,
}));

import { updateSession } from "./proxy";

type CookieToSet = {
  name: string;
  value: string;
  options?: {
    httpOnly?: boolean;
    path?: string;
  };
};

type ServerClientOptions = {
  cookies: {
    setAll: (cookies: CookieToSet[]) => void;
  };
};

function createRequest(pathname: string) {
  return new NextRequest(`https://example.test${pathname}`);
}

function mockSupabaseSession(user: { id: string } | null, cookiesToSet: CookieToSet[] = []) {
  mockCreateServerClient.mockImplementation(
    (_url: string, _key: string, options: ServerClientOptions) => {
      options.cookies.setAll(cookiesToSet);

      return {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user } }),
        },
      };
    },
  );
}

describe("updateSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("redirects an unauthenticated /app request to /dang-nhap", async () => {
    mockSupabaseSession(null);

    const response = await updateSession(createRequest("/app/hom-nay"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://example.test/dang-nhap");
  });

  test("allows an authenticated /app request to proceed", async () => {
    mockSupabaseSession({ id: "user-123" });

    const response = await updateSession(createRequest("/app/hom-nay"));

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  test("returns refreshed session cookies", async () => {
    mockSupabaseSession(
      { id: "user-123" },
      [
        {
          name: "sb-access-token",
          value: "fresh-token",
          options: { httpOnly: true, path: "/" },
        },
      ],
    );

    const response = await updateSession(createRequest("/app/hom-nay"));

    expect(response.cookies.get("sb-access-token")?.value).toBe("fresh-token");
  });

  test("does not protect routes that only share the /app prefix", async () => {
    mockSupabaseSession(null);

    const response = await updateSession(createRequest("/application"));

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });
});
