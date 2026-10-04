import Iter "mo:core/Iter";
import List "mo:core/List";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Set "mo:core/Set";
import Text "mo:core/Text";
import OQL "mo:caffeineai-oql";
import Entity "mo:caffeineai-oql/Entity";
import MapEntity "mo:caffeineai-oql/MapEntity";
import NatValue "mo:caffeineai-oql/NatValue";
import IntValue "mo:caffeineai-oql/IntValue";
import TextValue "mo:caffeineai-oql/TextValue";
import PrincipalValue "mo:caffeineai-oql/PrincipalValue";
import BoolValue "mo:caffeineai-oql/BoolValue";
import Common "../types/common";
import Types "../types/chat";
import ChatLib "../lib/chat";

module {
  /// Flatten every conversation's messages into a single iterator.
  func allMessages(chatState : ChatLib.ChatState) : Iter.Iter<Types.Message> {
    let out = List.empty<Types.Message>();
    for ((_, conv) in chatState.conversations.entries()) {
      for (msg in conv.messages.values()) {
        out.add(msg);
      };
    };
    out.values();
  };

  /// Build the OQL entity declarations for the chat domain.
  ///
  /// Authorization:
  /// - `profile` — controllerOrScoped, owned by `user`.
  /// - `connectionCode` — controllerOrScoped, owned by `creator`.
  /// - `conversation` — controllerOrScoped, owned by `participants` (the
  ///   comma-separated participant list; a caller sees a conversation when
  ///   their principal text appears in it).
  /// - `message` — controllerOrScoped, owned by `sender`.
  public func entities(
    profiles : Map.Map<Common.UserId, Types.UserProfile>,
    chatState : ChatLib.ChatState,
  ) : [Entity.Decl] {
    // The sample principal used only to seed schema discovery.
    let samplePrincipal = Principal.fromText("aaaaa-aa");
    [
      OQL.Entity.manual<(Common.UserId, Types.UserProfile)>(
        "profile",
        func () = profiles.entries(),
        "Profile",
        "user",
      )
        .sample((samplePrincipal, { displayName = ""; avatar = null }))
        .payload("user", func ((user, _)) = user)
        .payload("displayName", func ((_, p)) = p.displayName)
        .payload("avatarName", func ((_, p)) = switch (p.avatar) {
          case (?a) { a.name };
          case null { "" };
        })
        .payload("avatarMimeType", func ((_, p)) = switch (p.avatar) {
          case (?a) { a.mimeType };
          case null { "" };
        })
        .payload("avatarSize", func ((_, p)) = switch (p.avatar) {
          case (?a) { a.size };
          case null { 0 };
        })
        .ownedBy("user")
        .controllerOrScoped()
        .build(),
      chatState.codes.toEntityManual("connectionCode", "ConnectionCode", "code")
        .sample({
          code = "";
          creator = samplePrincipal;
          createdAt = 0;
          expiresAt = 0;
          used = false;
        })
        .payload("code", func c = c.code)
        .payload("creator", func c = c.creator)
        .payload("createdAt", func c = c.createdAt)
        .payload("expiresAt", func c = c.expiresAt)
        .payload("used", func c = c.used)
        .ownedBy("creator")
        .controllerOrScoped()
        .build(),
      chatState.conversations.toEntityManual("conversation", "Conversation", "id")
        .sample({
          id = 0;
          participants = Set.empty<Common.UserId>();
          createdAt = 0;
          messages = List.empty<Types.Message>();
        })
        .payload("id", func c = c.id)
        .payload("participants", func c =
          c.participants.toArray().map(func p = p.toText()).values().join(","))
        .payload("createdAt", func c = c.createdAt)
        .ownedByWith("participants", func (caller : Principal, owner : OQL.Value) : Bool =
          switch (owner) {
            case (#text(participants)) {
              participants.split(#char ',').any(func (p : Text) : Bool = p == caller.toText());
            };
            case (_) { false };
          })
        .controllerOrScoped()
        .build(),
      OQL.Entity.manual<Types.Message>(
        "message",
        func () = allMessages(chatState),
        "Message",
        "id",
      )
        .sample({
          id = 0;
          conversationId = 0;
          sender = samplePrincipal;
          text = "";
          attachments = [];
          createdAt = 0;
        })
        .payload("id", func m = m.id)
        .payload("conversationId", func m = m.conversationId)
        .payload("sender", func m = m.sender)
        .payload("text", func m = m.text)
        .payload("attachments", func m =
          m.attachments.map(func a = a.name).values().join(","))
        .payload("createdAt", func m = m.createdAt)
        .ownedByWith("conversationId", func (caller : Principal, owner : OQL.Value) : Bool =
          switch (owner) {
            case (#nat(conversationId)) {
              switch (chatState.conversations.get(conversationId)) {
                case (?conv) { conv.participants.contains(caller) };
                case null { false };
              };
            };
            case (_) { false };
          })
        .controllerOrScoped()
        .build(),
    ];
  };
};
