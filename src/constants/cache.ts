export const CACHE_HEADERS = {
  immutable: 'public, immutable, max-age=31536000, s-maxage=31536000',
  mutable: 'public, max-age=86400, s-maxage=86400, must-revalidate',
  failure: 'private, no-cache, no-store, max-age=0, must-revalidate',
};
