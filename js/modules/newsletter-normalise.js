/**
 * One mapping from a newsletters.json record to the fields the pages render.
 *
 * The data file uses filePath / publishDate / description / pageCount /
 * featuredArticles. Older records (and the first versions of newsletter.js and
 * home.js) used pdfUrl / date / summary / pages / features, so those remain as
 * fallbacks. Shared by the newsletter page and the home page so the two cannot
 * drift apart.
 */

import { firstSafeUrl } from '../utils/safe-dom.js';
import { parseLocalDate } from '../utils/dates.js';

/**
 * @param {Object} newsletter - Raw record from newsletters.json
 * @returns {Object} The record plus normalised fields: date (string),
 *   dateValue (local-midnight Date), summary, pages, pdfUrl ('' when there is
 *   no usable URL) and features (array of article title strings, unescaped --
 *   escape at render time)
 */
export function normaliseNewsletter(newsletter) {
  const date = newsletter.publishDate || newsletter.date || '';
  const featured = Array.isArray(newsletter.featuredArticles)
    ? newsletter.featuredArticles
      .map(article => (typeof article === 'string' ? article : article && article.title))
      .filter(title => typeof title === 'string' && title.trim() !== '')
    : [];

  return {
    ...newsletter,
    date,
    dateValue: parseLocalDate(date),
    summary: newsletter.description || newsletter.summary,
    pages: newsletter.pageCount || newsletter.pages,
    pdfUrl: firstSafeUrl(newsletter.filePath, newsletter.pdfUrl),
    features: featured.length > 0 ? featured : (Array.isArray(newsletter.features) ? newsletter.features : [])
  };
}
