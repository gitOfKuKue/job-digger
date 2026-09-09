export function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function looksLikeHtml(value: string) {
  return /<\/?[a-z][\s\S]*>/i.test(value.trim());
}

export function htmlToText(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function isEmptyHtml(value: string) {
  return !htmlToText(value);
}

export function plainToHtml(value: string) {
  const escaped = escapeHtml(value);
  if (!escaped.trim()) return '<p></p>';
  return escaped
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`)
    .join('');
}

export function toEditorHtml(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '<p></p>';
  return looksLikeHtml(trimmed) ? value : plainToHtml(value);
}

const ALLOWED_TAGS = new Set([
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'strike',
  'h1',
  'h2',
  'h3',
  'ul',
  'ol',
  'li',
  'a',
  'blockquote',
  'span',
  'div',
]);

function hrefFromAttrs(attrs: string) {
  const match = /href\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(attrs);
  return (match?.[2] || match?.[3] || match?.[4] || '').trim();
}

function alignFromAttrs(attrs: string) {
  const match = /text-align:\s*(left|center|right|justify)/i.exec(attrs);
  return match?.[1]?.toLowerCase() || '';
}

export function sanitizeEmailHtml(html: string) {
  const withoutDanger = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');

  return withoutDanger.replace(
    /<\/?([a-z0-9]+)(\s[^>]*)?>/gi,
    (match, rawTag: string, attrs = '') => {
      const tag = rawTag.toLowerCase();
      if (!ALLOWED_TAGS.has(tag)) return '';
      if (match.startsWith('</')) return `</${tag}>`;
      if (tag === 'br') return '<br>';
      const align = alignFromAttrs(attrs);
      const style = align ? ` style="text-align: ${align}"` : '';
      if (tag === 'a') {
        const url = hrefFromAttrs(attrs);
        if (!/^(https?:|mailto:)/i.test(url)) return '<a>';
        return `<a href="${escapeHtml(url)}">`;
      }
      return `<${tag}${style}>`;
    },
  );
}

export function wrapEmailHtml(html: string) {
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.65;color:#0f172a">${sanitizeEmailHtml(html)}</div>`;
}
