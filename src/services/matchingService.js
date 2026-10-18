import { itemService } from './itemService';

const DISMISSED_MATCHES_KEY = 'campusfind_dismissed_matches';

function getDismissedMatchKeys() {
  try {
    const raw = localStorage.getItem(DISMISSED_MATCHES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveDismissedMatchKey(key) {
  try {
    const current = getDismissedMatchKeys();
    if (!current.includes(key)) {
      localStorage.setItem(DISMISSED_MATCHES_KEY, JSON.stringify([...current, key]));
    }
  } catch {
    // Ignore
  }
}

const COMMON_COLORS = [
  'black', 'white', 'blue', 'navy', 'red', 'silver', 'grey', 'gray',
  'gold', 'green', 'yellow', 'brown', 'pink', 'maroon', 'orange', 'purple'
];

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
  'by', 'about', 'is', 'it', 'my', 'i', 'me', 'we', 'you', 'did', 'anyone',
  'find', 'found', 'lose', 'lost', 'have', 'seen', 'looking', 'where', 'what',
  'some', 'can', 'please', 'help', 'there', 'any', 'someone', 'item', 'belonging',
  'sample', 'listing', 'demo'
]);

function tokenize(text) {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
}

export const matchingService = {
  /**
   * Calculates similarity between a lost item and a found item.
   * Returns { score: number, reasons: Array<string> }
   */
  calculateMatch(lostItem, foundItem) {
    if (!lostItem || !foundItem) return { score: 0, reasons: [] };
    if (lostItem.id === foundItem.id) return { score: 0, reasons: [] };
    if (lostItem.status === 'resolved' || foundItem.status === 'resolved') {
      return { score: 0, reasons: [] };
    }
    if (lostItem.type !== 'lost' || foundItem.type !== 'found') {
      return { score: 0, reasons: [] };
    }

    let score = 0;
    const reasons = [];

    // 1. Category Matching (Weight: 35%)
    if (lostItem.category && foundItem.category && lostItem.category === foundItem.category) {
      score += 35;
      reasons.push(`Exact category match: "${lostItem.category}"`);
    }

    // 2. Campus Location Matching (Weight: 25%)
    if (lostItem.location && foundItem.location) {
      if (lostItem.location === foundItem.location) {
        if (lostItem.floor && foundItem.floor && lostItem.floor === foundItem.floor) {
          score += 25;
          reasons.push(`Reported in the same building and floor (${lostItem.location}, ${lostItem.floor})`);
        } else {
          score += 20;
          reasons.push(`Reported at the same campus location (${lostItem.location})`);
        }
      } else {
        // Proximity between grounds or adjacent blocks
        const grounds = ['Main Ground', 'Basketball Ground', 'Volleyball Ground'];
        if (grounds.includes(lostItem.location) && grounds.includes(foundItem.location)) {
          score += 10;
          reasons.push(`Both reported around outdoor sports grounds (${lostItem.location} & ${foundItem.location})`);
        }
      }
    }

    // 3. Keyword / Token Overlap in Title and Description (Weight: 20%)
    const lostTokens = new Set([
      ...tokenize(lostItem.title),
      ...tokenize(lostItem.description),
      ...tokenize(lostItem.features)
    ]);
    const foundTokens = new Set([
      ...tokenize(foundItem.title),
      ...tokenize(foundItem.description),
      ...tokenize(foundItem.features)
    ]);

    const overlappingTokens = [...lostTokens].filter((t) => foundTokens.has(t));
    if (overlappingTokens.length > 0) {
      const tokenScore = Math.min(20, overlappingTokens.length * 7);
      score += tokenScore;
      const displayTokens = overlappingTokens.slice(0, 3).map((t) => `"${t}"`).join(', ');
      reasons.push(`Matching keywords in descriptions: ${displayTokens}`);
    }

    // 4. Color and Distinguishing Characteristics (Weight: 10%)
    const lostCombinedText = `${lostItem.title} ${lostItem.description || ''} ${lostItem.features || ''}`.toLowerCase();
    const foundCombinedText = `${foundItem.title} ${foundItem.description || ''} ${foundItem.features || ''}`.toLowerCase();

    const sharedColors = COMMON_COLORS.filter(
      (c) => lostCombinedText.includes(c) && foundCombinedText.includes(c)
    );
    if (sharedColors.length > 0) {
      score += 10;
      reasons.push(`Similar color attributes detected: ${sharedColors.join(', ')}`);
    }

    // 5. Date Window Proximity (Weight: 10%)
    const lostDate = new Date(lostItem.eventDate || lostItem.createdAt || 0);
    const foundDate = new Date(foundItem.eventDate || foundItem.createdAt || 0);

    if (!isNaN(lostDate.getTime()) && !isNaN(foundDate.getTime())) {
      const diffDays = Math.abs(Math.round((foundDate - lostDate) / (1000 * 60 * 60 * 24)));
      if (diffDays <= 2) {
        score += 10;
        reasons.push(`Reported within 48 hours of each other (${diffDays === 0 ? 'same day' : `${diffDays} days apart`})`);
      } else if (diffDays <= 7) {
        score += 7;
        reasons.push(`Reported within 1 week (${diffDays} days apart)`);
      } else if (diffDays <= 14) {
        score += 4;
        reasons.push(`Reported within 2 weeks (${diffDays} days apart)`);
      }
    }

    return {
      score: Math.min(100, Math.round(score)),
      reasons
    };
  },

  /**
   * Finds all potential matches for a given lost item against active found listings.
   */
  async getMatchesForLostItem(lostItem) {
    if (!lostItem || lostItem.type !== 'lost') return [];

    const allItems = await itemService.getItems();
    const foundItems = allItems.filter(
      (i) => i.type === 'found' && i.status !== 'resolved' && i.status !== 'closed' && i.id !== lostItem.id
    );

    const dismissed = getDismissedMatchKeys();

    const matches = foundItems
      .map((found) => {
        const matchKey = `${lostItem.id}_${found.id}`;
        if (dismissed.includes(matchKey)) return null;

        const { score, reasons } = this.calculateMatch(lostItem, found);
        if (score >= 40) {
          return {
            matchKey,
            lostItem,
            foundItem: found,
            score,
            confidence: score >= 75 ? 'High' : score >= 55 ? 'Moderate' : 'Potential',
            reasons
          };
        }
        return null;
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score);

    return matches;
  },

  /**
   * Finds all matches across all lost items owned by a student.
   */
  async getAllMatchesForUser(userUid) {
    if (!userUid) return [];

    const allItems = await itemService.getItems();
    const userLostItems = allItems.filter(
      (i) => i.ownerUid === userUid && i.type === 'lost' && i.status !== 'resolved' && i.status !== 'closed'
    );

    const allMatches = [];
    for (const lost of userLostItems) {
      const itemMatches = await this.getMatchesForLostItem(lost);
      allMatches.push(...itemMatches);
    }

    return allMatches.sort((a, b) => b.score - a.score);
  },

  /**
   * Dismisses a suggested match so it doesn't clutter the user's dashboard.
   */
  dismissMatch(matchKey) {
    saveDismissedMatchKey(matchKey);
  }
};
export default matchingService;