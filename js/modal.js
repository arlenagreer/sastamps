/**
 * Modal Component
 * Handles modal dialogs for event details and other content
 */

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
     * Create modal HTML structure
     */
    createModal() {
        // Remove existing modal if it exists
        const existingModal = document.getElementById('event-modal');
        if (existingModal) {
            existingModal.remove();
        }

        // Create modal structure
        const modalHTML = `
            <div id="event-modal" class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-title" aria-hidden="true">
                <div class="modal-container">
                    <div class="modal-header">
                        <h2 id="modal-title" class="modal-title">Event Details</h2>
                        <button type="button" class="modal-close" aria-label="Close modal">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-content">
                        <div id="modal-body" class="modal-body">
                            <!-- Content will be dynamically inserted here -->
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary modal-close-btn">Close</button>
                    </div>
                </div>
            </div>
        `;

        // Insert modal into DOM
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.modal = document.getElementById('event-modal');
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Close button clicks
        const closeButtons = this.modal.querySelectorAll('.modal-close, .modal-close-btn');
        closeButtons.forEach(button => {
            button.addEventListener('click', () => this.close());
        });

        // Overlay click
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.close();
            }
        });

        // Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });

        // Tab key (focus trap)
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

        this.previousFocus = document.activeElement;
        this.populateContent(meetingData);
        
        this.modal.style.display = 'flex';
        this.modal.setAttribute('aria-hidden', 'false');
        
        // Small delay for smooth animation
        setTimeout(() => {
            this.modal.classList.add('modal-open');
            this.isOpen = true;
            
            // Focus first focusable element
            this.setFocusableElements();
            if (this.focusableElements.length > 0) {
                this.focusableElements[0].focus();
            }
        }, 10);

        // Prevent body scroll
        document.body.style.overflow = 'hidden';
    }

    /**
     * Close modal
     */
    close() {
        if (!this.isOpen) return;

        this.modal.classList.remove('modal-open');
        this.modal.setAttribute('aria-hidden', 'true');
        
        setTimeout(() => {
            this.modal.style.display = 'none';
            this.isOpen = false;
        }, 300);

        // Restore body scroll
        document.body.style.overflow = '';
        
        // Restore focus
        if (this.previousFocus) {
            this.previousFocus.focus();
        }
    }

    /**
     * Populate modal content with meeting data
     * @param {Object} meeting - Meeting data object
     */
    populateContent(meeting) {
        const modalTitle = this.modal.querySelector('#modal-title');
        const modalBody = this.modal.querySelector('#modal-body');

        modalTitle.textContent = meeting.title;

        // Build detailed content
        const content = this.buildMeetingContent(meeting);
        modalBody.innerHTML = content;
    }

    /**
     * Build meeting content HTML
     * @param {Object} meeting - Meeting data object
     * @returns {string} HTML content
     */
    buildMeetingContent(meeting) {
        const eventDate = new Date(meeting.date);
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
                        <span>${formattedDate}</span>
                    </div>
                    <div class="event-type">
                        <i class="fas fa-tag"></i>
                        <span class="type-badge type-${meeting.type}">${this.capitalizeFirst(meeting.type)}</span>
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
                    ${time.doorsOpen ? `<div class="time-item"><strong>Doors Open:</strong> ${time.doorsOpen}</div>` : ''}
                    ${time.meetingStart ? `<div class="time-item"><strong>Meeting Start:</strong> ${time.meetingStart}</div>` : ''}
                    ${time.meetingEnd ? `<div class="time-item"><strong>Meeting End:</strong> ${time.meetingEnd}</div>` : ''}
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
                    <div class="location-name">${location.name}</div>
                    ${location.building ? `<div class="location-building">${location.building}</div>` : ''}
                    ${location.room ? `<div class="location-room">${location.room}</div>` : ''}
                    ${fullAddress ? `<div class="location-address">${fullAddress}</div>` : ''}
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
                    <div class="presenter-name">${presenter.name}</div>
                    ${presenter.bio ? `<div class="presenter-bio">${presenter.bio}</div>` : ''}
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
                    ${description}
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
                <div class="agenda-time">${item.time}</div>
                <div class="agenda-content">
                    <div class="agenda-title">${item.item}</div>
                    ${item.presenter ? `<div class="agenda-presenter">Presenter: ${item.presenter}</div>` : ''}
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
        const noteItems = notes.map(note => `<li>${note}</li>`).join('');
        
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
            const items = requirements.bringItems.map(item => `<li>${item}</li>`).join('');
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
                    <div class="contact-name">${contact.name}</div>
                    ${contact.email ? `<div class="contact-email">
                        <a href="mailto:${contact.email}">
                            <i class="fas fa-envelope"></i> ${contact.email}
                        </a>
                    </div>` : ''}
                    ${contact.phone ? `<div class="contact-phone">
                        <a href="tel:${contact.phone}">
                            <i class="fas fa-phone"></i> ${contact.phone}
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