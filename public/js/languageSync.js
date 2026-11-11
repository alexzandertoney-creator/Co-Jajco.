// The "Learning" picker on every page. The server is the source of truth:
// show the account's language, save changes to the server, then reload so every
// part of the page (decks, prompts, voices) uses the new language. Other open
// tabs reload too.
(function () {
  const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

  async function init() {
    const sel = document.getElementById('languageSelect');
    if (!sel || !localStorage.getItem('token')) return;

    try {
      const res = await fetch('/api/auth/me', { headers: authHeader() });
      if (res.ok) {
        const user = await res.json();
        // Only languages the app has content for, given the language you speak
        // (kept in sync with LANGUAGE_PAIRS in js/constants.js).
        const pairs = { en: ['pl', 'es', 'fr', 'it'], pl: ['en'] };
        const allowed = pairs[user.nativeLang] || pairs.en;
        [...sel.options].forEach((o) => { if (!allowed.includes(o.value) && o.value !== user.learningLang) o.remove(); });
        if (user.learningLang) sel.value = user.learningLang;
      }
    } catch { /* page scripts report connection problems */ }
    let current = sel.value;

    sel.addEventListener('change', async () => {
      const next = sel.value;
      sel.disabled = true;
      try {
        const res = await fetch('/api/auth/me/language', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...authHeader() },
          body: JSON.stringify({ learningLang: next }),
        });
        if (!res.ok) throw new Error(res.status);
        localStorage.setItem('learningLang', next); // pings other tabs
        window.flash?.(`Now learning ${sel.selectedOptions[0].textContent}`, 'success');
        location.reload();
      } catch {
        sel.value = current;
        sel.disabled = false;
        window.toast?.('Couldn’t change the language. Try again.', 'error');
      }
    });

    window.addEventListener('storage', (e) => {
      if (e.key === 'learningLang' && e.newValue && e.newValue !== current) location.reload();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
