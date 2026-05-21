import type { PublicDetailGroup } from "@/lib/public-pet-display";

type PublicDetailGroupsProps = {
  groups: PublicDetailGroup[];
};

export function PublicDetailGroups({ groups }: PublicDetailGroupsProps) {
  if (!groups.length) return null;

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div key={group.label}>
          <h3 className="text-sm font-semibold text-foreground">{group.label}</h3>
          <ul className="mt-1.5 space-y-1 text-sm text-foreground/85">
            {group.items.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-brand-teal" aria-hidden>
                  ·
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
