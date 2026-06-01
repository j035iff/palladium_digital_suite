/**
 * Normalize Morphus table citations: book names, WB suffixes, ® removal, hyphen ranges, book order.
 */
const fs = require('fs');
const path = require('path');

const TABLES_DIR = path.join('src', 'data', 'content', 'morphus', 'tables');

const BOOK_ORDER = [
  'Nightbane Core Rulebook',
  'Between the Shadows (WB1)',
  'Nightlands (WB2)',
  'Through the Glass Darkly (WB3)',
  'Shadows of Light (WB4)',
  'Nightbane Survival Guide (WB5)',
  'Dark Designs (WB6)',
];

function normalizeReference(ref) {
  const r = String(ref).replace(/®/g, '').trim();
  const lower = r.toLowerCase();
  if (
    lower.includes('core rulebook') ||
    lower === 'nightbane rpg' ||
    lower.includes('rpg (core') ||
    (lower.includes('nightbane') && lower.includes('rpg') && lower.includes('core'))
  ) {
    return 'Nightbane Core Rulebook';
  }
  if (lower.includes('between the shadows')) return 'Between the Shadows (WB1)';
  if (lower.includes('nightlands') || lower.includes('sourcebook 2')) return 'Nightlands (WB2)';
  if (lower.includes('through the glass darkly')) return 'Through the Glass Darkly (WB3)';
  if (lower.includes('shadows of light')) return 'Shadows of Light (WB4)';
  if (lower.includes('survival guide')) return 'Nightbane Survival Guide (WB5)';
  if (lower.includes('dark designs')) return 'Dark Designs (WB6)';
  return r;
}

const PROSE_FIXES = [
  [/Nightbane®\s*Dark Designs Sourcebook\s*\(WB6\)/gi, 'Dark Designs (WB6)'],
  [/Nightbane®\s*Survival Guide\s*\(WB5\)/gi, 'Nightbane Survival Guide (WB5)'],
  [/Nightbane®\s*Between the Shadows\s*\(WB1\)/gi, 'Between the Shadows (WB1)'],
  [/Nightbane®\s*Sourcebook 2:\s*Nightlands\s*\(WB2\)/gi, 'Nightlands (WB2)'],
  [/Nightbane®\s*RPG\s*\(core rulebook\)/gi, 'Nightbane Core Rulebook'],
  [/Nightbane\s+Dark Designs\s*\(WB6\)\s+Sourcebook\s*\(WB6\)/gi, 'Dark Designs (WB6)'],
  [/Nightbane\s+Core Rulebook\s*\(core rulebook\)/gi, 'Nightbane Core Rulebook'],
  [/Nightbane\s+Between the Shadows\s*\(WB1\)/gi, 'Between the Shadows (WB1)'],
  [/Nightbane\s+Sourcebook 2:\s*Nightlands\s*\(WB2\)/gi, 'Nightlands (WB2)'],
  [/Nightbane RPG/g, 'Nightbane Core Rulebook'],
  [/Nightbane Survival Guide,\s*WB5/gi, 'Nightbane Survival Guide (WB5)'],
  [/,\s*WB6,\s*pp\./gi, ', pp.'],
  [/,\s*WB1,\s*pp\./gi, ', pp.'],
  [/,\s*WB5,\s*printed\s+pp\./gi, ', pp.'],
  [/Nightbane Survival Guide,\s*WB5,\s*printed/gi, 'Nightbane Survival Guide (WB5),'],
];

function normalizeProse(text) {
  if (typeof text !== 'string' || !text) return text;
  let out = text.replace(/®/g, '').replace(/[\u2013\u2014]/g, '-');
  for (const [pattern, replacement] of PROSE_FIXES) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

function formatPages(pages) {
  const uniq = [...new Set(pages)].sort((a, b) => a - b);
  if (!uniq.length) return null;
  const ranges = [];
  let start = uniq[0];
  let prev = uniq[0];
  for (let i = 1; i < uniq.length; i++) {
    const n = uniq[i];
    if (n === prev + 1) {
      prev = n;
      continue;
    }
    ranges.push([start, prev]);
    start = n;
    prev = n;
  }
  ranges.push([start, prev]);
  if (ranges.length === 1) {
    const [a, b] = ranges[0];
    return a === b ? `p. ${a}` : `pp. ${a}-${b}`;
  }
  return `pp. ${ranges.map(([a, b]) => (a === b ? `${a}` : `${a}-${b}`)).join(', ')}`;
}

function bookSortIndex(reference) {
  const idx = BOOK_ORDER.indexOf(reference);
  return idx === -1 ? BOOK_ORDER.length : idx;
}

function collectSourcesFromEntries(entries) {
  const refs = new Map();
  for (const entry of entries) {
    const sources = Array.isArray(entry.sources) ? entry.sources : [];
    for (const src of sources) {
      if (!src || typeof src.pageNumber !== 'number') continue;
      const reference = normalizeReference(src.reference || '');
      src.reference = reference;
      if (!refs.has(reference)) refs.set(reference, []);
      refs.get(reference).push(src.pageNumber);
    }
  }
  return refs;
}

function buildCitationPrefix(displayName, refs) {
  if (refs.size === 0) return null;
  const refText = [...refs.entries()]
    .sort(([a], [b]) => bookSortIndex(a) - bookSortIndex(b))
    .map(([reference, pages]) => `${reference}, ${formatPages(pages)}`)
    .join('; ');
  const tableWord = refs.size > 1 ? 'tables' : 'table';
  return `${displayName} Morphus ${tableWord} (${refText}).`;
}

/** Match parens with one level of nesting (enough for "(WB1)" inside citation lists). */
const CITATION_PARENS = '(?:[^()]|\\([^()]*\\))*';

function stripCitationBlocks(text, displayName) {
  let tail = normalizeProse(String(text || '').trim());
  const escaped = displayName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const blockPatterns = [
    new RegExp(`${escaped} Morphus tables? \\(${CITATION_PARENS}\\)\\.\\s*`, 'gi'),
    new RegExp(`Morphus tables? \\(${CITATION_PARENS}\\)\\.\\s*`, 'gi'),
    new RegExp(`Biomechanical:\\s*Aquatic Morphus table \\(${CITATION_PARENS}\\)\\.\\s*`, 'gi'),
    new RegExp(`Bear Form Morphus table \\(${CITATION_PARENS}\\)\\.\\s*`, 'gi'),
    new RegExp(`Superbeing Morphus table \\(${CITATION_PARENS}\\)\\.\\s*`, 'gi'),
    /Disproportionate Head \(WB5 p\. \d+\)\.\s*/gi,
  ];

  let changed = true;
  while (changed) {
    changed = false;
    for (const pattern of blockPatterns) {
      const next = tail.replace(pattern, '');
      if (next !== tail) {
        tail = next;
        changed = true;
      }
    }
  }

  return tail.trim();
}

function walkNormalize(obj) {
  if (!obj || typeof obj !== 'object') return;
  if (Array.isArray(obj)) {
    for (const item of obj) walkNormalize(item);
    return;
  }
  if (typeof obj.reference === 'string') {
    obj.reference = normalizeReference(obj.reference);
  }
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      obj[key] = normalizeProse(value);
    } else if (value && typeof value === 'object') {
      walkNormalize(value);
    }
  }
}

const files = fs.readdirSync(TABLES_DIR).filter((f) => f.endsWith('.json'));
let updated = 0;

for (const file of files) {
  const fullPath = path.join(TABLES_DIR, file);
  const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  if (data.kind !== 'morphus_trait_table') continue;

  walkNormalize(data);

  const entries = Array.isArray(data.entries) ? data.entries : [];
  const refs = collectSourcesFromEntries(entries);
  const displayName = String(data.displayName || data.id || 'Morphus');
  const prefix = buildCitationPrefix(displayName, refs);

  if (prefix) {
    const tail = stripCitationBlocks(data.description, displayName);
    data.description = tail ? `${prefix} ${tail}` : prefix;
  } else if (data.description) {
    data.description = stripCitationBlocks(data.description, displayName);
  }

  fs.writeFileSync(fullPath, JSON.stringify(data, null, 2) + '\n');
  updated++;
}

console.log(`Normalized ${updated} morphus table files.`);
