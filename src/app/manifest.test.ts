import { describe, expect, test } from "vitest";

import manifest from "./manifest";

describe("PWA manifest", () => {
  test("describes an installable Vietnamese standalone app", () => {
    const result = manifest();

    expect(result.lang).toBe("vi");
    expect(result.display).toBe("standalone");
    expect(result.start_url).toBe("/app/tong-quan");
    expect(result.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          src: "/icons/icon-192.png",
          sizes: "192x192",
          type: "image/png",
        }),
        expect.objectContaining({
          src: "/icons/icon-512.png",
          sizes: "512x512",
          type: "image/png",
        }),
      ]),
    );
  });
});
