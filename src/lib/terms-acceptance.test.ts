import { describe, expect, it } from "vitest";
import {
  classifyTermsInsertError,
  friendlyTermsInsertMessage,
} from "@/lib/terms-acceptance";

describe("classifyTermsInsertError", () => {
  it("detects missing table (PostgREST schema cache)", () => {
    expect(
      classifyTermsInsertError({
        code: "PGRST205",
        message:
          "Could not find the table 'public.terms_acceptance' in the schema cache",
      }),
    ).toBe("schema_missing");
  });

  it("detects RLS / permission denied", () => {
    expect(
      classifyTermsInsertError({
        code: "42501",
        message: "permission denied for table terms_acceptance",
      }),
    ).toBe("rls_auth");
  });

  it("detects foreign key violation on request_id before request exists", () => {
    const kind = classifyTermsInsertError({
      code: "23503",
      message:
        'insert or update on table "terms_acceptance" violates foreign key constraint "terms_acceptance_request_id_fkey"',
      details: 'Key (request_id)=(xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx) is not present in table "requests".',
    });
    expect(kind).toBe("foreign_key");
    expect(friendlyTermsInsertMessage(kind)).toBe(
      "Could not save your acceptance. Please try again.",
    );
  });

  it("detects acceptance_context check constraint mismatch", () => {
    expect(
      classifyTermsInsertError({
        code: "23514",
        message:
          'new row for relation "terms_acceptance" violates check constraint "terms_acceptance_context_check"',
      }),
    ).toBe("check_constraint");
  });
});

describe("friendlyTermsInsertMessage", () => {
  it("maps schema missing to support message", () => {
    expect(friendlyTermsInsertMessage("schema_missing")).toBe(
      "Terms acceptance is not set up yet. Please contact support.",
    );
  });

  it("maps rls_auth to session message", () => {
    expect(friendlyTermsInsertMessage("rls_auth")).toBe(
      "We could not verify your session. Please sign in again.",
    );
  });
});
