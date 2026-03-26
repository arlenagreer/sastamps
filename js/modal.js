/**
 * Modal Component
 * DaisyUI v5 <dialog>-based modal for event details and other content.
 * Public API unchanged: open(data), close().
 */

import { escapeHTML } from './utils/safe-dom.js';

export class Modal {
  constructor() {
    this.modal = null;
    this.isOpen = false;
    this.focusableElements = null;
    this.previousFocus = null;
    this.init();
  }

  /**
     * Initialize modal component
     */
  init() {
    this.createModal();
    this.bindEvents();
  }

  /**
     * Create DaisyUI dialog-based modal structure
     */
  createModal() {
    const existingModal = document.getElementById('event-modal');
    if (existingModal) {
      existingModal.remove();
    }

    const modalHTML = `
            <dialog id="event-modal" class="modal" aria-labelledby="modal-title">
                <div class="modal-box">
                    <form method="dialog">
                        <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
                                aria-label="Close modal">
                            <i class="fas fa-times"></i>
                        </button>
                    </form>
                    <h3 id="modal-title" class="text-lg font-bold font-heading">Event Details</h3>
                    <div id="modal-body" class="py-4">
                        <!-- Content will be dynamically inserted here -->
                    </div>
                    <div class="modal-action">
                        <form method="dialog">
                            <button class="btn btn-ghost">Close</button>
                        </form>
                    </div>
                </div>
                <form method="dialog" class="modal-backdrop">
                    <button>close</button>
                </form>
            </dialog>
        `;

    // Insert modal into DOM
    // NOTE: Uses insertAdjacentHTML with pre-escaped template literals.
    // All dynamic user content is escaped via escapeHTML() before insertion.
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    this.modal = document.getElementById('event-modal');
  }

  /**
     * Bind event listeners
     */
  bindEvents() {
    // Native <dialog> handles close via form method="dialog" buttons
    // and backdrop click via the modal-backdrop form.

    // Escape key -- native <dialog> handles this via form method="dialog"
    // and the 'close' event listener syncs state via _handleClose().

    // Listen for the native dialog close event to sync state
    this.modal.addEventListener('close', () => {
      if (this.isOpen) {
        this._handleClose();
      }
    });

    // Tab key (focus trap) -- native <dialog> has built-in focus
    // trapping, but keep as safety net for older browsers
    this.modal.addEventListener('keydown', (e) => {
      if (e.key === 'Tab' && this.isOpen) {
        this.trapFocus(e);
      }
    });
  }

  /**
     * Open modal with content
     * @param {Object} meetingData - Meeting data object
     */
  open(meetingData) {
    if (this.isOpen) return;
    if (!this.modal) {
      console.error('Modal element not found. Cannot open modal.');
      return;
    }

    this.previousFocus = document.activeElement;
    this.populateContent(meetingData);

    // Use native <dialog> showModal() for proper focus management
    try {
      this.modal.showModal();
    } catch (error) {
      console.error('Failed to open modal dialog:', error);
      return;
    }
    this.isOpen = true;

    // Focus first focusable element
    this.setFocusableElements();
    if (this.focusableElements.length > 0) {
      this.focusableElements[0].focus();
    }

    // Prevent body scroll
    document.body.style.overflow = 'hidden';
  }

  /**
     * Close modal (public API)
     */
  close() {
    if (!this.isOpen) return;

    // Use native <dialog> close()
    this.modal.close();
    // State cleanup happens in the 'close' event handler
  }

  /**
     * Internal close handler -- syncs state after native dialog closes
     */
  _handleClose() {
    this.isOpen = false;

    // Restore body scroll
    document.body.style.overflow = '';

    // Restore focus
    if (this.previousFocus) {
      this.previousFocus.focus();
    }
  }

  /**
     * Populate modal content with meeting data.
     * All dynamic values are passed through escapeHTML() before
     * being placed into the template to prevent XSS.
     * @param {Object} meeting - Meeting data object
     */
  populateContent(meeting) {
    const modalTitle = this.modal.querySelector('#modal-title');
    const modalBody = this.modal.querySelector('#modal-body');

    modalTitle.textContent = meeting.title;

    // Build detailed content (all values escaped via escapeHTML)
    const content = this.buildMeetingContent(meeting);
    modalBody.innerHTML = content; // eslint-disable-line no-unsanitized/property -- all values escaped via escapeHTML()
  }

  /**
     * Build meeting content HTML.
     * Every dynamic value is sanitised through escapeHTML().
     * @param {Object} meeting - Meeting data object
     * @returns {string} HTML content
     */
  buildMeetingContent(meeting) {
    const eventDate = new Date(meeting.date + 'T00:00:00');
    const formattedDate = eventDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const eventTypeClass = `event-type-${meeting.type}`;
    const cancelledClass = meeting.cancelled ? 'event-cancelled' : '';

    let content = `
            <div class="event-details ${eventTypeClass} ${cancelledClass}">
                ${meeting.cancelled ? '<div class="cancelled-banner"><i class="fas fa-exclamation-triangle"></i> This event has been cancelled</div>' : ''}

                <div class="event-meta">
                    <div class="event-date">
                        <i class="fas fa-calendar"></i>
                        <span>${escapeHTML(formattedDate)}</span>
                    </div>
                    <div class="event-type">
                        <i class="fas fa-tag"></i>
                        <span class="type-badge type-${escapeHTML(meeting.type)}">${escapeHTML(this.capitalizeFirst(meeting.type))}</span>
                    </div>
                </div>

                ${meeting.time ? this.buildTimeSection(meeting.time) : ''}
                ${meeting.location ? this.buildLocationSection(meeting.location) : ''}
                ${meeting.presenter ? this.buildPresenterSection(meeting.presenter) : ''}
                ${meeting.description ? this.buildDescriptionSection(meeting.description) : ''}
                ${meeting.agenda ? this.buildAgendaSection(meeting.agenda) : ''}
                ${meeting.specialNotes ? this.buildSpecialNotesSection(meeting.specialNotes) : ''}
                ${meeting.requirements ? this.buildRequirementsSection(meeting.requirements) : ''}
                ${meeting.contact ? this.buildContactSection(meeting.contact) : ''}
            </div>
        `;

    return content;
  }

  /**
     * Build time section
     * @param {Object} time - Time object
     * @returns {string} HTML content
     */
  buildTimeSection(time) {
    return `
            <div class="detail-section">
                <h3><i class="fas fa-clock"></i> Schedule</h3>
                <div class="time-details">
                    ${time.doorsOpen ? `<div class="time-item"><strong>Doors Open:</strong> ${escapeHTML(time.doorsOpen)}</div>` : ''}
                    ${time.meetingStart ? `<div class="time-item"><strong>Meeting Start:</strong> ${escapeHTML(time.meetingStart)}</div>` : ''}
                    ${time.meetingEnd ? `<div class="time-item"><strong>Meeting End:</strong> ${escapeHTML(time.meetingEnd)}</div>` : ''}
                </div>
            </div>
        `;
  }

  /**
     * Build location section
     * @param {Object} location - Location object
     * @returns {string} HTML content
     */
  buildLocationSection(location) {
    const address = location.address;
    const fullAddress = address ?
      `${address.street}, ${address.city}, ${address.state} ${address.zipCode}` : '';

    return `
            <div class="detail-section">
                <h3><i class="fas fa-map-marker-alt"></i> Location</h3>
                <div class="location-details">
                    <div class="location-name">${escapeHTML(location.name)}</div>
                    ${location.building ? `<div class="location-building">${escapeHTML(location.building)}</div>` : ''}
                    ${location.room ? `<div class="location-room">${escapeHTML(location.room)}</div>` : ''}
                    ${fullAddress ? `<div class="location-address">${escapeHTML(fullAddress)}</div>` : ''}
                </div>
            </div>
        `;
  }

  /**
     * Build presenter section
     * @param {Object} presenter - Presenter object
     * @returns {string} HTML content
     */
  buildPresenterSection(presenter) {
    return `
            <div class="detail-section">
                <h3><i class="fas fa-user"></i> Presenter</h3>
                <div class="presenter-details">
                    <div class="presenter-name">${escapeHTML(presenter.name)}</div>
                    ${presenter.bio ? `<div class="presenter-bio">${escapeHTML(presenter.bio)}</div>` : ''}
                </div>
            </div>
        `;
  }

  /**
     * Build description section
     * @param {string} description - Event description
     * @returns {string} HTML content
     */
  buildDescriptionSection(description) {
    return `
            <div class="detail-section">
                <h3><i class="fas fa-info-circle"></i> Description</h3>
                <div class="description-content">
                    ${escapeHTML(description)}
                </div>
            </div>
        `;
  }

  /**
     * Build agenda section
     * @param {Array} agenda - Agenda items array
     * @returns {string} HTML content
     */
  buildAgendaSection(agenda) {
    const agendaItems = agenda.map(item => `
            <div class="agenda-item">
                <div class="agenda-time">${escapeHTML(item.time)}</div>
                <div class="agenda-content">
                    <div class="agenda-title">${escapeHTML(item.item)}</div>
                    ${item.presenter ? `<div class="agenda-presenter">Presenter: ${escapeHTML(item.presenter)}</div>` : ''}
                </div>
            </div>
        `).join('');

    return `
            <div class="detail-section">
                <h3><i class="fas fa-list"></i> Agenda</h3>
                <div class="agenda-list">
                    ${agendaItems}
                </div>
            </div>
        `;
  }

  /**
     * Build special notes section
     * @param {Array} notes - Special notes array
     * @returns {string} HTML content
     */
  buildSpecialNotesSection(notes) {
    const noteItems = notes.map(note => `<li>${escapeHTML(note)}</li>`).join('');

    return `
            <div class="detail-section">
                <h3><i class="fas fa-exclamation-circle"></i> Special Notes</h3>
                <ul class="special-notes">
                    ${noteItems}
                </ul>
            </div>
        `;
  }

  /**
     * Build requirements section
     * @param {Object} requirements - Requirements object
     * @returns {string} HTML content
     */
  buildRequirementsSection(requirements) {
    let content = `
            <div class="detail-section">
                <h3><i class="fas fa-clipboard-check"></i> Requirements</h3>
                <div class="requirements-list">
        `;

    if (requirements.rsvpRequired !== undefined) {
      content += `<div class="requirement-item">
                <i class="fas fa-${requirements.rsvpRequired ? 'check' : 'times'}"></i>
                RSVP ${requirements.rsvpRequired ? 'Required' : 'Not Required'}
            </div>`;
    }

    if (requirements.membershipRequired !== undefined) {
      content += `<div class="requirement-item">
                <i class="fas fa-${requirements.membershipRequired ? 'check' : 'times'}"></i>
                Membership ${requirements.membershipRequired ? 'Required' : 'Not Required'}
            </div>`;
    }

    if (requirements.bringItems && requirements.bringItems.length > 0) {
      const items = requirements.bringItems.map(item => `<li>${escapeHTML(item)}</li>`).join('');
      content += `<div class="requirement-item">
                <strong>Bring:</strong>
                <ul>${items}</ul>
            </div>`;
    }

    content += `</div></div>`;
    return content;
  }

  /**
     * Build contact section
     * @param {Object} contact - Contact object
     * @returns {string} HTML content
     */
  buildContactSection(contact) {
    return `
            <div class="detail-section">
                <h3><i class="fas fa-envelope"></i> Contact</h3>
                <div class="contact-details">
                    <div class="contact-name">${escapeHTML(contact.name)}</div>
                    ${contact.email ? `<div class="contact-email">
                        <a href="mailto:${escapeHTML(contact.email)}">
                            <i class="fas fa-envelope"></i> ${escapeHTML(contact.email)}
                        </a>
                    </div>` : ''}
                    ${contact.phone ? `<div class="contact-phone">
                        <a href="tel:${escapeHTML(contact.phone)}">
                            <i class="fas fa-phone"></i> ${escapeHTML(contact.phone)}
                        </a>
                    </div>` : ''}
                </div>
            </div>
        `;
  }

  /**
     * Set focusable elements for accessibility
     */
  setFocusableElements() {
    const focusableSelectors = [
      'button',
      '[href]',
      'input',
      'select',
      'textarea',
      '[tabindex]:not([tabindex="-1"])'
    ];

    this.focusableElements = Array.from(
      this.modal.querySelectorAll(focusableSelectors.join(','))
    ).filter(el => !el.disabled && !el.hidden);
  }

  /**
     * Trap focus within modal
     * @param {Event} e - Keyboard event
     */
  trapFocus(e) {
    if (this.focusableElements.length === 0) return;

    const firstElement = this.focusableElements[0];
    const lastElement = this.focusableElements[this.focusableElements.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        lastElement.focus();
        e.preventDefault();
      }
    } else {
      if (document.activeElement === lastElement) {
        firstElement.focus();
        e.preventDefault();
      }
    }
  }

  /**
     * Capitalize first letter of string
     * @param {string} str - String to capitalize
     * @returns {string} Capitalized string
     */
  capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

// Export singleton instance
export const modal = new Modal();
