import { describe, expect, it } from "vitest";
import {
  formatPhoneForDisplay,
  normalizeTelHref,
  telHrefFromPhone,
} from "@/lib/phone-format";

describe("formatPhoneForDisplay", () => {
  it("formats Estonian mobile numbers", () => {
    expect(formatPhoneForDisplay("+37259017916")).toBe("+372 5901 7916");
  });

  it("returns null for empty values", () => {
    expect(formatPhoneForDisplay(null)).toBeNull();
    expect(formatPhoneForDisplay("")).toBeNull();
  });
});

describe("normalizeTelHref", () => {
  it("builds tel links from formatted numbers", () => {
    expect(normalizeTelHref("+372 5901 7916")).toBe("tel:+37259017916");
  });
});

describe("telHrefFromPhone", () => {
  it("combines display formatting with tel href", () => {
    expect(telHrefFromPhone("+37259017916")).toBe("tel:+37259017916");
  });
});
