import { itemService } from './itemService';
import { CATEGORIES } from '../utils/validation';

/**
 * Common stop words to exclude from natural language search tokenization.
 */
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
  'by', 'about', 'is', 'it', 'my', 'i', 'me', 'we', 'you', 'did', 'anyone',
  'find', 'found', 'lose', 'lost', 'have', 'seen', 'looking', 'where', 'what',
  'some', 'can', 'please', 'help', 'there', 'any', 'someone', 'item', 'belonging'
]);

/**
 * Extracts recognized campus category from query string.
 */
export function extractCategory(query) {
  const q = query.toLowerCase();
  
  if (q.includes('laptop') || q.includes('macbook') || q.includes('phone') || q.includes('iphone') || 
      q.includes('headphone') || q.includes('airpod') || q.includes('earbud') || q.includes('charger') ||
      q.includes('tablet') || q.includes('ipad') || q.includes('calculator') || q.includes('electronic')) {
    return 'Electronics';
  }
  if (q.includes('id') || q.includes('card') || q.includes('student id') || q.includes('identity')) {
    return 'ID Cards';
  }
  if (q.includes('book') || q.includes('textbook') || q.includes('notebook') || q.includes('binder') || 
      q.includes('notes') || q.includes('folder')) {
    return 'Books & Notes';
  }
  if (q.includes('pencil') || q.includes('pouch') || q.includes('pen') ||
      q.includes('eraser') || q.includes('ruler')) {
    return 'Other';
  }
  if (q.includes('key') || q.includes('keychain') || q.includes('fob')) {
    return 'Keys';
  }
  if (q.includes('bottle') || q.includes('flask') || q.includes('water bottle')) {
    return 'Water Bottles';
  }
  if (q.includes('watch') || q.includes('wristwatch') || q.includes('glasses') || 
      q.includes('sunglasses') || q.includes('wallet')) {
    return 'Accessories';
  }
  if (q.includes('jacket') || q.includes('coat') || q.includes('hoodie') || q.includes('sweater') || 
      q.includes('shirt') || q.includes('hat') || q.includes('cap') || q.includes('clothing')) {
    return 'Clothing';
  }
  if (q.includes('bag') || q.includes('backpack') || q.includes('purse') || q.includes('tote') || 
      q.includes('duffel')) {
    return 'Bags';
  }
  if (q.includes('umbrella')) {
    return 'Other';
  }

  // Exact match against CATEGORIES
  for (const cat of CATEGORIES) {
    if (q.includes(cat.toLowerCase())) {
      return cat;
    }
  }

  return null;
}

/**
 * Extracts recognized campus location from query string.
 */
export function extractLocation(query) {
  const q = query.toLowerCase();

  const locationKeywords = [
    { name: 'A-Block', terms: ['a-block', 'a block', 'ablock'] },
    { name: 'U-Block', terms: ['u-block', 'u block', 'ublock'] },
    { name: 'N-Block', terms: ['n-block', 'n block', 'nblock'] },
    { name: 'P-Block', terms: ['p-block', 'p block', 'pblock'] },
    { name: 'H-Block', terms: ['h-block', 'h block', 'hblock'] },
    { name: 'Basketball Ground', terms: ['basketball ground', 'basketball court', 'basketball'] },
    { name: 'Volleyball Ground', terms: ['volleyball ground', 'volleyball court', 'volleyball'] },
    { name: 'Main Ground', terms: ['main ground', 'ground'] },
    { name: 'Convocation', terms: ['convocation', 'convocation hall', 'auditorium'] },
    { name: 'Guest House', terms: ['guest house', 'guesthouse'] },
    { name: 'Library', terms: ['library', 'reading room', 'study hall', 'book bank'] },
    { name: 'MHP Canteen', terms: ['mhp canteen', 'mhp', 'canteen', 'cafeteria'] }
  ];

  for (const loc of locationKeywords) {
    if (loc.terms.some(t => q.includes(t))) {
      return loc.name;
    }
  }

  return null;
}

/**
 * Determines whether user query is looking for Lost, Found, or General items.
 */
export function extractTypeIntent(query) {
  const q = query.toLowerCase();
  
  if (q.includes('i lost') || q.includes('lost my') || q.includes('missing my') || q.includes('lost item')) {
    // If user lost an item, they want to find matching "found" items reported by others!
    return 'found';
  }
  
  if (q.includes('i found') || q.includes('found a') || q.includes('someone lost') || q.includes('looking for owner')) {
    // If user found an item, they want to match with "lost" items reported by owners!
    return 'lost';
  }

  if (q.includes('found items') || q.includes('recently found')) {
    return 'found';
  }

  if (q.includes('lost items') || q.includes('recently lost')) {
    return 'lost';
  }

  return 'all';
}

/**
 * Extracts search keywords from natural query text.
 */
export function extractKeywords(query) {
  return query
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !STOP_WORDS.has(word));
}

/**
 * Searches real listings in Firestore (or demo cache in demo mode)
 * using natural language criteria.
 */
export async function searchListingsWithNLP(queryText) {
  const cleanQuery = (queryText || '').trim();
  if (!cleanQuery) return { items: [], criteria: {} };

  const extractedCategory = extractCategory(cleanQuery);
  const extractedLoc = extractLocation(cleanQuery);
  const typeIntent = extractTypeIntent(cleanQuery);
  const keywords = extractKeywords(cleanQuery);

  // Retrieve items from active database
  const allItems = await itemService.getItems();

  const scoredItems = allItems.map(item => {
    let score = 0;
    const titleLower = (item.title || '').toLowerCase();
    const descLower = (item.description || '').toLowerCase();
    const locLower = (item.location || '').toLowerCase();
    const catLower = (item.category || '').toLowerCase();

    // Type matching
    if (typeIntent !== 'all') {
      if (item.type === typeIntent) {
        score += 3;
      } else {
        score -= 2;
      }
    }

    // Category matching
    if (extractedCategory && item.category === extractedCategory) {
      score += 4;
    }

    // Location matching
    if (extractedLoc && (item.location === extractedLoc || locLower.includes(extractedLoc.toLowerCase()))) {
      score += 4;
    }

    // Keyword matching
    for (const kw of keywords) {
      if (titleLower.includes(kw)) score += 5;
      if (descLower.includes(kw)) score += 2;
      if (locLower.includes(kw)) score += 3;
      if (catLower.includes(kw)) score += 3;
    }

    return { item, score };
  });

  // Filter items that have meaningful keyword / category / location overlap
  const matches = scoredItems
    .filter(entry => entry.score >= 3)
    .sort((a, b) => b.score - a.score)
    .map(entry => entry.item)
    .slice(0, 4);

  return {
    items: matches,
    criteria: {
      category: extractedCategory,
      location: extractedLoc,
      typeIntent,
      keywords
    }
  };
}
