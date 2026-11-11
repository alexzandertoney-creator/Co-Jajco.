const dictionary = require('../services/dictionary.service.js');

const LANG = /^[a-z]{2}$/;
const langsOk = (l, n) => LANG.test(l || '') && LANG.test(n || '');

// POST { learningLang, nativeLang, words: [...] } -> { [word]: { translation, lemma } }
const lookup = async (req, res) => {
  try {
    const { learningLang, nativeLang, words } = req.body || {};
    if (!langsOk(learningLang, nativeLang) || !Array.isArray(words)) return res.status(400).json({ error: 'Invalid lookup.' });
    res.json(await dictionary.lookup(learningLang, nativeLang, words));
  } catch (err) {
    console.error('Dictionary lookup error:', err);
    res.status(500).json({ error: 'Dictionary unavailable' });
  }
};

// GET ?learningLang&nativeLang&word -> { translation, lemma } or {} (editor suggestions)
const suggest = async (req, res) => {
  try {
    const { learningLang, nativeLang, word } = req.query;
    if (!langsOk(learningLang, nativeLang) || !word) return res.json({});
    const found = await dictionary.lookup(learningLang, nativeLang, [word]);
    res.json(found[dictionary.normalize(word)] || {});
  } catch (err) {
    console.error('Dictionary suggest error:', err);
    res.json({});
  }
};

// POST { learningLang, nativeLang, pairs: [{ word, translation }] } -> { added }
const contribute = async (req, res) => {
  try {
    const { learningLang, nativeLang, pairs } = req.body || {};
    if (!langsOk(learningLang, nativeLang) || !Array.isArray(pairs)) return res.status(400).json({ error: 'Invalid contribution.' });
    res.json({ added: await dictionary.contribute(learningLang, nativeLang, pairs) });
  } catch (err) {
    console.error('Dictionary contribute error:', err);
    res.status(500).json({ error: 'Could not save translations' });
  }
};

module.exports = { lookup, suggest, contribute };
