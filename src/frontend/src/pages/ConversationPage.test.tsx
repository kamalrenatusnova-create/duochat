import { ChatError } from "@/backend";
import { ConversationPage } from "@/pages/ConversationPage";
import {
  type MockActor,
  chatErr,
  chatOk,
  createMockActor,
  renderWithProviders,
} from "@/test/helpers";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const actorRef: { current: MockActor } = { current: createMockActor() };
const identityRef: {
  current: { getPrincipal: () => { toText: () => string } };
} = {
  current: { getPrincipal: () => ({ toText: () => "aaaaa-aa" }) },
};

vi.mock("@caffeineai/core-infrastructure", () => ({
  useActor: () => ({ actor: actorRef.current, isFetching: false }),
  useInternetIdentity: () => ({
    identity: identityRef.current,
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
  useParams: () => ({ conversationId: "1" }),
}));

// The upload helper talks to the object-storage gateway; stub it so the test
// exercises the composer's own progress/preview/send behavior.
const uploadFileMock = vi.fn();
vi.mock("@/lib/upload", () => ({
  uploadFile: (...args: unknown[]) => uploadFileMock(...args),
  downloadAttachment: vi.fn(async () => undefined),
}));

function makeMessage(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 1n,
    conversationId: 1n,
    sender: { toText: () => "aaaaa-aa" },
    text: "Hello there",
    attachments: [],
    createdAt: 1_700_000_000_000_000_000n,
    ...overrides,
  };
}

describe("ConversationPage messaging", () => {
  beforeEach(() => {
    actorRef.current = createMockActor();
    uploadFileMock.mockReset();
    actorRef.current.listConversations.mockResolvedValue([
      {
        id: 1n,
        participants: [{ toText: () => "aaaaa-aa" }],
        createdAt: 0n,
        unreadCount: 0n,
      },
    ]);
  });

  it("renders the empty state with guidance when there are no messages", async () => {
    renderWithProviders(<ConversationPage />);

    expect(await screen.findByText("Say hello")).toBeInTheDocument();
    expect(
      screen.getByText(/Send the first message, or share a photo/i),
    ).toBeInTheDocument();
  });

  it("renders received messages with sender, text, and timestamp", async () => {
    actorRef.current.getMessages.mockResolvedValue(
      chatOk({
        messages: [
          makeMessage({
            id: 2n,
            sender: { toText: () => "bbbbb-bb" },
            text: "Hi from a friend",
          }),
        ],
      }),
    );
    renderWithProviders(<ConversationPage />);

    expect(await screen.findByText("Hi from a friend")).toBeInTheDocument();
    // The peer's name is shown as the sender label (header + bubble).
    expect(screen.getAllByText("your friend").length).toBeGreaterThan(0);
    // A timestamp element is rendered for the message.
    expect(document.querySelector("time")).not.toBeNull();
  });

  it("sends a text message on Enter and clears the composer", async () => {
    actorRef.current.sendMessage.mockResolvedValue(
      chatOk(makeMessage({ text: "Ping" })),
    );
    const user = userEvent.setup();
    renderWithProviders(<ConversationPage />);

    const textarea = await screen.findByLabelText("Message");
    await user.type(textarea, "Ping{Enter}");

    await waitFor(() => {
      expect(actorRef.current.sendMessage).toHaveBeenCalledWith(1n, "Ping", []);
    });
    expect(textarea).toHaveValue("");
  });

  it("keeps multi-line text when Shift+Enter is pressed instead of sending", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ConversationPage />);

    const textarea = await screen.findByLabelText("Message");
    await user.type(textarea, "line one{Shift>}{Enter}{/Shift}line two");

    expect(textarea).toHaveValue("line one\nline two");
    expect(actorRef.current.sendMessage).not.toHaveBeenCalled();
  });

  it("uploads an image, shows a preview, and sends it as an attachment", async () => {
    uploadFileMock.mockResolvedValue({
      attachment: {
        blob: { getDirectURL: () => "blob:preview" },
        name: "photo.png",
        mimeType: "image/png",
        size: 2048n,
      },
      previewUrl: "blob:preview",
    });
    actorRef.current.sendMessage.mockResolvedValue(
      chatOk(makeMessage({ text: "" })),
    );
    const user = userEvent.setup();
    renderWithProviders(<ConversationPage />);

    const file = new File(["bytes"], "photo.png", { type: "image/png" });
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    await user.upload(input, file);

    // Preview appears before sending.
    expect(await screen.findByText("photo.png")).toBeInTheDocument();
    expect(uploadFileMock).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: /Send message/i }));

    await waitFor(() => {
      expect(actorRef.current.sendMessage).toHaveBeenCalledTimes(1);
    });
    const [, , attachments] = actorRef.current.sendMessage.mock.calls[0];
    expect(attachments).toHaveLength(1);
    expect(attachments[0]).toMatchObject({
      name: "photo.png",
      mimeType: "image/png",
    });
  });

  it("rejects an oversized file with a clear error and does not upload it", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ConversationPage />);

    const big = new File(["x"], "huge.bin", {
      type: "application/octet-stream",
    });
    Object.defineProperty(big, "size", { value: 26 * 1024 * 1024 });
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    await user.upload(input, big);

    expect(
      await screen.findByText(/larger than the 25 MB limit/i),
    ).toBeInTheDocument();
    expect(uploadFileMock).not.toHaveBeenCalled();
  });

  it("shows a send error and restores the draft when the backend rejects", async () => {
    actorRef.current.sendMessage.mockResolvedValue(
      chatErr(ChatError.notParticipant),
    );
    const user = userEvent.setup();
    renderWithProviders(<ConversationPage />);

    const textarea = await screen.findByLabelText("Message");
    await user.type(textarea, "Are you there?{Enter}");

    await waitFor(() => {
      expect(actorRef.current.sendMessage).toHaveBeenCalledTimes(1);
    });
    // The draft is restored so the user can retry.
    await waitFor(() => {
      expect(textarea).toHaveValue("Are you there?");
    });
  });

  it("renders an inline audio player for audio attachments", async () => {
    actorRef.current.getMessages.mockResolvedValue(
      chatOk({
        messages: [
          makeMessage({
            text: "",
            attachments: [
              {
                blob: { getDirectURL: () => "blob:audio" },
                name: "song.mp3",
                mimeType: "audio/mpeg",
                size: 4096n,
              },
            ],
          }),
        ],
      }),
    );
    renderWithProviders(<ConversationPage />);

    expect(await screen.findByText("song.mp3")).toBeInTheDocument();
    expect(
      document.querySelector('[data-ocid="message.audio_player"]'),
    ).not.toBeNull();
  });

  it("renders a downloadable attachment with name and size for documents", async () => {
    actorRef.current.getMessages.mockResolvedValue(
      chatOk({
        messages: [
          makeMessage({
            text: "",
            attachments: [
              {
                blob: { getDirectURL: () => "blob:doc" },
                name: "report.pdf",
                mimeType: "application/pdf",
                size: 1024n,
              },
            ],
          }),
        ],
      }),
    );
    renderWithProviders(<ConversationPage />);

    expect(await screen.findByText("report.pdf")).toBeInTheDocument();
    expect(screen.getByText("1.0 KB")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Download report.pdf/i }),
    ).toBeInTheDocument();
  });

  it("renders an inline image for image attachments", async () => {
    actorRef.current.getMessages.mockResolvedValue(
      chatOk({
        messages: [
          makeMessage({
            text: "",
            attachments: [
              {
                blob: { getDirectURL: () => "blob:image" },
                name: "cat.png",
                mimeType: "image/png",
                size: 512n,
              },
            ],
          }),
        ],
      }),
    );
    renderWithProviders(<ConversationPage />);

    const image = await screen.findByAltText("cat.png");
    expect(image).toHaveAttribute("src", "blob:image");
  });
});
