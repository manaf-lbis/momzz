/**
 * Advanced Search & Fuzzy Matching Algorithm for Momzz (Frontend)
 * Handles typos, whitespace differences, punctuation variations, word order,
 * phonetic similarities, and duplicate prevention for products & services.
 */

export interface SearchExtractors<T> {
  getTitle: (item: T) => string;
  getSku?: (item: T) => string | undefined;
  getCategory?: (item: T) => string | undefined;
  getDescription?: (item: T) => string | undefined;
}

export interface ScoredResult<T> {
  item: T;
  score: number;
  matchType: 'EXACT' | 'EXACT_NORMALIZED' | 'PREFIX' | 'ALL_TOKENS' | 'FUZZY_TOKEN' | 'FUZZY_SUBSTRING' | 'NONE';
}

/**
 * Normalizes text:
 * - Lowercases
 * - Replaces diacritics / accents
 * - Expands common symbols (& -> and, + -> plus, etc.)
 * - Replaces punctuation, hyphens, and slashes with spaces
 * - Collapses consecutive whitespace to a single space
 */
export function normalizeSearchText(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/\+/g, ' plus ')
    .replace(/[/\\_\-.,:;()[\]{}#@!|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Strips all non-alphanumeric characters.
 * Useful for matching "10W-40" with "10w40", "air-filter" with "airfilter".
 */
export function stripToAlphanumeric(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Breaks string into clean tokens.
 */
export function tokenize(text: string | null | undefined): string[] {
  const norm = normalizeSearchText(text);
  if (!norm) return [];
  return norm.split(' ').filter((t) => t.length > 0);
}

/**
 * Fast Damerau-Levenshtein distance calculation.
 */
export function damerauLevenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const lenA = a.length;
  const lenB = b.length;
  if (lenA === 0) return lenB;
  if (lenB === 0) return lenA;

  if (lenA > lenB) {
    const tmpS = a; a = b; b = tmpS;
  }

  const d: number[][] = [];
  for (let i = 0; i <= a.length; i++) {
    d[i] = [i];
  }
  for (let j = 0; j <= b.length; j++) {
    d[0][j] = j;
  }

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + cost
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + cost);
      }
    }
  }

  return d[a.length][b.length];
}

/**
 * Normalized similarity score [0.0 - 1.0] based on edit distance.
 */
export function editSimilarity(a: string, b: string): number {
  if (a === b) return 1.0;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1.0;
  const dist = damerauLevenshtein(a, b);
  return Math.max(0, 1 - dist / maxLen);
}

/**
 * Generates character n-grams.
 */
export function generateNgrams(text: string, n = 2): Set<string> {
  const ngrams = new Set<string>();
  if (text.length < n) {
    if (text.length > 0) ngrams.add(text);
    return ngrams;
  }
  for (let i = 0; i <= text.length - n; i++) {
    ngrams.add(text.substring(i, i + n));
  }
  return ngrams;
}

/**
 * Dice coefficient of n-grams [0.0 - 1.0].
 */
export function ngramSimilarity(a: string, b: string, n = 2): number {
  if (a === b) return 1.0;
  const ngramsA = generateNgrams(a, n);
  const ngramsB = generateNgrams(b, n);
  if (ngramsA.size === 0 || ngramsB.size === 0) return 0.0;

  let intersection = 0;
  for (const gram of ngramsA) {
    if (ngramsB.has(gram)) intersection++;
  }

  return (2 * intersection) / (ngramsA.size + ngramsB.size);
}

const SYNONYMS: Record<string, string[]> = {
  fr: ['front'],
  rr: ['rear'],
  lh: ['left', 'left hand'],
  rh: ['right', 'right hand'],
  eng: ['engine'],
  oil: ['lubricant', 'mobil', 'motul', 'castrol', 'servicing'],
  fltr: ['filter'],
  filtr: ['filter'],
  brk: ['brake'],
  breake: ['brake'],
  disc: ['disk', 'rotor'],
  syn: ['synthetic'],
  synth: ['synthetic'],
  semi: ['semisynthetic', 'semi synthetic'],
  ac: ['air conditioning', 'aircon', 'climate'],
  coolant: ['radiator', 'antifreeze'],
  plug: ['spark plug', 'glow plug'],
  plugs: ['spark plugs'],
  tyre: ['tire'],
  tires: ['tyres'],
  serv: ['service', 'servicing'],
  gen: ['general'],
  oem: ['original', 'genuine'],
};

/**
 * Evaluates match quality between a search query and a target item.
 * Produces a score from 0 to 1000.
 */
export function calculateMatchScore(
  query: string,
  targetTitle: string,
  targetSku?: string,
  targetCategory?: string,
  targetDescription?: string
): { score: number; matchType: ScoredResult<any>['matchType'] } {
  const rawQ = query.trim();
  if (!rawQ) return { score: 1000, matchType: 'EXACT' };

  const normQ = normalizeSearchText(rawQ);
  const stripQ = stripToAlphanumeric(rawQ);
  const qTokens = tokenize(normQ);

  const rawTitle = targetTitle || '';
  const normTitle = normalizeSearchText(rawTitle);
  const stripTitle = stripToAlphanumeric(rawTitle);
  const titleTokens = tokenize(normTitle);

  // 1. EXACT MATCHES
  if (rawTitle.toLowerCase() === rawQ.toLowerCase()) {
    return { score: 1000, matchType: 'EXACT' };
  }
  if (normTitle === normQ) {
    return { score: 980, matchType: 'EXACT_NORMALIZED' };
  }
  if (stripTitle === stripQ && stripQ.length >= 3) {
    return { score: 960, matchType: 'EXACT_NORMALIZED' };
  }

  // 2. SKU / CODE EXACT OR PREFIX MATCH
  if (targetSku) {
    const normSku = normalizeSearchText(targetSku);
    const stripSku = stripToAlphanumeric(targetSku);
    if (normSku === normQ || stripSku === stripQ) {
      return { score: 990, matchType: 'EXACT' };
    }
    if (normSku.startsWith(normQ) || (stripSku.startsWith(stripQ) && stripQ.length >= 2)) {
      return { score: 940, matchType: 'PREFIX' };
    }
  }

  // 3. PREFIX MATCHES
  if (normTitle.startsWith(normQ)) {
    return { score: 920, matchType: 'PREFIX' };
  }
  if (stripTitle.startsWith(stripQ) && stripQ.length >= 3) {
    return { score: 890, matchType: 'PREFIX' };
  }

  // 4. SUBSTRING & WORD BOUNDARY MATCH
  if (normTitle.includes(normQ)) {
    const wordBoundaryRegex = new RegExp(`\\b${normQ.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (wordBoundaryRegex.test(normTitle)) {
      return { score: 850, matchType: 'ALL_TOKENS' };
    }
    return { score: 780, matchType: 'ALL_TOKENS' };
  }
  if (stripTitle.includes(stripQ) && stripQ.length >= 3) {
    return { score: 740, matchType: 'ALL_TOKENS' };
  }

  // 5. MULTI-TOKEN ORDER-AGNOSTIC MATCH
  if (qTokens.length > 0) {
    let matchedTokenScoreSum = 0;
    let tokensFullyMatched = 0;

    for (const qToken of qTokens) {
      let bestTokenScore = 0;

      for (const tToken of titleTokens) {
        if (tToken === qToken) {
          bestTokenScore = Math.max(bestTokenScore, 1.0);
          break;
        }
        if (tToken.startsWith(qToken)) {
          bestTokenScore = Math.max(bestTokenScore, 0.88);
        } else if (qToken.startsWith(tToken) && tToken.length >= 3) {
          bestTokenScore = Math.max(bestTokenScore, 0.75);
        } else {
          const syns = SYNONYMS[qToken] || [];
          if (syns.some((s) => tToken.includes(s) || s.includes(tToken))) {
            bestTokenScore = Math.max(bestTokenScore, 0.85);
          } else {
            const sim = editSimilarity(qToken, tToken);
            if (sim >= 0.75) {
              bestTokenScore = Math.max(bestTokenScore, sim * 0.85);
            }
          }
        }
      }

      if (bestTokenScore === 0 && normTitle.includes(qToken)) {
        bestTokenScore = 0.7;
      }

      if (bestTokenScore < 0.6 && targetCategory) {
        const normCat = normalizeSearchText(targetCategory);
        if (normCat.includes(qToken)) {
          bestTokenScore = Math.max(bestTokenScore, 0.65);
        }
      }

      if (bestTokenScore >= 0.7) {
        tokensFullyMatched++;
      }
      matchedTokenScoreSum += bestTokenScore;
    }

    const tokenCoverage = matchedTokenScoreSum / qTokens.length;

    if (tokensFullyMatched === qTokens.length) {
      const score = Math.round(650 + tokenCoverage * 180);
      return { score, matchType: 'ALL_TOKENS' };
    }

    if (tokenCoverage >= 0.5) {
      const score = Math.round(tokenCoverage * 600);
      return { score, matchType: 'FUZZY_TOKEN' };
    }
  }

  // 6. GLOBAL FUZZY / N-GRAM SIMILARITY
  const overallEditSim = editSimilarity(normQ, normTitle);
  const bigramSim = ngramSimilarity(normQ, normTitle, 2);
  const trigramSim = ngramSimilarity(normQ, normTitle, 3);
  const strippedBigramSim = ngramSimilarity(stripQ, stripTitle, 2);

  const maxFuzzySim = Math.max(overallEditSim, bigramSim, trigramSim, strippedBigramSim);

  if (maxFuzzySim >= 0.65) {
    const score = Math.round(maxFuzzySim * 600);
    return { score, matchType: 'FUZZY_SUBSTRING' };
  }

  // 7. CONTEXTUAL MATCH (Description / Category)
  if (targetDescription) {
    const normDesc = normalizeSearchText(targetDescription);
    if (normDesc.includes(normQ)) {
      return { score: 320, matchType: 'FUZZY_SUBSTRING' };
    }
  }

  return { score: 0, matchType: 'NONE' };
}

/**
 * Filters and ranks items based on the advanced search algorithm.
 */
export function advancedSearch<T>(
  items: T[],
  query: string,
  extractors: SearchExtractors<T>,
  threshold = 200
): T[] {
  if (!query || !query.trim()) {
    return items;
  }

  const scored: ScoredResult<T>[] = [];

  for (const item of items) {
    const title = extractors.getTitle(item);
    const sku = extractors.getSku ? extractors.getSku(item) : undefined;
    const category = extractors.getCategory ? extractors.getCategory(item) : undefined;
    const description = extractors.getDescription ? extractors.getDescription(item) : undefined;

    const { score, matchType } = calculateMatchScore(query, title, sku, category, description);

    if (score >= threshold) {
      scored.push({ item, score, matchType });
    }
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    const titleA = extractors.getTitle(a.item);
    const titleB = extractors.getTitle(b.item);
    return titleA.length - titleB.length;
  });

  return scored.map((s) => s.item);
}

/**
 * Checks if a candidate title is a duplicate or near-duplicate of an existing item.
 */
export function findDuplicateCandidates<T>(
  candidateTitle: string,
  existingItems: T[],
  getTitle: (item: T) => string,
  threshold = 0.82
): Array<{ item: T; similarity: number; reason: string }> {
  const normCandidate = normalizeSearchText(candidateTitle);
  const stripCandidate = stripToAlphanumeric(candidateTitle);
  const candidateTokens = tokenize(normCandidate).sort().join(' ');

  const duplicates: Array<{ item: T; similarity: number; reason: string }> = [];

  for (const item of existingItems) {
    const rawExisting = getTitle(item);
    const normExisting = normalizeSearchText(rawExisting);
    const stripExisting = stripToAlphanumeric(rawExisting);
    const existingTokens = tokenize(normExisting).sort().join(' ');

    if (normCandidate === normExisting) {
      duplicates.push({
        item,
        similarity: 1.0,
        reason: `Exact match with "${rawExisting}"`,
      });
      continue;
    }

    if (stripCandidate === stripExisting && stripCandidate.length >= 3) {
      duplicates.push({
        item,
        similarity: 0.98,
        reason: `Spelling/spacing identical to "${rawExisting}"`,
      });
      continue;
    }

    if (candidateTokens === existingTokens && candidateTokens.length >= 4) {
      duplicates.push({
        item,
        similarity: 0.95,
        reason: `Same words as "${rawExisting}"`,
      });
      continue;
    }

    const editSim = editSimilarity(normCandidate, normExisting);
    const bigramSim = ngramSimilarity(normCandidate, normExisting, 2);
    const combinedSim = editSim * 0.6 + bigramSim * 0.4;

    if (combinedSim >= threshold) {
      duplicates.push({
        item,
        similarity: Math.round(combinedSim * 100) / 100,
        reason: `Very similar name to "${rawExisting}" (${Math.round(combinedSim * 100)}% match)`,
      });
    }
  }

  duplicates.sort((a, b) => b.similarity - a.similarity);
  return duplicates;
}
