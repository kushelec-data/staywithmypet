import { describe, expect, it } from "vitest";
import {
  classifyCareRequestCreateError,
  friendlyCareRequestCreateMessage,
  friendlyCareRequestCreateMessageForRole,
} from "@/lib/request-create-errors";
import { DATE_NOT_AVAILABLE_ERROR } from "@/lib/request-validation";

describe("classifyCareRequestCreateError", () => {
  it("detects RLS insert denial", () => {
    expect(
      classifyCareRequestCreateError({
        code: "42501",
        message: 'new row violates row-level security policy for table "requests"',
        details: null,
        hint: null,
        name: "PostgrestError",
      }),
    ).toBe("REQUEST_PERMISSION_DENIED");
  });

  it("detects legacy NOT NULL requester_id violation", () => {
    const kind = classifyCareRequestCreateError({
      code: "23502",
      message:
        'null value in column "requester_id" of relation "requests" violates not-null constraint',
      details: "Failing row contains (...).",
      hint: null,
      name: "PostgrestError",
    });
    expect(kind).toBe("REQUEST_CREATE_ERROR");
    expect(friendlyCareRequestCreateMessage(kind)).toBe(
      "Could not send request. Please try again.",
    );
  });

  it("detects unavailable dates", () => {
    expect(classifyCareRequestCreateError(DATE_NOT_AVAILABLE_ERROR)).toBe("INVALID_DATES");
    expect(friendlyCareRequestCreateMessage("INVALID_DATES")).toBe(
      "Please select one or more available dates.",
    );
  });

  it("detects duplicate key", () => {
    expect(
      classifyCareRequestCreateError({
        code: "23505",
        message: 'duplicate key value violates unique constraint "requests_pkey"',
        details: null,
        hint: null,
        name: "PostgrestError",
      }),
    ).toBe("REQUEST_ALREADY_EXISTS");
  });

  it("maps membership message by role", () => {
    expect(
      friendlyCareRequestCreateMessageForRole("MEMBERSHIP_REQUIRED", "pet_friend"),
    ).toBe("An active Pet Friend membership is required to send a care request.");
  });
});
