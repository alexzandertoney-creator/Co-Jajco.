// App-styled dropdowns for every <select>, identical in every browser.
//
// Native select menus can't be styled (macOS draws them dark in dark mode and
// copies the select's font size), so each select gets a button + listbox on top.
// The real <select> stays in the DOM as the source of truth: existing code keeps
// reading .value, setting .value / .innerHTML, and listening for 'change'.
(() => {
  const nativeValue = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
  const nativeIndex = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'selectedIndex');
  let openMenu = null;

  function labelFor(select) {
    if (select.getAttribute('aria-label')) return select.getAttribute('aria-label');
    const label = (select.id && document.querySelector(`label[for="${select.id}"]`)) || select.closest('label');
    if (!label) return '';
    // Label text without the select's own option text.
    const clone = label.cloneNode(true);
    clone.querySelectorAll('select, .select-wrap').forEach((n) => n.remove());
    return clone.textContent.trim();
  }

  function enhance(select) {
    if (select.dataset.enhanced || select.multiple) return;
    select.dataset.enhanced = '1';

    const wrap = document.createElement('span');
    wrap.className = 'select-wrap';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `select-button ${select.className}`.trim();
    button.setAttribute('aria-haspopup', 'listbox');
    button.setAttribute('aria-expanded', 'false');
    const text = document.createElement('span');
    text.className = 'select-text';
    button.appendChild(text);
    const list = document.createElement('ul');
    list.className = 'select-list';
    list.setAttribute('role', 'listbox');
    list.tabIndex = -1;
    list.hidden = true;

    select.replaceWith(wrap);
    wrap.append(select, button, list);
    select.classList.add('select-native');
    select.tabIndex = -1;
    select.setAttribute('aria-hidden', 'true');

    let active = -1; // keyboard-highlighted option while open

    const sync = () => {
      const opt = select.options[select.selectedIndex];
      text.textContent = opt ? opt.textContent : '';
      button.disabled = select.disabled || select.options.length === 0;
      const name = labelFor(select);
      button.setAttribute('aria-label', name ? `${name}: ${text.textContent}` : text.textContent);
    };

    // Keep the button in step when code sets .value or .selectedIndex directly.
    Object.defineProperty(select, 'value', {
      get() { return nativeValue.get.call(this); },
      set(v) { nativeValue.set.call(this, v); sync(); },
    });
    Object.defineProperty(select, 'selectedIndex', {
      get() { return nativeIndex.get.call(this); },
      set(v) { nativeIndex.set.call(this, v); sync(); },
    });
    // ...and when options are rebuilt or the select is disabled.
    new MutationObserver(sync).observe(select, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['disabled'] });
    select.addEventListener('change', sync);
    select.addEventListener('focus', () => button.focus());

    const render = () => {
      list.replaceChildren();
      [...select.options].forEach((opt, i) => {
        const li = document.createElement('li');
        li.setAttribute('role', 'option');
        li.id = `${select.id || 'sel'}-opt-${i}-${Math.random().toString(36).slice(2, 6)}`;
        li.textContent = opt.textContent;
        li.setAttribute('aria-selected', String(i === select.selectedIndex));
        if (opt.disabled) li.setAttribute('aria-disabled', 'true');
        li.addEventListener('mousedown', (e) => e.preventDefault()); // keep focus on the list
        li.addEventListener('click', () => choose(i));
        li.addEventListener('mousemove', () => highlight(i, false));
        list.appendChild(li);
      });
    };

    const highlight = (i, scroll = true) => {
      const items = list.children;
      if (!items.length) return;
      active = Math.max(0, Math.min(items.length - 1, i));
      [...items].forEach((li, n) => li.classList.toggle('active', n === active));
      list.setAttribute('aria-activedescendant', items[active].id);
      if (scroll) items[active].scrollIntoView({ block: 'nearest' });
    };

    const open = () => {
      if (button.disabled) return;
      if (openMenu && openMenu !== close) openMenu();
      render();
      list.hidden = false;
      // Open upward when there isn't room below (e.g. the language picker at the bottom of the sidebar).
      const r = button.getBoundingClientRect();
      const below = window.innerHeight - r.bottom;
      wrap.classList.toggle('drop-up', below < Math.min(list.scrollHeight, 320) + 16 && r.top > below);
      button.setAttribute('aria-expanded', 'true');
      highlight(select.selectedIndex);
      list.focus({ preventScroll: true });
      openMenu = close;
    };

    function close(refocus = true) {
      if (list.hidden) return;
      list.hidden = true;
      button.setAttribute('aria-expanded', 'false');
      if (openMenu === close) openMenu = null;
      if (refocus) button.focus({ preventScroll: true });
    }

    const choose = (i) => {
      if (select.options[i]?.disabled) return;
      const changed = i !== select.selectedIndex;
      nativeIndex.set.call(select, i);
      sync();
      close();
      if (changed) select.dispatchEvent(new Event('change', { bubbles: true }));
    };

    button.addEventListener('click', () => (list.hidden ? open() : close()));
    button.addEventListener('keydown', (e) => {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        open();
      }
    });

    let typed = '';
    let typedTimer;
    list.addEventListener('keydown', (e) => {
      const n = list.children.length;
      if (e.key === 'ArrowDown') { e.preventDefault(); highlight(active + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); highlight(active - 1); }
      else if (e.key === 'Home') { e.preventDefault(); highlight(0); }
      else if (e.key === 'End') { e.preventDefault(); highlight(n - 1); }
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(active); }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
      else if (e.key === 'Tab') { close(false); }
      else if (e.key.length === 1 && !e.metaKey && !e.ctrlKey) {
        // Type-to-jump, like a native select.
        typed += e.key.toLowerCase();
        clearTimeout(typedTimer);
        typedTimer = setTimeout(() => (typed = ''), 600);
        const hit = [...list.children].findIndex((li) => li.textContent.trim().toLowerCase().startsWith(typed));
        if (hit >= 0) highlight(hit);
      }
    });
    list.addEventListener('blur', () => setTimeout(() => {
      if (!wrap.contains(document.activeElement)) close(false);
    }));

    sync();
  }

  document.addEventListener('mousedown', (e) => {
    if (openMenu && !e.target.closest('.select-wrap')) openMenu(false);
  });

  const enhanceAll = (root) => {
    if (root.matches?.('select')) enhance(root);
    root.querySelectorAll?.('select').forEach(enhance);
  };
  window.enhanceSelects = enhanceAll;
  const start = () => {
    enhanceAll(document);
    // Selects added later (dialogs, re-rendered pages) are upgraded as they appear.
    new MutationObserver((records) => records.forEach((r) => r.addedNodes.forEach(enhanceAll)))
      .observe(document.body, { childList: true, subtree: true });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
