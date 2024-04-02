/**
 * @param request Request object
 * @returns {@link URL} instance if url is valid, a 400
 *  response otherwise
 */
export function parseUrl(request: Request): URL | undefined {
  let url: URL | undefined;

  try {
    url = new URL(request.url);
  } catch (e) {
    console.error(e);
  }

  return url;
}
