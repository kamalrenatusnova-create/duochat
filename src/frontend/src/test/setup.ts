import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// jsdom does not implement matchMedia, which the theme hook reads on mount.
if (!window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
}

// jsdom does not implement scrollIntoView, which the message thread calls.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = vi.fn();
}

// jsdom does not implement object URLs, which the composer uses for previews.
if (typeof URL.createObjectURL !== "function") {
  URL.createObjectURL = vi.fn(() => "blob:mock");
}
if (typeof URL.revokeObjectURL !== "function") {
  URL.revokeObjectURL = vi.fn();
}

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});
