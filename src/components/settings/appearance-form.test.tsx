import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";

import { AppearanceForm } from "./appearance-form";

describe("AppearanceForm", () => {
  afterEach(() => {
    cleanup();
  });

  test("renders the system theme as the selected option", () => {
    render(<AppearanceForm initialTheme="system" />);

    expect(screen.getByLabelText("Sáng")).toBeVisible();
    expect(screen.getByLabelText("Tối")).toBeVisible();
    expect(screen.getByLabelText("Theo hệ thống")).toBeChecked();
  });
});
