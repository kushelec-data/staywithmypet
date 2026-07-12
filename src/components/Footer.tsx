"use client";

import Link from "next/link";
import { CookieSettingsLink } from "@/components/cookies/CookieSettingsLink";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { PAGE_CONTAINER } from "@/lib/layout";

const LOGO_SRC = "/logo.png";
const CONTACT_EMAIL = "info@staywithmypet.ee";

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
] as const;

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  );
}

const LEGAL_LINK_CLASS =
  "text-xs font-medium text-muted transition-colors hover:text-brand-teal sm:text-sm";

const FOOTER_GROUP_TITLE_CLASS =
  "font-heading text-[0.65rem] font-semibold uppercase tracking-wider text-foreground sm:text-xs";

type FooterLinkGroup = {
  title: string;
  links: { href: string; label: string }[];
};

function FooterLinkColumn({ group }: { group: FooterLinkGroup }) {
  return (
    <div className="min-w-0">
      <h3 className={FOOTER_GROUP_TITLE_CLASS}>{group.title}</h3>
      <ul className="mt-2 space-y-1.5">
        {group.links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className={`link-hover ${LEGAL_LINK_CLASS}`}>
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FooterLegalRow({
  legalLinks,
  year,
  showEmail = true,
  compact = false,
}: {
  legalLinks: { href: string; label: string }[];
  year: number;
  showEmail?: boolean;
  compact?: boolean;
}) {
  const { t } = useLanguage();

  return (
    <div
      className={`flex min-w-0 flex-col gap-2 border-t border-border/80 pt-3 ${
        compact ? "mt-0" : "mt-4 sm:mt-5"
      }`}
    >
      <nav aria-label="Legal" className="min-w-0">
        <ul className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          {legalLinks.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className={LEGAL_LINK_CLASS}>
                {link.label}
              </Link>
            </li>
          ))}
          <li>
            <CookieSettingsLink className={LEGAL_LINK_CLASS} />
          </li>
        </ul>
      </nav>
      <div className="flex min-w-0 flex-col gap-1.5 text-xs text-muted sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3 sm:text-sm">
        <p className="min-w-0">{t.footer.copyright.replace("{year}", String(year))}</p>
        {showEmail ? (
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="shrink-0 font-medium text-brand-teal hover:text-brand-pink"
          >
            {CONTACT_EMAIL}
          </a>
        ) : null}
      </div>
    </div>
  );
}

function FooterSocialColumn() {
  const { t } = useLanguage();

  return (
    <div className="min-w-0">
      <h3 className={FOOTER_GROUP_TITLE_CLASS}>{t.footer.followUs}</h3>
      <ul className="mt-2 space-y-1.5">
        {SOCIAL_LINKS.map(({ href, labelKey, Icon }) => (
          <li key={href}>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="link-hover inline-flex min-w-0 items-center gap-2 text-xs text-muted sm:text-sm"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-mint/50 text-brand-teal">
                <Icon className="h-3.5 w-3.5" />
              </span>
              <span className="truncate">{t.footer[labelKey]}</span>
            </a>
          </li>
        ))}
      </ul>
      <a
        href={`mailto:${CONTACT_EMAIL}`}
        className="mt-3 inline-block text-xs font-medium text-brand-teal hover:text-brand-pink sm:text-sm"
      >
        {CONTACT_EMAIL}
      </a>
    </div>
  );
}

function LoggedOutFooterBody({
  footerGroups,
}: {
  footerGroups: FooterLinkGroup[];
}) {
  const { t } = useLanguage();

  return (
    <div className="grid min-w-0 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.6fr)_minmax(0,0.75fr)] lg:gap-8">
      <div className="min-w-0 sm:col-span-2 lg:col-span-1">
        <Link href="/" aria-label="StayWithMyPet home">
          <img
            src={LOGO_SRC}
            alt="StayWithMyPet"
            className="h-10 w-auto max-w-[9rem] object-contain object-left sm:h-11"
          />
        </Link>
        <p className="mt-2 max-w-sm text-xs leading-relaxed text-muted sm:mt-3 sm:text-sm">
          {t.footer.shortTagline}
        </p>
        <ul className="mt-2.5 flex flex-wrap gap-1.5">
          {t.footer.points.map((point) => (
            <li
              key={point}
              className="rounded-full bg-mint/60 px-2 py-0.5 text-[0.6rem] font-semibold text-brand-teal sm:px-2.5 sm:py-1 sm:text-[0.65rem]"
            >
              {point}
            </li>
          ))}
        </ul>
        <Button href="/signup" variant="primary" size="sm" className="mt-3">
          {t.footer.joinCta}
        </Button>
      </div>

      <div className="grid min-w-0 grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:col-span-1">
        {footerGroups.map((group) => (
          <FooterLinkColumn key={group.title} group={group} />
        ))}
      </div>

      <div className="min-w-0 sm:col-span-2 lg:col-span-1">
        <FooterSocialColumn />
      </div>
    </div>
  );
}

function LoggedInFooterBody({
  legalLinks,
  utilityLinks,
  year,
}: {
  legalLinks: { href: string; label: string }[];
  utilityLinks: { href: string; label: string }[];
  year: number;
}) {
  return (
    <div className="min-w-0">
      {utilityLinks.length > 0 ? (
        <nav aria-label="Site" className="mb-3 min-w-0">
          <ul className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            {utilityLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className={LEGAL_LINK_CLASS}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
      <FooterLegalRow legalLinks={legalLinks} year={year} compact />
    </div>
  );
}

export function Footer() {
  const { t } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const year = new Date().getFullYear();
  const g = t.footer.groups;

  const isLoggedIn = Boolean(user) && !authLoading;

  const legalLinks = [
    { href: "/terms", label: g.company.terms },
    { href: "/privacy", label: g.company.privacy },
    { href: "/safety", label: g.company.safety },
  ];

  const loggedInUtilityLinks = [{ href: "/articles", label: g.company.articles }];

  const footerGroups: FooterLinkGroup[] = [
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
        { href: "/care/emergency", label: g.company.vetClinics },
      ],
    },
  ];

  return (
    <footer className="mt-auto min-w-0 border-t border-border bg-gradient-to-b from-pastel-blue/20 via-background to-mint/20">
      <div className={`${PAGE_CONTAINER} min-w-0 py-5 sm:py-6`}>
        <div className="card-elevated min-w-0 overflow-hidden rounded-2xl p-4 sm:p-5 lg:p-6">
          {isLoggedIn ? (
            <LoggedInFooterBody
              legalLinks={legalLinks}
              utilityLinks={loggedInUtilityLinks}
              year={year}
            />
          ) : (
            <>
              <LoggedOutFooterBody footerGroups={footerGroups} />
              <FooterLegalRow legalLinks={legalLinks} year={year} showEmail={false} />
            </>
          )}
        </div>
      </div>
    </footer>
  );
}
