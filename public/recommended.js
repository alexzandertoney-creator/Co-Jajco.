import { recommendedVocabSets } from "./recommendedSets.js";
import { loadProfile } from "./js/profile.js";
import { renderIdentity } from "./js/home.js";

let selectedDecks = [];

// Display current user languages for debugging
function showCurrentLanguages() {
  const container = document.getElementById("currentLanguages");
  if (!container) return;

  const user = window.currentUser;
  if (!user) {
    container.textContent = "Loading user info...";
    return;
  }

  container.textContent = `Native: ${user.nativeLang} | Learning: ${user.learningLang}`;
}

// Load current user
async function loadUser() {
  const token = localStorage.getItem("token");

  if (!token) {
    window.location.href = "login.html";
    return null;
  }

  try {
    const res = await fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (res.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "login.html";
      return null;
    }

    if (!res.ok) {
      console.error("Auth validation failed for recommended page:", res.status);
      toast("Unable to verify your login right now. Please try again later.", 'error');
      return null;
    }

    const user = await res.json();
    window.currentUser = user;
    console.log("Loaded user:", user);
    showCurrentLanguages();
    return user;
  } catch (error) {
    console.error("Failed to fetch current user for recommended page:", error);
    toast("Cannot reach the server to verify login. Please make sure the backend is running.", 'error');
    return null;
  }
}

async function init() {
  const profileReady = loadProfile();
  await loadUser();
  await profileReady;
  renderIdentity(window.currentUser);
  await loadExistingDecks();
  await renderRecommendedDecks();
  updateAddButton();

  const addBtn = document.getElementById("addSelectedDecks");
  addBtn?.addEventListener("click", addSelectedDecks);
}

// Names of decks the user already has for this language pair, so starter decks aren't added twice.
let existingNames = new Set();
async function loadExistingDecks() {
  const user = window.currentUser;
  if (!user) return;
  try {
    const res = await fetch("/api/library/decks", { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
    if (!res.ok) throw new Error(res.status);
    const decks = await res.json();
    existingNames = new Set(decks
      .filter(d => d.learningLang === user.learningLang && d.nativeLang === user.nativeLang)
      .map(d => d.name));
  } catch (e) {
    console.error("Failed to load existing decks", e);
  }
}

function checkedSets() {
  return [...document.querySelectorAll('.deck-card input[type="checkbox"]:checked:not(:disabled)')]
    .map(cb => recommendedVocabSets.find(s =>
      s.name === cb.dataset.name && s.learningLang === cb.dataset.learningLang && s.nativeLang === cb.dataset.nativeLang))
    .filter(Boolean);
}

function updateAddButton() {
  const btn = document.getElementById("addSelectedDecks");
  if (!btn) return;
  const n = checkedSets().length;
  btn.disabled = n === 0;
  btn.textContent = n ? `Add ${n} deck${n === 1 ? "" : "s"}` : "Select decks to add";
}

// The main app loads decks from the server, so starter decks must be created there
// (they used to be written to localStorage, which nothing read).
async function addSelectedDecks() {
  const sets = checkedSets();
  if (!sets.length) return;
  const btn = document.getElementById("addSelectedDecks");
  btn.disabled = true;
  btn.textContent = "Adding…";
  let added = 0;
  for (const set of sets) {
    try {
      const res = await fetch("/api/library/decks", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify({
          name: set.name,
          learningLang: set.learningLang,
          nativeLang: set.nativeLang,
          cards: set.cards.map(c => ({ question: c.question, answer: c.answer, stats: { correct: 0, incorrect: 0 } })),
        }),
      });
      if (res.ok) added++;
    } catch (e) {
      console.error("Failed to add deck", set.name, e);
    }
  }
  if (added === sets.length) {
    flash(`Added ${added} deck${added === 1 ? "" : "s"}. Happy studying!`, "success");
    window.location.href = "index.html";
  } else {
    toast(`Added ${added} of ${sets.length} decks. Try the rest again.`, "error");
    await loadExistingDecks();
    await renderRecommendedDecks();
    updateAddButton();
  }
}

document.addEventListener("DOMContentLoaded", init);
// Keep page in sync if learning language changes in another tab/page
window.addEventListener('storage', (e) => {
  if (e.key === 'learningLang') {
    try { location.reload(); } catch (err) { /* ignore */ }
  }
});

// Logout button handler (clears token and redirects)
document.addEventListener('DOMContentLoaded', () => {
  const lb = document.getElementById('logoutBtn');
  if (lb) lb.addEventListener('click', () => {
    localStorage.removeItem('token');
    window.location.href = 'login.html';
  });
});
// Render recommended decks
async function renderRecommendedDecks() {
  const user = window.currentUser;
  if (!user) return; // wait until user is loaded

const learningLang = user.learningLang;
const nativeLang = user.nativeLang;  // native language

  const colPreA1 = document.getElementById("columnPreA1");
  const colA1 = document.getElementById("columnA1");
  const colA2 = document.getElementById("columnA2");
  const colPrepositions = document.getElementById("columnPrepositions");

  //safety check
    if (!colPreA1 || !colA1 || !colA2 || !colPrepositions) {
    console.warn("Recommended decks DOM not ready yet");
    return;
  }
  // Clear deck lists before rendering
  [colPreA1, colA1, colA2, colPrepositions].forEach(col => {
    col.innerHTML = "";
  });


  // Filter sets that match the user's native/learning languages
 const matchingSets = recommendedVocabSets.filter(
  set => set.learningLang === learningLang &&
         set.nativeLang === nativeLang
);

  matchingSets.forEach(set => {
    const alreadyAdded = existingNames.has(set.name);

    // A <label> wrapper makes the whole row toggle the checkbox.
    const card = document.createElement("label");
    card.className = "deck-card";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = alreadyAdded;
    checkbox.disabled = alreadyAdded;
    // store identifying info so the global handler can find the set
    checkbox.dataset.name = set.name;
    checkbox.dataset.learningLang = set.learningLang;
    checkbox.dataset.nativeLang = set.nativeLang;

    checkbox.addEventListener("change", updateAddButton);

    const label = document.createElement("span");
    label.className = "deck-card-name";
    label.textContent = set.name;
    const count = document.createElement("span");
    count.className = "meta";
    count.textContent = alreadyAdded ? "Added" : `${set.cards.length} cards`;

    card.append(checkbox, label, count);

    if (set.category === "PreA1") colPreA1.appendChild(card);
    else if (set.category === "A1") colA1.appendChild(card);
    else if (set.category === "A2") colA2.appendChild(card);
    else if (set.category === "Prepositions") colPrepositions.appendChild(card);
  });

  [colPreA1, colA1, colA2, colPrepositions].forEach(col => {
    if (!col.hasChildNodes()) {
      const emptyMessage = document.createElement('div');
      emptyMessage.className = 'deck-empty';
      emptyMessage.textContent = 'No recommended decks are available for this category right now.';
      col.appendChild(emptyMessage);
    }
  });
}
