import { SignInGate } from "@/components/SignInGate";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const loginMock = vi.fn();
const authState = {
  isAuthenticated: false,
  isInitializing: false,
  isLoggingIn: false,
  loginError: undefined as Error | undefined,
};

vi.mock("@caffeineai/core-infrastructure", () => ({
  useInternetIdentity: () => ({
    identity: undefined,
    isAuthenticated: authState.isAuthenticated,
    isInitializing: authState.isInitializing,
    isLoggingIn: authState.isLoggingIn,
    login: loginMock,
    clear: vi.fn(),
    loginError: authState.loginError,
  }),
}));

describe("SignInGate", () => {
  it("shows the welcome surface and starts login when signed out", async () => {
    authState.isAuthenticated = false;
    authState.isInitializing = false;
    authState.isLoggingIn = false;
    authState.loginError = undefined;
    loginMock.mockClear();
    const user = userEvent.setup();

    render(
      <SignInGate>
        <div>Private content</div>
      </SignInGate>,
    );

    expect(screen.getByText("Ember")).toBeInTheDocument();
    expect(screen.queryByText("Private content")).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /Sign in with Internet Identity/i }),
    );
    expect(loginMock).toHaveBeenCalledTimes(1);
  });

  it("renders children once authenticated", () => {
    authState.isAuthenticated = true;
    authState.isInitializing = false;

    render(
      <SignInGate>
        <div>Private content</div>
      </SignInGate>,
    );

    expect(screen.getByText("Private content")).toBeInTheDocument();
    expect(screen.queryByText("Ember")).not.toBeInTheDocument();
  });

  it("shows a loading state while initializing", () => {
    authState.isAuthenticated = false;
    authState.isInitializing = true;

    render(
      <SignInGate>
        <div>Private content</div>
      </SignInGate>,
    );

    expect(screen.getByText("Warming up…")).toBeInTheDocument();
    expect(screen.queryByText("Private content")).not.toBeInTheDocument();
  });

  it("surfaces a login error", () => {
    authState.isAuthenticated = false;
    authState.isInitializing = false;
    authState.loginError = new Error("Popup blocked");

    render(
      <SignInGate>
        <div>Private content</div>
      </SignInGate>,
    );

    expect(screen.getByText("Popup blocked")).toBeInTheDocument();
  });
});
