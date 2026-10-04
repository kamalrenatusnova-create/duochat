import { ProfileSetup } from "@/components/ProfileSetup";
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

const uploadFileMock = vi.fn();
vi.mock("@/lib/upload", () => ({
  uploadFile: (...args: unknown[]) => uploadFileMock(...args),
  downloadAttachment: vi.fn(async () => undefined),
}));

describe("ProfileSetup", () => {
  beforeEach(() => {
    actorRef.current = createMockActor();
    uploadFileMock.mockReset();
  });

  it("prefills the saved display name and saves an edited one", async () => {
    actorRef.current.getCallerProfile.mockResolvedValue({
      displayName: "Maya",
    });
    const user = userEvent.setup();
    renderWithProviders(<ProfileSetup />);

    const input = await screen.findByLabelText(/Display name/i);
    await waitFor(() => expect(input).toHaveValue("Maya"));

    await user.clear(input);
    await user.type(input, "Maya Chen");
    await user.click(screen.getByRole("button", { name: /Save profile/i }));

    await waitFor(() => {
      expect(actorRef.current.saveCallerProfile).toHaveBeenCalledWith({
        displayName: "Maya Chen",
        avatar: undefined,
      });
    });
  });

  it("refuses to save an empty display name", async () => {
    actorRef.current.getCallerProfile.mockResolvedValue(null);
    const user = userEvent.setup();
    renderWithProviders(<ProfileSetup />);

    await screen.findByLabelText(/Display name/i);
    await user.click(screen.getByRole("button", { name: /Save profile/i }));

    expect(await screen.findByText(/Add a display name/i)).toBeInTheDocument();
    expect(actorRef.current.saveCallerProfile).not.toHaveBeenCalled();
  });

  it("uploads an avatar and includes it when saving", async () => {
    actorRef.current.getCallerProfile.mockResolvedValue(null);
    uploadFileMock.mockResolvedValue({
      attachment: {
        blob: { getDirectURL: () => "blob:avatar" },
        name: "me.png",
        mimeType: "image/png",
        size: 100n,
      },
      previewUrl: "blob:avatar",
    });
    const user = userEvent.setup();
    renderWithProviders(<ProfileSetup />);

    await screen.findByLabelText(/Display name/i);
    const file = new File(["x"], "me.png", { type: "image/png" });
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    await user.upload(input, file);

    await waitFor(() => expect(uploadFileMock).toHaveBeenCalledTimes(1));

    await user.type(screen.getByLabelText(/Display name/i), "Maya");
    await user.click(screen.getByRole("button", { name: /Save profile/i }));

    await waitFor(() => {
      expect(actorRef.current.saveCallerProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          displayName: "Maya",
          avatar: expect.objectContaining({ name: "me.png" }),
        }),
      );
    });
  });
});
