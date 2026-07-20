import { describe, expect, it } from "vitest";
import {
  BREED_OTHER_VALUE,
  breedFormStateFromStored,
  dogBreedOptions,
  resolveBreedFieldsForSave,
  resolvePetBreedDisplay,
  validateOtherBreedText,
} from "@/lib/pet-breeds";

describe("dog breed options", () => {
  it("includes Samoyed", () => {
    expect(dogBreedOptions).toContain("Samoyed");
  });
});

describe("validateOtherBreedText", () => {
  it("requires non-empty trimmed text", () => {
    expect(validateOtherBreedText("")).toBe("required");
    expect(validateOtherBreedText("   ")).toBe("required");
  });

  it("requires at least 2 characters", () => {
    expect(validateOtherBreedText("A")).toBe("too_short");
    expect(validateOtherBreedText("Ab")).toBeNull();
  });

  it("rejects text longer than 80 characters", () => {
    expect(validateOtherBreedText("x".repeat(81))).toBe("too_long");
    expect(validateOtherBreedText("x".repeat(80))).toBeNull();
  });

  it("trims before validating length", () => {
    expect(validateOtherBreedText("  mix  ")).toBeNull();
  });
});

describe("resolveBreedFieldsForSave", () => {
  it("stores Other sentinel with separate other_breed", () => {
    expect(resolveBreedFieldsForSave("dog", BREED_OTHER_VALUE, "Lab mix")).toEqual({
      breed: BREED_OTHER_VALUE,
      other_breed: "Lab mix",
    });
  });

  it("stores standard breed and clears other_breed", () => {
    expect(resolveBreedFieldsForSave("dog", "Samoyed", "old custom")).toEqual({
      breed: "Samoyed",
      other_breed: null,
    });
  });
});

describe("breedFormStateFromStored", () => {
  it("loads Other with other_breed column", () => {
    expect(breedFormStateFromStored("dog", BREED_OTHER_VALUE, "Custom mix")).toEqual({
      breedSelection: BREED_OTHER_VALUE,
      breedOther: "Custom mix",
    });
  });

  it("loads legacy custom breed from breed column only", () => {
    expect(breedFormStateFromStored("dog", "Custom mix", null)).toEqual({
      breedSelection: BREED_OTHER_VALUE,
      breedOther: "Custom mix",
    });
  });

  it("loads Samoyed as standard selection", () => {
    expect(breedFormStateFromStored("dog", "Samoyed", null)).toEqual({
      breedSelection: "Samoyed",
      breedOther: "",
    });
  });
});

describe("resolvePetBreedDisplay", () => {
  it("shows other_breed when breed is Other", () => {
    expect(resolvePetBreedDisplay("dog", BREED_OTHER_VALUE, "Lab mix")).toBe("Lab mix");
  });

  it("shows Samoyed directly", () => {
    expect(resolvePetBreedDisplay("dog", "Samoyed", null)).toBe("Samoyed");
  });

  it("shows legacy custom breed from breed column", () => {
    expect(resolvePetBreedDisplay("dog", "Rare mix", null)).toBe("Rare mix");
  });

  it("does not show Other sentinel alone", () => {
    expect(resolvePetBreedDisplay("dog", BREED_OTHER_VALUE, null)).toBeNull();
  });
});
