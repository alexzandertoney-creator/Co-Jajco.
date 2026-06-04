// Keeps any `#languageSelect` inputs in sync across open pages/tabs using localStorage
(function () {
  function init() {
    const sel = document.getElementById('languageSelect');
    if (!sel) return;

    // Initialize from localStorage if present
    try {
      const stored = localStorage.getItem('learningLang');
      if (stored) sel.value = stored;
    } catch (e) {
      // ignore
    }

    sel.addEventListener('change', () => {
      try {
        localStorage.setItem('learningLang', sel.value);
      } catch (e) {}
      // Notify same-window listeners
      window.dispatchEvent(new CustomEvent('languageChanged', { detail: sel.value }));
    });

    // Listen for storage events from other tabs/windows
    window.addEventListener('storage', (e) => {
      if (e.key === 'learningLang') {
        if (sel.value !== e.newValue) sel.value = e.newValue;
      }
    });

    // Mirror custom same-window events
    window.addEventListener('languageChanged', (e) => {
      if (sel.value !== e.detail) sel.value = e.detail;
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
