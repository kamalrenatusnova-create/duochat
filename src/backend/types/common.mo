import Storage "mo:caffeineai-object-storage/Storage";

module {
  /// A user principal (Internet Identity principal).
  public type UserId = Principal;

  /// Nanoseconds since the Unix epoch (Time.now()).
  public type Timestamp = Int;

  /// Identifier of a conversation between exactly two users.
  public type ConversationId = Nat;

  /// Identifier of a single message within a conversation.
  public type MessageId = Nat;

  /// A short, shareable connection code used to pair two accounts.
  public type ConnectionCode = Text;

  /// A file/photo/audio/music attachment stored via platform object storage.
  public type Attachment = {
    blob : Storage.ExternalBlob;
    name : Text;
    mimeType : Text;
    size : Nat;
  };
};
