import type { ArticleBlock } from "@/lib/articles";

type ArticleBodyProps = {
  blocks: ArticleBlock[];
};

export function ArticleBody({ blocks }: ArticleBodyProps) {
  return (
    <div className="space-y-5 text-base leading-relaxed text-muted">
      {blocks.map((block, index) => {
        switch (block.type) {
          case "h2":
            return (
              <h2
                key={index}
                className="font-heading pt-2 text-xl font-semibold text-foreground sm:text-2xl"
              >
                {block.text}
              </h2>
            );
          case "h3":
            return (
              <h3 key={index} className="font-heading text-lg font-semibold text-foreground">
                {block.text}
              </h3>
            );
          case "ul":
            return (
              <ul key={index} className="list-disc space-y-2 pl-5 marker:text-brand-teal">
                {block.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={index} className="list-decimal space-y-2 pl-5 marker:font-semibold marker:text-brand-teal">
                {block.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
            );
          default:
            return (
              <p key={index} className="text-muted">
                {block.text}
              </p>
            );
        }
      })}
    </div>
  );
}
