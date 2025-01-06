import type { File, ReadDirectoryResult } from '../providers/provider';
import htmlTemplate from '../templates/directoryListing.out.json' with { type: 'json' };
import { toReadableBytes } from '../utils/object';
import { template } from './template';

// Closest we can get to nginx's time format with this api
const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'UTC',
});

/**
 * Render a directory listing
 *
 * TODO: Work with other teams on removing their dependency on nginx's listing
 *  result so we don't need to emulate it
 */
export function renderDirectoryListing(
  url: URL,
  result: ReadDirectoryResult
): string {
  const tableElements: TableElement[] =
    result.subdirectories.map(renderSubdirectory);

  for (const file of result.files) {
    tableElements.push(renderFile(url.pathname, file));
  }

  return template(htmlTemplate, {
    pathname: url.pathname,
    entries: tableElements,
  });
}

/**
 * Element to be displayed on the directory listing page
 */
type TableElement = {
  href: string;
  name: string;
  displayNamePaddingRight: string;
  lastModified: string;
  size: string;
};

function renderSubdirectory(name: string): TableElement {
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String#utf-16_characters_unicode_code_points_and_grapheme_clusters
  const wellFormedName: string = name.isWellFormed()
    ? name
    : name.toWellFormed();

  const href = encodeURIComponent(
    wellFormedName.substring(0, wellFormedName.length - 1)
  );

  let displayName: string;
  let displayNamePaddingRight: string;
  if (name.length > 50) {
    // Too long, truncate
    displayName = name.substring(0, 49) + '>';
    displayNamePaddingRight = '';
  } else {
    displayName = name;
    displayNamePaddingRight = ' '.repeat(50 - name.length);
  }

  return {
    href: `${href}/`,
    name: displayName,
    displayNamePaddingRight,
    lastModified: `${' '.repeat(15)}-`,
    size: `${' '.repeat(18)}-`,
  };
}

function renderFile(pathPrefix: string, file: File): TableElement {
  const { name, lastModified } = file;

  let displayName: string;
  let displayNamePaddingRight: string;
  if (name!.length > 50) {
    // Too long, truncate
    displayName = name.substring(0, 47) + '..>';
    displayNamePaddingRight = '';
  } else {
    displayName = name;
    displayNamePaddingRight = ' '.repeat(50 - name!.length);
  }

  const dateString = dateFormatter
    .format(lastModified)
    .replace(/(\d{2}) (\w{3}) (\d{4}), (\d{2}):(\d{2})/, '$1-$2-$3 $4:$5');

  const bytes = toReadableBytes(file.size);

  return {
    href: pathPrefix + encodeURIComponent(name),
    name: displayName,
    displayNamePaddingRight,
    lastModified: dateString,
    size: ' '.repeat(20 - bytes.length) + bytes,
  };
}
