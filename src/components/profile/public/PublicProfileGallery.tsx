import { AppImage } from "@/components/ui/AppImage";

type PublicProfileGalleryProps = {
  photos: string[];
  displayName: string;
};

export function PublicProfileGallery({ photos, displayName }: PublicProfileGalleryProps) {
  const urls = photos.filter((u) => u.trim()).slice(0, 6);
  if (!urls.length) return null;

  return (
    <section className="card-elevated rounded-2xl p-4 sm:p-5">
      <h2 className="text-sm font-semibold text-foreground">Photos</h2>
      <ul className="mt-2 flex flex-wrap gap-1.5" aria-label={`${displayName} profile photos`}>
        {urls.map((url, index) => (
          <li key={url}>
            <div className="relative h-14 w-14 overflow-hidden rounded-lg sm:h-16 sm:w-16">
              <AppImage
                src={url}
                alt={`${displayName} photo ${index + 1}`}
                seed={url}
                fallbackCaption={displayName}
                sizes="64px"
                className="object-cover"
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
