// ============ NOTEBOOK ============
// Private notes and free writing, saved to the account. "Check my Polish" copies a ready-made
// prompt for ChatGPT / Claude (free, no API key); pasting the answer back shows the mistakes
// and can turn them into flashcards in a "My mistakes" deck.

import { mascot } from './art.js';
import { langName } from './constants.js';
import * as DataManager from './data.js';
import { shuffleArray } from './utils.js';

const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` });

let notes = [];
let current = null;      // the open note
let saveTimer = null;
let ctx = {};            // { user, getDeckWords }
let built = false;

// ---------- API ----------
async function api(method, url, body) {
  const res = await fetch(url, { method, headers: headers(), body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}
const lang = () => ctx.user?.learningLang || 'pl';

// ---------- Rendering ----------
export async function renderNotes(context) {
  ctx = context;
  const root = $('notesContainer');
  if (!root) return;
  if (!built) { build(root); built = true; }
  try {
    notes = await api('GET', `/api/library/notes?learningLang=${encodeURIComponent(lang())}`);
  } catch (e) {
    toast(e.message, 'error');
    notes = [];
  }
  if (current && !notes.some((n) => n.id === current.id)) current = null;
  current = current ? notes.find((n) => n.id === current.id) : notes[0] || null;
  renderList();
  openNote(current);
}

function build(root) {
  root.innerHTML = `
    <div class="nb-head">
      <div><h2>Notebook</h2><p class="meta">Your notes and writing practice, saved to your account. Write in ${langName(lang())}, then check it with AI.</p></div>
      <button id="nbNew" type="button">+ New note</button>
    </div>
    <div class="nb-layout">
      <aside class="nb-list panel" aria-label="Your notes"><ul id="nbList"></ul></aside>
      <div class="nb-main">
        <div class="panel nb-editor" id="nbEditor">
          <input id="nbTitle" class="nb-title" placeholder="Title" maxlength="120" autocomplete="off" aria-label="Note title" />
          <p id="nbIdea" class="nb-idea" hidden></p>
          <textarea id="nbBody" class="nb-body" lang="pl" placeholder="Write here — notes, new words, sentences, a diary entry…" aria-label="Note"></textarea>
          <div class="nb-foot">
            <span id="nbStatus" class="meta"></span>
            <div class="nb-foot-actions">
              <button id="nbIdeaBtn" class="ghost small" type="button">Writing idea</button>
              <button id="nbDelete" class="ghost small danger-text" type="button">Delete</button>
            </div>
          </div>
        </div>
        <div class="panel nb-check" id="nbCheck">
          <h3>Check my Polish</h3>
          <p class="meta">Copy a ready-made prompt, paste it into ChatGPT or Claude (free), then paste the answer back here to see your mistakes explained.</p>
          <div class="nb-check-actions">
            <button id="nbCopyGpt" type="button">Copy for ChatGPT</button>
            <button id="nbCopyClaude" class="ghost" type="button">Copy for Claude</button>
          </div>
          <details class="nb-paste" id="nbPaste">
            <summary>Paste the AI’s answer</summary>
            <textarea id="nbAnswer" rows="5" placeholder="Paste the whole reply here"></textarea>
            <button id="nbShow" type="button">Show corrections</button>
          </details>
          <div id="nbResult" hidden></div>
        </div>
      </div>
      <div class="nb-empty panel" id="nbEmpty" hidden></div>
    </div>`;
  $('nbNew').addEventListener('click', newNote);
  $('nbTitle').addEventListener('input', () => queueSave({ title: $('nbTitle').value }));
  $('nbBody').addEventListener('input', () => queueSave({ body: $('nbBody').value }));
  $('nbDelete').addEventListener('click', deleteNote);
  $('nbIdeaBtn').addEventListener('click', showIdea);
  $('nbCopyGpt').addEventListener('click', () => copyPrompt('https://chatgpt.com/'));
  $('nbCopyClaude').addEventListener('click', () => copyPrompt('https://claude.ai/new'));
  $('nbShow').addEventListener('click', readAnswer);
  // Keep unsaved typing when leaving the page.
  window.addEventListener('beforeunload', () => { if (saveTimer) flushSave(); });
}

function renderList() {
  const list = $('nbList');
  list.replaceChildren();
  const empty = !notes.length;
  $('nbEmpty').hidden = !empty;
  document.querySelector('.nb-main').hidden = empty;
  document.querySelector('.nb-list').hidden = empty;
  if (empty) {
    const box = $('nbEmpty');
    box.innerHTML = `${mascot('wave')}<h3>Start your notebook</h3><p class="meta">Write notes, new words or a few sentences in Polish. Then check them with AI and turn your mistakes into flashcards.</p>`;
    const b = el('button', null, 'Write your first note'); b.type = 'button';
    b.addEventListener('click', newNote);
    box.appendChild(b);
    return;
  }
  for (const n of notes) {
    const li = el('li');
    const b = el('button', 'nb-item'); b.type = 'button';
    if (current?.id === n.id) b.setAttribute('aria-current', 'true');
    const title = n.title || n.body.trim().split('\n')[0].slice(0, 60) || 'Untitled';
    b.append(el('strong', null, title), el('span', 'meta', new Date(n.updatedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })));
    if (n.check?.mistakes) b.appendChild(el('span', 'nb-badge', `${n.check.mistakes.length} fix${n.check.mistakes.length === 1 ? '' : 'es'}`));
    b.addEventListener('click', () => { flushSave(); openNote(n); renderList(); });
    li.appendChild(b);
    list.appendChild(li);
  }
}

function openNote(n) {
  current = n || null;
  if (!n) return;
  $('nbTitle').value = n.title;
  $('nbBody').value = n.body;
  $('nbIdea').hidden = true;
  $('nbStatus').textContent = n.updatedAt ? `Saved · ${wordCount(n.body)}` : '';
  $('nbAnswer').value = '';
  $('nbPaste').open = false;
  renderCheck(n.check);
}

const wordCount = (t) => { const n = (t.match(/\p{L}+/gu) || []).length; return `${n} word${n === 1 ? '' : 's'}`; };

// ---------- Saving ----------
let pending = {};
function queueSave(change) {
  if (!current) return;
  Object.assign(pending, change);
  Object.assign(current, change);
  $('nbStatus').textContent = 'Saving…';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flushSave, 700);
}
async function flushSave() {
  clearTimeout(saveTimer); saveTimer = null;
  if (!current || !Object.keys(pending).length) return;
  const note = current; const change = pending; pending = {};
  try {
    const saved = await api('PUT', `/api/library/notes/${note.id}`, change);
    Object.assign(note, { updatedAt: saved.updatedAt });
    if (note === current) $('nbStatus').textContent = `Saved · ${wordCount(note.body)}`;
    notes.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
    renderList();
  } catch (e) {
    Object.assign(pending, change); // try again with the next save
    $('nbStatus').textContent = 'Not saved — check your connection';
    toast(e.message, 'error');
  }
}

async function newNote() {
  await flushSave();
  try {
    const n = await api('POST', '/api/library/notes', { learningLang: lang(), title: '', body: '' });
    notes.unshift(n);
    openNote(n);
    renderList();
    $('nbBody').focus();
  } catch (e) { toast(e.message, 'error'); }
}

async function deleteNote() {
  if (!current) return;
  const ok = await confirmDialog('Delete this note?', 'It will be removed from your account for good.', { confirmLabel: 'Delete', danger: true });
  if (!ok) return;
  try {
    clearTimeout(saveTimer); pending = {};
    await api('DELETE', `/api/library/notes/${current.id}`);
    notes = notes.filter((n) => n !== current);
    current = notes[0] || null;
    renderList();
    openNote(current);
  } catch (e) { toast(e.message, 'error'); }
}

// ---------- Writing idea ----------
const IDEAS = [
  'Describe your morning using', 'Write a short message to a friend using', 'Write about your weekend using',
  'Describe your home using', 'Tell a tiny story that uses', 'Write three sentences in the past tense with',
];
function showIdea() {
  const words = shuffleArray([...new Set((ctx.getDeckWords?.() || []).filter((w) => /\p{L}{3,}/u.test(w)))]).slice(0, 3);
  const idea = shuffleArray([...IDEAS])[0];
  const box = $('nbIdea');
  box.textContent = words.length ? `${idea}: ${words.join(', ')}.` : `${idea} words you learned this week.`;
  box.hidden = false;
}

// ---------- Check with AI (copy / paste, no API key) ----------
function buildPrompt() {
  const native = langName(ctx.user?.nativeLang || 'en');
  const target = langName(lang());
  return `You are a kind, precise ${target} teacher. A learner wrote the text below in ${target}. Check grammar (cases, gender, verb aspect and conjugation, agreement), spelling, vocabulary and word order.

Reply with ONLY a JSON code block in exactly this shape, with explanations in ${native}:
\`\`\`json
{
  "corrected": "the whole text, corrected, keeping the learner's meaning and style",
  "mistakes": [
    { "wrong": "short phrase exactly as the learner wrote it", "right": "the corrected phrase", "why": "one short sentence: the rule, naming the case / gender / aspect when relevant", "type": "case | gender | aspect | conjugation | agreement | spelling | word order | vocabulary | other" }
  ],
  "tips": ["one to three short, encouraging tips for this learner"],
  "level": "estimated CEFR level, e.g. A2"
}
\`\`\`
If there are no mistakes, return an empty "mistakes" list. Do not add anything outside the code block.

Text:
"""
${$('nbBody').value.trim()}
"""`;
}

async function copyPrompt(url) {
  if (!$('nbBody').value.trim()) return toast('Write something first, then check it.', 'error');
  const win = window.open(url, '_blank'); // opened inside the click so pop-up blockers allow it
  if (win) win.opener = null;
  try {
    await navigator.clipboard.writeText(buildPrompt());
    toast('Prompt copied. Paste it into the chat, then paste the reply back here.', 'success');
  } catch {
    toast('Couldn’t copy automatically. Try again, or copy your text yourself.', 'error');
  }
  if (!win) toast('Your browser blocked the new tab. The prompt is copied; open the chat yourself.', 'info');
  $('nbPaste').open = true;
}

/** Pulls the JSON out of an AI reply (code block or bare object). Returns null if there isn't one. */
export function parseCheck(text) {
  const raw = String(text || '');
  const block = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1] ?? raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1);
  let data;
  try { data = JSON.parse(block); } catch { return null; }
  if (!data || typeof data !== 'object') return null;
  const str = (v, max = 400) => String(v ?? '').trim().slice(0, max);
  const mistakes = (Array.isArray(data.mistakes) ? data.mistakes : [])
    .map((m) => ({ wrong: str(m?.wrong, 200), right: str(m?.right, 200), why: str(m?.why), type: str(m?.type, 40) }))
    .filter((m) => m.wrong || m.right)
    .slice(0, 60);
  return {
    corrected: str(data.corrected, 20000),
    mistakes,
    tips: (Array.isArray(data.tips) ? data.tips : []).map((t) => str(t)).filter(Boolean).slice(0, 5),
    level: str(data.level, 20),
    checkedAt: new Date().toISOString(),
  };
}

async function readAnswer() {
  const check = parseCheck($('nbAnswer').value);
  if (!check) return toast('Couldn’t read that reply. Paste the whole answer, including the ```json part.', 'error');
  if (!current) return;
  current.check = check;
  renderCheck(check);
  $('nbPaste').open = false;
  $('nbAnswer').value = '';
  try { await api('PUT', `/api/library/notes/${current.id}`, { check }); renderList(); } catch (e) { toast(e.message, 'error'); }
}

function renderCheck(check) {
  const box = $('nbResult');
  box.replaceChildren();
  box.hidden = !check;
  if (!check) return;
  const head = el('div', 'nb-result-head');
  head.appendChild(el('h4', null, check.mistakes.length ? `${check.mistakes.length} thing${check.mistakes.length === 1 ? '' : 's'} to fix` : 'No mistakes found — nice!'));
  if (check.level) head.appendChild(el('span', 'nb-level', `Level ${check.level}`));
  box.appendChild(head);

  if (check.mistakes.length) {
    const ul = el('ul', 'nb-mistakes');
    for (const m of check.mistakes) {
      const li = el('li');
      const line = el('p', 'nb-fix');
      line.append(el('del', null, m.wrong), ' → ', el('ins', null, m.right));
      if (m.type) line.appendChild(el('span', 'nb-type', m.type));
      li.appendChild(line);
      if (m.why) li.appendChild(el('p', 'meta', m.why));
      ul.appendChild(li);
    }
    box.appendChild(ul);
  }
  if (check.corrected) {
    const c = el('div', 'nb-corrected');
    c.append(el('h4', null, 'Corrected text'), el('p', null, check.corrected));
    box.appendChild(c);
  }
  if (check.tips.length) {
    const t = el('ul', 'nb-tips');
    check.tips.forEach((x) => t.appendChild(el('li', null, x)));
    box.appendChild(t);
  }
  const row = el('div', 'nb-check-actions');
  if (check.mistakes.some((m) => m.wrong && m.right)) {
    const add = el('button', null, 'Add mistakes to flashcards'); add.type = 'button';
    add.addEventListener('click', () => addMistakeCards(check, add));
    row.appendChild(add);
  }
  if (check.corrected) {
    const use = el('button', 'ghost', 'Replace my text with the corrected one'); use.type = 'button';
    use.addEventListener('click', () => { $('nbBody').value = check.corrected; queueSave({ body: check.corrected }); toast('Text replaced. Your mistakes stay listed here.', 'success'); });
    row.appendChild(use);
  }
  const clear = el('button', 'ghost', 'Clear check'); clear.type = 'button';
  clear.addEventListener('click', async () => { current.check = null; renderCheck(null); renderList(); try { await api('PUT', `/api/library/notes/${current.id}`, { check: null }); } catch (e) { toast(e.message, 'error'); } });
  row.appendChild(clear);
  box.appendChild(row);
}

// Each fix becomes a card in a "My mistakes" deck: front "Correct this: …", back the fix, note = why.
async function addMistakeCards(check, btn) {
  const name = 'My mistakes';
  const user = DataManager.currentUser;
  const cards = check.mistakes.filter((m) => m.wrong && m.right)
    .map((m) => ({ question: `Correct this: ${m.wrong}`, answer: m.right, note: m.why }));
  btn.disabled = true;
  try {
    let deck = DataManager.filteredDecks.find((d) => d.name === name);
    let added = 0;
    if (!deck) {
      deck = await DataManager.createDeck(name, user.learningLang, user.nativeLang, cards);
      if (!deck) throw new Error('Couldn’t create the deck.');
      added = cards.length;
    } else {
      const have = new Set(deck.cards.map((c) => `${c.question}\u0000${c.answer}`));
      for (const c of cards) {
        if (have.has(`${c.question}\u0000${c.answer}`)) continue;
        if (await DataManager.addCardToDeck(deck.id, c.question, c.answer, c.note)) added++;
      }
    }
    window.dispatchEvent(new Event('deckCreated'));
    toast(added ? `Added ${added} card${added === 1 ? '' : 's'} to “${name}”.` : `They’re already in “${name}”.`, 'success');
  } catch (e) {
    toast(e.message || 'Couldn’t add the cards.', 'error');
  } finally {
    btn.disabled = false;
  }
}
