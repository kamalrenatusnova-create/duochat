mixin () {
  /// Static Markdown documentation of the backend's public API.
  public query func getApiDoc() : async Text {
    "
# Private Chat Backend API

A private, two-person chat canister. Two accounts pair through a short
connection code; once paired they share a conversation where they can exchange
text messages and file/photo/audio/music attachments.

## Authentication and identity

Every method that reads or writes personal data takes the caller's principal
from the IC message (`{ caller }`). There is no separate login endpoint: the
frontend authenticates with Internet Identity and the resulting principal is
the user's identity.

- **Anonymous callers** are not explicitly rejected by the chat/profile
  methods, but they act as the anonymous principal: they have no profile, no
  connections, and no messages, so the methods return empty results. The
  frontend must sign in with Internet Identity before the app is usable.
- **Signed-in callers** are identified by their principal. A user's profile,
  connection codes, conversations, and messages are all keyed by that principal.
- **Owner** of a resource is the principal that created it: a profile belongs to
  its user, a connection code to its creator, a message to its sender.
- **Admin / controller** is the canister controller (the platform). Controllers
  can read all OQL-exposed rows; ordinary users are scoped to their own rows.

The app's frontend pins an Internet Identity derivation origin, published at
`/.well-known/ii-derivation-origin` when available. An agent that already holds
the user's Internet Identity authorization derives the correct per-app principal
against that origin (for example `icp identity link web <name> --app <host>`).
Such a delegation acts with the user's full authority in this app until it
expires.

### Registration prerequisite

There is no explicit registration call. A user becomes known to the canister the
first time they call a method that writes their data (for example
`saveCallerProfile`). A principal that has never signed in through the app's own
frontend is unknown to the canister even if it belongs to the app's owner, and a
signed-in caller derived against a different origin is a different principal
than the one the frontend registered.

## Public methods

### Profiles

- `saveCallerProfile(profile : UserProfile) : async ()` — create or replace the
  caller's profile. `UserProfile = { displayName : Text; avatar : ?Attachment }`.
  Requires a signed-in caller.
- `getCallerProfile() : async ?UserProfile` — read the caller's own profile.
  Returns `null` when none has been saved.
- `getUserProfile(user : UserId) : async ?UserProfile` — read another user's
  public profile by principal. Returns `null` when that user has no profile.

### Connection codes

- `createConnectionCode() : async ConnectionCode` — generate a new short,
  shareable code for the caller. Codes are valid for 24 hours.
- `redeemConnectionCode(code : ConnectionCode) : async { #ok : ConversationId;
  #err : ChatError }` — redeem a friend's code, opening (or reusing) the shared
  conversation between the caller and the code's creator.

### Conversations and messages

- `listConversations() : async [ConversationSummary]` — the caller's active
  connections, newest activity first, each with an unread count.
- `leaveConversation(conversationId : ConversationId) : async { #ok;
  #err : ChatError }` — end a conversation for the caller. This removes the
  conversation and its messages for both participants.
- `sendMessage(conversationId : ConversationId, text : Text,
  attachments : [Attachment]) : async { #ok : Message; #err : ChatError }` —
  append a message. At least one of `text` or `attachments` must be non-empty.
- `getMessages(conversationId : ConversationId, cursor : ?MessageId,
  limit : Nat) : async { #ok : MessagePage; #err : ChatError }` — a page of
  messages, newest-first. `limit == 0` uses the default of 50; the maximum is
  200.
- `markConversationRead(conversationId : ConversationId) : async { #ok;
  #err : ChatError }` — mark all messages in a conversation as read for the
  caller, clearing its unread count.

### Query layer (OQL)

- `schema() : async Text` — JSON schema of the queryable entities.
- `execute(qJson : Text) : async Result` — run a JSON query against the
  entities. Both honour per-entity authorization.

### Documentation

- `getApiDoc() : async Text` — this document.

## Units and encodings

- **Timestamps** (`createdAt`, `expiresAt`, `lastMessageAt`) are `Int`
  nanoseconds since the Unix epoch (`Time.now()`).
- **`UserId`** is a `Principal`.
- **`ConversationId`** and **`MessageId`** are `Nat`, assigned monotonically
  from 0.
- **`ConnectionCode`** is an 8-character `Text` drawn from an unambiguous
  alphabet (no `I`, `O`, `0`, `1`).
- **`Attachment`** is `{ blob : Blob; name : Text; mimeType : Text; size : Nat }`.
  `blob` is an object-storage reference; `size` is in bytes.
- **`?T`** optional values are `null` when absent.
- **`ChatError`** is a variant: `#invalidCode`, `#expiredCode`,
  `#alreadyUsedCode`, `#cannotConnectToSelf`, `#alreadyConnected`,
  `#notParticipant`, `#conversationNotFound`, `#emptyMessage`.

## Lifecycle and polling

- A connection code is created with `createConnectionCode` and expires 24 hours
  after creation. It is single-use: once redeemed it can never be redeemed
  again.
- Redeeming a code between two users who already share a conversation returns
  that existing conversation instead of creating a duplicate.
- Conversations are ordered by last message time (falling back to creation
  time) and carry an unread count computed from the caller's read marker.
- To receive new messages, poll `getMessages` (or `listConversations` for
  unread counts) on an interval. There is no push/subscription endpoint.
  `getMessages` is a query call and is cheap to poll.
- `getMessages` returns messages newest-first. Pass the returned `nextCursor`
  as the next call's `cursor` to page backwards through older messages; a
  `null` cursor starts from the newest message.

## Mutation retry safety

- `sendMessage` is **not idempotent**: retrying a call that actually succeeded
  appends a duplicate message. The frontend should not blindly retry; it should
  re-read the conversation to confirm whether the message landed.
- `createConnectionCode` is **not idempotent**: each call creates a new code.
- `redeemConnectionCode` is effectively idempotent for a given pair: a second
  redemption of an already-used code returns `#alreadyUsedCode`, but if the two
  users are already connected the first redemption returns the existing
  conversation.
- `saveCallerProfile` is idempotent: it replaces the caller's profile.
- `markConversationRead` is idempotent.
- `leaveConversation` is destructive and not idempotent: the first call removes
  the conversation and its messages; a second call returns
  `#conversationNotFound`.

## Errors, traps, and gotchas

- Methods that require a signed-in caller trap for anonymous callers.
- `redeemConnectionCode` returns `#cannotConnectToSelf` when the caller tries to
  redeem their own code.
- `sendMessage` returns `#emptyMessage` when both `text` and `attachments` are
  empty.
- `getMessages` and `markConversationRead` return `#notParticipant` when the
  caller is not a participant of the conversation, and
  `#conversationNotFound` when the conversation does not exist.
- `leaveConversation` removes the conversation for **both** participants; the
  other user loses access to the history as well.
- Attachments are stored through platform object storage. Uploads that exceed
  the platform's size limits fail at the storage layer, not in this canister.
- OQL `execute` traps on a malformed JSON query.
";
  };
};
