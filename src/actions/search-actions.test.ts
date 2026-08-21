import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  requireUser: vi.fn(),
}));

vi.mock("@/lib/auth/require-user", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/supabase/server", () => ({
  createServerClient: mocks.createServerClient,
}));

import { searchGlobal } from "./search-actions";

function createQuery(data: unknown[]) {
  const query = {
    eq: vi.fn(),
    ilike: vi.fn(),
    limit: vi.fn(),
    or: vi.fn(),
    order: vi.fn(),
    select: vi.fn(),
  };

  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.ilike.mockReturnValue(query);
  query.order.mockReturnValue(query);
  query.or.mockReturnValue(query);
  query.limit.mockReturnValue(Promise.resolve({ data, error: null }));

  return query;
}

describe("searchGlobal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({ id: "server-user-id" });
  });

  test("returns empty groups for a query shorter than one non-space character", async () => {
    const result = await searchGlobal("   ");

    expect(result).toEqual({ ok: true, data: { tasks: [], projects: [] } });
    expect(mocks.requireUser).not.toHaveBeenCalled();
    expect(mocks.createServerClient).not.toHaveBeenCalled();
  });

  test("scopes task, project, and tag queries by the authenticated user", async () => {
    const taskQuery = createQuery([]);
    const projectQuery = createQuery([]);
    const tagQuery = createQuery([]);
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "tasks") return taskQuery;
        if (table === "projects") return projectQuery;
        return tagQuery;
      }),
    };
    mocks.createServerClient.mockResolvedValue(supabase);

    await searchGlobal("báo cáo");

    expect(mocks.requireUser).toHaveBeenCalledOnce();
    expect(taskQuery.eq).toHaveBeenCalledWith("user_id", "server-user-id");
    expect(projectQuery.eq).toHaveBeenCalledWith("user_id", "server-user-id");
    expect(tagQuery.eq).toHaveBeenCalledWith("user_id", "server-user-id");
  });
});
