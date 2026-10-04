import { ConnectionList } from "@/components/ConnectionList";
import {
  type MockActor,
  createMockActor,
  renderWithProviders,
} from "@/test/helpers";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const actorRef: { current: MockActor } = { current: createMockActor() };

vi.mock("@caffeineai/core-infrastructure", () => ({
  useActor: () => ({ actor: actorRef.current, isFetching: false }),
  useInternetIdentity: () => ({
    identity: undefined,
    isAuthenticated: true,
    isInitializing: false,
    isLoggingIn: false,
    login: vi.fn(),
    clear: vi.fn(),
    loginError: undefined,
  }),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    to?: string;
  }) => <a {...props}>{children}</a>,
}));

const conversation = {
  id: 5n,
  participants: [],
  createdAt: 0n,
  unreadCount: 0n,
};

describe("ConnectionList", () => {
  beforeEach(() => {
    actorRef.current = createMockActor();
  });

  it("opens a connection via a link to its conversation", () => {
    renderWithProviders(<ConnectionList conversations={[conversation]} />);

    const link = document.querySelector(
      '[data-ocid="connections.open_link.1"]',
    );
    expect(link).not.toBeNull();
    expect(link).toHaveAttribute("to", "/chat/$conversationId");
  });

  it("leaves a connection after confirmation", async () => {
    actorRef.current.leaveConversation.mockResolvedValue({
      __kind__: "ok",
      ok: null,
    });
    const user = userEvent.setup();
    renderWithProviders(<ConnectionList conversations={[conversation]} />);

    await user.click(
      screen.getByRole("button", { name: /Leave conversation/i }),
    );
    expect(
      await screen.findByText("Leave this conversation?"),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^Leave$/i }));

    await waitFor(() => {
      expect(actorRef.current.leaveConversation).toHaveBeenCalledWith(5n);
    });
  });

  it("does not leave when the user keeps the conversation", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ConnectionList conversations={[conversation]} />);

    await user.click(
      screen.getByRole("button", { name: /Leave conversation/i }),
    );
    await user.click(await screen.findByRole("button", { name: /Keep it/i }));

    expect(actorRef.current.leaveConversation).not.toHaveBeenCalled();
  });
});
