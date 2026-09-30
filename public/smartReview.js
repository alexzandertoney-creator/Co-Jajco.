let decks = [];
let currentUser = null;
let selectedDeck = null;

const langMap = {
  en: 'en-US',
  fr: 'fr-FR',
  es: 'es-ES',
  pl: 'pl-PL',
  de: 'de-DE',
  it: 'it-IT',
  ja: 'ja-JP',
  zh: 'zh-CN'
};

function speakText(text, langCode = currentUser?.learningLang || "en") {
  if (!window.speechSynthesis) return;

  const run = () => {
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const lang = langMap[langCode] || 'en-US';

    const voices = speechSynthesis.getVoices();

    let voice = voices.find(v => v.lang === lang);

    if (!voice) {
      const baseLang = lang.split("-")[0];
      voice = voices.find(v => v.lang.startsWith(baseLang));
    }

    if (voice) utterance.voice = voice;

    utterance.lang = lang;
    utterance.rate = 0.9;

    speechSynthesis.speak(utterance);
  };

  if (speechSynthesis.getVoices().length === 0) {
    speechSynthesis.onvoiceschanged = run;
  } else {
    run();
  }
}
speechSynthesis.onvoiceschanged = () => {
  console.log("Voices loaded:", speechSynthesis.getVoices());
};

async function saveSelectedDeck() {
  if (!selectedDeck) return;

  const token = localStorage.getItem("token");
  try {
    const res = await fetch(`/api/library/decks/${selectedDeck.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ cards: selectedDeck.cards })
    });

    if (!res.ok) throw new Error(`Deck update failed: ${res.status}`);
  } catch (error) {
    console.error("Failed to save Smart Review progress:", error);
  }
}
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
      console.error("Auth validation failed for smart review page:", res.status);
      alert("Unable to verify your login right now. Please try again later.");
      return null;
    }

    currentUser = await res.json();
    return currentUser;
  } catch (error) {
    console.error("Failed to fetch current user for smart review page:", error);
    alert("Cannot reach the server to verify login. Please make sure the backend is running.");
    return null;
  }
}
let reviewCards = [];
let currentIndex = 0;
let frontIsQuestion = true;

// DOM elements
const cardEl = document.getElementById("card");
const questionEl = document.getElementById("question");
const answerEl = document.getElementById("answer");
const nextBtn = document.getElementById("next");
const prevBtn = document.getElementById("prev");
const correctBtn = document.getElementById("correctBtn");
const incorrectBtn = document.getElementById("incorrectBtn");
const swapSidesBtn = document.getElementById("swapSides");
const progressEl = document.getElementById("cardProgress");
const reviewDeckSelect = document.getElementById("reviewDeckSelect");



// speak buttons
const speakFrontBtn = document.getElementById("speakFrontBtn");
const speakBackBtn = document.getElementById("speakBackBtn");

[speakFrontBtn, speakBackBtn].forEach(btn => {
  if (!btn) return;
  btn.addEventListener("click", (e) => {
    e.stopPropagation(); // Prevents the card from flipping when clicking the speaker
    if (!reviewCards.length) return;
    
    const currentCard = reviewCards[currentIndex];
    const isFrontBtn = btn.id === "speakFrontBtn";
    
    // Determine what text is actually on the front/back right now
    const frontText = frontIsQuestion ? currentCard.question : currentCard.answer;
    const backText = frontIsQuestion ? currentCard.answer : currentCard.question;
    
    const textToSpeak = isFrontBtn ? frontText : backText;
    
    // Determine language based on whether that text is the 'question' (learning) or 'answer' (native)
    const lang = (textToSpeak === currentCard.question) 
                 ? currentUser.learningLang 
                 : currentUser.nativeLang;

    speakText(textToSpeak, lang);
  });
});


const speakModeSelect = document.getElementById("speakMode");
let speakMode = "off";

speakModeSelect.addEventListener("change", () => {
  speakMode = speakModeSelect.value;
  
});
function autoSpeakCard(cardData) {
  if (speakMode === "off") return;
speakModeSelect.blur();
  const isFlipped = cardEl.classList.contains("flipped");

  // Map what’s currently visible
  const frontText = frontIsQuestion ? cardData.question : cardData.answer;
  const backText = frontIsQuestion ? cardData.answer : cardData.question;
  const visibleText = isFlipped ? backText : frontText;

  // Determine language of visible side
  const visibleLang = (visibleText === cardData.question)
    ? currentUser.learningLang
    : currentUser.nativeLang;

  if (speakMode === "native") {
    if (visibleLang === currentUser.learningLang) {
      speakText(visibleText, currentUser.learningLang);
    }
  } else if (speakMode === "learning") {
    if (visibleLang === currentUser.nativeLang) {
      speakText(visibleText, currentUser.nativeLang);
    }
  } else if (speakMode === "both") {
    // Always speak the visible side
    speakText(visibleText, visibleLang);
  }
}

// --------- INIT ---------
async function initSmartReview() {
  const user = await loadUser();
  if (!user) return;

  const token = localStorage.getItem("token");
  try {
    const res = await fetch("/api/library/decks", {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`Deck load failed: ${res.status}`);
    decks = await res.json();
  } catch (error) {
    console.error("Failed to load saved decks for Smart Review:", error);
    questionEl.textContent = "Unable to load your saved decks.";
    return;
  }

  const matchingDecks = decks.filter(deck =>
    deck.learningLang === user.learningLang && deck.nativeLang === user.nativeLang
  );
  reviewDeckSelect.innerHTML = "";

  matchingDecks.forEach(deck => {
    const option = document.createElement("option");
    option.value = String(deck.id);
    option.textContent = `${deck.name} (${deck.cards?.length || 0})`;
    reviewDeckSelect.appendChild(option);
  });

  reviewDeckSelect.disabled = matchingDecks.length === 0;
  if (!matchingDecks.length) {
    questionEl.textContent = "No saved decks for this language pair.";
    return;
  }

  reviewDeckSelect.addEventListener("change", () => loadSelectedDeck());
  loadSelectedDeck();
}

function loadSelectedDeck() {
  selectedDeck = decks.find(deck => String(deck.id) === reviewDeckSelect.value);
  const cards = selectedDeck?.cards || [];
  reviewCards = cards
    .map(card => {
      if (!card.stats) card.stats = { correct: 0, incorrect: 0 };
      return card;
    })
    .sort((a, b) => {
      const totalA = a.stats.correct + a.stats.incorrect || 1;
      const totalB = b.stats.correct + b.stats.incorrect || 1;

      return (a.stats.correct / totalA) - (b.stats.correct / totalB);
    })
    .slice(0, 20);

  if (reviewCards.length === 0) {
    questionEl.textContent = "No cards in this deck.";
    answerEl.textContent = "";
    progressEl.textContent = "";
    return;
  }

  currentIndex = 0;
  showCard();
}
function flipCard() {
  cardEl.classList.toggle("flipped");

  setTimeout(() => {
    if (reviewCards.length) {
      autoSpeakCard(reviewCards[currentIndex]);
    }
  }, 50);
}

function showCard() {
  if (!reviewCards.length) {
    questionEl.textContent = "🎉 All done!";
    answerEl.textContent = "";
    progressEl.textContent = "";
    return;
  }

  const c = reviewCards[currentIndex];

  // Force front
  cardEl.classList.add("no-transition");
cardEl.classList.remove("flipped");

  requestAnimationFrame(() => {
    if (frontIsQuestion) {
      questionEl.textContent = c.question;
      answerEl.textContent = c.answer;
    } else {
      questionEl.textContent = c.answer;
      answerEl.textContent = c.question;
    }
    requestAnimationFrame(() => cardEl.classList.remove("no-transition"));
  });

  progressEl.textContent = `${currentIndex + 1} / ${reviewCards.length}`;
  autoSpeakCard(c);
}
correctBtn.addEventListener("click", () => {
  if (!reviewCards.length) return;

  const currentCard = reviewCards[currentIndex];

  currentCard.stats.correct++;
  saveSelectedDeck();

  reviewCards.splice(currentIndex, 1);

  if (currentIndex >= reviewCards.length) currentIndex = 0;

  showCard();
});

incorrectBtn.addEventListener("click", () => {
  if (!reviewCards.length) return;

  const currentCard = reviewCards[currentIndex];

  currentCard.stats.incorrect++;
  saveSelectedDeck();

  reviewCards.push(reviewCards.splice(currentIndex, 1)[0]);

  showCard();
});


nextBtn.addEventListener("click", () => {
  currentIndex = (currentIndex + 1) % reviewCards.length;
  showCard();
});
prevBtn.addEventListener("click", () => {
  currentIndex = (currentIndex - 1 + reviewCards.length) % reviewCards.length;
  showCard();
});

swapSidesBtn.addEventListener("click", () => {
  frontIsQuestion = !frontIsQuestion;
  showCard();
});

// --------- START ---------
initSmartReview();
document.body.classList.add("study-mode");
document.addEventListener("keydown", (e) => {
   if (document.activeElement === speakModeSelect) {
    speakModeSelect.blur();
  }

  if (!reviewCards.length) return;

  if (e.key === "c") correctBtn.click();
  if (e.key === "i") incorrectBtn.click();

  switch (e.key) {
    case "ArrowRight":
      currentIndex = (currentIndex + 1) % reviewCards.length;
      showCard();
      break;

    case "ArrowLeft":
      currentIndex = (currentIndex - 1 + reviewCards.length) % reviewCards.length;
      showCard();
      break;

    case " ":
      e.preventDefault();
      flipCard();
      break;
  }
});
cardEl.addEventListener("click", (e) => {
  // If we clicked a button inside the card, don't flip and don't auto-speak
  if (e.target.closest("button")) return;
  
  flipCard();
});

// Reload page when learning language changes elsewhere so review set updates
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
