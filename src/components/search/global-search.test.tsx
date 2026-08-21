import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

vi.mock("@/actions/search-actions", () => ({
  searchGlobal: vi.fn(),
}));

import { GlobalSearch } from "./global-search";

describe("GlobalSearch", () => {
  test("focuses the search input when slash is pressed outside an input", async () => {
    const user = userEvent.setup();

    render(<GlobalSearch />);

    await user.keyboard("/");

    expect(screen.getByPlaceholderText("Tìm công việc...")).toHaveFocus();
  });
});
