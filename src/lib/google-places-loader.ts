const SCRIPT_ID = "google-maps-places-js";

export function getGoogleMapsApiKey(): string | undefined {
  const k = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  return typeof k === "string" && k.trim() ? k.trim() : undefined;
}

let loadPromise: Promise<void> | null = null;

export function loadGoogleMapsPlacesScript(apiKey: string): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Places is only available in the browser."));
  }
  if (window.google?.maps?.places) {
    return Promise.resolve();
  }
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Google Maps script failed to load.")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places`;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google Maps script failed to load."));
    document.head.appendChild(script);
  });

  return loadPromise;
}
