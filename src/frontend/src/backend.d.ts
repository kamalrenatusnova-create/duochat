import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
import type { ExternalBlob } from "@caffeineai/object-storage";
export type { ExternalBlob } from "@caffeineai/object-storage";
export interface Attachment {
    blob: ExternalBlob;
    name: string;
    size: bigint;
    mimeType: string;
}
export interface Cell {
    value: Value;
    name: string;
}
export type ConnectionCode = string;
export type ConversationId = bigint;
export interface ConversationSummary {
    id: ConversationId;
    participants: Array<UserId>;
    lastMessageAt?: Timestamp;
    createdAt: Timestamp;
    unreadCount: bigint;
}
export type Error_ = {
    __kind__: "FrontendOriginsNotConfigured";
    FrontendOriginsNotConfigured: null;
} | {
    __kind__: "MixedSsoSources";
    MixedSsoSources: {
        otherKeys: Array<string>;
        ssoKeys: Array<string>;
    };
} | {
    __kind__: "Stale";
    Stale: {
        ageNs: bigint;
    };
} | {
    __kind__: "MalformedCandid";
    MalformedCandid: null;
} | {
    __kind__: "AmbiguousAttribute";
    AmbiguousAttribute: {
        field: string;
        sources: Array<string>;
    };
} | {
    __kind__: "NoAttributes";
    NoAttributes: null;
} | {
    __kind__: "UnknownNonce";
    UnknownNonce: null;
} | {
    __kind__: "UntrustedSsoSource";
    UntrustedSsoSource: {
        domain: string;
    };
} | {
    __kind__: "MissingField";
    MissingField: string;
} | {
    __kind__: "FrontendOriginMismatch";
    FrontendOriginMismatch: {
        got: string;
        expected: Array<string>;
    };
};
export interface Message {
    id: MessageId;
    createdAt: Timestamp;
    text: string;
    sender: UserId;
    conversationId: ConversationId;
    attachments: Array<Attachment>;
}
export type MessageId = bigint;
export interface MessagePage {
    messages: Array<Message>;
    nextCursor?: MessageId;
}
export interface Result {
    hasMore: boolean;
    rows: Array<Array<Cell>>;
}
export type Result__1 = {
    __kind__: "ok";
    ok: null;
} | {
    __kind__: "err";
    err: Error_;
};
export type Timestamp = bigint;
export type UserId = Principal;
export interface UserProfile {
    displayName: string;
    avatar?: Attachment;
}
export type Value = {
    __kind__: "int";
    int: bigint;
} | {
    __kind__: "nat";
    nat: bigint;
} | {
    __kind__: "float";
    float: number;
} | {
    __kind__: "bool";
    bool: boolean;
} | {
    __kind__: "null";
    null: null;
} | {
    __kind__: "text";
    text: string;
};
export enum ChatError {
    alreadyUsedCode = "alreadyUsedCode",
    notParticipant = "notParticipant",
    cannotConnectToSelf = "cannotConnectToSelf",
    expiredCode = "expiredCode",
    invalidCode = "invalidCode",
    alreadyConnected = "alreadyConnected",
    conversationNotFound = "conversationNotFound",
    emptyMessage = "emptyMessage"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    /**
     * / Create a new short, shareable connection code for the caller.
     */
    createConnectionCode(): Promise<ConnectionCode>;
    execute(qJson: string): Promise<Result>;
    /**
     * / Static Markdown documentation of the backend's public API.
     */
    getApiDoc(): Promise<string>;
    /**
     * / Read the caller's own profile, if one has been saved.
     */
    getCallerProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    /**
     * / Fetch a page of messages, newest-first, using an optional cursor.
     */
    getMessages(conversationId: ConversationId, cursor: MessageId | null, limit: bigint): Promise<{
        __kind__: "ok";
        ok: MessagePage;
    } | {
        __kind__: "err";
        err: ChatError;
    }>;
    /**
     * / Read another user's public profile.
     */
    getUserProfile(user: UserId): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    /**
     * / Leave/end a conversation for the caller.
     */
    leaveConversation(conversationId: ConversationId): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: ChatError;
    }>;
    /**
     * / List the caller's active connections with unread counts.
     */
    listConversations(): Promise<Array<ConversationSummary>>;
    /**
     * / Mark all messages in a conversation as read for the caller.
     */
    markConversationRead(conversationId: ConversationId): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: ChatError;
    }>;
    /**
     * / Redeem a friend's connection code, opening a shared conversation.
     */
    redeemConnectionCode(code: ConnectionCode): Promise<{
        __kind__: "ok";
        ok: ConversationId;
    } | {
        __kind__: "err";
        err: ChatError;
    }>;
    /**
     * / Create or replace the caller's profile (display name and avatar).
     */
    saveCallerProfile(profile: UserProfile): Promise<void>;
    schema(): Promise<string>;
    /**
     * / Send a text and/or attachment message to a conversation.
     */
    sendMessage(conversationId: ConversationId, text: string, attachments: Array<Attachment>): Promise<{
        __kind__: "ok";
        ok: Message;
    } | {
        __kind__: "err";
        err: ChatError;
    }>;
}
