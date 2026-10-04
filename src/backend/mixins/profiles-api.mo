import Map "mo:core/Map";
import Common "../types/common";
import Types "../types/chat";
import ProfilesLib "../lib/profiles";

mixin (profiles : Map.Map<Common.UserId, Types.UserProfile>) {
  public type UserProfile = Types.UserProfile;

  /// Read the caller's own profile, if one has been saved.
  public query ({ caller }) func getCallerProfile() : async ?UserProfile {
    ProfilesLib.getCallerProfile(profiles, caller);
  };

  /// Create or replace the caller's profile (display name and avatar).
  public shared ({ caller }) func saveCallerProfile(profile : UserProfile) : async () {
    ProfilesLib.saveCallerProfile(profiles, caller, profile);
  };

  /// Read another user's public profile.
  public query ({ caller }) func getUserProfile(user : Common.UserId) : async ?UserProfile {
    ProfilesLib.getUserProfile(profiles, user);
  };
};
