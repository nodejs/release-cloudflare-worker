export const CACHE_HEADERS = {
  immutable: 'public, immutable, max-age=31536000, s-maxage=31536000',
  // Mirrors the nginx origin's `public, max-age=3600, s-maxage=14400`.
  mutable: 'public, max-age=3600, s-maxage=14400',
  failure: 'private, no-cache, no-store, max-age=0, must-revalidate',
};
