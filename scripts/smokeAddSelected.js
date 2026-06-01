// Smoke test: simulate selecting recommended decks and updating a localStorage-like JSON file
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

async function main() {
  const setsModulePath = path.resolve(__dirname, '..', 'public', 'recommendedSets.js');
  const setsModule = await import(pathToFileURL(setsModulePath).href);
  const recommendedVocabSets = setsModule.recommendedVocabSets;

  const user = { nativeLang: 'en', learningLang: 'pl' };

  // simulate existing localStorage decks file
  const storageFile = path.resolve(__dirname, 'test_local_storage.json');
  let decks = [];
  if (fs.existsSync(storageFile)) {
    try { decks = JSON.parse(fs.readFileSync(storageFile, 'utf8') || '[]'); } catch (e) { decks = []; }
  }

  // pick some sets to "select" (simulate checked boxes)
  const toSelect = [
    'Basic Greetings and Polite Expressions',
    'Numbers 1-10'
  ];

  // helper: addDeckToStorage (same logic as app)
  function addDeckToStorage(set) {
    const exists = decks.some(d =>
      d.name === set.name && d.learningLang === set.learningLang && d.nativeLang === set.nativeLang
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
  }

  // add selected matching sets for user's languages
  const matchingSets = recommendedVocabSets.filter(s => s.learningLang === user.learningLang && s.nativeLang === user.nativeLang);
  const selectedSets = matchingSets.filter(s => toSelect.includes(s.name));

  selectedSets.forEach(s => addDeckToStorage(s));

  fs.writeFileSync(storageFile, JSON.stringify(decks, null, 2));
  console.log('Wrote', decks.length, 'decks to', storageFile);
  console.log(JSON.stringify(decks, null, 2));
}

main().catch(err => { console.error(err); process.exit(1); });
