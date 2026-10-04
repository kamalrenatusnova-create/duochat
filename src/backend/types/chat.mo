import Common "common";

module {
  public type UserId = Common.UserId;
  public type Timestamp = Common.Timestamp;
  public type ConversationId = Common.ConversationId;
  public type MessageId = Common.MessageId;
  public type ConnectionCode = Common.ConnectionCode;
  public type Attachment = Common.Attachment;

  /// A user's public profile: display name and avatar.
  public type UserProfile = {
    displayName : Text;
    avatar : ?Attachment;
  };

  /// A pending connection code created by a user and shared with a friend.
  public type ConnectionCodeInfo = {
    code : ConnectionCode;
    createdAt : Timestamp;
    expiresAt : Timestamp;
    used : Bool;
  };

  /// A conversation between exactly two users.
  public type Conversation = {
    id : ConversationId;
    participants : [UserId];
    createdAt : Timestamp;
  };

  /// A conversation plus the caller's unread count and last activity.
  public type ConversationSummary = {
    id : ConversationId;
    participants : [UserId];
    createdAt : Timestamp;
    lastMessageAt : ?Timestamp;
    unreadCount : Nat;
  };

  /// A single message in a conversation.
  public type Message = {
    id : MessageId;
    conversationId : ConversationId;
    sender : UserId;
    text : Text;
    attachments : [Attachment];
    createdAt : Timestamp;
  };

  /// A page of messages, newest-first, with a cursor for older pages.
  public type MessagePage = {
    messages : [Message];
    nextCursor : ?MessageId;
  };

  /// Errors surfaced by connection-code and conversation operations.
  public type ChatError = {
    #invalidCode;
    #expiredCode;
    #alreadyUsedCode;
    #cannotConnectToSelf;
    #alreadyConnected;
    #notParticipant;
    #conversationNotFound;
    #emptyMessage;
  };
};
