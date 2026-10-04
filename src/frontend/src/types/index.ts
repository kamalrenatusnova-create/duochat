import { ChatError } from "@/backend";
import type {
  Attachment,
  ConversationId,
  ConversationSummary,
  Message,
  MessageId,
  MessagePage,
  Timestamp,
  UserId,
  UserProfile,
} from "@/backend";
import type { Principal } from "@icp-sdk/core/principal";

export { ChatError };
export type {
  Attachment,
  ConversationId,
  ConversationSummary,
  Message,
  MessageId,
  MessagePage,
  Timestamp,
  UserId,
  UserProfile,
};

export type { Principal };

/** A conversation paired with the other participant's profile. */
export interface Connection {
  summary: ConversationSummary;
  peer: UserId;
  peerProfile: UserProfile | null;
}

/** Result of a backend call that returns a ChatError variant. */
export type ChatResult<T> =
  | { __kind__: "ok"; ok: T }
  | { __kind__: "err"; err: ChatError };

/** Human-readable copy for every backend chat error. */
export const CHAT_ERROR_MESSAGES: Record<ChatError, string> = {
  [ChatError.invalidCode]:
    "That code doesn't match any connection. Check it and try again.",
  [ChatError.expiredCode]:
    "That code has expired. Ask your friend for a fresh one.",
  [ChatError.alreadyUsedCode]:
    "That code has already been used to open a connection.",
  [ChatError.cannotConnectToSelf]:
    "You can't connect to yourself — share the code with a friend.",
  [ChatError.alreadyConnected]: "You're already connected with this person.",
  [ChatError.notParticipant]: "You're not part of this conversation.",
  [ChatError.conversationNotFound]: "This conversation no longer exists.",
  [ChatError.emptyMessage]: "Write something or attach a file before sending.",
};

export function chatErrorMessage(error: ChatError): string {
  return (
    CHAT_ERROR_MESSAGES[error] ?? "Something went wrong. Please try again."
  );
}

/** Convert a Motoko nanosecond timestamp into a JS Date, or null when invalid. */
export function timestampToDate(
  timestamp: Timestamp | null | undefined,
): Date | null {
  if (timestamp === null || timestamp === undefined) return null;
  const date = new Date(Number(timestamp / 1_000_000n));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Compact relative time for conversation lists ("now", "4m", "2h", "3d"). */
export function formatRelativeTime(
  timestamp: Timestamp | null | undefined,
): string {
  const date = timestampToDate(timestamp);
  if (!date) return "";
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Clock time for message bubbles. */
export function formatClockTime(
  timestamp: Timestamp | null | undefined,
): string {
  const date = timestampToDate(timestamp);
  if (!date) return "";
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Day separator label for message groups. */
export function formatDayLabel(
  timestamp: Timestamp | null | undefined,
): string {
  const date = timestampToDate(timestamp);
  if (!date) return "";
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (sameDay(date, today)) return "Today";
  if (sameDay(date, yesterday)) return "Yesterday";
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

/** Human-readable file size. */
export function formatFileSize(bytes: bigint): string {
  const value = Number(bytes);
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 * 1024 * 1024)
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  return `${(value / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/** Shorten a principal for display. */
export function shortPrincipal(principal: Principal): string {
  const text = principal.toText();
  return `${text.slice(0, 5)}…${text.slice(-3)}`;
}

/** Initials for an avatar fallback. */
export function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function isImageAttachment(attachment: Attachment): boolean {
  return attachment.mimeType.startsWith("image/");
}

export function isAudioAttachment(attachment: Attachment): boolean {
  return attachment.mimeType.startsWith("audio/");
}

/** Maximum upload size accepted by the storage gateway (25 MB). */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export const MESSAGE_PAGE_SIZE = 50n;
