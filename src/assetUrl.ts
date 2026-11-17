/** The address of a file of the public folder, relative to the site so that it works from any folder the site is served from. */
export function assetUrl(path: string): string {
  return import.meta.env.BASE_URL + path
}
