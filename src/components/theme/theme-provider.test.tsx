import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { ThemeProvider } from "./theme-provider";

describe("ThemeProvider", () => {
  beforeEach(() => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        addEventListener: vi.fn(),
        addListener: vi.fn(),
        dispatchEvent: vi.fn(),
        matches: false,
        media: query,
        onchange: null,
        removeEventListener: vi.fn(),
        removeListener: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    cleanup();
  });

  test("renders children inside the theme context", () => {
    render(
      <ThemeProvider>
        <p>Nội dung ứng dụng</p>
      </ThemeProvider>,
    );

    expect(screen.getByText("Nội dung ứng dụng")).toBeVisible();
  });
});
