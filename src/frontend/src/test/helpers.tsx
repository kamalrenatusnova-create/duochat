import type { backendInterface } from "@/backend";
import type { ChatError } from "@/backend";
import { Toaster } from "@/components/ui/sonner";
import type { Principal } from "@icp-sdk/core/principal";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type RenderOptions, render } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { vi } from "vitest";

/**
 * A typed stand-in for the generated backend actor. Every method is a Vitest
 * mock so tests can assert the calls the UI makes, and the type is the app's
 * own `backendInterface` so a signature drift is a compile error.
 */
export type MockActor = {
  [K in keyof backendInterface]: ReturnType<typeof vi.fn>;
};

export function createMockActor(overrides: Partial<MockActor> = {}): MockActor {
  const base: MockActor = {
    _immutableObjectStorageBlobsAreLive: vi.fn(async () => []),
    _immutableObjectStorageBlobsToDelete: vi.fn(async () => []),
    _immutableObjectStorageConfirmBlobDeletion: vi.fn(async () => undefined),
    _immutableObjectStorageCreateCertificate: vi.fn(async () => ({
      method: "",
      blob_hash: "",
    })),
    _immutableObjectStorageRefillCashier: vi.fn(async () => ({})),
    _immutableObjectStorageUpdateGatewayPrincipals: vi.fn(
      async () => undefined,
    ),
    _initialize_access_control: vi.fn(async () => undefined),
    _internet_identity_sign_in_finish: vi.fn(async () => ({
      __kind__: "ok" as const,
      ok: null,
    })),
    _internet_identity_sign_in_start: vi.fn(async () => new Uint8Array()),
    assignCallerUserRole: vi.fn(async () => undefined),
    createConnectionCode: vi.fn(async () => "EMBER-TEST"),
    execute: vi.fn(async () => ({ hasMore: false, rows: [] })),
    getApiDoc: vi.fn(async () => ""),
    getCallerProfile: vi.fn(async () => null),
    getCallerUserRole: vi.fn(async () => "user" as never),
    getMessages: vi.fn(async () => ({
      __kind__: "ok" as const,
      ok: { messages: [] },
    })),
    getUserProfile: vi.fn(async () => null),
    isCallerAdmin: vi.fn(async () => false),
    leaveConversation: vi.fn(async () => ({
      __kind__: "ok" as const,
      ok: null,
    })),
    listConversations: vi.fn(async () => []),
    markConversationRead: vi.fn(async () => ({
      __kind__: "ok" as const,
      ok: null,
    })),
    redeemConnectionCode: vi.fn(async () => ({
      __kind__: "ok" as const,
      ok: 1n,
    })),
    saveCallerProfile: vi.fn(async () => undefined),
    schema: vi.fn(async () => ""),
    sendMessage: vi.fn(async () => ({
      __kind__: "ok" as const,
      ok: {
        id: 1n,
        conversationId: 1n,
        sender: null as unknown as Principal,
        text: "",
        attachments: [],
        createdAt: 0n,
      },
    })),
  };
  return { ...base, ...overrides };
}

/** A ChatError result variant, matching the generated wrapper's shape. */
export function chatErr(error: ChatError) {
  return { __kind__: "err" as const, err: error };
}

/** A successful result variant. */
export function chatOk<T>(ok: T) {
  return { __kind__: "ok" as const, ok };
}

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
}

interface ProvidersOptions extends Omit<RenderOptions, "wrapper"> {
  queryClient?: QueryClient;
}

/** Render a component inside a fresh React Query provider. */
export function renderWithProviders(
  ui: ReactElement,
  { queryClient = createTestQueryClient(), ...options }: ProvidersOptions = {},
) {
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster position="top-center" richColors />
      </QueryClientProvider>
    );
  }
  return { queryClient, ...render(ui, { wrapper: Wrapper, ...options }) };
}
