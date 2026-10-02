/**
 * Screen-reader announcements through an always-rendered role="status" element.
 *
 * Bulk list containers are deliberately NOT live regions: a live region on a
 * 4-6k-character list makes screen readers read the whole list on load and on
 * every filter. Pages instead keep a short, visually hidden status line
 * ("Showing 12 of 39 meetings") and update it here.
 */

// Pending refill per region, so a stale message cannot land after a newer one.
const pending = new WeakMap();

/**
 * Set the text of a status region so that it is announced, even when the new
 * text is identical to the old one (screen readers skip unchanged text, so the
 * region is cleared first and refilled on the next task).
 * @param {HTMLElement|null} region - Element with role="status"
 * @param {string} message - Short message to announce
 */
export function announceStatus(region, message) {
  if (!region) {return;}
  clearTimeout(pending.get(region));
  region.textContent = '';
  pending.set(region, setTimeout(() => {
    region.textContent = message;
  }, 50));
}

/**
 * "Showing 3 resources" / "Showing 2 of 3 resources"
 * @param {number} shown - Items currently visible
 * @param {number} total - Items in the full list
 * @param {string} singular - Noun for one item
 * @param {string} plural - Noun for several items
 * @returns {string} Summary text
 */
export function countSummary(shown, total, singular, plural) {
  const noun = (n) => (n === 1 ? singular : plural);
  return shown === total
    ? `Showing ${total} ${noun(total)}`
    : `Showing ${shown} of ${total} ${noun(total)}`;
}
