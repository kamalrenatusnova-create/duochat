import AccessControl "mo:caffeineai-authorization/access-control";
import MixinAuthorization "mo:caffeineai-authorization/MixinAuthorization";
import MixinObjectStorage "mo:caffeineai-object-storage/Mixin";
import Expose "mo:caffeineai-oql/Expose";
import Map "mo:core/Map";
import Common "types/common";
import Types "types/chat";
import ChatLib "lib/chat";
import OqlLib "lib/oql";
import ChatApi "mixins/chat-api";
import ProfilesApi "mixins/profiles-api";
import ApiDocMixin "mixins/api-doc";

actor {
  let accessControlState : AccessControl.AccessControlState;

  let profiles : Map.Map<Common.UserId, Types.UserProfile>;
  let chatState : ChatLib.ChatState;

  include MixinAuthorization(accessControlState, null);
  include MixinObjectStorage();
  include Expose({ entities = OqlLib.entities(profiles, chatState) });
  include ChatApi(chatState);
  include ProfilesApi(profiles);
  include ApiDocMixin();
};
