import { MessageAttachment } from "@/components/chat/MessageAttachment";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  type Message,
  type UserProfile,
  formatClockTime,
  initialsFor,
} from "@/types";

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  senderName: string;
  senderProfile: UserProfile | null;
  /** True when the previous message shares this sender and day. */
  grouped: boolean;
}

export function MessageBubble({
  message,
  isOwn,
  senderName,
  senderProfile,
  grouped,
}: MessageBubbleProps) {
  const avatarUrl = senderProfile?.avatar?.blob.getDirectURL();
  const hasText = message.text.trim().length > 0;

  return (
    <div
      className={cn(
        "flex w-full items-end gap-2.5",
        isOwn ? "flex-row-reverse" : "flex-row",
        grouped ? "mt-1" : "mt-5",
      )}
      data-ocid="message.item"
    >
      <div className="w-8 shrink-0">
        {grouped ? null : (
          <Avatar className="size-8">
            {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
            <AvatarFallback className="bg-secondary text-[11px] font-semibold text-secondary-foreground">
              {initialsFor(senderName)}
            </AvatarFallback>
          </Avatar>
        )}
      </div>

      <div
        className={cn(
          "flex min-w-0 max-w-[85%] flex-col gap-1.5 sm:max-w-[72%]",
          isOwn ? "items-end" : "items-start",
        )}
      >
        {grouped ? null : (
          <span className="px-1 text-[11px] font-medium text-muted-foreground">
            {isOwn ? "You" : senderName}
          </span>
        )}

        <div
          className={cn(
            "flex flex-col gap-2 px-3.5 py-2.5 text-[15px] leading-relaxed",
            isOwn
              ? "rounded-[18px] rounded-br-md bg-bubble-out text-bubble-out-foreground shadow-bubble-out"
              : "rounded-[18px] rounded-bl-md bg-bubble-in text-bubble-in-foreground shadow-bubble-in",
          )}
        >
          {message.attachments.map((attachment, index) => (
            <MessageAttachment
              key={`${message.id.toString()}-${index}`}
              attachment={attachment}
            />
          ))}
          {hasText ? (
            <p className="whitespace-pre-wrap break-words">{message.text}</p>
          ) : null}
        </div>

        <time
          className="px-1 font-mono text-[10px] text-muted-foreground"
          dateTime={new Date(
            Number(message.createdAt / 1_000_000n),
          ).toISOString()}
        >
          {formatClockTime(message.createdAt)}
        </time>
      </div>
    </div>
  );
}
