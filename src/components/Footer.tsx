"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/context/LanguageContext";
import { PAGE_CONTAINER } from "@/lib/layout";

const LOGO_SRC = "/logo.png";

export function Footer() {
  const { t } = useLanguage();
  const year = new Date().getFullYear();
  const g = t.footer.groups;

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
        { href: "/care/emergency", label: "Vet clinics" },
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
              <Button href="/signup" variant="primary" size="lg" className="mt-6 w-full sm:mt-8 sm:w-auto">
                {t.footer.joinCta}
              </Button>
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

        <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 text-center text-xs text-muted sm:mt-10 sm:flex-row sm:pt-8 sm:text-left sm:text-sm">
          <p>{t.footer.copyright.replace("{year}", String(year))}</p>
          <a href="mailto:info@staywithmypet.ee" className="font-medium text-brand-teal hover:text-brand-pink">
            info@staywithmypet.ee
          </a>
        </div>
      </div>
    </footer>
  );
}
