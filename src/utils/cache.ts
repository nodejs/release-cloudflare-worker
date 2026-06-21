import { CACHE_HEADERS } from '../constants/cache';
import latestVersions from '../constants/latestVersions.json' assert { type: 'json' };
import { isDirectoryPath } from './path';

// Files whose contents change without a version/URL change.
const MUTABLE_FILENAMES = new Set([
  'index.json',
  'index.tab',
  'llms.txt',
  'node-config-schema.json',
]);

// Moving aliases (`latest`, `latest-v20.x`, `latest-argon`, `node-latest.tar.gz`,
//  …). Each key of `latestVersions` is a path segment that points at a different
//  release over time, so anything served under one must not be cached immutably.
//  Sourcing this from `latestVersions` keeps it in sync with the routes
//  registered in `routes/index.ts`.
const MOVING_ALIASES = new Set(Object.keys(latestVersions));

/**
 * Decides whether a response can be cached immutably (effectively forever) based
 *  on the ORIGINAL (unsubstituted) request pathname.
 *
 * Most content we serve is immutable: a published release asset under a concrete
 *  version never changes. The exceptions are resources whose contents change
 *  while their URL stays the same:
 *  - directory listings (a new file can appear at any time)
 *  - the `/api/*` route (always serves the current `latest` version's docs)
 *  - `latest`/`latest-vXX.x`/`latest-<codename>` aliases (point at a different
 *    release over time)
 *  - index/metadata files like `index.json`
 *
 * @param pathname Original request pathname (use `unsubstitutedUrl` if present)
 */
export function isImmutablePath(pathname: string): boolean {
  // Directory listings change as files are added.
  if (isDirectoryPath(pathname)) {
    return false;
  }

  // `/api/*` always serves the current `latest` version's docs.
  if (pathname === '/api' || pathname.startsWith('/api/')) {
    return false;
  }

  // `/dist/latest/`, `/docs/latest-v18.x/`, `/dist/latest-argon/`, etc. are
  //  moving aliases. Any path segment matching a known alias is mutable.
  if (pathname.split('/').some(segment => MOVING_ALIASES.has(segment))) {
    return false;
  }

  const filename = pathname.slice(pathname.lastIndexOf('/') + 1);
  if (MUTABLE_FILENAMES.has(filename)) {
    return false;
  }

  return true;
}

/**
 * Single source of truth for the `cache-control` header on a response.
 *
 * Only fully-successful (200) responses are given a long-lived cache policy.
 *  Conditional/range responses (206/304/412) and errors keep the `failure`
 *  policy so they're always re-validated.
 */
export function cacheControlFor(pathname: string, statusCode: number): string {
  if (statusCode !== 200) {
    return CACHE_HEADERS.failure;
  }

  return isImmutablePath(pathname)
    ? CACHE_HEADERS.immutable
    : CACHE_HEADERS.mutable;
}
