const HTTP_PROTOCOL_PATTERN = /^https?:\/\//iu;
const URI_SCHEME_PATTERN = /^[a-z][a-z\d+.-]*:/iu;

function assertSafePublicAssetPath(path: string): string {
  const normalized = path.trim();
  const decoded = (() => {
    try {
      return decodeURIComponent(normalized);
    } catch {
      throw new Error(`Static asset path contains invalid percent encoding: ${path}`);
    }
  })();

  if (
    normalized.length === 0
    || normalized.startsWith("/")
    || normalized.startsWith("\\")
    || normalized.includes("\\")
    || normalized.includes("?")
    || normalized.includes("#")
    || URI_SCHEME_PATTERN.test(normalized)
  ) {
    throw new Error(`Static asset path must be a relative public path: ${path}`);
  }

  const decodedSegments = decoded.replaceAll("\\", "/").split("/");
  if (decodedSegments.some((segment) => segment === "" || segment === "." || segment === "..")) {
    throw new Error(`Static asset path contains an unsafe segment: ${path}`);
  }

  return normalized;
}

function withTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

/**
 * Resolves a Vite public asset without assuming that the application is hosted
 * at the origin root. In particular, `./` stays relative for GitHub Pages.
 */
export function resolvePublicAssetUrl(
  path: string,
  baseUrl: string = import.meta.env.BASE_URL || "./",
): string {
  const safePath = assertSafePublicAssetPath(path);
  const base = baseUrl.trim();

  if (base === "" || base === "." || base === "./") {
    return `./${safePath}`;
  }

  if (HTTP_PROTOCOL_PATTERN.test(base)) {
    return new URL(safePath, withTrailingSlash(base)).toString();
  }

  if (URI_SCHEME_PATTERN.test(base) || base.startsWith("//") || base.includes("\\")) {
    throw new Error(`Unsupported public base URL: ${baseUrl}`);
  }

  const segments = base.split("/").filter((segment) => segment.length > 0);
  if (segments.some((segment) => segment === "." || segment === "..")) {
    throw new Error(`Public base URL contains an unsafe segment: ${baseUrl}`);
  }

  if (base.startsWith("/")) {
    return `${withTrailingSlash(base)}${safePath}`;
  }

  return `${withTrailingSlash(base)}${safePath}`;
}

export function isSafePublicAssetPath(path: string): boolean {
  try {
    assertSafePublicAssetPath(path);
    return true;
  } catch {
    return false;
  }
}
