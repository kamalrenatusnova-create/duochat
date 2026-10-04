import Map "mo:core/Map";
import Common "../types/common";
import Types "../types/chat";

module {
  public type UserId = Common.UserId;
  public type UserProfile = Types.UserProfile;

  /// Read the caller's own profile, if one has been saved.
  public func getCallerProfile(profiles : Map.Map<UserId, UserProfile>, caller : UserId) : ?UserProfile {
    profiles.get(caller);
  };

  /// Create or replace the caller's profile (display name and avatar).
  public func saveCallerProfile(profiles : Map.Map<UserId, UserProfile>, caller : UserId, profile : UserProfile) : () {
    profiles.add(caller, profile);
  };

  /// Read another user's public profile.
  public func getUserProfile(profiles : Map.Map<UserId, UserProfile>, user : UserId) : ?UserProfile {
    profiles.get(user);
  };
};
