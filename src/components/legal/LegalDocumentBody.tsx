import {
  buildLegalContentBlocks,
  type LegalParagraphRole,
} from "@/lib/legal-typography";

const ROLE_CLASS: Record<LegalParagraphRole, string> = {
  section:
    "mt-10 scroll-mt-24 font-heading text-xl font-semibold tracking-tight text-foreground first:mt-0 sm:mt-12 sm:text-2xl",
  subsection:
    "mt-8 scroll-mt-24 font-heading text-lg font-semibold tracking-tight text-foreground sm:mt-9 sm:text-xl",
  group:
    "mt-6 font-heading text-base font-semibold text-foreground sm:mt-7 sm:text-lg",
  label: "mt-5 font-semibold text-foreground sm:mt-6",
  "list-item": "",
  body: "mt-4 text-[0.9375rem] leading-[1.75] text-muted sm:text-base sm:leading-[1.8]",
};

function LegalParagraph({ text, role }: { text: string; role: LegalParagraphRole }) {
  const className = ROLE_CLASS[role];

  if (role === "section") {
    return <h2 className={className}>{text}</h2>;
  }
  if (role === "subsection") {
    return <h3 className={className}>{text}</h3>;
  }
  if (role === "group" || role === "label") {
    return <p className={className}>{text}</p>;
  }
  return (
    <p className={`${className} whitespace-pre-wrap`}>{text}</p>
  );
}

export function LegalDocumentBody({ paragraphs }: { paragraphs: string[] }) {
  const blocks = buildLegalContentBlocks(paragraphs);

  return (
    <div className="legal-document-body">
      {blocks.map((block, index) => {
        if (block.type === "list") {
          return (
            <ul
              key={`list-${index}`}
              className="mt-3 space-y-2 border-l-2 border-mint/70 pl-4 sm:mt-4 sm:pl-5"
            >
              {block.items.map((item) => (
                <li
                  key={item.slice(0, 48)}
                  className="text-[0.9375rem] leading-relaxed text-muted sm:text-base"
                >
                  {item}
                </li>
              ))}
            </ul>
          );
        }

        return (
          <LegalParagraph
            key={`${block.role}-${block.text.slice(0, 48)}`}
            text={block.text}
            role={block.role}
          />
        );
      })}
    </div>
  );
}
