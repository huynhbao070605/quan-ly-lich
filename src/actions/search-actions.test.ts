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
    in: vi.fn(),
    ilike: vi.fn(),
    limit: vi.fn(),
    or: vi.fn(),
    order: vi.fn(),
    select: vi.fn(),
  };

  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.in.mockReturnValue(query);
  query.ilike.mockReturnValue(query);
  query.order.mockReturnValue(query);
  query.or.mockReturnValue(query);
  query.limit.mockReturnValue(Promise.resolve({ data, error: null }));

  return query;
}

function createSupabase({
  taskQueries = [createQuery([])],
  projectQuery = createQuery([]),
  tagQuery = createQuery([]),
  taskTagQuery = createQuery([]),
}: {
  taskQueries?: ReturnType<typeof createQuery>[];
  projectQuery?: ReturnType<typeof createQuery>;
  tagQuery?: ReturnType<typeof createQuery>;
  taskTagQuery?: ReturnType<typeof createQuery>;
}) {
  return {
    from: vi.fn((table: string) => {
      if (table === "tasks") return taskQueries.shift() ?? createQuery([]);
      if (table === "projects") return projectQuery;
      if (table === "tags") return tagQuery;
      return taskTagQuery;
    }),
  };
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

  test("returns a task when its project matches the query and scopes the derived task query", async () => {
    const projectTask = {
      id: "project-task-id",
      title: "Task in matched project",
      description: null,
      projects: { id: "project-id", name: "Matched project" },
      task_tags: [],
    };
    const directTaskQuery = createQuery([]);
    const projectTaskQuery = createQuery([projectTask]);
    const projectQuery = createQuery([{ id: "project-id", name: "Matched project" }]);
    mocks.createServerClient.mockResolvedValue(
      createSupabase({
        taskQueries: [directTaskQuery, projectTaskQuery],
        projectQuery,
      }),
    );

    const result = await searchGlobal("matched project");

    expect(result).toEqual({
      ok: true,
      data: {
        tasks: [
          {
            id: "project-task-id",
            title: "Task in matched project",
            description: null,
            projectName: "Matched project",
            tagNames: [],
          },
        ],
        projects: [{ id: "project-id", name: "Matched project" }],
      },
    });
    expect(projectTaskQuery.eq).toHaveBeenCalledWith("user_id", "server-user-id");
  });

  test("returns a task when its tag matches the query and scopes the derived tag query", async () => {
    const tagTask = {
      id: "tag-task-id",
      title: "Task with matched tag",
      description: "Description",
      projects: null,
      task_tags: [{ tags: { id: "tag-id", name: "Matched tag" } }],
    };
    const tagTaskQuery = createQuery([{ tasks: tagTask }]);
    mocks.createServerClient.mockResolvedValue(
      createSupabase({
        tagQuery: createQuery([{ id: "tag-id" }]),
        taskTagQuery: tagTaskQuery,
      }),
    );

    const result = await searchGlobal("matched tag");

    expect(result).toEqual({
      ok: true,
      data: {
        tasks: [
          {
            id: "tag-task-id",
            title: "Task with matched tag",
            description: "Description",
            projectName: null,
            tagNames: ["Matched tag"],
          },
        ],
        projects: [],
      },
    });
    expect(tagTaskQuery.eq).toHaveBeenCalledWith("tasks.user_id", "server-user-id");
  });
});
