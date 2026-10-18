import { searchListingsWithNLP } from './itemSearchService';

const AI_ENDPOINT_URL = import.meta.env.VITE_AI_ENDPOINT_URL || '';

/**
 * Handles communication with the AI assistant backend or local NLP search fallback.
 */
export const chatService = {
  /**
   * Process a user chat message
   * @param {string} userMessage
   * @param {Array} history
   * @returns {Promise<{text: string, matchedItems: Array, quickReplies: Array, isBackend: boolean}>}
   */
  async sendMessage(userMessage, history = []) {
    const trimmed = (userMessage || '').trim();
    if (!trimmed) {
      return {
        text: "Please provide a query or describe the item you are looking for.",
        matchedItems: [],
        quickReplies: ['Search for my lost item', 'Show recently found items', 'How do I report an item?'],
        isBackend: false
      };
    }

    // 1. Try Backend Cloud Function if endpoint is configured
    if (AI_ENDPOINT_URL) {
      try {
        const response = await fetch(AI_ENDPOINT_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: trimmed,
            history: history.slice(-6).map(m => ({ sender: m.sender, text: m.text }))
          })
        });

        if (response.ok) {
          const data = await response.json();
          return {
            text: data.reply || data.text,
            matchedItems: data.matchedItems || [],
            quickReplies: data.quickReplies || [],
            isBackend: true
          };
        } else {
          console.warn(`AI Backend returned ${response.status}. Falling back to local search engine.`);
        }
      } catch (err) {
        console.warn('AI Backend endpoint unreachable. Falling back to local search engine:', err);
      }
    }

    // 2. Intelligent Local Search & Guidance Fallback (Guaranteed zero-hallucination)
    return this.generateLocalResponse(trimmed);
  },

  /**
   * Generates a safe, database-grounded response using local NLP search.
   */
  async generateLocalResponse(queryText) {
    const lower = queryText.toLowerCase();

    // Check 1: How to report guidance
    if (lower.includes('how do i report') || lower.includes('how to report') || lower.includes('report an item') || lower.includes('post an item')) {
      return {
        text: `Here is how you can report an item on CampusFind:

1. **Click "Report an Item"** in the top navigation bar or go directly to the [Report Page](/report).
2. **Choose the report type**: select whether you *Lost* an item or *Found* someone's belonging.
3. **Add item details**: Title, Category, Campus Building / Area, and Date.
4. **Upload a clear photo** (JPG, PNG, WebP up to 5 MB) if you have one.
5. **Describe with safety in mind**: Keep at least one identifying secret detail private so you can verify claimants!

Would you like to report an item now?`,
        matchedItems: [],
        quickReplies: ['I Lost an Item', 'I Found an Item', 'Campus safety tips'],
        isBackend: false
      };
    }

    // Check 2: How CampusFind works / General recovery workflow
    if (lower.includes('how does campusfind work') || lower.includes('how it works') || lower.includes('how to recover') || lower.includes('claim an item')) {
      return {
        text: `CampusFind helps connect lost belongings with their owners through a secure 3-step process:

- **1. Report**: Students post details and photos of lost or found belongings.
- **2. Connect Securely**: When you spot your belonging, submit an in-app recovery claim with proof of ownership. Direct phone numbers and emails are never exposed publicly.
- **3. Safe Hand-Off**: Meet at designated campus hubs (like Library reception or A-Block help desk) to verify ownership and safely return the item.`,
        matchedItems: [],
        quickReplies: ['Search for my lost item', 'Show recently found items', 'How do I report an item?'],
        isBackend: false
      };
    }

    // Check 3: Safety guidelines
    if (lower.includes('safety') || lower.includes('safe') || lower.includes('trust') || lower.includes('scam')) {
      return {
        text: `Here are our **Campus Trust & Safety Guidelines**:

- 🔒 **Never share passwords or SSNs**: Never disclose device passcodes, PINs, or ID card numbers in public descriptions.
- 🏛️ **Meet in daylight at campus hubs**: Arrange hand-offs at official spots such as the Library Entrance or A-Block / U-Block Help Desks.
- 🚫 **Zero cash demands**: Returning items is a community service. Demanding money or ransom is strictly prohibited.
- 👮 **Surrender high-value items**: Unclaimed credit cards, car keys, or driver licenses should be handed over to Campus Security.`,
        matchedItems: [],
        quickReplies: ['Show recently found items', 'How do I report an item?'],
        isBackend: false
      };
    }

    // Check 4: Dashboard questions
    if (lower.includes('dashboard') || lower.includes('my items') || lower.includes('my reports')) {
      return {
        text: `You can manage your reported items and incoming claims from your [User Dashboard](/dashboard):
- View, edit, or delete your reported items.
- Review incoming recovery claims from other students.
- Accept or decline claims and mark belongings as **Returned & Recovered**.`,
        matchedItems: [],
        quickReplies: ['Show recently found items', 'How do I report an item?'],
        isBackend: false
      };
    }

    // Check 5: Query too short or ambiguous
    if (queryText.trim().split(/\s+/).length < 2 && !lower.includes('all') && !lower.includes('found') && !lower.includes('lost')) {
      return {
        text: `Could you tell me a little more? For example:
- What kind of item is it (e.g. *MacBook*, *water bottle*, *student ID*, *jacket*)?
- Which campus location was it in (e.g. *A-Block*, *Library*, *MHP Canteen*, *Main Ground*)?
- Was it lost or found?`,
        matchedItems: [],
        quickReplies: ['Search for my lost item', 'Show recently found items', 'How do I report an item?'],
        isBackend: false
      };
    }

    // Check 6: Natural Language Search in Firestore / Demo Items
    const searchResult = await searchListingsWithNLP(queryText);
    const { items, criteria } = searchResult;

    if (items.length > 0) {
      let replyPrefix = `I found **${items.length} possible matching ${items.length === 1 ? 'listing' : 'listings'}** in our campus records:`;
      
      if (criteria.location) {
        replyPrefix += ` around **${criteria.location}**`;
      }
      if (criteria.category) {
        replyPrefix += ` in **${criteria.category}**`;
      }
      replyPrefix += `. Please inspect the details below to verify if any of these match:`;

      return {
        text: replyPrefix,
        matchedItems: items,
        quickReplies: ['How do I claim an item?', 'How do I report an item?'],
        isBackend: false
      };
    } else {
      // Clear no-match response without hallucinating
      return {
        text: `I searched our active campus listings, but **no matching records were found** for "${queryText}".

💡 **What you can do next**:
1. Check your spelling or try broader keywords (e.g., search for "headphones" instead of specific model).
2. [Click here to report this item](/report) so other students and staff can notify you when it turns up.
3. Check back regularly, as new items are reported daily.`,
        matchedItems: [],
        quickReplies: ['Report Lost Item', 'Browse All Listings', 'Campus safety tips'],
        isBackend: false
      };
    }
  }
};
