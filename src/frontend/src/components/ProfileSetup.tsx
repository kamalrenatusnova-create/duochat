import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCallerProfile, useSaveProfile } from "@/hooks/useQueries";
import { uploadFile } from "@/lib/upload";
import { initialsFor } from "@/types";
import { Camera, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

/**
 * Profile setup surface: display name + optional avatar. Used both as the
 * profile/settings page body and as a first-run prompt.
 */
export function ProfileSetup() {
  const { data: profile, isLoading } = useCallerProfile();
  const saveProfile = useSaveProfile();

  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarBlob, setAvatarBlob] = useState<
    Awaited<ReturnType<typeof uploadFile>>["attachment"] | null
  >(null);
  const [uploading, setUploading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!initialized && profile) {
      setDisplayName(profile.displayName);
      setInitialized(true);
    }
  }, [profile, initialized]);

  const handleAvatarPick = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const uploaded = await uploadFile(file);
      setAvatarBlob(uploaded.attachment);
      setAvatarUrl(uploaded.previewUrl);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const name = displayName.trim();
    if (!name) {
      toast.error("Add a display name so your friend knows it's you.");
      return;
    }
    saveProfile.mutate(
      { displayName: name, avatar: avatarBlob ?? profile?.avatar },
      {
        onSuccess: () => toast.success("Profile saved"),
        onError: () => toast.error("Couldn't save your profile. Try again."),
      },
    );
  };

  if (isLoading) {
    return (
      <div
        className="mx-auto max-w-lg animate-pulse space-y-4"
        data-ocid="profile.loading_state"
      >
        <div className="h-8 w-40 rounded-lg bg-muted" />
        <div className="h-24 rounded-2xl bg-muted" />
      </div>
    );
  }

  const previewUrl = avatarUrl ?? profile?.avatar?.blob.getDirectURL() ?? null;

  return (
    <div className="mx-auto max-w-lg animate-fade-up" data-ocid="profile.panel">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
          Your profile
        </h1>
        <p className="mt-1.5 text-[15px] text-muted-foreground">
          This is how you appear to the one friend you connect with.
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-2xl border border-border bg-card p-6 shadow-subtle"
      >
        <div className="flex items-center gap-4">
          <Avatar className="size-16 ring-2 ring-border">
            {previewUrl ? <AvatarImage src={previewUrl} alt="" /> : null}
            <AvatarFallback className="bg-secondary text-lg font-semibold text-secondary-foreground">
              {initialsFor(displayName || "You")}
            </AvatarFallback>
          </Avatar>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) =>
                void handleAvatarPick(event.target.files?.[0])
              }
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              data-ocid="profile.upload_button"
              className="rounded-full"
            >
              {uploading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Camera className="size-4" />
              )}
              {uploading ? "Uploading…" : "Change photo"}
            </Button>
            <p className="mt-1.5 text-xs text-muted-foreground">
              PNG or JPG, up to 25 MB.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="display-name">Display name</Label>
          <Input
            id="display-name"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="e.g. Maya"
            maxLength={40}
            data-ocid="profile.input"
            className="rounded-xl"
          />
        </div>

        <Button
          type="submit"
          disabled={saveProfile.isPending}
          data-ocid="profile.save_button"
          className="w-full rounded-full bg-primary text-primary-foreground shadow-bubble-out transition-smooth hover:-translate-y-px hover:bg-primary/90"
        >
          {saveProfile.isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Saving…
            </>
          ) : (
            "Save profile"
          )}
        </Button>
      </form>
    </div>
  );
}
