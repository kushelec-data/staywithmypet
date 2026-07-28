export type MembershipDogCapabilityOptions = {
  reducedMotion?: boolean;
  saveData?: boolean;
  webglAvailable?: boolean;
  deviceMemoryGb?: number;
  viewportWidth?: number;
};

export const MEMBERSHIP_DOG_MIN_VIEWPORT_PX = 360;

export function isWebGLAvailable(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      canvas.getContext("webgl2") ?? canvas.getContext("webgl") ?? canvas.getContext("experimental-webgl"),
    );
  } catch {
    return false;
  }
}

export function readSaveDataEnabled(): boolean {
  if (typeof navigator === "undefined") return false;
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return Boolean(connection?.saveData);
}

export function readDeviceMemoryGb(): number | undefined {
  if (typeof navigator === "undefined") return undefined;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  return typeof memory === "number" ? memory : undefined;
}

export function shouldEnableMembership3DDog(
  options: MembershipDogCapabilityOptions = {},
): boolean {
  const hasExplicitOptions =
    options.reducedMotion !== undefined ||
    options.saveData !== undefined ||
    options.webglAvailable !== undefined ||
    options.viewportWidth !== undefined ||
    options.deviceMemoryGb !== undefined;

  if (typeof window === "undefined" && !hasExplicitOptions) return false;

  const reducedMotion =
    options.reducedMotion ??
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reducedMotion) return false;

  const saveData = options.saveData ?? readSaveDataEnabled();
  if (saveData) return false;

  const webglAvailable = options.webglAvailable ?? isWebGLAvailable();
  if (!webglAvailable) return false;

  const viewportWidth = options.viewportWidth ?? window.innerWidth;
  if (viewportWidth < MEMBERSHIP_DOG_MIN_VIEWPORT_PX) return false;

  const deviceMemoryGb = options.deviceMemoryGb ?? readDeviceMemoryGb();
  if (deviceMemoryGb !== undefined && deviceMemoryGb < 4) return false;

  return true;
}
