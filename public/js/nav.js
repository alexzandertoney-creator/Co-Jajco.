// Phones: the "More" tab opens a small menu (Decks, Grammar, Library). Any other tap,
// including picking an item, or Esc closes it. Classic script so every page can use it.
(() => {
  const set = (open) => {
    const nav = document.querySelector('.primary-nav');
    if (!nav) return;
    nav.classList.toggle('more-open', open);
    nav.querySelector('.nav-more')?.setAttribute('aria-expanded', String(open));
  };
  document.addEventListener('click', (e) => {
    const more = e.target.closest?.('.nav-more');
    set(more ? !document.querySelector('.primary-nav')?.classList.contains('more-open') : false);
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') set(false); });
})();
