import type { Attachment } from "@/backend";
import { MAX_UPLOAD_BYTES } from "@/types";
import { ExternalBlob } from "@caffeineai/object-storage";

export interface UploadedFile {
  attachment: Attachment;
  previewUrl: string;
}

export class UploadTooLargeError extends Error {
  constructor() {
    super("That file is larger than the 25 MB limit. Try a smaller file.");
    this.name = "UploadTooLargeError";
  }
}

/**
 * Convert a browser File into a backend Attachment, reporting upload progress.
 * The blob carries the MIME type and filename so the gateway serves it correctly.
 */
export async function uploadFile(
  file: File,
  onProgress?: (percentage: number) => void,
): Promise<UploadedFile> {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new UploadTooLargeError();
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  let blob = ExternalBlob.fromBytes(bytes, file.type, file.name);
  if (onProgress) {
    blob = blob.withUploadProgress(onProgress);
  }

  const attachment: Attachment = {
    blob,
    name: file.name,
    mimeType: file.type || "application/octet-stream",
    size: BigInt(file.size),
  };

  const previewUrl = file.type.startsWith("image/")
    ? URL.createObjectURL(file)
    : "";

  return { attachment, previewUrl };
}

/** Trigger a save-as download for an attachment, preserving its filename. */
export async function downloadAttachment(
  attachment: Attachment,
): Promise<void> {
  const bytes = await attachment.blob.getBytes();
  const blob = new Blob([bytes], { type: attachment.mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = attachment.name;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
