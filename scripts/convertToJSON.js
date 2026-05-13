import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Needed for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Define input/output paths first
const inputPath = path.join(__dirname, '../public/vocab/spanish_words.txt');
const outputPath = path.join(__dirname, '../public/vocab/spanish_words.json');

// Now you can log
console.log("Reading file from:", inputPath);

// Read the file
const data = fs.readFileSync(inputPath, 'utf-8');
const lines = data.split('\n');

const cards = lines
  .map(line => line.trim())
  .filter(Boolean)
  .map(line => {
    const parts = line.split(/\t+/); // split by tab
    return {
      question: parts[0],
      type: parts[1] || "",
      answer: parts[2] || ""
    };
  })
  .filter(Boolean);

// Write JSON
fs.writeFileSync(outputPath, JSON.stringify(cards, null, 2));
console.log('Done! Created spanish_words.json with', cards.length, 'cards including word types.');
