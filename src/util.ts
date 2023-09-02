import { Env } from './env';

const units = ['B', 'KB', 'MB', 'GB', 'TB'];

/**
 * @param env Worker env
 * @returns True if we want to either cache files or
 *  directory listings
 */
export function isCacheEnabled(env: Env): boolean {
  return (
    env.CACHE_CONTROL !== 'no-store' ||
    env.DIRECTORY_CACHE_CONTROL !== 'no-store'
  );
}

/**
 * Maps a path in a url to the path to the resource
 *  in the R2 bucket
 * @param url Url to map
 * @param env Worker env
 * @returns Mapped path if the resource is accessible, undefined
 *  if the eyeball should not be trying to access the resource
 */
export function mapUrlPathToBucketPath(url: URL, env: Env): string | undefined {
  const urlToBucketPathMap = {
    dist: `nodejs/release${url.pathname.substring(5)}`,
    download: `nodejs${url.pathname.substring(9)}`,
    docs: `nodejs/docs${url.pathname.substring(5)}`,
    api: `nodejs/docs/latest/api${url.pathname.substring(4)}`,
  };

  // Example: /docs/asd/123
  const splitPath = url.pathname.split('/'); // ['', 'docs', 'asd', '123']
  const basePath = splitPath[1]; // 'docs'
  let bucketPath: string;
  switch (basePath) {
    case 'dist':
    case 'download':
    case 'docs':
    case 'api':
      bucketPath = urlToBucketPathMap[basePath];
      break;
    case 'metrics':
      // Substring to cut off the first /
      bucketPath = url.pathname.substring(1);
      break;
    default: {
      if (env.DIRECTORY_LISTING === 'restricted') {
        return undefined;
      } else {
        // Substring to cut off the first /
        bucketPath = url.pathname.substring(1);
      }
      break;
    }
  }

  return decodeURIComponent(bucketPath);
}

/**
 * Checks if a R2 path is for a directory or not.
 *  If a path ends in a `/` or there's no file
 *  extension, it's considered a directory path
 * @param path Path to check
 * @returns True if it's for a directory
 */
export function isDirectoryPath(path: string): boolean {
  // `path.lastIndexOf('.') == -1` is a Node-specific
  //  heuristic here. There aren't any files that don't
  //  have file extensions, so, if there are no file extensions
  //  specified in the url, treat it like a directory.
  return path[path.length - 1] == '/' || path.lastIndexOf('.') == -1;
}

/**
 * Converts raw size into readable bytes
 * @param bytes Bytes
 * @returns Something like `4.5 KB` or `8.7 MB`
 */
export function niceBytes(bytes: number): string {
  let l = 0;
  let n = parseInt(bytes.toString(), 10) || 0;

  while (n >= 1000 && ++l) {
    n = n / 1000;
  }

  return n.toFixed(n < 10 && l > 0 ? 1 : 0) + ' ' + units[l];
}

/**
 * Checks whether or not an R2 object
 *  or R2ObjectBody has a body
 * @param object R2 object
 * @returns True if it has a body
 */
export function objectHasBody(
  object: R2Object | R2ObjectBody
): object is R2ObjectBody {
  return (<R2ObjectBody>object).body !== undefined;
}
