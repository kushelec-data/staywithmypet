import { describe, expect, it } from "vitest";
import { ctaButton, wrapEmail } from "./layout";

describe("transactional email layout Outlook fallbacks", () => {
  it("uses a table CTA with a solid teal cell so Outlook can paint the button", () => {
    const html = ctaButton("Complete Your Profile", "https://www.staywithmypet.ee/profile/edit");
    expect(html).toContain('role="presentation"');
    expect(html).toContain('bgcolor="#1a6b5c"');
    expect(html).toContain("background-color:#1a6b5c");
    expect(html).toContain('href="https://www.staywithmypet.ee/profile/edit"');
    expect(html).toContain("Complete Your Profile");
    expect(html).not.toContain("localhost");
    expect(html).not.toContain("vercel.app");
    expect(html).not.toContain("border-radius:999px");
  });

  it("keeps a solid header color under the gradient for Outlook", () => {
    const html = wrapEmail("<p>Body</p>", "Headline", { preheader: "Hidden preheader" });
    expect(html).toContain('bgcolor="#d4ede4"');
    expect(html).toContain("background-color:#d4ede4");
    expect(html).toContain("linear-gradient(135deg,#d4ede4 0%,#f7f5f0 100%)");
    expect(html).toContain("https://www.staywithmypet.ee/logo.png");
    expect(html).toContain("Stay With My Pet");
    expect(html).toContain("Hidden preheader");
    expect(html).toContain("Headline");
  });
});
