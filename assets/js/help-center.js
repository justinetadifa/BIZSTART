/**
 * LOCUS-SF Help Center & FAQs Controller
 * Manages modal visibility, tabs, accordions, criterion deep-linking,
 * keyboard accessibility, and focus restoration.
 */

(function () {
  'use strict';

  let lastFocusedElement = null;

  function getDialog() {
    return document.getElementById('locusHelpDialog');
  }

  function setAccordionState(item, expand) {
    if (!item) return;
    const header = item.querySelector('.locus-accordion-header');
    const body = item.querySelector('.locus-accordion-body');
    const icon = item.querySelector('.locus-accordion-toggle-icon');

    if (expand) {
      item.classList.add('is-expanded');
      if (header) header.setAttribute('aria-expanded', 'true');
      if (body) body.hidden = false;
      if (icon) {
        icon.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>';
      }
    } else {
      item.classList.remove('is-expanded');
      if (header) header.setAttribute('aria-expanded', 'false');
      if (body) body.hidden = true;
      if (icon) {
        icon.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>';
      }
    }
  }

  function toggleAccordion(item) {
    const isExpanded = item.classList.contains('is-expanded');
    setAccordionState(item, !isExpanded);
  }

  function showTab(tabName) {
    const dialog = getDialog();
    if (!dialog) return;

    // Update tab buttons
    const tabButtons = dialog.querySelectorAll('.locus-help-tab-btn');
    tabButtons.forEach(btn => {
      const match = btn.getAttribute('data-locus-tab') === tabName;
      btn.setAttribute('aria-selected', match ? 'true' : 'false');
      btn.classList.toggle('is-active', match);
    });

    // Update tab panels
    const panels = dialog.querySelectorAll('.locus-help-tab-panel');
    panels.forEach(panel => {
      const match = panel.getAttribute('data-locus-panel') === tabName;
      panel.hidden = !match;
    });
  }

  function showScoresView(subview) {
    const commonView = document.getElementById('locusHelpCommonQuestions');
    const criteriaView = document.getElementById('locusHelpSevenCriteria');
    if (!commonView || !criteriaView) return;

    if (subview === 'criteria') {
      commonView.hidden = true;
      criteriaView.hidden = false;
    } else {
      commonView.hidden = false;
      criteriaView.hidden = true;
    }
  }

  window.openLocusHelp = function (tab = 'scores', targetId = null) {
    const dialog = getDialog();
    if (!dialog) return;

    lastFocusedElement = document.activeElement;

    if (tab === 'criteria') {
      showTab('scores');
      showScoresView('criteria');

      if (targetId) {
        // Expand the requested criterion accordion
        const targetItem = dialog.querySelector(`[data-criterion-key="${targetId}"]`);
        if (targetItem) {
          // Collapse all criteria first, then expand target
          dialog.querySelectorAll('#locusHelpSevenCriteria .locus-accordion-item').forEach(el => setAccordionState(el, false));
          setAccordionState(targetItem, true);
          targetItem.classList.add('is-active-criterion');
          setTimeout(() => {
            targetItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }, 60);
        }
      }
    } else if (tab === 'using') {
      showTab('using');
    } else if (tab === 'sounds' || tab === 'sound') {
      showTab('sounds');
    } else if (tab === 'team') {
      showTab('team');
    } else {
      showTab('scores');
      showScoresView('common');
      if (targetId) {
        const targetFaq = dialog.querySelector(`[data-faq-id="${targetId}"]`);
        if (targetFaq) {
          setAccordionState(targetFaq, true);
          setTimeout(() => {
            targetFaq.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }, 60);
        }
      }
    }

    if (typeof dialog.showModal === 'function') {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      dialog.setAttribute('open', '');
    }

    // Set focus to the close button or first tab
    const closeBtn = document.getElementById('locusHelpCloseBtn');
    if (closeBtn) {
      closeBtn.focus();
    }
  };

  window.closeLocusHelp = function () {
    const dialog = getDialog();
    if (!dialog) return;

    if (typeof dialog.close === 'function') {
      if (dialog.open) dialog.close();
    } else {
      dialog.removeAttribute('open');
    }

    // Restore focus
    if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
      try {
        lastFocusedElement.focus();
      } catch (e) {
        // Ignored
      }
    }
    lastFocusedElement = null;
  };

  function initHelpCenter() {
    const dialog = getDialog();
    if (!dialog) return;

    // Close button
    const closeBtn = document.getElementById('locusHelpCloseBtn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => window.closeLocusHelp());
    }

    // Click outside to close (backdrop click on native dialog)
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) {
        window.closeLocusHelp();
      }
    });

    // Escape key
    dialog.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        window.closeLocusHelp();
      }
    });

    // Tab buttons
    dialog.querySelectorAll('.locus-help-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-locus-tab');
        if (tab === 'scores') {
          showTab('scores');
          showScoresView('common');
        } else {
          showTab(tab);
        }
      });
    });

    // Accordion headers
    dialog.querySelectorAll('.locus-accordion-header').forEach(header => {
      header.addEventListener('click', () => {
        const item = header.closest('.locus-accordion-item');
        if (item) toggleAccordion(item);
      });
    });

    // Subview navigation links
    dialog.querySelectorAll('.locus-to-criteria-view').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        showTab('scores');
        showScoresView('criteria');
      });
    });

    dialog.querySelectorAll('.locus-to-common-view').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        showTab('scores');
        showScoresView('common');
      });
    });

    dialog.querySelectorAll('.locus-to-team-tab').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        showTab('team');
      });
    });

    dialog.querySelectorAll('.locus-to-scores-tab').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        showTab('scores');
        showScoresView('common');
      });
    });

    dialog.querySelectorAll('[data-open-sound-tab]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        showTab('sounds');
      });
    });

    // View this property's evidence link
    dialog.querySelectorAll('.locus-view-property-evidence').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        window.closeLocusHelp();
        const assessmentSection = document.getElementById('propertyAssessmentSection');
        if (assessmentSection) {
          // Find and expand the evidence disclosure
          const evidenceDetail = assessmentSection.querySelector('details[data-disclosure-evidence]') ||
            assessmentSection.querySelectorAll('details.property-disclosure')[1];
          if (evidenceDetail) evidenceDetail.open = true;
          assessmentSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });

    // Listen to global clicks for data-locus-help-trigger and data-help-criterion
    document.addEventListener('click', (event) => {
      const trigger = event.target.closest('[data-locus-help-trigger]');
      if (trigger) {
        event.preventDefault();
        const tab = trigger.getAttribute('data-locus-help-tab') || 'scores';
        const target = trigger.getAttribute('data-locus-help-target') || null;
        window.openLocusHelp(tab, target);
        return;
      }

      const criterionBtn = event.target.closest('[data-help-criterion]');
      if (criterionBtn) {
        event.preventDefault();
        const criterionKey = criterionBtn.getAttribute('data-help-criterion');
        window.openLocusHelp('criteria', criterionKey);
        return;
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHelpCenter);
  } else {
    initHelpCenter();
  }
})();
