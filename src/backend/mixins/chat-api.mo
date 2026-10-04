import Common "../types/common";
import Types "../types/chat";
import ChatLib "../lib/chat";

mixin (state : ChatLib.ChatState) {
  public type UserId = Common.UserId;
  public type ConversationId = Common.ConversationId;
  public type MessageId = Common.MessageId;
  public type ConnectionCode = Common.ConnectionCode;
  public type Attachment = Common.Attachment;
  public type ConnectionCodeInfo = Types.ConnectionCodeInfo;
  public type ConversationSummary = Types.ConversationSummary;
  public type Message = Types.Message;
  public type MessagePage = Types.MessagePage;
  public type ChatError = Types.ChatError;

  /// Create a new short, shareable connection code for the caller.
  public shared ({ caller }) func createConnectionCode() : async ConnectionCode {
    ChatLib.createConnectionCode(state, caller);
  };

  /// Redeem a friend's connection code, opening a shared conversation.
  public shared ({ caller }) func redeemConnectionCode(code : ConnectionCode) : async {
    #ok : ConversationId;
    #err : ChatError;
  } {
    ChatLib.redeemConnectionCode(state, caller, code);
  };

  /// List the caller's active connections with unread counts.
  public query ({ caller }) func listConversations() : async [ConversationSummary] {
    ChatLib.listConversations(state, caller);
  };

  /// Leave/end a conversation for the caller.
  public shared ({ caller }) func leaveConversation(conversationId : ConversationId) : async {
    #ok;
    #err : ChatError;
  } {
    ChatLib.leaveConversation(state, caller, conversationId);
  };

  /// Send a text and/or attachment message to a conversation.
  public shared ({ caller }) func sendMessage(
    conversationId : ConversationId,
    text : Text,
    attachments : [Attachment],
  ) : async { #ok : Message; #err : ChatError } {
    ChatLib.sendMessage(state, caller, conversationId, text, attachments);
  };

  /// Fetch a page of messages, newest-first, using an optional cursor.
  public query ({ caller }) func getMessages(
    conversationId : ConversationId,
    cursor : ?MessageId,
    limit : Nat,
  ) : async { #ok : MessagePage; #err : ChatError } {
    ChatLib.getMessages(state, caller, conversationId, cursor, limit);
  };

  /// Mark all messages in a conversation as read for the caller.
  public shared ({ caller }) func markConversationRead(conversationId : ConversationId) : async {
    #ok;
    #err : ChatError;
  } {
    ChatLib.markConversationRead(state, caller, conversationId);
  };
};
