import { ChatError } from "@/backend";
import { ConnectionsPage } from "@/pages/ConnectionsPage";
import {
  type MockActor,
  chatErr,
  chatOk,
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

// The page links into the router; a lightweight stub keeps the test focused on
// the pairing UI rather than router internals.
const navigateMock = vi.fn();
vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    to?: string;
  }) => <a {...props}>{children}</a>,
  useNavigate: () => navigateMock,
}));

describe("ConnectionsPage pairing flows", () => {
  beforeEach(() => {
    actorRef.current = createMockActor();
  });

  it("shows the empty state with guidance when there are no connections", async () => {
    renderWithProviders(<ConnectionsPage />);

    expect(await screen.findByText("No one here yet")).toBeInTheDocument();
    expect(
      screen.getByText(/Create a code and share it with a friend/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Enter a friend's code/i }),
    ).toBeInTheDocument();
  });

  it("creates a connection code and displays it for sharing", async () => {
    actorRef.current.createConnectionCode.mockResolvedValue("EMBER-7K2Q");
    const user = userEvent.setup();
    renderWithProviders(<ConnectionsPage />);

    await user.click(
      await screen.findByRole("button", { name: /Create a code/i }),
    );

    expect(await screen.findByText("EMBER-7K2Q")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Copy code/i }),
    ).toBeInTheDocument();
    expect(actorRef.current.createConnectionCode).toHaveBeenCalledTimes(1);
  });

  it("rejects an invalid code with a visible error and keeps the draft for retry", async () => {
    actorRef.current.redeemConnectionCode.mockResolvedValue(
      chatErr(ChatError.invalidCode),
    );
    const user = userEvent.setup();
    renderWithProviders(<ConnectionsPage />);

    await user.click(await screen.findByRole("tab", { name: /Enter a code/i }));
    const input = await screen.findByLabelText(/Connection code/i);
    await user.type(input, "WRONG-CODE");
    await user.click(screen.getByRole("button", { name: /Connect/i }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/doesn't match any connection/i);
    // The draft survives so the user can correct and retry.
    expect(input).toHaveValue("WRONG-CODE");
    expect(actorRef.current.redeemConnectionCode).toHaveBeenCalledWith(
      "WRONG-CODE",
    );
  });

  it("surfaces an expired-code error distinctly", async () => {
    actorRef.current.redeemConnectionCode.mockResolvedValue(
      chatErr(ChatError.expiredCode),
    );
    const user = userEvent.setup();
    renderWithProviders(<ConnectionsPage />);

    await user.click(await screen.findByRole("tab", { name: /Enter a code/i }));
    await user.type(
      await screen.findByLabelText(/Connection code/i),
      "OLD-CODE",
    );
    await user.click(screen.getByRole("button", { name: /Connect/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/expired/i);
  });

  it("lists active connections with an unread indicator", async () => {
    actorRef.current.listConversations.mockResolvedValue([
      {
        id: 42n,
        participants: [],
        createdAt: 0n,
        unreadCount: 3n,
      },
    ]);
    renderWithProviders(<ConnectionsPage />);

    expect(await screen.findByText("3 new messages")).toBeInTheDocument();
    expect(screen.getByLabelText("3 unread messages")).toBeInTheDocument();
  });

  it("redeems a valid code and reports success", async () => {
    actorRef.current.redeemConnectionCode.mockResolvedValue(chatOk(7n));
    const user = userEvent.setup();
    renderWithProviders(<ConnectionsPage />);

    await user.click(await screen.findByRole("tab", { name: /Enter a code/i }));
    await user.type(
      await screen.findByLabelText(/Connection code/i),
      "GOOD-CODE",
    );
    await user.click(screen.getByRole("button", { name: /Connect/i }));

    await waitFor(() => {
      expect(actorRef.current.redeemConnectionCode).toHaveBeenCalledWith(
        "GOOD-CODE",
      );
    });
    // No error alert is shown on success.
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
