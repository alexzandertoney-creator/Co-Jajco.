// Self-check for the answer grader: node scripts/checkGrading.mjs
import assert from 'node:assert/strict';
import { gradeAnswer as g, esc } from '../public/js/utils.js';

assert.equal(g('Dziękuję', 'dziękuję').result, 'correct');
assert.equal(g('  dziękuję! ', 'Dziękuję.').result, 'correct');
assert.equal(g('dziekuje', 'dziękuję').result, 'almost');
assert.equal(g('zolw', 'żółw').result, 'almost');
assert.equal(g('hi', 'hello / hi').result, 'correct');
assert.equal(g('hi', 'hello / hi').expected, 'hi');
assert.equal(g('helo', 'hello').result, 'almost');      // one typo, 5+ letters
assert.equal(g('cat', 'car').result, 'wrong');          // short words must be exact
assert.equal(g('', 'jajko').result, 'wrong');
assert.equal(g('mleko', 'jajko').result, 'wrong');
assert.equal(esc('<img onerror=x>"\''), '&lt;img onerror=x&gt;&quot;&#39;');
console.log('grading ok');
