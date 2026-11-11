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
