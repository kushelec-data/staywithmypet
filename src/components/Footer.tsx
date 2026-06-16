"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/context/ProfileContext";
import { useLanguage } from "@/context/LanguageContext";
import { PAGE_CONTAINER } from "@/lib/layout";
import { resolveActiveMode } from "@/lib/profile-mode";

const LOGO_SRC = "/logo.png";

const SOCIAL_LINKS = [
  {
    href: "https://www.facebook.com/profile.php?id=61578788162683",
    labelKey: "facebook" as const,
    Icon: FacebookIcon,
  },
  {
    href: "https://www.instagram.com/staywithmypet/",
    labelKey: "instagram" as const,
    Icon: InstagramIcon,
  },
];

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className={className}
    >
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className={className}
    >
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  );
}

function FooterSocialLinks() {
  const { t } = useLanguage();

  return (
    <div className="min-w-0">
      <h3 className="font-heading text-xs font-semibold uppercase tracking-wider text-foreground">
        {t.footer.followUs}
      </h3>
      <ul className="mt-3 space-y-2.5 sm:mt-4">
        {SOCIAL_LINKS.map(({ href, labelKey, Icon }) => (
          <li key={href}>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="link-hover inline-flex items-center gap-2.5 text-sm text-muted"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-mint/50 text-brand-teal">
                <Icon className="h-4 w-4" />
              </span>
              {t.footer[labelKey]}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FooterPrimaryCta() {
  const { user, loading: authLoading } = useAuth();
  const { profile } = useProfile();
  const { t } = useLanguage();

  if (authLoading) return null;

  if (!user) {
    return (
      <Button href="/signup" variant="primary" size="lg" className="mt-6 w-full sm:mt-8 sm:w-auto">
        {t.footer.joinCta}
      </Button>
    );
  }

  const mode = profile
    ? resolveActiveMode(profile.role, profile.active_mode)
    : "pet_parent";
  const href = mode === "pet_friend" ? "/find-pets" : "/find-care";
  const label = mode === "pet_friend" ? t.navbar.findPets : t.navbar.findPetFriends;

  return (
    <Button href={href} variant="primary" size="lg" className="mt-6 w-full sm:mt-8 sm:w-auto">
      {label}
    </Button>
  );
}

export function Footer() {
  const { t } = useLanguage();
  const year = new Date().getFullYear();
  const g = t.footer.groups;

  const legalLinks = [
    { href: "/terms", label: g.company.terms ?? "Terms of Use" },
    { href: "/privacy", label: g.company.privacy ?? "Privacy Policy" },
    { href: "/safety", label: g.company.safety ?? "Safety Guidelines" },
  ];

  const footerGroups = [
    {
      title: g.petFriends.title,
      links: [
        { href: "/find-pets", label: g.petFriends.searchPets },
        { href: "/how-it-works#pet-friend-workflow", label: g.petFriends.howItWorks },
        { href: "/signup", label: g.petFriends.join },
      ],
    },
    {
      title: g.petParents.title,
      links: [
        { href: "/find-care", label: g.petParents.findCare },
        { href: "/how-it-works#pet-parent-workflow", label: g.petParents.howItWorks },
        { href: "/signup", label: g.petParents.join },
      ],
    },
    {
      title: g.company.title,
      links: [
        { href: "/pricing", label: g.company.pricing },
        { href: "/faq", label: g.company.faq },
        { href: "/articles", label: g.company.articles },
        { href: "/about", label: g.company.about },
        { href: "/contact", label: g.company.contact },
        { href: "/care/emergency", label: g.company.vetClinics ?? "Vet clinics" },
      ],
    },
  ];

  return (
    <footer className="mt-auto min-w-0 border-t border-border bg-gradient-to-b from-pastel-blue/25 via-background to-mint/25">
      <div className={`${PAGE_CONTAINER} min-w-0 py-10 sm:py-14 lg:py-16`}>
        <div className="card-elevated min-w-0 rounded-2xl p-5 sm:rounded-3xl sm:p-8 lg:p-12">
          <div className="flex min-w-0 flex-col gap-8 sm:gap-10 lg:flex-row lg:justify-between lg:gap-12">
            <div className="min-w-0 max-w-md">
              <Link href="/" aria-label="StayWithMyPet home">
                <img
                  src={LOGO_SRC}
                  alt="StayWithMyPet"
                  className="h-12 w-auto max-w-[10rem] object-contain object-left sm:h-14"
                />
              </Link>
              <p className="mt-4 text-sm leading-relaxed text-muted sm:mt-6 sm:text-base">{t.footer.tagline}</p>
              <ul className="mt-4 flex flex-wrap gap-2 sm:mt-6">
                {t.footer.points.map((point) => (
                  <li
                    key={point}
                    className="rounded-full bg-mint/60 px-2.5 py-1 text-[0.65rem] font-semibold text-brand-teal sm:px-3 sm:py-1.5 sm:text-xs"
                  >
                    {point}
                  </li>
                ))}
              </ul>
              <FooterPrimaryCta />
            </div>

            <div className="grid min-w-0 grid-cols-2 gap-6 sm:grid-cols-3 sm:gap-10">
              {footerGroups.map((group) => (
                <div key={group.title} className="min-w-0">
                  <h3 className="font-heading text-xs font-semibold uppercase tracking-wider text-foreground">
                    {group.title}
                  </h3>
                  <ul className="mt-3 space-y-2 sm:mt-4 sm:space-y-2.5">
                    {group.links.map((link) => (
                      <li key={link.href}>
                        <Link href={link.href} className="link-hover text-sm text-muted">
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-border pt-6 sm:mt-10 sm:pt-8">
          <FooterSocialLinks />
        </div>

        <div className="mt-6 border-t border-border pt-6 sm:mt-8 sm:pt-6">
          <nav aria-label="Legal" className="min-w-0">
            <ul className="flex flex-wrap items-center justify-center gap-2">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="legal-footer-link inline-flex rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted transition-colors sm:px-3.5 sm:text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="mt-4 flex flex-col items-center justify-between gap-3 text-center sm:mt-5 sm:flex-row sm:text-left">
            <p className="text-xs text-muted sm:text-sm">
              {t.footer.copyright.replace("{year}", String(year))}
            </p>
            <a
              href="mailto:info@staywithmypet.ee"
              className="text-xs font-medium text-brand-teal hover:text-brand-pink sm:text-sm"
            >
              info@staywithmypet.ee
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
