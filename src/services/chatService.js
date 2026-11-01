import { searchListingsWithNLP, extractCategory, extractLocation, extractKeywords } from './itemSearchService.js';
import { itemService } from './itemService.js';

const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {};
const AI_ENDPOINT_URL = env.VITE_AI_ENDPOINT_URL || '';
const GEMINI_API_KEY = env.VITE_GEMINI_API_KEY || '';

/**
 * Handles communication with the AI assistant backend, Gemini API,
 * or the advanced built-in CampusFind Cognitive Assistant.
 */
export const chatService = {
  /**
   * Process a user chat message
   * @param {string} userMessage - The current message from the user
   * @param {Array} history - Previous messages for conversation memory
   * @returns {Promise<{text: string, matchedItems: Array, quickReplies: Array, isBackend: boolean}>}
   */
  async sendMessage(userMessage, history = []) {
    const trimmed = (userMessage || '').trim();
    if (!trimmed) {
      return {
        text: "Please ask a question or describe an item you're looking for, and I'll be glad to help!",
        matchedItems: [],
        quickReplies: ['Search for my lost item', 'Show recently found items', 'How do I report an item?'],
        isBackend: false
      };
    }

    // 1. Try Dedicated Cloud Function Backend if configured
    if (AI_ENDPOINT_URL) {
      try {
        const response = await fetch(AI_ENDPOINT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: trimmed,
            history: history.slice(-6).map((m) => ({ sender: m.sender, text: m.text }))
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
        }
      } catch (err) {
        console.warn('AI Backend endpoint unreachable. Falling back to built-in cognitive assistant:', err);
      }
    }

    // 2. Try Direct Gemini API call if VITE_GEMINI_API_KEY is configured
    if (GEMINI_API_KEY) {
      try {
        const geminiResult = await this.callGeminiDirect(trimmed, history);
        if (geminiResult) {
          return geminiResult;
        }
      } catch (err) {
        console.warn('Gemini API call failed. Falling back to built-in cognitive assistant:', err);
      }
    }

    // 3. Built-in Dynamic Context-Aware Cognitive Assistant (No external keys needed)
    return this.generateIntelligentResponse(trimmed, history);
  },

  /**
   * Calls Google Gemini 1.5 Flash directly if client key is configured
   */
  async callGeminiDirect(userMessage, history = []) {
    const allItems = await itemService.getItems();
    const itemsContext = allItems.slice(0, 10).map((i) => ({
      id: i.id,
      title: i.title,
      category: i.category,
      type: i.type,
      location: i.location,
      status: i.status
    }));

    const systemPrompt = `You are the official AI Assistant for CampusFind at Vignan University.
CampusFind is a campus lost and found portal.
Current active items in the database: ${JSON.stringify(itemsContext)}

Guidelines:
- Answer the student's exact question naturally, concisely, and helpfully.
- If they ask general knowledge questions (e.g., "What is artificial intelligence?"), answer accurately and informatively.
- If they ask about lost or found items, check the database items and answer accurately. Never invent fake records.
- If they ask how to do something on CampusFind, give clear, numbered step-by-step instructions.
- Never repeat the same canned responses. Keep your tone friendly, professional, and collegiate.`;

    const contents = [];
    contents.push({ role: 'user', parts: [{ text: systemPrompt }] });
    contents.push({ role: 'model', parts: [{ text: 'Understood. I am ready to assist students with CampusFind and general queries.' }] });

    const recentHistory = history.slice(-4);
    for (const msg of recentHistory) {
      contents.push({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
      });
    }
    contents.push({ role: 'user', parts: [{ text: userMessage }] });

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents })
      }
    );

    if (response.ok) {
      const data = await response.json();
      const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (replyText) {
        const searchResult = await searchListingsWithNLP(userMessage);
        return {
          text: replyText,
          matchedItems: searchResult.items || [],
          quickReplies: ['Browse all items', 'How do I report an item?', 'Campus safety tips'],
          isBackend: true
        };
      }
    }
    return null;
  },

  /**
   * Generates dynamic, context-aware, tailored answers for any question
   */
  async generateIntelligentResponse(userMessage, history = []) {
    const raw = userMessage.trim();
    const lower = raw.toLowerCase();

    // Context analysis from conversation history
    const lastUserMsg = [...history].reverse().find((m) => m.sender === 'user')?.text?.toLowerCase() || '';
    const lastBotMsg = [...history].reverse().find((m) => m.sender === 'assistant')?.text?.toLowerCase() || '';

    // Handle follow-up queries using context memory
    const isFollowUp =
      lower.includes('how do i do that') ||
      lower.includes('how can i do that') ||
      lower.includes('how to do that') ||
      lower.includes('where can i find it') ||
      lower.includes('where is it') ||
      lower.includes('tell me more') ||
      lower.includes('what about that') ||
      lower.includes('how do i contact them');

    if (isFollowUp) {
      if (lastBotMsg.includes('report') || lastUserMsg.includes('report') || lastUserMsg.includes('lost') || lastUserMsg.includes('found')) {
        return {
          text: `To complete that on CampusFind:
1. Click the **[Report an Item](/report)** button in the top navigation bar.
2. Select whether you **Lost** or **Found** the item.
3. Choose the campus building/location (e.g. *Central Library*, *A-Block*, *MHP Canteen*).
4. Add a photo (optional but recommended) and any identifying details.
5. Click **Publish Listing** to submit your report!`,
          matchedItems: [],
          quickReplies: ['Go to Report Page', 'Browse All Listings', 'Safety Guidelines'],
          isBackend: false
        };
      }

      if (lastBotMsg.includes('claim') || lastBotMsg.includes('match') || lastUserMsg.includes('contact')) {
        return {
          text: `To contact the reporter or claim your item:
1. Open the item's page by clicking **"View Details"** on the card.
2. Click the **"Submit Ownership Claim"** button.
3. Answer any verification question set by the finder (e.g. describing a unique mark or color).
4. Once verified, you can arrange a safe hand-off at an official campus hub like the **Central Library Desk** or **A-Block Security**.`,
          matchedItems: [],
          quickReplies: ['Browse items', 'Campus safety tips'],
          isBackend: false
        };
      }
    }

    // 1. VIEWING ITEM DETAILS
    if (
      (lower.includes('view') || lower.includes('see') || lower.includes('check') || lower.includes('look at')) &&
      (lower.includes('detail') || lower.includes('details') || lower.includes('information'))
    ) {
      return {
        text: `To view the full details of any reported belonging:

1. **Browse or Search**: Visit the **[Home Page](/)** or use the search bar at the top of the page.
2. **Click "View Details"**: Every item card features a prominent **"View Details"** button.
3. **What You Can Inspect**:
   - High-resolution photograph of the item.
   - Campus Building, Floor, and Room Number (e.g., *U-Block 3rd Floor Room 312*).
   - Date and time the item was lost or discovered.
   - Public description and status (*Open, Claimed, Returned*).
4. **Claim Ownership**: If it belongs to you, click **"Submit Ownership Claim"** directly on the details page to connect with the finder!`,
        matchedItems: [],
        quickReplies: ['Browse all items', 'How do I claim an item?', 'Search listings'],
        isBackend: false
      };
    }

    // 2. EXPLICIT ITEM SEARCH QUERIES (e.g. "Can I find a water bottle reported near the library?", "Did anyone find keys?")
    const isExplicitSearch =
      lower.startsWith('can i find') ||
      lower.includes('can i find') ||
      lower.includes('is there a') ||
      lower.includes('did anyone find') ||
      lower.includes('did someone find') ||
      lower.includes('search for') ||
      lower.includes('looking for') ||
      lower.includes('find me');

    if (isExplicitSearch) {
      const searchResult = await searchListingsWithNLP(raw);
      const { items, criteria } = searchResult;

      if (items.length > 0) {
        let replyText = `I searched our campus records and found **${items.length} matching ${
          items.length === 1 ? 'listing' : 'listings'
        }**`;

        if (criteria.location) {
          replyText += ` near **${criteria.location}**`;
        }
        if (criteria.category) {
          replyText += ` under **${criteria.category}**`;
        }
        replyText += `. Please check the card below to inspect the details and submit a recovery claim:`;

        return {
          text: replyText,
          matchedItems: items,
          quickReplies: ['How do I claim an item?', 'How do I report an item?'],
          isBackend: false
        };
      }

      const extractedCat = extractCategory(raw);
      const extractedLoc = extractLocation(raw);

      if (extractedCat) {
        const allCategoryItems = await itemService.getItems({ category: extractedCat });
        const activeCatItems = allCategoryItems.filter((i) => i.status !== 'resolved');

        if (activeCatItems.length > 0) {
          const itemLocations = [...new Set(activeCatItems.map((i) => i.location))].join(', ');
          let locNote = '';
          if (extractedLoc) {
            locNote = ` specifically near **${extractedLoc}**`;
          }

          return {
            text: `I checked our active campus records for **${extractedCat}**${locNote}. Currently, no items are listed at that exact spot, but we do have **${extractedCat}** reported at: **${itemLocations}**.

Take a look at the listings below, or click below to publish a report so you can be notified as soon as yours is found!`,
            matchedItems: activeCatItems.slice(0, 3),
            quickReplies: [`Report Lost ${extractedCat}`, 'Browse All Items', 'Campus safety tips'],
            isBackend: false
          };
        }
      }

      return {
        text: `I searched our active campus database for **"${raw}"**, but no matching records are currently open in that category or location.

💡 **Recommended next steps**:
1. Check your spelling or try broader terms (e.g. *"earbuds"* instead of specific model numbers).
2. **[Report your item on the Report page](/report)** — publishing your report alerts other students and security staff right away.
3. Check back regularly, as newly found belongings are registered throughout the day!`,
        matchedItems: [],
        quickReplies: ['Report Lost Item', 'Browse All Listings', 'Campus safety tips'],
        isBackend: false
      };
    }

    // 3. SPECIFIC: Reporting a Lost Mobile Phone / Smartphone
    if (
      (lower.includes('report') || lower.includes('lost')) &&
      (lower.includes('phone') || lower.includes('mobile') || lower.includes('iphone') || lower.includes('android') || lower.includes('smartphone'))
    ) {
      return {
        text: `Here is the step-by-step guide to reporting a **lost mobile phone**:

1. **Submit a Lost Report immediately**:
   - Go directly to the **[Report an Item](/report)** page and select **"I Lost an Item"**.
   - Select the **Electronics** category.
   - Enter your phone's make and model (e.g. *iPhone 13 Starlight*, *Samsung Galaxy S22*).
2. **Key Details to Include**:
   - Specify the phone case color, lock-screen wallpaper, or distinctive scratches.
   - ⚠️ **Security Precaution**: Never disclose your device unlock passcode, Apple ID/Google password, or IMEI number publicly.
3. **Where to Check in Person**:
   - Visit the **A-Block Security Desk** or **Central Library Reception** — students frequently hand in unattended phones there.
   - Use Apple's *Find My* or Google's *Find My Device* to lock the phone and display a recovery contact message.`,
        matchedItems: [],
        quickReplies: ['Go to Report Page', 'Search found phones', 'Campus safety tips'],
        isBackend: false
      };
    }

    // 4. SPECIFIC: Reporting a Found Wallet
    if (
      (lower.includes('report') || lower.includes('found')) &&
      (lower.includes('wallet') || lower.includes('purse') || lower.includes('money') || lower.includes('cash') || lower.includes('credit card'))
    ) {
      return {
        text: `Thank you for being a responsible campus citizen! Here is how to handle and report a **found wallet**:

1. **Protect Owner Privacy**:
   - Do **not** disclose the exact cash amount, credit card numbers, or full identity numbers in public descriptions.
2. **Submit a Found Report**:
   - Go to the **[Report an Item](/report)** page and select **"I Found an Item"**.
   - Choose category **Accessories** (or **Bags**).
   - Upload a photo of the *exterior only*.
   - In the **Private Verification Clue** field, set a question only the true owner would know (e.g., *"What brand is stamped on the inside flap?"*).
3. **Hand Over for Safekeeping**:
   - We recommend turning the wallet in to the **Campus Security Desk (A-Block)** or the **Central Library Front Desk** so it remains secure until the owner claims it.`,
        matchedItems: [],
        quickReplies: ['Report Found Wallet', 'Browse lost items', 'Contact Security Desk'],
        isBackend: false
      };
    }

    // 5. IMAGE UPLOAD TROUBLESHOOTING
    if (
      lower.includes('upload an image') ||
      lower.includes('upload image') ||
      lower.includes('image upload') ||
      lower.includes('photo upload') ||
      lower.includes('cannot upload') ||
      lower.includes('upload problem') ||
      lower.includes('picture error')
    ) {
      return {
        text: `If you are having trouble uploading an image, here are the exact steps to fix it:

1. **Supported Formats**: Make sure your file is a standard **JPG, JPEG, PNG, or WebP** image.
2. **File Size Limit**: Files up to **5 MB** are accepted.
3. **Automatic Compression Active**: CampusFind now includes built-in client-side compression that automatically shrinks high-resolution camera photos so they upload in under 2 seconds.
4. **Dependable Fallback**: If Cloud Storage encounters network delays or CORS configuration issues, CampusFind automatically creates a lightweight inline photo representation so your report **never fails or hangs**.
5. **Quick Workaround**:
   - If taking a live camera photo fails on your mobile browser, take the photo first with your camera app, then select it from your gallery.
   - Alternatively, taking a quick screenshot of the photo will reduce file complexity and upload immediately.`,
        matchedItems: [],
        quickReplies: ['Report an Item', 'Browse listings', 'Technical support'],
        isBackend: false
      };
    }

    // 6. PHONE NUMBER OTP LOGIN
    if (
      lower.includes('phone number') ||
      lower.includes('phone otp') ||
      lower.includes('mobile login') ||
      lower.includes('login with phone') ||
      lower.includes('otp') ||
      lower.includes('sms verification')
    ) {
      return {
        text: `Here is how to log in using **Phone OTP** on CampusFind:

1. Go to the **[Login Page](/login)**.
2. Click on the **"Phone OTP"** tab.
3. **Format**: Enter your 10-digit mobile number with the country code (e.g., \`+91 9876543210\` for India).
4. **Verification**: Solve the brief Google reCAPTCHA checkpoint.
5. **Enter Code**: You will receive a 6-digit SMS verification code on your phone. Type it in and click **Verify & Sign In**.

💡 **Troubleshooting Tips**:
- If you don't receive the SMS within 60 seconds, check your cellular reception and click **"Resend OTP"**.
- Make sure browser extensions or ad-blockers aren't disabling Google reCAPTCHA.`,
        matchedItems: [],
        quickReplies: ['Go to Login Page', 'Google Login Help', 'Forgot Password'],
        isBackend: false
      };
    }

    // 7. GOOGLE LOGIN ISSUES
    if (lower.includes('google login') || lower.includes('google sign in') || lower.includes('popup blocked')) {
      return {
        text: `If you encounter an issue logging in with Google:

1. **Popup Blocked**: If your browser displays a "Popup blocked" icon in the address bar, click it and select *"Always allow popups from this site"*.
2. **Redirect Fallback**: CampusFind automatically falls back to full-page redirect if popups are restricted.
3. **Authorized Domain**: Ensure you are accessing via the official domain (e.g. \`campusfind-seven-gamma.vercel.app\`).
4. **Private/Incognito**: If multiple Google accounts conflict, open an incognito window and sign in with your college Google account.`,
        matchedItems: [],
        quickReplies: ['Go to Login Page', 'Phone Login Help'],
        isBackend: false
      };
    }

    // 8. PASSWORD RESET / CHANGE PASSWORD
    if (
      lower.includes('change my password') ||
      lower.includes('change password') ||
      lower.includes('forgot password') ||
      lower.includes('reset password') ||
      lower.includes('new password')
    ) {
      return {
        text: `Here is how to change or reset your password on CampusFind:

1. Navigate to the **[Forgot Password Page](/forgot-password)**.
2. Enter your registered campus email address.
3. Click **"Send Password Reset Email"**.
4. Check your inbox (and Spam/Junk folder) for a secure reset link sent by Firebase Authentication.
5. Click the link in the email, choose a new password (at least 6 characters), and confirm.
6. Return to the **[Login Page](/login)** and sign in with your updated credentials!`,
        matchedItems: [],
        quickReplies: ['Go to Forgot Password', 'Go to Login Page'],
        isBackend: false
      };
    }

    // 9. CONTACTING THE PERSON WHO REPORTED AN ITEM / PRIVACY
    if (
      lower.includes('contact the person') ||
      lower.includes('contact person') ||
      lower.includes('contact owner') ||
      lower.includes('contact finder') ||
      lower.includes('phone number') ||
      lower.includes('message owner') ||
      lower.includes('speak to owner')
    ) {
      return {
        text: `Here is how communication works on CampusFind:

🔒 **Student Privacy Protection**:
To protect student privacy and prevent spam, harassment, or scam attempts, **personal phone numbers and private email addresses are never published openly** on the website.

🤝 **How to Connect Safely**:
1. Open the item's page by clicking **"View Details"**.
2. Click **"Submit Ownership Claim"** at the bottom of the page.
3. Enter your message and answer any verification challenge set by the finder (e.g., color of internal lining, brand of keychain, wallpaper).
4. The owner or finder will be notified in their **[User Dashboard](/dashboard)**.
5. Once confirmed, arrange an in-person exchange at a secure campus hub (like the **Library Reception** or **A-Block Security Desk**).`,
        matchedItems: [],
        quickReplies: ['Browse items', 'Campus safety tips', 'Go to Dashboard'],
        isBackend: false
      };
    }

    // 10. MANAGING & UPDATING REPORTED ITEMS
    if (
      lower.includes('update') ||
      lower.includes('manage') ||
      lower.includes('my items') ||
      lower.includes('delete report') ||
      lower.includes('mark returned') ||
      lower.includes('resolved')
    ) {
      return {
        text: `You can manage all your reported items from your **[User Dashboard](/dashboard)**:

- ✏️ **Edit Listing**: Update the title, description, or campus room number if new information comes to light.
- 📥 **Review Claims**: View incoming claims from other students claiming your found item.
- ✅ **Mark as Resolved / Returned**: Once the item is successfully returned, update its status so other students know it has been recovered.
- 🗑️ **Delete Listing**: Remove a report if it is no longer relevant.`,
        matchedItems: [],
        quickReplies: ['Go to Dashboard', 'Browse listings', 'Report an item'],
        isBackend: false
      };
    }

    // 11. WHAT IS CAMPUSFIND?
    if (
      lower.includes('what is campusfind') ||
      lower.includes('about campusfind') ||
      lower.includes('who created campusfind') ||
      lower.includes('what does this website do')
    ) {
      return {
        text: `**CampusFind** is the official digital **Campus Lost and Found Management Platform** for Vignan University.

Key highlights of what CampusFind does:
- 🔍 **Real-Time Item Database**: Centralizes lost and found reports across all campus zones (A-Block, U-Block, Library, Canteen, Grounds).
- 🤖 **Automated Matching Engine**: Automatically cross-references lost reports with found reports and notifies students when potential matches appear.
- 🔒 **Privacy-First Claims**: Protects personal contact details through verified in-app claims rather than broadcasting phone numbers.
- 🛡️ **Role-Based Moderation**: Features specialized consoles for Campus Authorities and Administrators to resolve disputes, audit returns, and maintain campus trust.`,
        matchedItems: [],
        quickReplies: ['Browse all items', 'How do I report an item?', 'Search listings'],
        isBackend: false
      };
    }

    // 12. DIFFERENCE BETWEEN LOST AND FOUND ITEMS
    if (
      lower.includes('difference between a lost item and a found item') ||
      lower.includes('difference between lost and found') ||
      lower.includes('lost vs found') ||
      lower.includes('difference lost found')
    ) {
      return {
        text: `Here is the difference between a **Lost Item** and a **Found Item** on CampusFind:

- 🔴 **Lost Item**:
  - A belonging that **you personally misplaced or lost** on campus (e.g. *you left your earbuds in the Library*).
  - You post this so the campus community and security desks know who to alert if it is turned in.

- 🟢 **Found Item**:
  - A belonging that **you discovered or picked up** that belongs to someone else (e.g. *you found a student ID card in MHP Canteen*).
  - You post this to help the rightful owner locate it, and optionally set a private verification question.

✨ **Smart Matching**:
When you post a lost report, CampusFind's matching engine automatically searches all found reports in the same category and campus building to find your item!`,
        matchedItems: [],
        quickReplies: ['I Lost an Item', 'I Found an Item', 'Browse all items'],
        isBackend: false
      };
    }

    // 13. GENERAL KNOWLEDGE: "What is artificial intelligence?" and related tech queries
    if (
      lower.includes('what is artificial intelligence') ||
      lower.includes('what is ai') ||
      lower.includes('define ai') ||
      lower.includes('artificial intelligence')
    ) {
      return {
        text: `**Artificial Intelligence (AI)** is a field of computer science dedicated to creating software and systems capable of performing tasks that typically require human cognition.

These capabilities include:
- 🧠 **Machine Learning**: Learning patterns from data to make predictions or decisions without explicit programming.
- 💬 **Natural Language Processing (NLP)**: Understanding, analyzing, and generating human language (just like I am doing right now!).
- 👁️ **Computer Vision**: Analyzing and recognizing visual content, such as identifying categories of misplaced objects from images.

💡 **How AI is used in CampusFind**:
CampusFind uses intelligent search and matching algorithms to compare descriptions, categories, and campus locations, automatically pairing students who lost items with those who found them!

Do you have any questions about finding a lost item on campus, or would you like to explore more?`,
        matchedItems: [],
        quickReplies: ['Search for my lost item', 'What is CampusFind?', 'How do I report an item?'],
        isBackend: false
      };
    }

    if (lower.includes('what is react') || lower.includes('what is vite')) {
      return {
        text: `**React** is an open-source JavaScript library developed by Meta for building dynamic, reactive user interfaces using reusable components and state management.
**Vite** is a next-generation frontend build tool that provides instant server start and lightning-fast Hot Module Replacement (HMR).

CampusFind is built using **React 19, Vite, Tailwind CSS, and Firebase** to provide a fast, secure, and responsive campus platform across mobile and desktop devices!`,
        matchedItems: [],
        quickReplies: ['What is CampusFind?', 'Browse listings'],
        isBackend: false
      };
    }

    // 14. SPECIFIC REPORT HOW-TO
    const isAskingHowToReport =
      lower.includes('how do i report') ||
      lower.includes('how can i report') ||
      lower.includes('how to report') ||
      lower.includes('post an item') ||
      lower.includes('report an item');

    if (isAskingHowToReport) {
      if (lower.includes('id card') || lower.includes('student id')) {
        return {
          text: `Here is how to report a **Student ID Card**:
1. Open the **[Report Page](/report)** and choose whether you *Lost* or *Found* the card.
2. Select the **ID Cards** category.
3. State the Student Name, Branch, and College (*Vignan University*).
4. 💡 **Campus Tip**: Found ID cards are frequently handed in at the **MHP Canteen counter** or the **Administrative Office (A-Block)**. Be sure to check there as well!`,
          matchedItems: [],
          quickReplies: ['Report ID Card', 'Browse ID Cards', 'Check MHP Canteen items'],
          isBackend: false
        };
      }

      if (lower.includes('key') || lower.includes('keychain')) {
        return {
          text: `Here is how to report **Lost or Found Keys**:
1. Open the **[Report Page](/report)**.
2. Select the **Keys** category.
3. Describe the keychain or lanyard (e.g. *blue ribbon lanyard*, *bike key with black fob*).
4. State the location where they were misplaced or picked up (e.g. *H-Block*, *Main Ground*, *Bike Parking*).
5. Post the listing so the owner can verify ownership.`,
          matchedItems: [],
          quickReplies: ['Report Keys', 'Browse Keys', 'Check H-Block'],
          isBackend: false
        };
      }

      const isFoundQuery = lower.includes('found');
      return {
        text: `Here is how to report a ${isFoundQuery ? '**found**' : '**lost**'} belonging on CampusFind:

1. **Open the Report Form**: Click **[Report an Item](/report)** in the navigation bar.
2. **Select Report Type**: Choose **"${isFoundQuery ? 'I Found an Item' : 'I Lost an Item'}"**.
3. **Select Category & Location**: Choose from *Electronics, Books & Notes, ID Cards, Bags, Clothing, Accessories, Keys, Water Bottles*, or *Other*. Pick the campus zone (e.g. *Library, U-Block, A-Block, Canteen*).
4. **Attach a Photo**: Upload a photo (CampusFind automatically optimizes it for rapid upload).
5. **Private Verification Clue**: If reporting a found item, set a secret question so only the rightful owner can claim it.
6. **Publish**: Click submit, and your listing will be immediately active for the campus community!`,
        matchedItems: [],
        quickReplies: ['Go to Report Page', 'Browse All Listings', 'Safety Guidelines'],
        isBackend: false
      };
    }

    // 15. CHIT-CHAT & CASUAL GREETINGS
    if (
      lower === 'hi' ||
      lower === 'hello' ||
      lower === 'hey' ||
      lower === 'good morning' ||
      lower === 'good afternoon' ||
      lower === 'good evening'
    ) {
      return {
        text: `Hello! 👋 Welcome to CampusFind. How can I assist you today?
- Search for a misplaced belonging
- Guide you through reporting a lost or found item
- Assist with login, image uploads, or verification claims`,
        matchedItems: [],
        quickReplies: ['Search for lost item', 'Show recently found items', 'How do I report an item?'],
        isBackend: false
      };
    }

    if (lower.includes('thank you') || lower.includes('thanks') || lower.includes('great help')) {
      return {
        text: `You're very welcome! 😊 I'm always here to help keep our Vignan University campus connected and organized. Let me know if you need anything else!`,
        matchedItems: [],
        quickReplies: ['Browse all items', 'Report an item'],
        isBackend: false
      };
    }

    if (lower.includes('tell me a joke') || lower.includes('joke')) {
      return {
        text: `Why did the computer keep looking for its glasses?
...Because it lost its Windows! 😄

On a serious note, if you ever lose real glasses or any other belonging on campus, I can help you search our campus listings right away!`,
        matchedItems: [],
        quickReplies: ['Search for my lost item', 'Report an item'],
        isBackend: false
      };
    }

    // 16. DYNAMIC DATABASE ITEM SEARCH FALLBACK
    const searchResult = await searchListingsWithNLP(raw);
    const { items, criteria } = searchResult;

    if (items.length > 0) {
      let replyText = `I searched our campus records and found **${items.length} matching ${
        items.length === 1 ? 'listing' : 'listings'
      }**`;

      if (criteria.location) {
        replyText += ` near **${criteria.location}**`;
      }
      if (criteria.category) {
        replyText += ` under **${criteria.category}**`;
      }
      replyText += `. Please check the card below to inspect the details and submit a recovery claim:`;

      return {
        text: replyText,
        matchedItems: items,
        quickReplies: ['How do I claim an item?', 'How do I report an item?'],
        isBackend: false
      };
    }

    // If no exact match, but category was extracted
    const extractedCat = extractCategory(raw);
    const extractedLoc = extractLocation(raw);

    if (extractedCat) {
      const allCategoryItems = await itemService.getItems({ category: extractedCat });
      const activeCatItems = allCategoryItems.filter((i) => i.status !== 'resolved');

      if (activeCatItems.length > 0) {
        const itemLocations = [...new Set(activeCatItems.map((i) => i.location))].join(', ');
        let locNote = '';
        if (extractedLoc) {
          locNote = ` specifically near **${extractedLoc}**`;
        }

        return {
          text: `I checked our active campus records for **${extractedCat}**${locNote}. Currently, no items are listed at that exact spot, but we do have **${extractedCat}** reported at: **${itemLocations}**.

Take a look at the listings below, or click below to publish a report so you can be notified as soon as yours is found!`,
          matchedItems: activeCatItems.slice(0, 3),
          quickReplies: [`Report Lost ${extractedCat}`, 'Browse All Items', 'Campus safety tips'],
          isBackend: false
        };
      }
    }

    // If query is short or unclear, ask a polite clarification question rather than giving a canned error
    if (raw.split(/\s+/).length <= 2 && !extractedCat && !extractedLoc) {
      return {
        text: `I'd love to help! Could you specify what you're looking for or trying to do?
For example:
- *"How do I report a lost phone?"*
- *"Can I find a backpack reported on the Main Ground?"*
- *"How do I log in with my phone number?"*
- Or ask any general technical question about CampusFind!`,
        matchedItems: [],
        quickReplies: ['Search for lost item', 'Show recently found items', 'How do I report an item?'],
        isBackend: false
      };
    }

    // Friendly, honest no-match answer
    return {
      text: `I searched our active campus database for **"${raw}"**, but no matching records are currently open in that category or location.

💡 **Recommended next steps**:
1. Check your spelling or try broader terms (e.g. *"earbuds"* instead of specific model numbers).
2. **[Report your item on the Report page](/report)** — publishing your report alerts other students and security staff right away.
3. Check back regularly, as newly found belongings are registered throughout the day!`,
      matchedItems: [],
      quickReplies: ['Report Lost Item', 'Browse All Listings', 'Campus safety tips'],
      isBackend: false
    };
  }
};
