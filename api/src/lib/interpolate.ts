import { escapeHtml, looksLikeHtml } from './html';

export function interpolate(
  template: string,
  values: Record<string, string | null | undefined>,
) {
  const html = looksLikeHtml(template);
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, key: string) => {
    const value = values[key] ?? '';
    return html ? escapeHtml(value) : value;
  });
}
