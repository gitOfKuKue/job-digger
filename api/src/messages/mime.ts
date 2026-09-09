import { extname } from 'path';

const EXT_MIME: Record<string, string> = {
  '7z': 'application/x-7z-compressed',
  aac: 'audio/aac',
  avi: 'video/x-msvideo',
  bmp: 'image/bmp',
  csv: 'text/csv',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  gif: 'image/gif',
  heic: 'image/heic',
  html: 'text/html',
  ics: 'text/calendar',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  json: 'application/json',
  key: 'application/x-iwork-keynote-sffkey',
  m4a: 'audio/mp4',
  md: 'text/markdown',
  mov: 'video/quicktime',
  mp3: 'audio/mpeg',
  mp4: 'video/mp4',
  numbers: 'application/x-iwork-numbers-sffnumbers',
  odt: 'application/vnd.oasis.opendocument.text',
  ods: 'application/vnd.oasis.opendocument.spreadsheet',
  pages: 'application/x-iwork-pages-sffpages',
  pdf: 'application/pdf',
  png: 'image/png',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  rar: 'application/vnd.rar',
  rtf: 'application/rtf',
  svg: 'image/svg+xml',
  tar: 'application/x-tar',
  tif: 'image/tiff',
  tiff: 'image/tiff',
  txt: 'text/plain',
  wav: 'audio/wav',
  webm: 'video/webm',
  webp: 'image/webp',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xml: 'application/xml',
  zip: 'application/zip',
};

function looksLikeMime(type: string) {
  return /^[a-z0-9][\w!#$&^.+-]*\/[a-z0-9][\w!#$&^.+-]*$/i.test(type);
}

export function resolveContentType(filename: string, declared?: string) {
  const fromBrowser = declared?.split(';')[0]?.trim().toLowerCase() || '';
  if (
    fromBrowser &&
    fromBrowser !== 'application/octet-stream' &&
    looksLikeMime(fromBrowser)
  ) {
    return fromBrowser;
  }
  const ext = extname(filename).replace('.', '').toLowerCase();
  return EXT_MIME[ext] || 'application/octet-stream';
}
