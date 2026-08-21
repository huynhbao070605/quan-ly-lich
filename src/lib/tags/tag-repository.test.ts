import { describe, expect, test } from "vitest";
import { deleteTagRecord, type TagSupabaseClient } from "./tag-repository";

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
  } as unknown as TagSupabaseClient;

  return { operations, supabase };
}

describe("deleteTagRecord", () => {
  test("throws not found when no scoped tag row was deleted", async () => {
    const { supabase } = createDeleteClient(null);

    await expect(
      deleteTagRecord(
        supabase,
        "server-user-id",
        "00000000-0000-4000-8000-000000000030",
      ),
    ).rejects.toThrow("Tag not found.");
  });

  test("scopes delete by user_id and confirms a deleted row", async () => {
    const { operations, supabase } = createDeleteClient({
      id: "00000000-0000-4000-8000-000000000030",
    });

    await deleteTagRecord(
      supabase,
      "server-user-id",
      "00000000-0000-4000-8000-000000000030",
    );

    expect(operations).toContainEqual({ method: "from", table: "tags" });
    expect(operations).toContainEqual({
      method: "eq",
      column: "user_id",
      value: "server-user-id",
    });
    expect(operations).toContainEqual({ method: "select", columns: "id" });
    expect(operations).toContainEqual({ method: "maybeSingle" });
  });
});
