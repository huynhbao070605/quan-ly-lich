import { describe, expect, test } from "vitest";
import { deleteProjectRecord, type ProjectSupabaseClient } from "./project-repository";

function createDeleteClient(deletedRow: { id: string } | null) {
  const operations: Array<Record<string, unknown>> = [];
  const builder = {
    delete() {
      operations.push({ method: "delete" });
      return builder;
    },
    eq(column: string, value: string) {
      operations.push({ method: "eq", column, value });
      return builder;
    },
    maybeSingle() {
      operations.push({ method: "maybeSingle" });
      return Promise.resolve({ data: deletedRow, error: null });
    },
    select(columns?: string) {
      operations.push({ method: "select", columns });
      return builder;
    },
    then(
      resolve: (value: { error: Error | null }) => unknown,
      reject?: (reason: unknown) => unknown,
    ) {
      return Promise.resolve({ error: null }).then(resolve, reject);
    },
  };

  const supabase = {
    from(table: string) {
      operations.push({ method: "from", table });
      return builder;
    },
  } as unknown as ProjectSupabaseClient;

  return { operations, supabase };
}

describe("deleteProjectRecord", () => {
  test("throws not found when no scoped project row was deleted", async () => {
    const { supabase } = createDeleteClient(null);

    await expect(
      deleteProjectRecord(
        supabase,
        "server-user-id",
        "00000000-0000-4000-8000-000000000020",
      ),
    ).rejects.toThrow("Project not found.");
  });

  test("scopes delete by user_id and confirms a deleted row", async () => {
    const { operations, supabase } = createDeleteClient({
      id: "00000000-0000-4000-8000-000000000020",
    });

    await deleteProjectRecord(
      supabase,
      "server-user-id",
      "00000000-0000-4000-8000-000000000020",
    );

    expect(operations).toContainEqual({ method: "from", table: "projects" });
    expect(operations).toContainEqual({
      method: "eq",
      column: "user_id",
      value: "server-user-id",
    });
    expect(operations).toContainEqual({ method: "select", columns: "id" });
    expect(operations).toContainEqual({ method: "maybeSingle" });
  });
});
