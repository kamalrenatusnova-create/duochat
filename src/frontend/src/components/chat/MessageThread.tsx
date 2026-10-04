import { MessageBubble } from "@/components/chat/MessageBubble";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  type Message,
  type UserProfile,
  formatDayLabel,
  timestampToDate,
} from "@/types";
import { Loader2, MessagesSquare } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";

interface MessageThreadProps {
  messages: Message[];
  callerId: string;
  peerName: string;
  peerProfile: UserProfile | null;
  callerName: string;
  callerProfile: UserProfile | null;
  isLoading: boolean;
  /** True when older messages exist beyond the loaded pages. */
  hasEarlier?: boolean;
  isLoadingEarlier?: boolean;
  onLoadEarlier?: () => void;
}

interface ThreadItem {
  message: Message;
  isOwn: boolean;
  grouped: boolean;
  dayLabel: string | null;
}

function sameDay(a: Date | null, b: Date | null): boolean {
  if (!a || !b) return false;
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function MessageThread({
  messages,
  callerId,
  peerName,
  peerProfile,
  callerName,
  callerProfile,
  isLoading,
  hasEarlier = false,
  isLoadingEarlier = false,
  onLoadEarlier,
}: MessageThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const previousCount = useRef(0);
  const previousNewestId = useRef<string | null>(null);

  // Backend returns newest-first; render oldest → newest.
  const items = useMemo<ThreadItem[]>(() => {
    const ordered = [...messages].sort((a, b) =>
      a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0,
    );
    return ordered.map((message, index) => {
      const previous = index > 0 ? ordered[index - 1] : null;
      const isOwn = message.sender.toText() === callerId;
      const previousOwn = previous
        ? previous.sender.toText() === callerId
        : false;
      const date = timestampToDate(message.createdAt);
      const previousDate = previous
        ? timestampToDate(previous.createdAt)
        : null;
      const newDay = !sameDay(date, previousDate);
      return {
        message,
        isOwn,
        grouped: !newDay && previousOwn === isOwn,
        dayLabel: newDay ? formatDayLabel(message.createdAt) : null,
      };
    });
  }, [messages, callerId]);

  // Scroll to the newest message only when a new message is appended at the
  // end. Prepending older pages (Load earlier) must preserve scroll position.
  useEffect(() => {
    if (items.length === 0) return;
    const newestId = items[items.length - 1].message.id.toString();
    const isFirstLoad = previousCount.current === 0;
    const appended = previousNewestId.current !== newestId;
    if (isFirstLoad || appended) {
      bottomRef.current?.scrollIntoView({
        behavior: isFirstLoad ? "auto" : "smooth",
        block: "end",
      });
    }
    previousCount.current = items.length;
    previousNewestId.current = newestId;
  }, [items]);

  if (isLoading) {
    return (
      <div
        className="flex flex-1 flex-col gap-4 overflow-hidden p-4 sm:p-6"
        data-ocid="conversation.loading_state"
      >
        {Array.from({ length: 5 }, (_, i) => `msg-skeleton-${i}`).map(
          (id, index) => (
            <Skeleton
              key={id}
              className={
                index % 2 === 0
                  ? "h-12 w-2/3 rounded-2xl"
                  : "ml-auto h-12 w-1/2 rounded-2xl"
              }
            />
          ),
        )}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div
        className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center"
        data-ocid="conversation.empty_state"
      >
        <span className="flex size-14 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground">
          <MessagesSquare className="size-6" aria-hidden="true" />
        </span>
        <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          Say hello
        </h2>
        <p className="max-w-sm text-[15px] leading-relaxed text-muted-foreground">
          This room is just for you and {peerName}. Send the first message, or
          share a photo, a song, or a file.
        </p>
      </div>
    );
  }

  return (
    <div
      className="scrollbar-soft flex-1 overflow-y-auto bg-gradient-subtle px-4 py-4 sm:px-6"
      data-ocid="conversation.message_list"
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col">
        {hasEarlier ? (
          <div className="flex justify-center pb-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onLoadEarlier}
              disabled={isLoadingEarlier}
              className="rounded-full"
              data-ocid="conversation.load_earlier_button"
            >
              {isLoadingEarlier ? (
                <>
                  <Loader2
                    className="size-3.5 animate-spin"
                    aria-hidden="true"
                  />
                  Loading…
                </>
              ) : (
                "Load earlier messages"
              )}
            </Button>
          </div>
        ) : null}
        {items.map((item) => (
          <div key={item.message.id.toString()}>
            {item.dayLabel ? (
              <div className="my-5 flex items-center gap-3">
                <span className="h-px flex-1 bg-border" />
                <span className="rounded-full border border-border bg-card px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  {item.dayLabel}
                </span>
                <span className="h-px flex-1 bg-border" />
              </div>
            ) : null}
            <MessageBubble
              message={item.message}
              isOwn={item.isOwn}
              grouped={item.grouped}
              senderName={item.isOwn ? callerName : peerName}
              senderProfile={item.isOwn ? callerProfile : peerProfile}
            />
          </div>
        ))}
        <div ref={bottomRef} className="h-1" />
      </div>
    </div>
  );
}
