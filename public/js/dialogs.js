// App-styled replacements for alert/confirm/prompt. Classic script (not a module)
// so every page — including the non-module login/register pages — gets them on window.
(() => {
  const toastRegion = () => {
    let el = document.getElementById('toastRegion');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toastRegion';
      el.className = 'toast-region';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      document.body.appendChild(el);
    }
    return el;
  };

  // tone: 'info' | 'success' | 'error'
  window.toast = (message, tone = 'info') => {
    const el = document.createElement('div');
    el.className = `toast toast-${tone}`;
    el.textContent = message;
    toastRegion().appendChild(el);
    setTimeout(() => {
      el.classList.add('leaving');
      setTimeout(() => el.remove(), 250);
    }, tone === 'error' ? 5000 : 3000);
  };

  // Toast that survives a page change (e.g. "Added 3 decks" after redirecting home).
  window.flash = (message, tone = 'info') => {
    try { sessionStorage.setItem('flash', JSON.stringify({ message, tone })); } catch { /* storage blocked */ }
  };
  const showFlash = () => {
    try {
      const f = JSON.parse(sessionStorage.getItem('flash') || 'null');
      sessionStorage.removeItem('flash');
      if (f) window.toast(f.message, f.tone);
    } catch { /* ignore */ }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', showFlash);
  else showFlash();

  // Builds a native <dialog> (focus trap, Esc to cancel come free) and resolves
  // with the submitted field values, or null if cancelled.
  const openDialog = ({ title, message, fields = [], confirmLabel = 'OK', danger = false }) =>
    new Promise((resolve) => {
      const dlg = document.createElement('dialog');
      dlg.className = 'app-dialog';
      const form = document.createElement('form');
      form.method = 'dialog';

      const h = document.createElement('h2');
      h.textContent = title;
      form.appendChild(h);

      if (message) {
        const p = document.createElement('p');
        p.className = 'meta';
        p.textContent = message;
        form.appendChild(p);
      }

      const inputs = fields.map((f, i) => {
        const label = document.createElement('label');
        label.className = 'dialog-field';
        label.textContent = f.label;
        let input;
        if (f.options) {
          input = document.createElement('select');
          f.options.forEach((o) => input.add(new Option(o, o)));
        } else {
          input = document.createElement('input');
          if (f.type) input.type = f.type;
          if (f.autocomplete) input.setAttribute('autocomplete', f.autocomplete);
          input.placeholder = f.placeholder || '';
          if (!f.autocomplete) input.autocomplete = 'off';
          input.required = f.required !== false;
        }
        input.value = f.value ?? '';
        input.name = `f${i}`;
        label.appendChild(input);
        form.appendChild(label);
        return input;
      });

      const actions = document.createElement('div');
      actions.className = 'dialog-actions';
      const cancel = document.createElement('button');
      cancel.type = 'button';
      cancel.className = 'ghost';
      cancel.textContent = 'Cancel';
      const ok = document.createElement('button');
      ok.type = 'submit';
      ok.value = 'ok';
      ok.textContent = confirmLabel;
      if (danger) ok.className = 'danger';
      actions.append(cancel, ok);
      form.appendChild(actions);
      dlg.appendChild(form);
      document.body.appendChild(dlg);

      // Resolve straight from what the user did (confirm, cancel, Esc, backdrop click)
      // rather than relying only on the dialog's 'close' event, which some browsers
      // and embedded webviews deliver late or not at all.
      let settled = false;
      const finish = (confirmed) => {
        if (settled) return;
        settled = true;
        const values = confirmed ? inputs.map((i) => i.value.trim()) : null;
        if (dlg.open) dlg.close();
        dlg.remove();
        resolve(values);
      };
      form.addEventListener('submit', (e) => { e.preventDefault(); finish(true); }); // only fires once required fields are filled
      cancel.addEventListener('click', () => finish(false));
      dlg.addEventListener('cancel', (e) => { e.preventDefault(); finish(false); }); // Esc
      dlg.addEventListener('click', (e) => { if (e.target === dlg) finish(false); });
      dlg.addEventListener('close', () => finish(dlg.returnValue === 'ok'));

      window.enhanceSelects?.(dlg);
      dlg.showModal();
      (inputs[0] || ok).focus();
      if (inputs[0]?.tagName === 'INPUT') inputs[0].select();
    });

  window.confirmDialog = async (title, message, { confirmLabel = 'Confirm', danger = false } = {}) =>
    (await openDialog({ title, message, confirmLabel, danger })) !== null;

  // Resolves with the trimmed string, or null if cancelled.
  window.promptDialog = async (title, { label = '', value = '', placeholder = '', confirmLabel = 'Save', message = '' } = {}) => {
    const res = await openDialog({ title, message, confirmLabel, fields: [{ label, value, placeholder }] });
    return res ? res[0] : null;
  };

  // Several fields at once; resolves with an array of values, or null.
  window.formDialog = (title, fields, { confirmLabel = 'Save', message = '', danger = false } = {}) =>
    openDialog({ title, message, fields, confirmLabel, danger });
})();
