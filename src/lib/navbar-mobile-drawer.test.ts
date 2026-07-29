import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("mobile navigation drawer layout", () => {
  const navbarSource = readSource("src/components/Navbar.tsx");
  const drawerSource = readSource("src/components/navbar/MobileNavDrawer.tsx");
  const bellSource = readSource("src/components/notifications/NotificationsBell.tsx");
  const savedSource = readSource("src/components/navbar/NavbarSavedLink.tsx");
  const userMenuSource = readSource("src/components/navbar/NavbarUserMenu.tsx");

  it("1. notification action renders as a mobile menu row", () => {
    expect(bellSource).toContain('variant?: "icon" | "menu-row"');
    expect(bellSource).toContain('variant === "menu-row"');
    expect(bellSource).toContain("mobileNavRowClass");
    expect(navbarSource).toContain('variant="menu-row"');
  });

  it("2. favourites action renders as a mobile menu row", () => {
    expect(savedSource).toContain('variant?: "icon" | "menu-row"');
    expect(savedSource).toContain('variant === "menu-row"');
    expect(savedSource).toContain("mobileNavRowClass");
    expect(navbarSource).toContain('<NavbarSavedLink variant="menu-row"');
  });

  it("3. desktop icon buttons remain unchanged", () => {
    expect(navbarSource).toContain("<NotificationsBell />");
    expect(navbarSource).toContain("<NavbarSavedLink />");
    expect(navbarSource).toContain('className="hidden items-center gap-2 md:flex"');
    expect(bellSource).toContain('variant = "icon"');
    expect(savedSource).toContain('variant = "icon"');
  });

  it("4. mobile account links render vertically with icons", () => {
    expect(userMenuSource).toContain('variant === "mobile"');
    expect(userMenuSource).toContain("accountSidebarIconForHref");
    expect(userMenuSource).toContain("min-w-0 max-w-full space-y-0.5");
    expect(navbarSource).toContain('variant="mobile"');
  });

  it("5. drawer has no horizontal-scroll classes on the shell", () => {
    expect(drawerSource).toContain("overflow-x-hidden");
    expect(drawerSource).toContain("w-[min(100vw,420px)]");
    expect(drawerSource).toContain("max-w-[100vw]");
    expect(drawerSource).not.toContain("overflow-x-auto");
    expect(drawerSource).not.toContain("w-screen");
    expect(navbarSource).not.toContain("grid-rows-[1fr]");
  });

  it("6. only one navigation variant is visible per breakpoint", () => {
    expect(navbarSource).toContain("hidden min-w-0 items-center justify-center gap-0.5 lg:flex");
    expect(drawerSource).toContain("lg:hidden");
    expect(navbarSource).toContain("lg:hidden");
  });

  it("7. close button closes the drawer", () => {
    expect(drawerSource).toContain("onClose");
    expect(drawerSource).toContain("aria-label={closeLabel}");
    expect(navbarSource).toContain("onClose={closeDrawer}");
  });

  it("8. Escape closes the drawer", () => {
    expect(drawerSource).toContain('event.key === "Escape"');
    expect(drawerSource).toContain("onClose()");
  });

  it("9. body scroll is locked while open", () => {
    expect(navbarSource).toContain('document.body.style.overflow = open ? "hidden" : ""');
  });

  it("10. unread notification count remains visible on mobile menu row", () => {
    expect(bellSource).toContain("unreadCount");
    expect(bellSource).toContain("badgeLabel");
    expect(bellSource).toMatch(/isMenuRow[\s\S]*ml-auto[\s\S]*badgeLabel/s);
  });

  it("uses fixed overlay drawer instead of in-header collapsible panel", () => {
    expect(drawerSource).toContain("createPortal");
    expect(drawerSource).toContain("fixed inset-0");
    expect(drawerSource).toContain('role="dialog"');
    expect(drawerSource).toContain("returnFocusRef");
  });

  it("keeps mobile utility and account sections below md only", () => {
    expect(navbarSource).toMatch(/NotificationsBell[\s\S]*md:hidden/s);
    expect(navbarSource).toMatch(/NavbarUserMenu[\s\S]*md:hidden/s);
  });
});
