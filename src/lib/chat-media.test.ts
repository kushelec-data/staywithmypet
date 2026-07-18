import { describe, expect, it } from "vitest";
import {
  CHAT_IMAGE_MAX_BYTES,
  CHAT_VIDEO_MAX_BYTES,
  ChatMediaValidationError,
  chatMediaTypeForMime,
  chatMessagePreviewText,
  sanitizeChatMediaFileName,
  validateChatMediaFile,
  buildChatMediaStoragePath,
} from "@/lib/chat-media";

function mockFile(type: string, size: number, name = "test.bin"): File {
  const buffer = new Uint8Array(size);
  return new File([buffer], name, { type });
}

describe("validateChatMediaFile", () => {
  it("accepts supported image types up to 10 MB", () => {
    expect(validateChatMediaFile(mockFile("image/jpeg", 1024, "photo.jpg"))).toBe("image");
    expect(validateChatMediaFile(mockFile("image/png", CHAT_IMAGE_MAX_BYTES))).toBe("image");
  });

  it("accepts supported video types up to 100 MB", () => {
    expect(validateChatMediaFile(mockFile("video/mp4", 1024, "clip.mp4"))).toBe("video");
    expect(validateChatMediaFile(mockFile("video/webm", CHAT_VIDEO_MAX_BYTES))).toBe("video");
  });

  it("rejects unsupported mime types", () => {
    expect(() => validateChatMediaFile(mockFile("application/pdf", 100))).toThrow(
      ChatMediaValidationError,
    );
    try {
      validateChatMediaFile(mockFile("application/pdf", 100));
    } catch (error) {
      expect(error).toBeInstanceOf(ChatMediaValidationError);
      expect((error as ChatMediaValidationError).code).toBe("unsupported_type");
    }
  });

  it("rejects images larger than 10 MB", () => {
    expect(() =>
      validateChatMediaFile(mockFile("image/jpeg", CHAT_IMAGE_MAX_BYTES + 1)),
    ).toThrow(ChatMediaValidationError);
  });

  it("rejects videos larger than 100 MB", () => {
    expect(() =>
      validateChatMediaFile(mockFile("video/mp4", CHAT_VIDEO_MAX_BYTES + 1)),
    ).toThrow(ChatMediaValidationError);
  });
});

describe("chatMediaTypeForMime", () => {
  it("maps supported mime types", () => {
    expect(chatMediaTypeForMime("image/webp")).toBe("image");
    expect(chatMediaTypeForMime("video/webm")).toBe("video");
    expect(chatMediaTypeForMime("text/plain")).toBeNull();
  });
});

describe("chatMessagePreviewText", () => {
  it("prefers body text when present", () => {
    expect(
      chatMessagePreviewText({ body: "Hello", mediaType: "image" }),
    ).toBe("Hello");
  });

  it("falls back to media labels", () => {
    expect(chatMessagePreviewText({ body: "", mediaType: "image" })).toBe("[Photo]");
    expect(chatMessagePreviewText({ body: "", mediaType: "video" })).toBe("[Video]");
  });
});

describe("buildChatMediaStoragePath", () => {
  it("uses conversations prefix and sanitized file name", () => {
    const file = new File([new Uint8Array(8)], "my photo (1).jpg", { type: "image/jpeg" });
    const path = buildChatMediaStoragePath("conv-1", "user-1", file);
    expect(path.startsWith("conversations/conv-1/user-1/")).toBe(true);
    expect(path.endsWith(".jpg")).toBe(true);
    expect(path).toContain("my_photo_1_");
    expect(sanitizeChatMediaFileName("my photo (1).jpg")).toBe("my_photo_1_.jpg");
  });
});
