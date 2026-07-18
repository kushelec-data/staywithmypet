import type { SupabaseClient } from "@supabase/supabase-js";
import { assertSupabasePublicEnv } from "@/lib/supabase/env";

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

export function buildChatMediaStoragePath(
  conversationId: string,
  senderId: string,
  file: File,
): string {
  const ext = fileExtension(file);
  return `${conversationId}/${senderId}/${crypto.randomUUID()}.${ext}`;
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

  const { url, anonKey } = assertSupabasePublicEnv();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const accessToken = session?.access_token;
  if (!accessToken) {
    throw new Error("Not signed in.");
  }

  const encodedPath = storagePath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  const uploadUrl = `${url}/storage/v1/object/${CHAT_MEDIA_BUCKET}/${encodedPath}`;

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", uploadUrl);
    xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
    xhr.setRequestHeader("apikey", anonKey);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.setRequestHeader("x-upsert", "false");

    xhr.upload.addEventListener("progress", (event) => {
      if (!event.lengthComputable) return;
      const percent = Math.min(99, Math.round((event.loaded / event.total) * 100));
      onProgress?.(percent);
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve();
        return;
      }
      let message = "Upload failed.";
      try {
        const payload = JSON.parse(xhr.responseText) as { message?: string; error?: string };
        message = payload.message ?? payload.error ?? message;
      } catch {
        /* ignore parse errors */
      }
      reject(new Error(message));
    });

    xhr.addEventListener("error", () => {
      reject(new Error("Upload failed."));
    });

    xhr.addEventListener("abort", () => {
      reject(new Error("Upload failed."));
    });

    xhr.send(file);
  });
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
    console.error("[chat-media] signed url", error.message);
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
