import { recommendedVocabSets } from "./recommendedSets.js";

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
      alert("Unable to verify your login right now. Please try again later.");
      return null;
    }

    const user = await res.json();
    window.currentUser = user;
    console.log("Loaded user:", user);
    showCurrentLanguages();
    return user;
  } catch (error) {
    console.error("Failed to fetch current user for recommended page:", error);
    alert("Cannot reach the server to verify login. Please make sure the backend is running.");
    return null;
  }
}

async function init() {
  await loadUser();
  await renderRecommendedDecks();

  // Attach handler for the "Add Selected Decks" button after rendering
  const addBtn = document.getElementById("addSelectedDecks");
  if (addBtn) {
    addBtn.addEventListener("click", () => {
      // Find all checkboxes in deck cards and add checked ones to storage
      const checkboxes = document.querySelectorAll('.deck-card input[type="checkbox"]');
      checkboxes.forEach(cb => {
        if (cb.checked) {
          const name = cb.dataset.name;
          const learningLang = cb.dataset.learningLang;
          const nativeLang = cb.dataset.nativeLang;
          const set = recommendedVocabSets.find(s =>
            s.name === name && s.learningLang === learningLang && s.nativeLang === nativeLang
          );
          if (set) addDeckToStorage(set);
        } else {
          // if unchecked, optionally remove from storage
          const name = cb.dataset.name;
          const learningLang = cb.dataset.learningLang;
          const nativeLang = cb.dataset.nativeLang;
          const set = recommendedVocabSets.find(s =>
            s.name === name && s.learningLang === learningLang && s.nativeLang === nativeLang
          );
          if (set) removeDeckFromStorage(set);
        }
      });

      alert("Decks updated!");
      window.location.href = "index.html";
    });
  }
}

document.addEventListener("DOMContentLoaded", init);
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
  // Clear columns but keep headings
  [colPreA1, colA1, colA2, colPrepositions].forEach(col => {
    const heading = col.querySelector("h2")?.textContent || "";
    col.innerHTML = `<h2>${heading}</h2>`;
  });

  const decksInStorage = JSON.parse(localStorage.getItem("decks") || "[]");

  // Filter sets that match the user's native/learning languages
 const matchingSets = recommendedVocabSets.filter(
  set => set.learningLang === learningLang &&
         set.nativeLang === nativeLang
);

  matchingSets.forEach(set => {
    const alreadyAdded = decksInStorage.some(d =>
      d.name === set.name &&
      d.learningLang === learningLang &&
      d.nativeLang === nativeLang
    );

    const card = document.createElement("div");
    card.className = "deck-card";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = alreadyAdded;
    // store identifying info so the global handler can find the set
    checkbox.dataset.name = set.name;
    checkbox.dataset.learningLang = set.learningLang;
    checkbox.dataset.nativeLang = set.nativeLang;

    checkbox.addEventListener("change", () => {
      if (checkbox.checked) addDeckToStorage(set);
      else removeDeckFromStorage(set);
    });

    const label = document.createElement("label");
    label.textContent = set.name;

    card.appendChild(checkbox);
    card.appendChild(label);

    if (set.category === "PreA1") colPreA1.appendChild(card);
    else if (set.category === "A1") colA1.appendChild(card);
    else if (set.category === "A2") colA2.appendChild(card);
    else if (set.category === "Prepositions") colPrepositions.appendChild(card);
  });
}

// Add deck to localStorage
function addDeckToStorage(set) {
  const decks = JSON.parse(localStorage.getItem("decks") || "[]");
  const exists = decks.some(d =>
    d.name === set.name &&
    d.learningLang === set.learningLang &&
    d.nativeLang === set.nativeLang
  );

  if (!exists) {
    decks.push({
      id: Date.now() + Math.random(),
      name: set.name,
      learningLang: set.learningLang,
      nativeLang: set.nativeLang,
      cards: set.cards.map(c => ({ ...c }))
    });
  }
  localStorage.setItem("decks", JSON.stringify(decks));
}

// Remove deck from localStorage
function removeDeckFromStorage(set) {
  let decks = JSON.parse(localStorage.getItem("decks") || "[]");
  decks = decks.filter(d =>
    !(d.name === set.name &&
      d.learningLang === set.learningLang &&
      d.nativeLang === set.nativeLang)
  );
  localStorage.setItem("decks", JSON.stringify(decks));
}

// Render decks after user is loaded
