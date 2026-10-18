const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

// In-memory rate limiting map (IP -> timestamps array)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 25;

function isRateLimited(clientIp) {
  const now = Date.now();
  const timestamps = rateLimitMap.get(clientIp) || [];
  const recent = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  recent.push(now);
  rateLimitMap.set(clientIp, recent);
  return recent.length > MAX_REQUESTS_PER_WINDOW;
}

/**
 * HTTPS endpoint: chatAssistant
 * Secure server-side AI chatbot for CampusFind
 */
exports.chatAssistant = functions.https.onRequest(async (req, res) => {
  // CORS setup
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  // Rate Limiting
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  if (isRateLimited(clientIp)) {
    res.status(429).json({
      error: 'Rate limit exceeded. Please wait a minute before sending more queries.',
      quickReplies: ['Show recently found items', 'How do I report an item?']
    });
    return;
  }

  // Validate user message
  const userMessage = (req.body && req.body.message) || '';
  if (typeof userMessage !== 'string' || !userMessage.trim()) {
    res.status(400).json({ error: 'Message text is required' });
    return;
  }

  if (userMessage.length > 500) {
    res.status(400).json({ error: 'Message exceeds maximum length of 500 characters' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(200).json({
      configured: false,
      reply: "The Gemini AI backend API key is not yet configured on this server. Running in fallback mode. Please configure GEMINI_API_KEY in your Firebase Functions environment to activate Gemini 1.5.",
      matchedItems: [],
      quickReplies: ['Search for my lost item', 'Show recently found items', 'How do I report an item?']
    });
    return;
  }

  try {
    // 1. Ask Gemini to extract query parameters
    const extractPrompt = `
You are an entity extractor for a university campus Lost and Found system called CampusFind.
Analyze this user query: "${userMessage}"
Categories: Electronics, Documents, Books & Notes, Accessories, Clothing, Bags, Other.
Common Locations: Central Library, Student Union Building, Science Complex, Engineering Hall, Campus Cafeteria, Recreation Center, Main Quad, Bus Terminal.

Return a valid JSON object ONLY with this exact shape:
{
  "intent": "search" | "report_guide" | "safety" | "general",
  "itemType": "lost" | "found" | "all",
  "category": string or null,
  "location": string or null,
  "keywords": string[]
}
`;

    const extractResp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: extractPrompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      }
    );

    let parsed = { intent: 'search', itemType: 'all', keywords: [] };
    if (extractResp.ok) {
      const data = await extractResp.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawText) {
        try {
          parsed = JSON.parse(rawText);
        } catch (e) {
          console.warn('Failed to parse entity JSON from LLM:', e);
        }
      }
    }

    // 2. Query Firestore (strictly public fields from /items collection)
    let matchedItems = [];
    if (parsed.intent === 'search' || parsed.intent === 'general') {
      let queryRef = db.collection('items').limit(20);
      
      if (parsed.itemType && parsed.itemType !== 'all') {
        queryRef = queryRef.where('type', '==', parsed.itemType);
      }
      if (parsed.category) {
        queryRef = queryRef.where('category', '==', parsed.category);
      }

      const snap = await queryRef.get();
      const rawList = snap.docs.map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          title: d.title,
          type: d.type,
          category: d.category,
          location: d.location,
          eventDate: d.eventDate,
          imageUrl: d.imageUrl,
          status: d.status,
          description: d.description || ''
        };
      });

      // Simple scoring for keyword overlap
      const kws = (parsed.keywords || []).map(k => k.toLowerCase());
      if (kws.length > 0) {
        matchedItems = rawList.filter(item => {
          const text = `${item.title} ${item.description} ${item.location}`.toLowerCase();
          return kws.some(k => text.includes(k));
        }).slice(0, 4);
      } else {
        matchedItems = rawList.slice(0, 4);
      }
    }

    // 3. Ask Gemini to write conversational response
    const summarizePrompt = `
You are the CampusFind AI Assistant. A student asked: "${userMessage}".
Matching listings found in database (${matchedItems.length}):
${JSON.stringify(matchedItems.map(i => ({ title: i.title, type: i.type, location: i.location, status: i.status })))}

Instructions:
- Be concise, helpful, friendly, and professional.
- State whether any matching records were found.
- If items were found, invite the student to view the details cards below to check ownership.
- Never invent listings that are not in the provided database list.
- Treat matches as possibilities, not guaranteed identification.
- If no items were found, guide them to report their item on the Report page.
`;

    const summaryResp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: summarizePrompt }] }]
        })
      }
    );

    let reply = "I've checked our campus lost and found records for your inquiry.";
    if (summaryResp.ok) {
      const data = await summaryResp.json();
      reply = data.candidates?.[0]?.content?.parts?.[0]?.text || reply;
    }

    res.status(200).json({
      configured: true,
      reply,
      matchedItems,
      quickReplies: ['Show recently found items', 'How do I report an item?', 'Campus safety tips']
    });

  } catch (err) {
    console.error('Cloud function execution error:', err);
    res.status(500).json({
      error: 'An unexpected error occurred while communicating with the AI service.',
      details: err.message
    });
  }
});
