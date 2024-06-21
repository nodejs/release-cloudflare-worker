import Handlebars from 'handlebars';
import type { File, ReadDirectoryResult } from '../providers/provider';
import htmlTemplate from '../templates/directoryListing.out';
import { toReadableBytes } from '../utils/object';

const handlebarsTemplate = Handlebars.template(htmlTemplate);

const months = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

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
  const tableElements: TableElement[] = [];

  for (const name of result.subdirectories) {
    tableElements.push(renderSubdirectory(name));
  }

  // Last time the directory was "modified", just the last modified of the most
  //  recently updated file
  let directoryLastModified: Date | undefined;

  for (const file of result.files) {
    if (
      directoryLastModified === undefined ||
      file.lastModified > directoryLastModified
    ) {
      directoryLastModified = file.lastModified;
    }

    tableElements.push(renderFile(url.pathname, file));
  }

  const html = handlebarsTemplate({
    pathname: url.pathname,
    entries: tableElements,
  });

  return html;
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
  const href = encodeURIComponent(name.substring(0, name.length - 1));

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
    lastModified: '               -',
    size: '                  -',
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

  const dateString = `${lastModified.getUTCDay()}-${months.at(
    lastModified.getUTCMonth()
  )}-${lastModified.getUTCFullYear()} ${lastModified.getUTCHours()}:${lastModified.getUTCMinutes()}`;

  const bytes = toReadableBytes(file.size);

  return {
    href: pathPrefix + encodeURIComponent(name),
    name: displayName,
    displayNamePaddingRight,
    lastModified: dateString,
    size: ' '.repeat(20 - bytes.length) + bytes,
  };
}
