import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { uploadFile } from "@/lib/upload";
import {
  type Attachment,
  MAX_UPLOAD_BYTES,
  formatFileSize,
  isImageAttachment,
} from "@/types";
import { Loader2, Paperclip, Send, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

interface PendingAttachment {
  attachment: Attachment;
  previewUrl: string;
}

interface ComposerProps {
  onSend: (
    text: string,
    attachments: Attachment[],
    onError: () => void,
  ) => void;
  isSending: boolean;
}

export function Composer({ onSend, isSending }: ComposerProps) {
  const [text, setText] = useState("");
  const [pending, setPending] = useState<PendingAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canSend =
    !isSending && !uploading && (text.trim().length > 0 || pending.length > 0);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setProgress(0);
    try {
      const uploaded: PendingAttachment[] = [];
      for (const file of Array.from(files)) {
        if (file.size > MAX_UPLOAD_BYTES) {
          toast.error(
            `"${file.name}" is ${formatFileSize(BigInt(file.size))} — larger than the 25 MB limit.`,
          );
          continue;
        }
        const result = await uploadFile(file, setProgress);
        uploaded.push(result);
      }
      if (uploaded.length > 0) {
        setPending((current) => [...current, ...uploaded]);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Upload failed. Try again.",
      );
    } finally {
      setUploading(false);
      setProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removePending = (index: number) => {
    setPending((current) => {
      const target = current[index];
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return current.filter((_, i) => i !== index);
    });
  };

  const submit = () => {
    if (!canSend) return;
    const capturedText = text;
    const capturedAttachments = pending.map((item) => item.attachment);
    setText("");
    setPending([]);
    for (const item of pending) {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    }
    onSend(capturedText, capturedAttachments, () => {
      setText((current) => (current === "" ? capturedText : current));
      setPending((current) => (current.length === 0 ? pending : current));
    });
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <div
      className="border-t border-border bg-card px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-5"
      data-ocid="composer.panel"
    >
      {pending.length > 0 ? (
        <ul
          className="mb-2.5 flex flex-wrap gap-2"
          data-ocid="composer.preview_list"
        >
          {pending.map((item, index) => (
            <li
              key={`${item.attachment.name}-${index}`}
              className="group relative flex items-center gap-2 rounded-xl border border-border bg-secondary/60 py-1.5 pl-1.5 pr-2"
              data-ocid={`composer.preview.${index + 1}`}
            >
              {isImageAttachment(item.attachment) && item.previewUrl ? (
                <img
                  src={item.previewUrl}
                  alt=""
                  className="size-9 rounded-lg object-cover"
                />
              ) : (
                <span className="flex size-9 items-center justify-center rounded-lg bg-card text-muted-foreground">
                  <Paperclip className="size-4" aria-hidden="true" />
                </span>
              )}
              <span className="max-w-[9rem] min-w-0">
                <span className="block truncate text-xs font-medium">
                  {item.attachment.name}
                </span>
                <span className="block font-mono text-[10px] text-muted-foreground">
                  {formatFileSize(item.attachment.size)}
                </span>
              </span>
              <button
                type="button"
                onClick={() => removePending(index)}
                aria-label={`Remove ${item.attachment.name}`}
                data-ocid={`composer.remove_attachment.${index + 1}`}
                className="flex size-6 items-center justify-center rounded-full text-muted-foreground transition-smooth hover:bg-destructive/10 hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {uploading ? (
        <div className="mb-2.5 space-y-1" data-ocid="composer.upload_progress">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Uploading…</span>
            <span className="font-mono">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>
      ) : null}

      <div className="flex items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(event) => void handleFiles(event.target.files)}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || isSending}
          aria-label="Attach a file"
          data-ocid="composer.upload_button"
          className="size-10 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
        >
          <Paperclip className="size-5" />
        </Button>

        <Textarea
          ref={textareaRef}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder="Write a message…"
          aria-label="Message"
          data-ocid="composer.textarea"
          className="max-h-40 min-h-10 flex-1 resize-none rounded-2xl border-input bg-background px-4 py-2.5 text-[15px] shadow-none"
        />

        <Button
          type="button"
          size="icon"
          onClick={submit}
          disabled={!canSend}
          aria-label="Send message"
          data-ocid="composer.send_button"
          className="size-10 shrink-0 rounded-full bg-primary text-primary-foreground shadow-bubble-out transition-smooth hover:-translate-y-px hover:bg-primary/90"
        >
          {isSending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
        </Button>
      </div>
      <p className="mt-1.5 hidden px-1 text-[11px] text-muted-foreground sm:block">
        Enter to send · Shift + Enter for a new line
      </p>
    </div>
  );
}
