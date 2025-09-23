/**
 * Loading States Utility Module
 * Provides functions for showing loading states and skeleton screens
 */

/**
 * Show loading spinner in an element
 * @param {HTMLElement} element - Element to show spinner in
 * @param {string} size - Size of spinner (small, medium, large)
 * @param {string} text - Optional loading text
 */
export function showLoadingSpinner(element, size = 'medium', text = '') {
  const sizeClass = size === 'small' ? 'small' : size === 'large' ? 'large' : '';

  element.innerHTML = `
        <div class="loading-container">
            <div class="loading-spinner ${sizeClass}"></div>
            ${text ? `<p class="loading-text">${text}</p>` : ''}
        </div>
    `;
}

/**
 * Add loading overlay to an element
 * @param {HTMLElement} element - Element to add overlay to
 */
export function showLoadingOverlay(element) {
  element.style.position = 'relative';

  const overlay = document.createElement('div');
  overlay.className = 'loading-overlay';
  overlay.innerHTML = '<div class="loading-spinner"></div>';

  element.appendChild(overlay);
}

/**
 * Remove loading overlay from an element
 * @param {HTMLElement} element - Element to remove overlay from
 */
export function hideLoadingOverlay(element) {
  const overlay = element.querySelector('.loading-overlay');
  if (overlay) {
    overlay.remove();
  }
}

/**
 * Show skeleton screen for newsletters
 * @param {HTMLElement} container - Container element
 * @param {number} count - Number of skeleton items
 */
export function showNewsletterSkeleton(container, count = 3) {
  const skeletons = Array(count).fill(0).map(() => `
        <div class="skeleton-newsletter">
            <div class="skeleton skeleton-newsletter-cover"></div>
            <div>
                <div class="skeleton skeleton-heading"></div>
                <div class="skeleton skeleton-text medium"></div>
                <div class="skeleton skeleton-text long"></div>
                <div class="skeleton skeleton-text short" style="margin-top: 1rem;"></div>
            </div>
        </div>
    `).join('');

  container.innerHTML = skeletons;
}

/**
 * Show skeleton screen for meetings
 * @param {HTMLElement} container - Container element
 * @param {number} count - Number of skeleton items
 */
export function showMeetingSkeleton(container, count = 3) {
  const skeletons = Array(count).fill(0).map(() => `
        <div class="skeleton-meeting">
            <div class="skeleton skeleton-meeting-date"></div>
            <div class="skeleton skeleton-text long"></div>
            <div class="skeleton skeleton-text medium"></div>
            <div class="skeleton skeleton-text short" style="margin-top: 1rem;"></div>
        </div>
    `).join('');

  container.innerHTML = skeletons;
}

/**
 * Show skeleton screen for glossary terms
 * @param {HTMLElement} container - Container element
 * @param {number} count - Number of skeleton items
 */
export function showGlossarySkeleton(container, count = 5) {
  const skeletons = Array(count).fill(0).map(() => `
        <div class="skeleton-glossary-term">
            <div class="skeleton skeleton-glossary-title"></div>
            <div class="skeleton skeleton-glossary-definition"></div>
        </div>
    `).join('');

  container.innerHTML = `<div class="card"><div class="card-content">${skeletons}</div></div>`;
}

/**
 * Show generic skeleton card
 * @param {HTMLElement} container - Container element
 * @param {number} count - Number of skeleton items
 */
export function showCardSkeleton(container, count = 3) {
  const skeletons = Array(count).fill(0).map(() => `
        <div class="skeleton-card">
            <div class="skeleton skeleton-image"></div>
            <div class="skeleton skeleton-heading"></div>
            <div class="skeleton-paragraph">
                <div class="skeleton skeleton-text"></div>
                <div class="skeleton skeleton-text"></div>
                <div class="skeleton skeleton-text"></div>
            </div>
        </div>
    `).join('');

  container.innerHTML = skeletons;
}

/**
 * Add loading state to a button
 * @param {HTMLButtonElement} button - Button element
 */
export function setButtonLoading(button) {
  button.classList.add('is-loading');
  button.disabled = true;
  button.dataset.originalText = button.textContent;
}

/**
 * Remove loading state from a button
 * @param {HTMLButtonElement} button - Button element
 */
export function removeButtonLoading(button) {
  button.classList.remove('is-loading');
  button.disabled = false;
  if (button.dataset.originalText) {
    button.textContent = button.dataset.originalText;
    delete button.dataset.originalText;
  }
}

/**
 * Add loading state to a form
 * @param {HTMLFormElement} form - Form element
 */
export function setFormLoading(form) {
  form.classList.add('is-loading');

  // Disable all inputs
  const inputs = form.querySelectorAll('input, textarea, select, button');
  inputs.forEach(input => {
    input.disabled = true;
  });

  // Add loading state to submit button
  const submitBtn = form.querySelector('[type="submit"]');
  if (submitBtn) {
    setButtonLoading(submitBtn);
  }
}

/**
 * Remove loading state from a form
 * @param {HTMLFormElement} form - Form element
 */
export function removeFormLoading(form) {
  form.classList.remove('is-loading');

  // Enable all inputs
  const inputs = form.querySelectorAll('input, textarea, select, button');
  inputs.forEach(input => {
    input.disabled = false;
  });

  // Remove loading state from submit button
  const submitBtn = form.querySelector('[type="submit"]');
  if (submitBtn) {
    removeButtonLoading(submitBtn);
  }
}

/**
 * Show loading state with custom content
 * @param {HTMLElement} element - Element to show loading in
 * @param {string} content - Custom loading content HTML
 */
export function showCustomLoading(element, content) {
  element.innerHTML = `
        <div class="loading-container">
            ${content}
        </div>
    `;
}

/**
 * Utility to add is-loading class
 * @param {HTMLElement} element - Element to add loading class to
 */
export function addLoadingClass(element) {
  element.classList.add('is-loading');
}

/**
 * Utility to remove is-loading class
 * @param {HTMLElement} element - Element to remove loading class from
 */
export function removeLoadingClass(element) {
  element.classList.remove('is-loading');
}
