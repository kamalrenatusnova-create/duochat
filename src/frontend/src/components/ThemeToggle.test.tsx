import { ThemeToggle } from "@/components/ThemeToggle";
import { ThemeProvider } from "@/hooks/useTheme";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

function renderToggle() {
  return render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>,
  );
}

describe("ThemeToggle", () => {
  it("starts in light mode and switches to dark", async () => {
    const user = userEvent.setup();
    renderToggle();

    const toggle = screen.getByRole("button", {
      name: /Switch to dark theme/i,
    });
    await user.click(toggle);

    expect(
      screen.getByRole("button", { name: /Switch to light theme/i }),
    ).toBeInTheDocument();
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(window.localStorage.getItem("ember-theme")).toBe("dark");
  });

  it("restores a stored dark preference on mount", () => {
    window.localStorage.setItem("ember-theme", "dark");
    renderToggle();

    expect(
      screen.getByRole("button", { name: /Switch to light theme/i }),
    ).toBeInTheDocument();
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });
});
