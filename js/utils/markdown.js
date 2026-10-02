/**
 * A deliberately small Markdown renderer for the guide text in
 * data/members/resources.json: headings, paragraphs, bullet and numbered
 * lists, bold, italic, inline code and links.
 *
 * Safety: links are cut out of the RAW text before anything is escaped, so a
 * link target is judged by safeUrl exactly as written and then HTML-escaped
 * once for the attribute (no double escaping, no partial unescaping). Every
 * other piece of text is HTML-escaped before any markup is added, so the data
 * cannot inject HTML or script.
 */

import { escapeHTML, safeUrl } from './safe-dom.js';

const LINK = /\[([^\]\n]+)\]\(([^)\s]+)\)/g;
// Placeholder delimiter: a private-use character that is stripped from the
// input first, so data can never forge a placeholder.
const MARK = '';

function emphasis(escaped) {
  return escaped
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    .replace(/(^|[^*\w])\*(?!\s)([^*]+?)\*(?!\w)/g, '$1<em>$2</em>')
    .replace(/(^|[^_\w])_(?!\s)([^_]+?)_(?!\w)/g, '$1<em>$2</em>');
}

/**
 * Render one line of inline Markdown to HTML.
 * @param {string} text - Raw (unescaped) text
 * @returns {string} HTML
 */
export function renderInline(text) {
  const links = [];
  const raw = String(text).split(MARK).join('');

  const withPlaceholders = raw.replace(LINK, (whole, label, rawUrl) => {
    const url = safeUrl(rawUrl, '');
    const labelHtml = emphasis(escapeHTML(label));
    if (!url) {
      links.push(labelHtml);
    } else {
      const external = /^https?:/i.test(url);
      links.push(`<a href="${escapeHTML(url)}"${external ? ' target="_blank" rel="noopener"' : ''}>${labelHtml}</a>`);
    }
    return `${MARK}${links.length - 1}${MARK}`;
  });

  return emphasis(escapeHTML(withPlaceholders))
    .replace(new RegExp(`${MARK}(\\d+)${MARK}`, 'g'), (whole, index) => links[Number(index)]);
}

/**
 * Render a Markdown document to HTML.
 * @param {string} markdown - Raw Markdown
 * @param {string} [title] - Document title; a leading "# <title>" is dropped
 *   because the surrounding dialog already shows it
 * @returns {string} HTML
 */
export function renderMarkdown(markdown, title = '') {
  if (typeof markdown !== 'string' || markdown.trim() === '') {return '';}

  const out = [];
  let paragraph = [];
  let list = null; // { type: 'ul' | 'ol', items: [] }
  let first = true;

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      out.push(`<p>${paragraph.map(renderInline).join('<br>')}</p>`);
      paragraph = [];
    }
  };
  const flushList = () => {
    if (list) {
      out.push(`<${list.type}>${list.items.map(item => `<li>${renderInline(item)}</li>`).join('')}</${list.type}>`);
      list = null;
    }
  };

  markdown.replace(/\r\n?/g, '\n').split('\n').forEach(rawLine => {
    const line = rawLine.trim();

    if (line === '') {
      flushParagraph();
      flushList();
      return;
    }

    const heading = /^(#{1,6})\s+(.+?)\s*#*$/.exec(line);
    if (heading) {
      flushParagraph();
      flushList();
      const text = heading[2];
      if (!(first && heading[1].length === 1 && title && text.trim() === String(title).trim())) {
        const level = Math.min(6, Math.max(3, heading[1].length + 1));
        out.push(`<h${level}>${renderInline(text)}</h${level}>`);
      }
      first = false;
      return;
    }
    first = false;

    const bullet = /^[-*+]\s+(.*)$/.exec(line);
    const numbered = /^\d+[.)]\s+(.*)$/.exec(line);
    if (bullet || numbered) {
      flushParagraph();
      const type = bullet ? 'ul' : 'ol';
      if (list && list.type !== type) {flushList();}
      if (!list) {list = { type, items: [] };}
      list.items.push((bullet || numbered)[1]);
      return;
    }

    flushList();
    paragraph.push(line);
  });

  flushParagraph();
  flushList();
  return out.join('\n');
}
