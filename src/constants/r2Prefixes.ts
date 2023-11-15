// Prefixes for paths in the R2 bucket that
//  have a different url path that we need to remap
//  later on.
// (e.g. url path `/dist` points to R2 path `nodejs/release`)
// See https://raw.githubusercontent.com/nodejs/build/main/ansible/www-standalone/resources/config/nodejs.org
import map from './redirectLinks.json' assert { type: 'json' };

export const REDIRECT_MAP = new Map(map as [string, string][]);

export const DIST_PATH_PREFIX = 'nodejs/release';

export const DOWNLOAD_PATH_PREFIX = 'nodejs';

export const DOCS_PATH_PREFIX = 'nodejs/docs';

export const API_PATH_PREFIX = `${REDIRECT_MAP.get('nodejs/docs/latest')}/api`;

export const VIRTUAL_DIRS: Record<string, Set<string>> = {
  'docs/': new Set(
    [...REDIRECT_MAP]
      .filter(([key]) => key.startsWith('nodejs/docs/'))
      .reverse()
      .map(([key]) => key.substring('nodejs/docs/'.length) + '/')
  ),
};

export const URL_TO_BUCKET_PATH_MAP: Record<string, (url: URL) => string> = {
  dist: (url): string =>
    DIST_PATH_PREFIX + (url.pathname.substring('/dist'.length) || '/'),
  download: (url): string =>
    DOWNLOAD_PATH_PREFIX + (url.pathname.substring('/download'.length) || '/'),
  docs: (url): string =>
    DOCS_PATH_PREFIX + (url.pathname.substring('/docs'.length) || '/'),
  api: (url): string =>
    API_PATH_PREFIX + (url.pathname.substring('/api'.length) || '/'),
  metrics: (url): string => url.pathname.substring(1), // substring to cut off the /
};
