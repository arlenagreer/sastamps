/**
 * Template Engine Module
 * Lightweight template engine for rendering JSON data into HTML components
 */

import { escapeHTML } from '../utils/safe-dom.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('TemplateEngine');

class TemplateEngine {
  constructor() {
    this.templates = new Map();
    this.helpers = new Map();
    this.components = new Map();

    // Register default helpers
    this.registerDefaultHelpers();
  }

  /**
     * Register a template
     * @param {string} name - Template name
     * @param {string} template - Template string
     */
  registerTemplate(name, template) {
    this.templates.set(name, template);
  }

  /**
     * Register a helper function
     * @param {string} name - Helper name
     * @param {Function} fn - Helper function
     */
  registerHelper(name, fn) {
    this.helpers.set(name, fn);
  }

  /**
     * Register a component
     * @param {string} name - Component name
     * @param {Function} render - Component render function
     */
  registerComponent(name, render) {
    this.components.set(name, render);
  }

  /**
     * Render a template with data
     * @param {string} template - Template string or registered template name
     * @param {Object} data - Data to render
     * @param {Object} options - Rendering options
     * @returns {string} Rendered HTML
     */
  render(template, data = {}, options = {}) {
    let templateStr = template;

    // Check if it's a registered template
    if (this.templates.has(template)) {
      templateStr = this.templates.get(template);
    }

    // Create context with data and helpers
    const context = {
      ...data,
      $helpers: this.helpers,
      $components: this.components,
      $options: options
    };

    // Process template
    return this.processTemplate(templateStr, context);
  }

  /**
     * Process template string with context
     * @param {string} template - Template string
     * @param {Object} context - Rendering context
     * @returns {string} Processed template
     */
  processTemplate(template, context) {
    // Handle conditionals {{#if condition}}...{{/if}}
    template = this.processConditionals(template, context);

    // Handle loops {{#each array}}...{{/each}}
    template = this.processLoops(template, context);

    // Handle variables and helpers {{variable}} or {{helper arg1 arg2}}
    template = this.processVariables(template, context);

    // Handle components {{component:name arg1=value1}}
    template = this.processComponents(template, context);

    return template;
  }

  /**
     * Process conditional blocks
     * @param {string} template - Template string
     * @param {Object} context - Rendering context
     * @returns {string} Processed template
     */
  processConditionals(template, context) {
    const conditionalRegex = /\{\{#if\s+([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g;

    return template.replace(conditionalRegex, (match, condition, content) => {
      const conditionResult = this.evaluateCondition(condition.trim(), context);
      return conditionResult ? this.processTemplate(content, context) : '';
    });
  }

  /**
     * Process loop blocks
     * @param {string} template - Template string
     * @param {Object} context - Rendering context
     * @returns {string} Processed template
     */
  processLoops(template, context) {
    const loopRegex = /\{\{#each\s+([^}]+)\}\}([\s\S]*?)\{\{\/each\}\}/g;

    return template.replace(loopRegex, (match, arrayPath, content) => {
      const array = this.getNestedValue(arrayPath.trim(), context);

      if (!Array.isArray(array)) {
        return '';
      }

      return array.map((item, index) => {
        const itemContext = {
          ...context,
          this: item,
          '@index': index,
          '@first': index === 0,
          '@last': index === array.length - 1,
          '@odd': index % 2 === 1,
          '@even': index % 2 === 0
        };
        return this.processTemplate(content, itemContext);
      }).join('');
    });
  }

  /**
     * Process variables and helper calls
     * @param {string} template - Template string
     * @param {Object} context - Rendering context
     * @returns {string} Processed template
     */
  processVariables(template, context) {
    const variableRegex = /\{\{([^}]+)\}\}/g;

    return template.replace(variableRegex, (match, expression) => {
      const trimmed = expression.trim();

      // Check if it's a helper call (contains spaces)
      if (trimmed.includes(' ')) {
        return this.processHelper(trimmed, context);
      }

      // It's a variable
      const value = this.getNestedValue(trimmed, context);
      return escapeHTML(String(value ?? ''));
    });
  }

  /**
     * Process components
     * @param {string} template - Template string
     * @param {Object} context - Rendering context
     * @returns {string} Processed template
     */
  processComponents(template, context) {
    const componentRegex = /\{\{component:(\w+)([^}]*)\}\}/g;

    return template.replace(componentRegex, (match, componentName, argsStr) => {
      if (!this.components.has(componentName)) {
        logger.warn(`Component not found: ${componentName}`);
        return '';
      }

      const component = this.components.get(componentName);
      const args = this.parseComponentArgs(argsStr, context);

      try {
        return component(args, context);
      } catch (error) {
        logger.error(`Error rendering component ${componentName}:`, error);
        return '';
      }
    });
  }

  /**
     * Process helper function calls
     * @param {string} expression - Helper expression
     * @param {Object} context - Rendering context
     * @returns {string} Helper result
     */
  processHelper(expression, context) {
    const parts = expression.split(/\s+/);
    const helperName = parts[0];
    const args = parts.slice(1);

    if (!this.helpers.has(helperName)) {
      logger.warn(`Helper not found: ${helperName}`);
      return '';
    }

    const helper = this.helpers.get(helperName);
    const resolvedArgs = args.map(arg => {
      // Handle string literals
      if ((arg.startsWith('"') && arg.endsWith('"')) ||
                (arg.startsWith('\'') && arg.endsWith('\''))) {
        return arg.slice(1, -1);
      }

      // Handle numbers
      if (!isNaN(arg)) {
        return parseFloat(arg);
      }

      // Handle booleans
      if (arg === 'true') {return true;}
      if (arg === 'false') {return false;}

      // Handle variables
      return this.getNestedValue(arg, context);
    });

    try {
      const result = helper(...resolvedArgs, context);
      return escapeHTML(String(result ?? ''));
    } catch (error) {
      logger.error(`Error executing helper ${helperName}:`, error);
      return '';
    }
  }

  /**
     * Parse component arguments
     * @param {string} argsStr - Arguments string
     * @param {Object} context - Rendering context
     * @returns {Object} Parsed arguments
     */
  parseComponentArgs(argsStr, context) {
    const args = {};
    const argRegex = /(\w+)=([^=\s]+)/g;
    let match;

    while ((match = argRegex.exec(argsStr)) !== null) {
      const [, key, value] = match;

      // Handle different value types
      if ((value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith('\'') && value.endsWith('\''))) {
        args[key] = value.slice(1, -1);
      } else if (!isNaN(value)) {
        args[key] = parseFloat(value);
      } else if (value === 'true') {
        args[key] = true;
      } else if (value === 'false') {
        args[key] = false;
      } else {
        args[key] = this.getNestedValue(value, context);
      }
    }

    return args;
  }

  /**
     * Evaluate conditional expression
     * @param {string} condition - Condition to evaluate
     * @param {Object} context - Rendering context
     * @returns {boolean} Condition result
     */
  evaluateCondition(condition, context) {
    // Simple conditions for now
    const value = this.getNestedValue(condition, context);

    // Truthy check
    if (Array.isArray(value)) {return value.length > 0;}
    if (typeof value === 'string') {return value.length > 0;}
    if (typeof value === 'number') {return value !== 0;}

    return Boolean(value);
  }

  /**
     * Get nested object value by path
     * @param {string} path - Object path (e.g., 'user.name')
     * @param {Object} context - Context object
     * @returns {any} Value at path
     */
  getNestedValue(path, context) {
    const parts = path.split('.');
    let current = context;

    for (const part of parts) {
      if (current === null || current === undefined) {return undefined;}
      current = current[part];
    }

    return current;
  }

  // escapeHTML is now imported from '../utils/safe-dom.js'

  /**
     * Register default helper functions
     */
  registerDefaultHelpers() {
    // Format date helper
    this.registerHelper('formatDate', (date, format = 'long') => {
      if (!date) {return '';}

      const d = new Date(date);
      if (isNaN(d.getTime())) {return date;}

      const options = {
        short: { month: 'short', day: 'numeric', year: 'numeric' },
        long: {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        },
        time: {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        }
      };

      return d.toLocaleDateString('en-US', options[format] || options.long);
    });

    // Truncate text helper
    this.registerHelper('truncate', (text, length = 100, suffix = '...') => {
      if (!text || text.length <= length) {return text;}
      return text.substring(0, length) + suffix;
    });

    // Join array helper
    this.registerHelper('join', (array, separator = ', ') => {
      if (!Array.isArray(array)) {return '';}
      return array.join(separator);
    });

    // Uppercase helper
    this.registerHelper('upper', (text) => {
      return String(text).toUpperCase();
    });

    // Lowercase helper
    this.registerHelper('lower', (text) => {
      return String(text).toLowerCase();
    });

    // Capitalize helper
    this.registerHelper('capitalize', (text) => {
      return String(text).charAt(0).toUpperCase() + String(text).slice(1);
    });

    // Default value helper
    this.registerHelper('default', (value, defaultValue = '') => {
      return value !== null && value !== undefined && value !== '' ? value : defaultValue;
    });

    // Math helpers
    this.registerHelper('add', (a, b) => Number(a) + Number(b));
    this.registerHelper('subtract', (a, b) => Number(a) - Number(b));
    this.registerHelper('multiply', (a, b) => Number(a) * Number(b));
    this.registerHelper('divide', (a, b) => Number(a) / Number(b));

    // Comparison helpers
    this.registerHelper('eq', (a, b) => a === b);
    this.registerHelper('ne', (a, b) => a !== b);
    this.registerHelper('gt', (a, b) => Number(a) > Number(b));
    this.registerHelper('lt', (a, b) => Number(a) < Number(b));
    this.registerHelper('gte', (a, b) => Number(a) >= Number(b));
    this.registerHelper('lte', (a, b) => Number(a) <= Number(b));
  }

  /**
     * Register common SAPA-specific components
     */
  registerSapaComponents() {
    // Newsletter card component
    this.registerComponent('newsletterCard', (args, _context) => {
      const { newsletter } = args;
      if (!newsletter) {return '';}

      return `
                <div class="newsletter-card">
                    <div class="card-header">
                        <h3>${escapeHTML(newsletter.title)}</h3>
                        <p class="quarter">${escapeHTML(newsletter.quarter)} Quarter ${newsletter.year}</p>
                    </div>
                    <div class="card-content">
                        <p class="publish-date">Published: ${this.helpers.get('formatDate')(newsletter.publishDate, 'short')}</p>
                        <p class="description">${escapeHTML(newsletter.description)}</p>
                        ${newsletter.highlights ? `
                            <ul class="highlights">
                                ${newsletter.highlights.map(h => `<li>${escapeHTML(h)}</li>`).join('')}
                            </ul>
                        ` : ''}
                        <a href="${newsletter.filePath}" class="btn btn-primary" target="_blank">
                            <i class="fas fa-file-pdf"></i> Download PDF
                        </a>
                    </div>
                </div>
            `;
    });

    // Meeting card component
    this.registerComponent('meetingCard', (args, _context) => {
      const { meeting } = args;
      if (!meeting) {return '';}

      return `
                <div class="meeting-card">
                    <div class="card-header">
                        <h3>${escapeHTML(meeting.title || meeting.topic || 'SAPA Meeting')}</h3>
                        <p class="date">${this.helpers.get('formatDate')(meeting.date)}</p>
                    </div>
                    <div class="card-content">
                        <p class="time">
                            <i class="fas fa-clock"></i>
                            Doors open: ${meeting.time.doorsOpen}
                            ${meeting.time.meetingStart ? ` | Meeting: ${meeting.time.meetingStart}` : ''}
                        </p>
                        <p class="location">
                            <i class="fas fa-map-marker-alt"></i>
                            ${escapeHTML(meeting.location.name)}
                            ${meeting.location.building ? `, ${escapeHTML(meeting.location.building)}` : ''}
                        </p>
                        ${meeting.presenter ? `
                            <p class="presenter">
                                <i class="fas fa-user"></i>
                                Presenter: ${escapeHTML(meeting.presenter.name)}
                                ${meeting.presenter.title ? ` (${escapeHTML(meeting.presenter.title)})` : ''}
                            </p>
                        ` : ''}
                        ${meeting.description ? `
                            <p class="description">${escapeHTML(meeting.description)}</p>
                        ` : ''}
                        ${meeting.specialNotes && meeting.specialNotes.length > 0 ? `
                            <div class="special-notes">
                                <strong>Special Notes:</strong>
                                <ul>
                                    ${meeting.specialNotes.map(note => `<li>${escapeHTML(note)}</li>`).join('')}
                                </ul>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
    });

    // Resource card component
    this.registerComponent('resourceCard', (args, _context) => {
      const { resource } = args;
      if (!resource) {return '';}

      return `
                <div class="resource-card">
                    <div class="card-header">
                        <h3>${escapeHTML(resource.title)}</h3>
                        <div class="meta">
                            <span class="difficulty ${resource.difficulty}">${this.helpers.get('capitalize')(resource.difficulty)}</span>
                            <span class="category">${this.helpers.get('capitalize')(resource.category.replace('-', ' '))}</span>
                            ${resource.estimatedReadTime ? `<span class="read-time">${resource.estimatedReadTime} min read</span>` : ''}
                        </div>
                    </div>
                    <div class="card-content">
                        <p class="summary">${escapeHTML(resource.summary)}</p>
                        ${resource.tags && resource.tags.length > 0 ? `
                            <div class="tags">
                                ${resource.tags.map(tag => `<span class="tag">${escapeHTML(tag)}</span>`).join('')}
                            </div>
                        ` : ''}
                        <a href="/resources/${resource.slug}" class="btn btn-primary">Read More</a>
                    </div>
                </div>
            `;
    });

    // Glossary term component
    this.registerComponent('glossaryTerm', (args, _context) => {
      const { term } = args;
      if (!term) {return '';}

      return `
                <div class="glossary-term">
                    <h3 class="term-name">${escapeHTML(term.term)}</h3>
                    ${term.alternateNames && term.alternateNames.length > 0 ? `
                        <p class="alternate-names">
                            Also known as: ${term.alternateNames.map(name => escapeHTML(name)).join(', ')}
                        </p>
                    ` : ''}
                    <p class="definition">${escapeHTML(term.definition)}</p>
                    ${term.detailedDescription ? `
                        <p class="detailed-description">${escapeHTML(term.detailedDescription)}</p>
                    ` : ''}
                    <div class="term-meta">
                        <span class="category">${this.helpers.get('capitalize')(term.category.replace('-', ' '))}</span>
                        <span class="difficulty ${term.difficulty}">${this.helpers.get('capitalize')(term.difficulty)}</span>
                    </div>
                </div>
            `;
    });
  }
}

// Create singleton instance
const templateEngine = new TemplateEngine();

// Register SAPA-specific components
templateEngine.registerSapaComponents();

// Export for module usage
export default templateEngine;

// Also attach to window for global access
if (typeof window !== 'undefined') {
  window.templateEngine = templateEngine;
}
