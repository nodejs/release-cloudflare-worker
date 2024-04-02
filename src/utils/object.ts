const byteUnits = ['B', 'KB', 'MB', 'GB', 'TB'];

/**
 * Checks whether or not an R2 object or R2ObjectBody has a body
 */
export function objectHasBody(
  object: R2Object | R2ObjectBody
): object is R2ObjectBody {
  return (<R2ObjectBody>object).body !== undefined;
}

/**
 * Converts raw size into human readable bytes
 * @returns Something like `4.5 KB` or `8.7 MB`
 */
export function toReadableBytes(bytes: number): string {
  let l = 0;
  let n = parseInt(bytes.toString(), 10) || 0;

  while (n >= 1000 && ++l) {
    n = n / 1000;
  }

  return n.toFixed(n < 10 && l > 0 ? 1 : 0) + ' ' + byteUnits[l];
}
