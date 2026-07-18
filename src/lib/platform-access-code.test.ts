import { describe, expect, it } from "vitest";
import { TEST_ACCESS_CODE } from "@/lib/test-access-code";

describe("platform access code fallback", () => {
  it("recognizes legacy STAYTEST3M constant", () => {
    expect(TEST_ACCESS_CODE).toBe("STAYTEST3M");
  });
});
