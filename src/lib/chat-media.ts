import type { SupabaseClient } from "@supabase/supabase-js";
import type { StorageError } from "@supabase/storage-js";

export const CHAT_MEDIA_BUCKET = "chat-media";

export const CHAT_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const CHAT_VIDEO_MAX_BYTES = 100 * 1024 * 1024;

export const CHAT_MEDIA_ACCEPT =
  "image/jpeg,image/png,image/webp,video/mp4,video/webm";

export const CHAT_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";
export const CHAT_VIDEO_ACCEPT = "video/mp4,video/webm";

export type ChatMediaType = "image" | "video";

const MIME_TO_MEDIA_TYPE: Record<string, ChatMediaType> = {
  "image/jpeg": "image",
  "image/png": "image",
  "image/webp": "image",
  "video/mp4": "video",
  "video/webm": "video",
};

export type ChatMediaValidationErrorCode =
  | "unsupported_type"
  | "file_too_large";

export class ChatMediaValidationError extends Error {
  readonly code: ChatMediaValidationErrorCode;

  constructor(code: ChatMediaValidationErrorCode, message: string) {
    super(message);
    this.name = "ChatMediaValidationError";
    this.code = code;
  }
}

export class ChatMediaUploadError extends Error {
  readonly name = "ChatMediaUploadError";
  readonly statusCode: string | number | undefined;
  readonly storageErrorName: string | undefined;

  constructor(error: StorageError | Error) {
    const storageError = error as StorageError;
    const message = storageError.message || "Media upload failed.";
    super(message);
    this.statusCode = storageError.statusCode ?? (storageError as { status?: number }).status;
    this.storageErrorName = storageError.name;
  }
}

export class ChatMessageSaveError extends Error {
  readonly name = "ChatMessageSaveError";

  constructor(message: string) {
    super(message || "Message could not be saved.");
  }
}

export function chatMediaTypeForMime(mimeType: string): ChatMediaType | null {
  return MIME_TO_MEDIA_TYPE[mimeType.toLowerCase()] ?? null;
}

export function chatMediaMaxBytesForType(mediaType: ChatMediaType): number {
  return mediaType === "image" ? CHAT_IMAGE_MAX_BYTES : CHAT_VIDEO_MAX_BYTES;
}

export function validateChatMediaFile(file: File): ChatMediaType {
  const mimeType = (file.type || "").toLowerCase();
  const mediaType = chatMediaTypeForMime(mimeType);
  if (!mediaType) {
    throw new ChatMediaValidationError(
      "unsupported_type",
      "Unsupported file type.",
    );
  }

  const maxBytes = chatMediaMaxBytesForType(mediaType);
  if (file.size > maxBytes) {
    throw new ChatMediaValidationError("file_too_large", "File too large.");
  }

  if (file.size <= 0) {
    throw new ChatMediaValidationError("unsupported_type", "Unsupported file type.");
  }

  return mediaType;
}

function fileExtension(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]+$/.test(fromName)) return fromName;

  switch (file.type.toLowerCase()) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "video/mp4":
      return "mp4";
    case "video/webm":
      return "webm";
    default:
      return "bin";
  }
}

export function sanitizeChatMediaFileName(fileName: string): string {
  const base = fileName.trim().replace(/[^a-zA-Z0-9._-]/g, "_");
  const cleaned = base.replace(/_+/g, "_").replace(/^\.+/, "");
  return cleaned.slice(0, 80) || "file";
}

export function buildChatMediaStoragePath(
  conversationId: string,
  senderId: string,
  file: File,
): string {
  const ext = fileExtension(file);
  const safeName = sanitizeChatMediaFileName(file.name);
  const stem = safeName.includes(".")
    ? safeName.slice(0, safeName.lastIndexOf("."))
    : safeName;
  return `conversations/${conversationId}/${senderId}/${crypto.randomUUID()}-${stem}.${ext}`;
}

export async function uploadChatMediaFile(
  supabase: SupabaseClient,
  storagePath: string,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<void> {
  const { assertRateLimitShared, requireAuthUserId } = await import("@/lib/security");
  const sessionUserId = await requireAuthUserId(supabase);
  await assertRateLimitShared("file_upload", sessionUserId);

  validateChatMediaFile(file);

  onProgress?.(0);

  const { error } = await supabase.storage.from(CHAT_MEDIA_BUCKET).upload(storagePath, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });

  if (error) {
    console.error("[chat-media] upload failed", {
      message: error.message,
      name: error.name,
      statusCode: error.statusCode,
      storagePath,
      fileName: file.name,
      mimeType: file.type,
      fileSize: file.size,
    });
    throw new ChatMediaUploadError(error);
  }

  onProgress?.(100);
}

export async function createChatMediaSignedUrl(
  supabase: SupabaseClient,
  storagePath: string,
  expiresInSeconds = 3600,
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(CHAT_MEDIA_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error) {
    console.error("[chat-media] signed url", {
      message: error.message,
      name: error.name,
      statusCode: error.statusCode,
      storagePath,
    });
    return null;
  }

  return data.signedUrl ?? null;
}

export function chatMessagePreviewText(input: {
  body: string | null | undefined;
  mediaType: ChatMediaType | null | undefined;
  photoLabel?: string;
  videoLabel?: string;
}): string {
  const body = input.body?.trim() ?? "";
  if (body) return body;
  if (input.mediaType === "image") return input.photoLabel ?? "[Photo]";
  if (input.mediaType === "video") return input.videoLabel ?? "[Video]";
  return "";
}
