type PublicProfileChipsProps = {
  chips: string[];
};

export function PublicProfileChips({ chips }: PublicProfileChipsProps) {
  if (!chips.length) return null;

  return (
    <ul className="flex flex-wrap gap-1.5">
      {chips.map((chip) => (
        <li
          key={chip}
          className="rounded-full border border-brand-teal/15 bg-mint/35 px-2.5 py-0.5 text-xs font-semibold text-brand-teal"
        >
          {chip}
        </li>
      ))}
    </ul>
  );
}
