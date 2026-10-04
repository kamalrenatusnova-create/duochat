import { Composer } from "@/components/chat/Composer";
import { MessageThread } from "@/components/chat/MessageThread";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  useCallerProfile,
  useConversations,
  useMarkConversationRead,
  useMessages,
  useSendMessage,
  useUserProfile,
} from "@/hooks/useQueries";
import { type Attachment, initialsFor, shortPrincipal } from "@/types";
import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, Loader2, MessagesSquare } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";

export function ConversationPage() {
  const { conversationId: conversationIdParam } = useParams({
    from: "/layout/chat/$conversationId",
  });
  const { identity } = useInternetIdentity();

  const conversationId = useMemo(() => {
    try {
      return BigInt(conversationIdParam);
    } catch {
      return null;
    }
  }, [conversationIdParam]);

  const { data: conversations } = useConversations();
  const { data: callerProfile } = useCallerProfile();
  const {
    data: messagePages,
    isLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useMessages(conversationId);
  const sendMessage = useSendMessage();
  const markRead = useMarkConversationRead();

  const summary = conversations?.find(
    (item) => item.id.toString() === conversationIdParam,
  );
  const callerId = identity?.getPrincipal().toText() ?? "";
  const peerId = summary?.participants.find(
    (participant) => participant.toText() !== callerId,
  );
  const { data: peerProfile } = useUserProfile(peerId ?? null);

  const peerName =
    peerProfile?.displayName?.trim() ||
    (peerId ? shortPrincipal(peerId) : "your friend");
  const callerName = callerProfile?.displayName?.trim() || "You";

  const messages = useMemo(
    () => messagePages?.pages.flatMap((page) => page.messages) ?? [],
    [messagePages],
  );

  // Mark the conversation read once it is open and whenever new messages land.
  const lastMessageId = messages[0]?.id.toString() ?? "";
  const markedRef = useRef("");
  useEffect(() => {
    if (conversationId === null) return;
    if (markedRef.current === lastMessageId) return;
    markedRef.current = lastMessageId;
    markRead.mutate(conversationId);
  }, [conversationId, lastMessageId, markRead]);

  const handleSend = (
    text: string,
    attachments: Attachment[],
    onError: () => void,
  ) => {
    if (conversationId === null) return;
    sendMessage.mutate(
      { conversationId, text: text.trim(), attachments },
      {
        onError: (error) => {
          onError();
          toast.error(
            typeof error === "string"
              ? error
              : "Couldn't send that message. Try again.",
          );
        },
      },
    );
  };

  if (conversationId === null) {
    return (
      <div
        className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center"
        data-ocid="conversation.error_state"
      >
        <span className="flex size-14 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground">
          <MessagesSquare className="size-6" aria-hidden="true" />
        </span>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Conversation not found
        </h1>
        <p className="max-w-sm text-[15px] text-muted-foreground">
          This link doesn't point to a conversation you can open.
        </p>
        <Button
          asChild
          type="button"
          variant="outline"
          className="mt-2 rounded-full"
        >
          <Link to="/" data-ocid="conversation.back_button">
            <ArrowLeft className="size-4" />
            Back to connections
          </Link>
        </Button>
      </div>
    );
  }

  const peerAvatarUrl = peerProfile?.avatar?.blob.getDirectURL();

  return (
    <div
      className="flex min-h-0 flex-1 flex-col bg-background"
      data-ocid="conversation.page"
      data-conversation-id={conversationIdParam}
    >
      <header className="flex items-center gap-3 border-b border-border bg-card/80 px-3 py-3 backdrop-blur supports-[backdrop-filter]:bg-card/70 sm:px-5">
        <Button
          asChild
          type="button"
          variant="ghost"
          size="icon"
          className="rounded-full text-muted-foreground hover:text-foreground lg:hidden"
        >
          <Link
            to="/"
            aria-label="Back to connections"
            data-ocid="conversation.back_button"
          >
            <ArrowLeft className="size-5" />
          </Link>
        </Button>

        <Avatar className="size-10">
          {peerAvatarUrl ? <AvatarImage src={peerAvatarUrl} alt="" /> : null}
          <AvatarFallback className="bg-secondary text-sm font-semibold text-secondary-foreground">
            {initialsFor(peerName)}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-lg font-semibold tracking-tight text-foreground">
            {peerName}
          </h1>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              className="size-1.5 rounded-full bg-accent animate-ember-pulse"
              aria-hidden="true"
            />
            Private room · two people
          </span>
        </div>

        {sendMessage.isPending ? (
          <span
            className="flex items-center gap-1.5 text-xs text-muted-foreground"
            data-ocid="conversation.sending_state"
          >
            <Loader2 className="size-3.5 animate-spin" />
            Sending
          </span>
        ) : null}
      </header>

      <MessageThread
        messages={messages}
        callerId={callerId}
        peerName={peerName}
        peerProfile={peerProfile ?? null}
        callerName={callerName}
        callerProfile={callerProfile ?? null}
        isLoading={isLoading}
        hasEarlier={hasNextPage ?? false}
        isLoadingEarlier={isFetchingNextPage}
        onLoadEarlier={() => {
          void fetchNextPage();
        }}
      />

      <Composer onSend={handleSend} isSending={sendMessage.isPending} />
    </div>
  );
}
