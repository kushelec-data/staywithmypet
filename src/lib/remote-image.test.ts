import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  canUseNextImage,
  isSupabaseStorageImageUrl,
  shouldBypassNextImageOptimization,
} from "@/lib/remote-image";

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

const PET_STORAGE =
  "https://proj.supabase.co/storage/v1/object/public/pet-photos/user/pet/photo.jpg";
const AVATAR_STORAGE =
  "https://proj.supabase.co/storage/v1/object/public/avatars/user/avatar.webp";

describe("Supabase Storage image optimization bypass", () => {
  const previous = process.env.NEXT_PUBLIC_SUPABASE_URL;

  afterEach(() => {
    if (previous === undefined) {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    } else {
      process.env.NEXT_PUBLIC_SUPABASE_URL = previous;
    }
  });

  it("detects pet and avatar objects on the configured Supabase host", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://proj.supabase.co";
    expect(isSupabaseStorageImageUrl(PET_STORAGE)).toBe(true);
    expect(isSupabaseStorageImageUrl(AVATAR_STORAGE)).toBe(true);
    expect(shouldBypassNextImageOptimization(PET_STORAGE)).toBe(true);
    expect(shouldBypassNextImageOptimization(AVATAR_STORAGE)).toBe(true);
  });

  it("detects Storage URLs on any *.supabase.co host when env is unset", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    expect(
      isSupabaseStorageImageUrl(
        "https://abcd.supabase.co/storage/v1/object/public/pet-photos/a.jpg",
      ),
    ).toBe(true);
  });

  it("does not treat local/static images as Storage URLs", () => {
    expect(isSupabaseStorageImageUrl("/logo.png")).toBe(false);
    expect(isSupabaseStorageImageUrl("/images/pets/luna.jpg")).toBe(false);
    expect(shouldBypassNextImageOptimization("/logo.png")).toBe(false);
    expect(canUseNextImage("/logo.png")).toBe(true);
  });

  it("detects signed Storage object URLs", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://proj.supabase.co";
    expect(
      isSupabaseStorageImageUrl(
        "https://proj.supabase.co/storage/v1/object/sign/pet-photos/a.jpg?token=abc",
      ),
    ).toBe(true);
  });

  it("does not bypass optimization for Google avatars or non-storage Supabase URLs", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://proj.supabase.co";
    expect(
      shouldBypassNextImageOptimization("https://lh3.googleusercontent.com/a/photo"),
    ).toBe(false);
    expect(isSupabaseStorageImageUrl("https://proj.supabase.co/rest/v1/pets")).toBe(false);
  });

  it("AppImage passes unoptimized for Storage URLs and keeps onError placeholder", () => {
    const source = readSource("src/components/ui/AppImage.tsx");
    expect(source).toContain("shouldBypassNextImageOptimization(src)");
    expect(source).toContain("unoptimized={skipOptimizer}");
    expect(source).toContain("onError={() => setFailed(true)}");
    expect(source).toContain("PawPlaceholder");
  });

  it("pet cards, public pet page, and avatars share AppImage/PositionedPhoto", () => {
    const petCard = readSource("src/components/pets/PetCard.tsx");
    const intro = readSource("src/components/pets/PetIntroCard.tsx");
    const publicTop = readSource("src/components/pets/PetPublicTopCard.tsx");
    const avatar = readSource("src/components/profile/ProfileAvatar.tsx");
    expect(petCard).toContain("PositionedPhoto");
    expect(intro).toContain("PositionedPhoto");
    expect(publicTop).toContain("PositionedPhoto");
    expect(avatar).toContain("PositionedPhoto");
    expect(readSource("src/components/media/PositionedPhoto.tsx")).toContain(
      "<AppImage",
    );
  });
});
