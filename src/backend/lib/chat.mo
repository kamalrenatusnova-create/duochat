import Char "mo:core/Char";
import Int "mo:core/Int";
import List "mo:core/List";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Set "mo:core/Set";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Common "../types/common";
import Types "../types/chat";

module {
  public type UserId = Common.UserId;
  public type Timestamp = Common.Timestamp;
  public type ConversationId = Common.ConversationId;
  public type MessageId = Common.MessageId;
  public type ConnectionCode = Common.ConnectionCode;
  public type Attachment = Common.Attachment;
  public type UserProfile = Types.UserProfile;
  public type ConnectionCodeInfo = Types.ConnectionCodeInfo;
  public type Conversation = Types.Conversation;
  public type ConversationSummary = Types.ConversationSummary;
  public type Message = Types.Message;
  public type MessagePage = Types.MessagePage;
  public type ChatError = Types.ChatError;

  /// Internal conversation record. `participants` is a Set for O(log n)
  /// membership checks; `messages` holds the conversation's messages in
  /// insertion (chronological) order.
  public type ConversationInternal = {
    id : ConversationId;
    participants : Set.Set<UserId>;
    createdAt : Timestamp;
    messages : List.List<Message>;
  };

  /// Internal connection-code record. `creator` is the user who generated
  /// the code; redeeming it pairs the redeemer with the creator.
  public type ConnectionCodeInternal = {
    code : ConnectionCode;
    creator : UserId;
    createdAt : Timestamp;
    expiresAt : Timestamp;
    used : Bool;
  };

  /// Shared mutable state owned by the actor and injected into the mixin.
  public type ChatState = {
    var nextConversationId : Nat;
    var nextMessageId : Nat;
    var nextCodeSeq : Nat;
    conversations : Map.Map<ConversationId, ConversationInternal>;
    codes : Map.Map<ConnectionCode, ConnectionCodeInternal>;
    /// conversationId -> (userId -> last-read message id)
    readMarkers : Map.Map<ConversationId, Map.Map<UserId, MessageId>>;
  };

  /// Connection codes are valid for 24 hours (86_400_000_000_000 ns).
  let CODE_TTL_NS : Int = 86_400_000_000_000;

  /// Default page size when the caller asks for zero.
  let DEFAULT_PAGE_LIMIT : Nat = 50;

  /// Maximum page size.
  let MAX_PAGE_LIMIT : Nat = 200;

  /// Generate a new short, shareable connection code for the caller.
  public func createConnectionCode(state : ChatState, caller : UserId) : ConnectionCode {
    let now = Time.now();
    let seq = state.nextCodeSeq;
    state.nextCodeSeq := seq + 1;
    let code = generateCode(caller, seq, now);
    state.codes.add(code, {
      code;
      creator = caller;
      createdAt = now;
      expiresAt = now + CODE_TTL_NS;
      used = false;
    });
    code;
  };

  /// Redeem a connection code, pairing the caller with the code's creator.
  public func redeemConnectionCode(state : ChatState, caller : UserId, code : ConnectionCode) : {
    #ok : ConversationId;
    #err : ChatError;
  } {
    let info = switch (state.codes.get(code)) {
      case (?info) { info };
      case null { return #err(#invalidCode) };
    };
    if (info.used) { return #err(#alreadyUsedCode) };
    if (Time.now() > info.expiresAt) { return #err(#expiredCode) };
    if (Principal.equal(info.creator, caller)) { return #err(#cannotConnectToSelf) };

    // Reuse an existing conversation between these two users, if any.
    switch (findConversationBetween(state, info.creator, caller)) {
      case (?existing) {
        state.codes.add(code, { info with used = true });
        return #ok(existing.id);
      };
      case null {};
    };

    let id = state.nextConversationId;
    state.nextConversationId := id + 1;
    let participants = Set.empty<UserId>();
    participants.add(info.creator);
    participants.add(caller);
    state.conversations.add(id, {
      id;
      participants;
      createdAt = Time.now();
      messages = List.empty<Message>();
    });
    state.codes.add(code, { info with used = true });
    #ok(id);
  };

  /// List the caller's active connections, newest activity first.
  public func listConversations(state : ChatState, caller : UserId) : [ConversationSummary] {
    let summaries = List.empty<ConversationSummary>();
    for ((_, conv) in state.conversations.entries()) {
      if (conv.participants.contains(caller)) {
        summaries.add(toSummary(state, conv, caller));
      };
    };
    let arr = summaries.toArray();
    arr.sort(compareSummaries);
  };

  /// Leave/end a conversation for the caller.
  public func leaveConversation(state : ChatState, caller : UserId, conversationId : ConversationId) : {
    #ok;
    #err : ChatError;
  } {
    let conv = switch (state.conversations.get(conversationId)) {
      case (?conv) { conv };
      case null { return #err(#conversationNotFound) };
    };
    if (not conv.participants.contains(caller)) { return #err(#notParticipant) };
    state.conversations.remove(conversationId);
    state.readMarkers.remove(conversationId);
    #ok;
  };

  /// Append a message (text and/or attachments) to a conversation.
  public func sendMessage(
    state : ChatState,
    caller : UserId,
    conversationId : ConversationId,
    text : Text,
    attachments : [Attachment],
  ) : { #ok : Message; #err : ChatError } {
    let conv = switch (state.conversations.get(conversationId)) {
      case (?conv) { conv };
      case null { return #err(#conversationNotFound) };
    };
    if (not conv.participants.contains(caller)) { return #err(#notParticipant) };
    if (text.size() == 0 and attachments.size() == 0) { return #err(#emptyMessage) };

    let id = state.nextMessageId;
    state.nextMessageId := id + 1;
    let message : Message = {
      id;
      conversationId;
      sender = caller;
      text;
      attachments;
      createdAt = Time.now();
    };
    conv.messages.add(message);
    #ok(message);
  };

  /// Fetch a page of messages, newest-first, using an optional cursor.
  public func getMessages(
    state : ChatState,
    caller : UserId,
    conversationId : ConversationId,
    cursor : ?MessageId,
    limit : Nat,
  ) : { #ok : MessagePage; #err : ChatError } {
    let conv = switch (state.conversations.get(conversationId)) {
      case (?conv) { conv };
      case null { return #err(#conversationNotFound) };
    };
    if (not conv.participants.contains(caller)) { return #err(#notParticipant) };

    let pageSize = if (limit == 0) { DEFAULT_PAGE_LIMIT } else { Nat.min(limit, MAX_PAGE_LIMIT) };
    let all = conv.messages.toArray();
    // Newest-first: walk from the end backwards.
    let collected = List.empty<Message>();
    var lastCollected : ?Message = null;
    var remaining = pageSize;
    var idx = all.size();
    while (idx > 0 and remaining > 0) {
      idx -= 1;
      let msg = all[idx];
      let skip = switch (cursor) {
        case (?c) { msg.id >= c };
        case null { false };
      };
      if (not skip) {
        collected.add(msg);
        lastCollected := ?msg;
        remaining -= 1;
      };
    };
    // If there are older messages beyond this page, expose the oldest id
    // returned as the next cursor.
    var nextCursor : ?MessageId = null;
    if (idx > 0) {
      switch (lastCollected) {
        case (?m) { nextCursor := ?m.id };
        case null {};
      };
    };
    #ok({ messages = collected.toArray(); nextCursor });
  };

  /// Mark all messages in a conversation as read for the caller.
  public func markConversationRead(state : ChatState, caller : UserId, conversationId : ConversationId) : {
    #ok;
    #err : ChatError;
  } {
    let conv = switch (state.conversations.get(conversationId)) {
      case (?conv) { conv };
      case null { return #err(#conversationNotFound) };
    };
    if (not conv.participants.contains(caller)) { return #err(#notParticipant) };
    let markers = switch (state.readMarkers.get(conversationId)) {
      case (?m) { m };
      case null {
        let m = Map.empty<UserId, MessageId>();
        state.readMarkers.add(conversationId, m);
        m;
      };
    };
    let lastId = switch (lastMessage(conv)) {
      case (?m) { m.id };
      case null { 0 };
    };
    markers.add(caller, lastId);
    #ok;
  };

  // --- helpers ---

  /// The most recent message in a conversation, if any.
  func lastMessage(conv : ConversationInternal) : ?Message {
    conv.messages.last();
  };

  /// Build a short, human-shareable code from the caller's principal and a
  /// monotonically increasing sequence number. Deterministic and collision-free
  /// for a given caller/sequence pair.
  func generateCode(caller : UserId, seq : Nat, now : Timestamp) : ConnectionCode {
    let alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let chars = alphabet.toArray();
    let base = chars.size();
    // Mix the caller's principal bytes and the sequence into a seed.
    let principalBytes = caller.toBlob().toArray();
    var acc : Nat = seq + 1;
    for (b in principalBytes.values()) {
      acc := (acc * 31 + b.toNat()) % 1_000_000_007;
    };
    acc := (acc * 31 + (now % 1_000_000_007).toNat()) % 1_000_000_007;
    var out = "";
    var n = acc;
    var i = 0;
    while (i < 8) {
      let digit = n % base;
      out := chars[digit].toText() # out;
      n := n / base;
      i += 1;
    };
    out;
  };

  func findConversationBetween(state : ChatState, a : UserId, b : UserId) : ?ConversationInternal {
    for ((_, conv) in state.conversations.entries()) {
      if (conv.participants.contains(a) and conv.participants.contains(b)) {
        return ?conv;
      };
    };
    null;
  };

  func toSummary(state : ChatState, conv : ConversationInternal, caller : UserId) : ConversationSummary {
    let lastMessageAt = switch (lastMessage(conv)) {
      case (?m) { ?m.createdAt };
      case null { null };
    };
    let lastRead = switch (state.readMarkers.get(conv.id)) {
      case (?markers) {
        switch (markers.get(caller)) {
          case (?id) { id };
          case null { 0 };
        };
      };
      case null { 0 };
    };
    var unread = 0;
    for (msg in conv.messages.values()) {
      if (not Principal.equal(msg.sender, caller) and msg.id > lastRead) {
        unread += 1;
      };
    };
    {
      id = conv.id;
      participants = conv.participants.toArray();
      createdAt = conv.createdAt;
      lastMessageAt;
      unreadCount = unread;
    };
  };

  func compareSummaries(a : ConversationSummary, b : ConversationSummary) : { #less; #equal; #greater } {
    let aTime = a.lastMessageAt ?? a.createdAt;
    let bTime = b.lastMessageAt ?? b.createdAt;
    if (aTime > bTime) { #less } else if (aTime < bTime) { #greater } else { #equal };
  };
};
