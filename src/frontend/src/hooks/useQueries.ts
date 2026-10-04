import { createActor } from "@/backend";
import type {
  Attachment,
  ChatError,
  ConnectionCode,
  ConversationId,
  ConversationSummary,
  Message,
  MessageId,
  MessagePage,
  UserId,
  UserProfile,
} from "@/backend";
import { MESSAGE_PAGE_SIZE } from "@/types";
import { useActor } from "@caffeineai/core-infrastructure";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

export const queryKeys = {
  profile: (userId?: string) => ["profile", userId ?? "caller"] as const,
  conversations: ["conversations"] as const,
  messages: (conversationId: string) => ["messages", conversationId] as const,
};

/** Poll interval for conversation list + message auto-refresh. */
export const POLL_INTERVAL_MS = 4000;

/** The caller's own profile. */
export function useCallerProfile() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<UserProfile | null>({
    queryKey: queryKeys.profile(),
    queryFn: async () => {
      if (!actor) return null;
      return actor.getCallerProfile();
    },
    enabled: !!actor && !isFetching,
  });
}

/** Another user's public profile. */
export function useUserProfile(userId: UserId | null) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<UserProfile | null>({
    queryKey: queryKeys.profile(userId?.toText()),
    queryFn: async () => {
      if (!actor || !userId) return null;
      return actor.getUserProfile(userId);
    },
    enabled: !!actor && !isFetching && !!userId,
  });
}

/** The caller's active connections, auto-refreshing for unread counts. */
export function useConversations() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<ConversationSummary[]>({
    queryKey: queryKeys.conversations,
    queryFn: async () => {
      if (!actor) return [];
      return actor.listConversations();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: POLL_INTERVAL_MS,
  });
}

/** A page of messages for one conversation, newest-first from the backend. */
export function useMessages(conversationId: ConversationId | null) {
  const { actor, isFetching } = useActor(createActor);
  return useInfiniteQuery<
    MessagePage,
    Error,
    { pages: MessagePage[]; pageParams: (MessageId | null)[] },
    readonly unknown[],
    MessageId | null
  >({
    queryKey: queryKeys.messages(conversationId?.toString() ?? "none"),
    queryFn: async ({ pageParam }) => {
      if (!actor || conversationId === null) {
        return { messages: [] };
      }
      const result = await actor.getMessages(
        conversationId,
        pageParam ?? null,
        MESSAGE_PAGE_SIZE,
      );
      if (result.__kind__ === "err") {
        throw new Error(result.err);
      }
      return result.ok;
    },
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !!actor && !isFetching && conversationId !== null,
    refetchInterval: POLL_INTERVAL_MS,
  });
}

/** Create a fresh connection code for the caller. */
export function useCreateConnectionCode() {
  const { actor } = useActor(createActor);
  return useMutation<ConnectionCode, Error, void>({
    mutationFn: async () => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.createConnectionCode();
    },
  });
}

/** Redeem a friend's code, returning the new conversation id. */
export function useRedeemConnectionCode() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation<ConversationId, ChatError, ConnectionCode>({
    mutationFn: async (code) => {
      if (!actor) throw new Error("Backend is not ready");
      const result = await actor.redeemConnectionCode(code);
      if (result.__kind__ === "err") throw result.err;
      return result.ok;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.conversations });
    },
  });
}

/** Leave/end a conversation. */
export function useLeaveConversation() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation<void, ChatError, ConversationId>({
    mutationFn: async (conversationId) => {
      if (!actor) throw new Error("Backend is not ready");
      const result = await actor.leaveConversation(conversationId);
      if (result.__kind__ === "err") throw result.err;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.conversations });
    },
  });
}

/** Send a message with optional attachments. */
export function useSendMessage() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation<
    Message,
    ChatError,
    { conversationId: ConversationId; text: string; attachments: Attachment[] }
  >({
    mutationFn: async ({ conversationId, text, attachments }) => {
      if (!actor) throw new Error("Backend is not ready");
      const result = await actor.sendMessage(conversationId, text, attachments);
      if (result.__kind__ === "err") throw result.err;
      return result.ok;
    },
    onSuccess: (_message, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.messages(variables.conversationId.toString()),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.conversations });
    },
  });
}

/** Mark every message in a conversation as read. */
export function useMarkConversationRead() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation<void, ChatError, ConversationId>({
    mutationFn: async (conversationId) => {
      if (!actor) throw new Error("Backend is not ready");
      const result = await actor.markConversationRead(conversationId);
      if (result.__kind__ === "err") throw result.err;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.conversations });
    },
  });
}

/** Create or replace the caller's profile. */
export function useSaveProfile() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation<void, Error, UserProfile>({
    mutationFn: async (profile) => {
      if (!actor) throw new Error("Backend is not ready");
      await actor.saveCallerProfile(profile);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.profile() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.conversations });
    },
  });
}

export type { MessageId };
