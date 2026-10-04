import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLeaveConversation, useUserProfile } from "@/hooks/useQueries";
import type { ConversationSummary, UserId } from "@/types";
import { formatRelativeTime, initialsFor, shortPrincipal } from "@/types";
import { Link } from "@tanstack/react-router";
import { Loader2, LogOut, MessageSquare } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

/** The caller's active connections, each linking into its conversation. */
export function ConnectionList({
  conversations,
}: {
  conversations: ConversationSummary[];
}) {
  return (
    <ul className="space-y-3" data-ocid="connections.list">
      {conversations.map((conversation, index) => (
        <ConnectionRow
          key={conversation.id.toString()}
          conversation={conversation}
          index={index}
        />
      ))}
    </ul>
  );
}

function ConnectionRow({
  conversation,
  index,
}: {
  conversation: ConversationSummary;
  index: number;
}) {
  const peer = conversation.participants[0] ?? null;
  const { data: peerProfile } = useUserProfile(peer);
  const leave = useLeaveConversation();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const name = peerProfile?.displayName?.trim() || "Your friend";
  const avatarUrl = peerProfile?.avatar?.blob.getDirectURL();
  const unread = Number(conversation.unreadCount);
  const hasUnread = unread > 0;
  const lastActive = formatRelativeTime(conversation.lastMessageAt);

  const handleLeave = () => {
    leave.mutate(conversation.id, {
      onSuccess: () => {
        setConfirmOpen(false);
        toast.success(`You left the conversation with ${name}.`);
      },
      onError: () => toast.error("Couldn't leave the conversation. Try again."),
    });
  };

  return (
    <li
      className="group relative animate-slide-in-left"
      style={{ animationDelay: `${Math.min(index, 6) * 40}ms` }}
      data-ocid={`connections.item.${index + 1}`}
    >
      <Link
        to="/chat/$conversationId"
        params={{ conversationId: conversation.id.toString() }}
        className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 pr-14 shadow-subtle transition-smooth hover:-translate-y-px hover:border-primary/30 hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        data-ocid={`connections.open_link.${index + 1}`}
      >
        <span className="relative shrink-0">
          <Avatar className="size-11 ring-2 ring-border">
            {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
            <AvatarFallback className="bg-secondary text-sm font-semibold text-secondary-foreground">
              {initialsFor(name)}
            </AvatarFallback>
          </Avatar>
          <span
            className="absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border-2 border-card bg-accent"
            aria-hidden="true"
          />
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate font-medium text-foreground">{name}</span>
            {hasUnread ? (
              <span
                className="inline-flex min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold leading-5 text-primary-foreground"
                aria-label={`${unread} unread ${unread === 1 ? "message" : "messages"}`}
                data-ocid={`connections.unread_badge.${index + 1}`}
              >
                {unread > 99 ? "99+" : unread}
              </span>
            ) : null}
          </span>
          <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <MessageSquare className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">
              {hasUnread
                ? `${unread} new ${unread === 1 ? "message" : "messages"}`
                : peer
                  ? shortPrincipal(peer)
                  : "Private room"}
            </span>
            {lastActive ? (
              <>
                <span aria-hidden="true">·</span>
                <span className="shrink-0">{lastActive}</span>
              </>
            ) : null}
          </span>
        </span>
      </Link>

      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        aria-label={`Leave conversation with ${name}`}
        data-ocid={`connections.leave_button.${index + 1}`}
        className="absolute right-3 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground opacity-100 transition-smooth hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
      >
        <LogOut className="size-4" aria-hidden="true" />
      </button>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent data-ocid={`connections.leave_dialog.${index + 1}`}>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave this conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              You'll stop seeing messages with {name}. They can reconnect with
              you using a new code.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              data-ocid={`connections.leave_cancel_button.${index + 1}`}
              className="rounded-full"
            >
              Keep it
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                handleLeave();
              }}
              disabled={leave.isPending}
              data-ocid={`connections.leave_confirm_button.${index + 1}`}
              className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {leave.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Leaving…
                </>
              ) : (
                "Leave"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
}
