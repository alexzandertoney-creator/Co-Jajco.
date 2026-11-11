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

// Spaced repetition schedule
import { scheduleCard, isDue, isNew } from '../public/js/utils.js';
const t0 = new Date('2026-01-10T15:00:00').getTime();
const c = { question: 'egg', answer: 'jajko' };
assert.ok(isNew(c));
scheduleCard(c, true, t0);   assert.equal(c.srs.interval, 1);
assert.ok(!isDue(c, t0));
assert.ok(isDue(c, new Date('2026-01-11T08:00:00').getTime())); // due next morning
scheduleCard(c, true, t0);   assert.equal(c.srs.interval, 3);
scheduleCard(c, true, t0);   assert.ok(c.srs.interval > 3);    // then grows by ease
scheduleCard(c, false, t0);  assert.equal(c.srs.interval, 0);
assert.ok(isDue(c, t0));                                          // a miss comes back today
assert.ok(c.srs.ease >= 1.3);
console.log('srs ok');

// Streak math
import { streak, bestStreak } from '../public/js/profile.js';
const key = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toLocaleDateString('en-CA'); };
const act = { [key(0)]: 3, [key(1)]: 5, [key(2)]: 1, [key(5)]: 2, [key(6)]: 2, [key(7)]: 2, [key(8)]: 2 };
assert.equal(streak(act), 3);                       // today, yesterday, day before
assert.equal(streak({ [key(1)]: 2, [key(2)]: 2 }), 2); // not studied yet today: streak still counts
assert.equal(streak({ [key(2)]: 2 }), 0);            // missed yesterday: broken
assert.equal(bestStreak(act), 4);                    // days 5–8
console.log('streak ok');
