/**
 * Dropdown Accessibility
 * Toggles aria-expanded on DaisyUI dropdown triggers when focus enters/leaves.
 * Self-executing — import as a side-effect module.
 */

(function initDropdownA11y() {
  document.querySelectorAll('.dropdown').forEach(dropdown => {
    const trigger = dropdown.querySelector('[aria-expanded]');
    if (!trigger) {
      return;
    }

    dropdown.addEventListener('focusin', () => {
      trigger.setAttribute('aria-expanded', 'true');
    });

    dropdown.addEventListener('focusout', (e) => {
      // Only close if focus leaves the dropdown entirely
      if (!dropdown.contains(e.relatedTarget)) {
        trigger.setAttribute('aria-expanded', 'false');
      }
    });
  });
})();
