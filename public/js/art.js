// ============ ARTWORK ============
// Hand-built SVG art for the "field guide" look: the Bigfoot mascot in a few
// poses and the embroidered merit patches. Plain strings so any page can use them.

const FUR = '#6e4b32';
const FUR_DARK = '#523522';
const FUR_LIGHT = '#8a6142';
const SKIN = '#e0bd93';
const SKIN_SHADE = '#c99f72';
const INK = '#2b2118';

// Shared body: the arms are added per pose.
function body({ eyes = 'open' } = {}) {
  const eyesSvg = eyes === 'closed'
    ? `<path d="M83 80q5 4 10 0M107 80q5 4 10 0" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`
    : eyes === 'down'
    ? `<circle cx="88" cy="82" r="4.6" fill="${INK}"/><circle cx="112" cy="82" r="4.6" fill="${INK}"/>`
    : `<circle cx="88" cy="79" r="4.6" fill="${INK}"/><circle cx="112" cy="79" r="4.6" fill="${INK}"/>
       <circle cx="89.6" cy="77.4" r="1.5" fill="#fff"/><circle cx="113.6" cy="77.4" r="1.5" fill="#fff"/>`;
  return `
    <ellipse cx="100" cy="214" rx="64" ry="7" fill="${INK}" opacity=".12"/>
    <path d="M38 208c-4-58 12-96 62-100 50 4 66 42 62 100-20 8-104 8-124 0Z" fill="${FUR}"/>
    <path d="M52 200c4-30 10-48 22-58M148 200c-4-30-10-48-22-58" fill="none" stroke="${FUR_DARK}" stroke-width="3" stroke-linecap="round" opacity=".55"/>
    <ellipse cx="100" cy="166" rx="34" ry="38" fill="${FUR_LIGHT}"/>
    <path d="M86 150l4 8M100 146v9M114 150l-4 8M90 172l4 7M110 172l-4 7" stroke="${FUR}" stroke-width="2.5" stroke-linecap="round"/>
    <ellipse cx="74" cy="210" rx="20" ry="9" fill="${FUR_DARK}"/><ellipse cx="126" cy="210" rx="20" ry="9" fill="${FUR_DARK}"/>
    <path d="M52 66c-2-22 18-40 48-40s50 18 48 40l6 4-8 2c4 30-18 50-46 50s-50-20-46-50l-8-2Z" fill="${FUR}"/>
    <path d="M70 32l6-12 6 10 8-14 6 12 8-14 6 12 8-12 6 12" fill="none" stroke="${FUR}" stroke-width="8" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="M70 66c0-12 14-18 30-18s30 6 30 18v14c0 22-14 34-30 34S70 102 70 80Z" fill="${SKIN}"/>
    <path d="M76 70q12-8 22-2M102 68q10-6 22 2" fill="none" stroke="${FUR_DARK}" stroke-width="4.5" stroke-linecap="round"/>
    ${eyesSvg}
    <ellipse cx="100" cy="91" rx="8" ry="5.5" fill="${INK}"/>
    <path d="M90 101q10 9 20 0" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
    <ellipse cx="80" cy="93" rx="6" ry="3.5" fill="#d98a6a" opacity=".45"/><ellipse cx="120" cy="93" rx="6" ry="3.5" fill="#d98a6a" opacity=".45"/>`;
}

const ARMS = {
  // Right arm raised in a wave, left arm resting.
  wave: `
    <path d="M44 128c-14 18-16 44-8 62" fill="none" stroke="${FUR}" stroke-width="22" stroke-linecap="round"/>
    <ellipse cx="38" cy="192" rx="11" ry="10" fill="${SKIN_SHADE}"/>
    <path d="M154 126c16-14 24-38 22-62" fill="none" stroke="${FUR}" stroke-width="22" stroke-linecap="round"/>
    <g class="mascot-hand"><ellipse cx="176" cy="56" rx="13" ry="14" fill="${SKIN}"/>
    <path d="M168 46v-8M175 44v-10M182 46v-8" stroke="${SKIN}" stroke-width="6" stroke-linecap="round"/></g>`,
  // Both arms up in celebration.
  cheer: `
    <path d="M48 126c-18-14-26-38-24-62M152 126c18-14 26-38 24-62" fill="none" stroke="${FUR}" stroke-width="22" stroke-linecap="round"/>
    <ellipse cx="24" cy="56" rx="13" ry="14" fill="${SKIN}"/><ellipse cx="176" cy="56" rx="13" ry="14" fill="${SKIN}"/>
    <path d="M14 30l-6-8M24 26v-10M34 30l6-8M166 30l-6-8M176 26v-10M186 30l6-8" stroke="#e8a92a" stroke-width="4" stroke-linecap="round"/>`,
  // Arms bent forward, holding the book drawn in front (see BOOK).
  read: `
    <path d="M46 130c-8 18-4 34 20 40M154 130c8 18 4 34-20 40" fill="none" stroke="${FUR}" stroke-width="22" stroke-linecap="round"/>`,
  // Hands folded on the belly (paired with closed eyes for the nap pose).
  rest: `
    <path d="M46 130c-8 20-4 40 22 46M154 130c8 20 4 40-22 46" fill="none" stroke="${FUR}" stroke-width="22" stroke-linecap="round"/>
    <ellipse cx="84" cy="178" rx="13" ry="10" fill="${SKIN_SHADE}"/><ellipse cx="116" cy="178" rx="13" ry="10" fill="${SKIN_SHADE}"/>`,
};

const ZZZ = `<g class="mascot-zzz" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity=".55">
  <path d="M150 40h12l-12 12h12"/><path d="M168 18h9l-9 9h9"/></g>`;

// An open book held in front of the belly; .mascot-page flips over and over (CSS).
const BOOK = `
  <g class="mascot-book" stroke="${INK}" stroke-linejoin="round">
    <path d="M100 150 66 145v38l34 5Z" fill="#f1e7cf" stroke-width="2.5"/>
    <path d="M100 150 134 145v38l-34 5Z" fill="#fbf6ea" stroke-width="2.5"/>
    <path d="M72 155l22 3M72 163l22 3M72 171l17 2M106 158l22-3M106 166l22-3M106 174l16-2" stroke-width="1.6" opacity=".35"/>
    <path class="mascot-page" d="M100 150 132 146v36l-32 5Z" fill="#fbf6ea" stroke-width="1.8"/>
    <path d="M62 184l38 6 38-6" fill="none" stroke="#b5472e" stroke-width="4" stroke-linecap="round"/>
  </g>
  <ellipse cx="64" cy="168" rx="10" ry="12" fill="${SKIN}"/><ellipse cx="136" cy="168" rx="10" ry="12" fill="${SKIN}"/>`;

/** The one loading indicator used everywhere: Bigfoot bobbing above a short message. */
export function loader(text = 'Loading…') {
  return `<div class="loader" role="status" aria-live="polite">${mascot('read')}<p class="meta">${text}</p></div>`;
}

/** Bigfoot. pose: 'wave' | 'cheer' | 'rest' | 'read' (reading a book, used while loading) */
export function mascot(pose = 'wave', className = '') {
  const art = pose === 'rest' ? body({ eyes: 'closed' }) + ARMS.rest + ZZZ
    : pose === 'read' ? ARMS.read + body({ eyes: 'down' }) + BOOK
    : (ARMS[pose] || ARMS.wave) + body();
  return `<svg class="mascot mascot-${pose} ${className}" viewBox="0 0 200 224" aria-hidden="true" focusable="false">${art}</svg>`;
}

// ---------- Merit patches ----------

const PATCH_ICONS = {
  sprout: '<path d="M50 66V46"/><path d="M50 50c-10 0-16-6-16-16 10 0 16 6 16 16Zm0-4c0-10 6-16 16-16 0 10-6 16-16 16Z"/>',
  books: '<path d="M34 64V38h8v26M44 64V34h8v30M55 64l6-28 8 2-6 28Z"/><path d="M30 64h40"/>',
  mountain: '<path d="M28 64l14-22 8 10 8-14 14 26Z"/><path d="M50 38l4 6"/>',
  flag: '<path d="M28 66l16-26 8 10 6-8 14 24Z"/><path d="M58 42V26l10 4-10 4"/>',
  flame: '<path d="M50 30c2 10 14 14 14 26a14 14 0 0 1-28 0c0-7 4-10 6-16 4 3 6 6 6 10 2-6 3-12 2-20Z"/>',
  campfire: '<path d="M50 30c2 8 10 11 10 20a10 10 0 0 1-20 0c0-5 3-8 4-12 3 2 4 4 4 7 2-4 2-9 2-15Z"/><path d="M32 66l36-8M32 58l36 8"/>',
  star: '<path d="m50 30 6 12 13 2-9 9 2 13-12-6-12 6 2-13-9-9 13-2Z"/>',
  pine: '<path d="M50 28l14 18h-7l10 12h-8l9 10H32l9-10h-8l10-12h-7Z"/><path d="M50 68v4"/>',
};

/** An embroidered patch. tone picks the fabric colour; locked patches render grey. */
export function patch(icon, tone = 'pine', locked = false) {
  const fills = { pine: ['#24402e', '#2f5440'], bark: ['#5a3d29', '#6e4b32'], yolk: ['#c98c12', '#e8a92a'], moss: ['#3d6b47', '#4e8a52'], sky: ['#2f5a6b', '#3f7488'] };
  const [edge, cloth] = locked ? ['#b9beb0', '#d8dbd1'] : fills[tone] || fills.pine;
  const thread = locked ? '#eceee8' : '#fafaf6';
  return `<svg class="patch${locked ? ' locked' : ''}" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
    <circle cx="50" cy="50" r="48" fill="${edge}"/>
    <circle cx="50" cy="50" r="42" fill="${cloth}"/>
    <circle cx="50" cy="50" r="42" fill="none" stroke="${thread}" stroke-width="1.6" stroke-dasharray="3.2 2.4" opacity=".85"/>
    <circle cx="50" cy="50" r="33" fill="none" stroke="${edge}" stroke-width="1" opacity=".5"/>
    <g fill="none" stroke="${thread}" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round">${PATCH_ICONS[icon] || PATCH_ICONS.star}</g>
  </svg>`;
}
