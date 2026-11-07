import { describe, expect, it } from "vitest";
import { DAY5_COPY, DAY10_DRAFTS, profileReminderCopy } from "./copy";
import { buildProfileCompletionReminderEmail, profileCompletionDeepLink } from "./templates";
import { reminderGreeting } from "./first-name";

describe("profile completion reminder templates", () => {
  it("uses the approved Day 5 subjects and preheaders exactly", () => {
    expect(DAY5_COPY.pet_parent.et.subject).toBe("🐾 Sinu lemmiku uus sõber on vaid ühe sammu kaugusel!");
    expect(DAY5_COPY.pet_parent.et.preheader).toBe(
      "Leia oma lemmikule hooliv hoidja, kellele saad ta südamerahuga usaldada.",
    );
    expect(DAY5_COPY.pet_parent.en.subject).toBe(
      "🐾 Your pet\u2019s new best friend could be just a few steps away!",
    );
    expect(DAY5_COPY.pet_parent.en.preheader).toBe(
      "Find a caring Pet Friend you can trust with your beloved pet.",
    );
    expect(DAY5_COPY.pet_friend.et.subject).toBe("💚 Sinu järgmine neljajalgne sõber võib sind juba oodata!");
    expect(DAY5_COPY.pet_friend.et.preheader).toBe(
      "Naudi loomade seltskonda ja leia uusi neljajalgseid sõpru!",
    );
    expect(DAY5_COPY.pet_friend.en.subject).toBe("💚 A four-legged friend could be waiting for you!");
    expect(DAY5_COPY.pet_friend.en.preheader).toBe(
      "Enjoy the company of animals and make new four-legged friends!",
    );
  });

  it("renders Day 5 bodies with hidden preheaders, bold benefits, and the profile edit CTA", () => {
    const parentEt = buildProfileCompletionReminderEmail({
      stage: "day_5",
      role: "pet_parent",
      locale: "et",
      firstName: "Gerly",
    });
    expect(parentEt.subject).toBe(DAY5_COPY.pet_parent.et.subject);
    expect(parentEt.html).toContain('display:none');
    expect(parentEt.html).toContain(DAY5_COPY.pet_parent.et.preheader);
    expect(parentEt.html).not.toMatch(
      new RegExp(`<p[^>]*>${DAY5_COPY.pet_parent.et.preheader}</p>`),
    );
    expect(parentEt.html).toContain("<strong>Miks tasub profiil lõpuni täita?</strong>");
    expect(parentEt.html).toContain("<strong>Leia sobiv loomasõber.</strong>");
    expect(parentEt.html).toContain("Täida oma profiil lõpuni");
    expect(parentEt.html).toContain("Tere, Gerly!");
    expect(parentEt.html).toContain(profileCompletionDeepLink());
    expect(profileCompletionDeepLink()).toBe("https://www.staywithmypet.ee/profile/edit");

    const parentEn = buildProfileCompletionReminderEmail({
      stage: "day_5",
      role: "pet_parent",
      locale: "en",
      firstName: "Alex",
    });
    expect(parentEn.html).toContain("Hi Alex!");
    expect(parentEn.html).toContain("<strong>Why complete your profile?</strong>");
    expect(parentEn.html).toContain("Complete Your Profile");
    expect(parentEn.text).toContain("You've already taken the first step by joining Stay With My Pet.");

    const friendEt = buildProfileCompletionReminderEmail({
      stage: "day_5",
      role: "pet_friend",
      locale: "et",
      firstName: null,
    });
    expect(friendEt.html).toContain(reminderGreeting("et", null));
    expect(friendEt.html).toContain("Tere!");
    expect(friendEt.html).not.toContain("Tere, !");

    const friendEn = buildProfileCompletionReminderEmail({
      stage: "day_5",
      role: "pet_friend",
      locale: "en",
      firstName: null,
    });
    expect(friendEn.html).toContain("Hi there!");
    expect(friendEn.html).toContain("Complete Your Profile");
    expect(friendEn.html).toContain("Why complete your profile?");
  });

  it("keeps Day 10 drafts shorter than Day 5 with their own subjects and preheaders", () => {
    const day5 = profileReminderCopy("day_5", "pet_parent", "en");
    const day10 = DAY10_DRAFTS.pet_parent.en;
    const day5Length = day5.intro.join(" ").length + day5.benefits.map((item) => item.rest).join(" ").length;
    const day10Length = day10.intro.join(" ").length;
    expect(day10Length).toBeLessThan(day5Length / 2);
    expect(DAY10_DRAFTS.pet_parent.et.subject).toContain("profiil");
    expect(DAY10_DRAFTS.pet_parent.et.preheader).toBeTruthy();
    expect(DAY10_DRAFTS.pet_friend.en.cta).toBe("Complete Your Profile");
    const rendered = buildProfileCompletionReminderEmail({
      stage: "day_10",
      role: "pet_friend",
      locale: "en",
      firstName: "Sam",
    });
    expect(rendered.subject).toBe(DAY10_DRAFTS.pet_friend.en.subject);
    expect(rendered.html).toContain(DAY10_DRAFTS.pet_friend.en.preheader);
    expect(rendered.html).toContain("https://www.staywithmypet.ee/profile/edit");
  });
});
