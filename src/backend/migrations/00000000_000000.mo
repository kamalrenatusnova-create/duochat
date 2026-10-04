import AccessControl "mo:caffeineai-authorization/access-control";
import Map "mo:core/Map";
import Set "mo:core/Set";
import List "mo:core/List";

module {
  public type OldActor = {};

  public type NewActor = {
    accessControlState : AccessControl.AccessControlState;
    profiles : Map.Map<Principal, {
      displayName : Text;
      avatar : ?{
        blob : Blob;
        name : Text;
        mimeType : Text;
        size : Nat;
      };
    }>;
    chatState : {
      var nextConversationId : Nat;
      var nextMessageId : Nat;
      var nextCodeSeq : Nat;
      conversations : Map.Map<Nat, {
        id : Nat;
        participants : Set.Set<Principal>;
        createdAt : Int;
        messages : List.List<{
          id : Nat;
          conversationId : Nat;
          sender : Principal;
          text : Text;
          attachments : [{
            blob : Blob;
            name : Text;
            mimeType : Text;
            size : Nat;
          }];
          createdAt : Int;
        }>;
      }>;
      codes : Map.Map<Text, {
        code : Text;
        creator : Principal;
        createdAt : Int;
        expiresAt : Int;
        used : Bool;
      }>;
      readMarkers : Map.Map<Nat, Map.Map<Principal, Nat>>;
    };
  };

  public func migration(_ : OldActor) : NewActor {
    {
      accessControlState = AccessControl.initState();
      profiles = Map.empty();
      chatState = {
        var nextConversationId = 0;
        var nextMessageId = 0;
        var nextCodeSeq = 0;
        conversations = Map.empty();
        codes = Map.empty();
        readMarkers = Map.empty();
      };
    };
  };
};
