import { Button } from "@/components/ui/button";
import { downloadAttachment } from "@/lib/upload";
import {
  type Attachment,
  formatFileSize,
  isAudioAttachment,
  isImageAttachment,
} from "@/types";
import { Download, FileText, Loader2, Music } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

/** Inline image with a graceful fallback when the blob cannot be fetched. */
function ImageAttachment({ attachment }: { attachment: Attachment }) {
  const [failed, setFailed] = useState(false);
  const url = attachment.blob.getDirectURL();

  if (failed) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
        <FileText className="size-4 shrink-0" aria-hidden="true" />
        <span className="min-w-0 truncate">{attachment.name}</span>
      </div>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="block overflow-hidden rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
      data-ocid="message.image_link"
    >
      <img
        src={url}
        alt={attachment.name}
        loading="lazy"
        onError={() => setFailed(true)}
        className="max-h-72 w-full max-w-xs object-cover transition-smooth hover:opacity-95"
      />
    </a>
  );
}

/** Inline audio/music player. */
function AudioAttachment({ attachment }: { attachment: Attachment }) {
  return (
    <div className="flex min-w-[15rem] max-w-xs flex-col gap-1.5">
      <div className="flex items-center gap-2 text-xs font-medium">
        <Music className="size-3.5 shrink-0" aria-hidden="true" />
        <span className="min-w-0 truncate">{attachment.name}</span>
      </div>
      {/* biome-ignore lint/a11y/useMediaCaption: user-shared audio has no caption track */}
      <audio
        controls
        preload="metadata"
        src={attachment.blob.getDirectURL()}
        className="h-9 w-full"
        data-ocid="message.audio_player"
      />
    </div>
  );
}

/** Non-media file rendered as a downloadable row with name and size. */
function FileAttachment({ attachment }: { attachment: Attachment }) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadAttachment(attachment);
    } catch {
      toast.error("Couldn't download that file. Try again.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card/70 px-3 py-2">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
        <FileText className="size-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">
          {attachment.name}
        </span>
        <span className="block font-mono text-[11px] text-muted-foreground">
          {formatFileSize(attachment.size)}
        </span>
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => void handleDownload()}
        disabled={downloading}
        aria-label={`Download ${attachment.name}`}
        data-ocid="message.download_button"
        className="size-8 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
      >
        {downloading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Download className="size-4" />
        )}
      </Button>
    </div>
  );
}

/** Renders one attachment according to its media type. */
export function MessageAttachment({ attachment }: { attachment: Attachment }) {
  if (isImageAttachment(attachment)) {
    return <ImageAttachment attachment={attachment} />;
  }
  if (isAudioAttachment(attachment)) {
    return <AudioAttachment attachment={attachment} />;
  }
  return <FileAttachment attachment={attachment} />;
}
