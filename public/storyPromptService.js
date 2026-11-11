// ============ STORY PROMPT SERVICE ============
// Handles prompt generation, story analysis, tokenization, and interactive token selection

/**
 * Generate AI prompt for story creation
 */
export function generateStoryPrompt({ level, length, topic, learningLang, nativeLang }) {
  return `
  You are a language learning assistant.

Target language: ${learningLang}
Native language: ${nativeLang}
Level: ${level}
Length: ${length}
Topic: ${topic}

Generate a story for a learner with the following profile:

REQUIREMENTS:
The story should:
- Match the learner's level (${level})
- Be natural and realistic (not robotic)
- Use mostly known vocabulary
- Introduce 15–30 new useful words or phrases based on the topic
- PARAGRAPH STRUCTURE: Divide the story into 3–5 short, clear paragraphs for easy reading. Do not output a single wall of text.

New vocabulary:
- Must be relevant and practical
- Include verbs, nouns, and expressions
- Avoid rare or poetic words

Tokenization (VERY IMPORTANT):
- Multi-word expressions MUST stay grouped as ONE token
- Examples: "me doy cuenta", "a pesar de", "por supuesto"
- Do NOT split these into individual words

Interactive design:
- The story must be easy to click word-by-word
- Avoid punctuation attached to words

OUTPUT FORMAT (STRICT JSON):

{
  "title": "A catchy title for the story",
  "story": "FULL STORY TEXT HERE",
  "tokens": [
    { "text": "token1", "translation": "..." },
    { "text": "token2", "translation": "..." }
  ]
}

RULES:
- DO NOT include explanations
- DO NOT include markdown
- ONLY return valid JSON
- Ensure tokens fully reconstruct the story when joined with spaces`;
}

/**
 * Generate AI prompt for tokenizing real-world text
 */
export function generateTextTokenizationPrompt({ rawText, level, learningLang, nativeLang, simplify = false }) {
  const simplifySection = simplify 
    ? `- Simplify to level ${level}`
    : '- Keep the original text as-is (no simplification)';

  return `You are a language learning assistant.

Convert the following real-world text into a learner-friendly version.

QUOTATION NORMALIZATION:
- Convert all "double quotes" and „smart quotes” into 'single quotes' only within the story text
- Never output double quotation marks in the final story

REQUIREMENTS:

${simplifySection}

- Keep original meaning

- Make it natural and conversational

- Extract useful vocabulary

- STRUCTURAL PRESERVATION: You must strictly preserve the original paragraph structure, stanzas, and line breaks (\n) of the source text inside the JSON "story" string. Do not collapse lines into a single block of text.


TEXT:

"${rawText}"


Tokenization (VERY IMPORTANT):
- Multi-word expressions MUST stay grouped as ONE token
- Examples: "me doy cuenta", "a pesar de", "por supuesto"
- Do NOT split these into individual words
- Preserve all punctuation in tokens

OUTPUT FORMAT (STRICT JSON):

{
  "title": "Search the Web for Accurate title based on text, otherwise generate a catchy title",
  "story": "FULL TEXT HERE (simplified if requested, or original if not)",
  "tokens": [
    { "text": "token1", "translation": "translation in ${nativeLang}" },
    { "text": "token2", "translation": "translation in ${nativeLang}" }
  ]
}

RULES:
- DO NOT include explanations
- DO NOT include markdown
- ONLY return valid JSON
- Ensure tokens fully reconstruct the story when joined with spaces
-Ensure tokens do not overlap with the pragraph break '/n' 
- Provide translations in ${nativeLang}`;
}

/**
 * Generate AI prompt for deck curation
 */
export function generateDeckCurationPrompt({ level, topic, cardCount, learningLang, nativeLang }) {
  return `You are a helpful AI assistant that creates flashcard decks for language learners.

Target language: ${learningLang}
Native language: ${nativeLang}
Level: ${level}
Topic: ${topic || 'everyday life'}
Card count: ${cardCount}

Create a JSON array of flashcards using this structure:
[
  { "question": "A word or short phrase in ${nativeLang}", "answer": "The translation in ${learningLang}", "note": "Optional: grammatical gender, a key form, or a short example sentence in ${learningLang} with its translation" }
]

Requirements:
- Generate exactly ${cardCount} flashcards
- Use practical vocabulary appropriate for the learner's level
- Keep questions in ${nativeLang} and answers in ${learningLang}
- Do not include explanations, examples, or markdown
- Return valid JSON only
- Do not wrap the JSON in text or code fences
- Use only the fields question, answer and (optionally) note for each card
- Keep each note under 80 characters

If the topic is blank, choose practical everyday vocabulary.
`;
}

/**
 * Pull the JSON object out of an AI reply: tolerates ```json fences and any chat text
 * before or after it ("Sure! Here's your story: {...} Enjoy!").
 */
export function extractJson(text) {
  const s = String(text || '').trim().replace(/^```(?:json)?\s*|\s*```$/g, '');
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  return start >= 0 && end > start ? s.slice(start, end + 1) : s;
}

/** True if the pasted text looks like an AI story reply rather than plain text to read. */
export const looksLikeStoryJson = (text) => /"story"\s*:/.test(text) && /"tokens"\s*:/.test(text);

/**
 * Parse AI response JSON
 */
export function parseStoryResponse(jsonString) {
  try {
    const data = JSON.parse(extractJson(jsonString));
    
    if (!data.story || !Array.isArray(data.tokens)) {
      throw new Error('Invalid story format: missing story or tokens array');
    }
    // Drop malformed tokens instead of crashing later when sorting/rendering.
    data.tokens = data.tokens.filter(t => t && typeof t.text === 'string' && t.text.trim());
    
    return data;
  } catch (error) {
    console.error('Failed to parse story response:', error);
    return null;
  }
}

export default {
  generateStoryPrompt,
  generateTextTokenizationPrompt,
  generateDeckCurationPrompt,
  parseStoryResponse,
  extractJson,
  looksLikeStoryJson,
};
