export function hasTrailingSlash(path: string): boolean {
  return path[path.length - 1] === '/';
}

export function isExtensionless(path: string): boolean {
  // `path.lastIndexOf('.') == -1` is a Node-specific heuristic here.
  //  There aren't any files in the bucket that don't have file extensions,
  //  so, if there is no file extension specified in the url, treat it
  //  like a directory.
  //
  // Two exceptions:
  //  - `latest-vXX.x` directories
  //  - `vX.X.X` directories

  const finalSlashIndex = path.lastIndexOf('/');
  const extensionDelimiter = path.lastIndexOf('.');

  // extensionDelimiter is the index of the last `.`, we use it to tell
  //  whether or not there is a file extension. However, bucket paths such
  //  as `nodejs/release/v21.2.0/docs/api/` trip it up. So check if there's
  //  no extension OR if the extension comes before the final `/` and thus
  //  can't be a file extension
  if (extensionDelimiter === -1 || extensionDelimiter < finalSlashIndex) {
    return true;
  }

  const fileExtension = path.substring(extensionDelimiter + 1); // +1 to remove the `.`

  // This handles the two exceptions
  //  Either fileExtension === 'x' or we can parse it to a number successfully,
  //  since generally file extensions aren't numbers
  return /^([a-z]|\d+)$/i.test(fileExtension);
}

/**
 * Checks if a R2 path is for a directory or not.
 *  If a path ends in a `/` or there's no file
 *  extension, it's considered a directory path
 * @param path Path to check
 * @returns True if it's for a directory
 */
export function isDirectoryPath(path: string): boolean {
  return hasTrailingSlash(path) || isExtensionless(path);
}
