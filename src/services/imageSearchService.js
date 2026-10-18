/**
 * imageSearchService.js
 *
 * Interface for AI Visual Similarity and Image Classification.
 * Can be connected to Google Cloud Vision API, Firebase Extensions (Label Images),
 * or Gemini Multimodal Embeddings.
 */

export const imageSearchService = {
  /**
   * Evaluates visual similarity between two items using image labels, category, and visual features.
   * Returns a score from 0.0 to 1.0.
   */
  async computeVisualSimilarity(itemA, itemB) {
    if (!itemA || !itemB) return 0;

    let score = 0;

    // Direct category alignment
    if (itemA.category === itemB.category) {
      score += 0.4;
    }

    // Color match from title, description, or features
    const colors = ['black', 'blue', 'red', 'silver', 'grey', 'gray', 'white', 'green', 'brown', 'pink', 'golden'];
    const textA = `${itemA.title} ${itemA.description} ${itemA.features || ''}`.toLowerCase();
    const textB = `${itemB.title} ${itemB.description} ${itemB.features || ''}`.toLowerCase();

    for (const color of colors) {
      if (textA.includes(color) && textB.includes(color)) {
        score += 0.3;
        break;
      }
    }

    // Keyword tokens overlap
    const wordsA = new Set(textA.split(/\s+/).filter((w) => w.length > 3));
    const wordsB = new Set(textB.split(/\s+/).filter((w) => w.length > 3));
    let common = 0;
    wordsA.forEach((w) => {
      if (wordsB.has(w)) common++;
    });

    if (common > 0) {
      score += Math.min(common * 0.1, 0.3);
    }

    return Math.min(Number(score.toFixed(2)), 1.0);
  },

  /**
   * Simulated Vision API label extraction.
   * Ready to be connected to Google Cloud Vision API:
   * POST https://vision.googleapis.com/v1/images:annotate?key=API_KEY
   */
  async extractImageLabels(imageSource) {
    if (!imageSource) return [];

    // Default heuristics based on URL keywords if available
    const urlLower = String(imageSource).toLowerCase();
    const labels = [];

    if (urlLower.includes('laptop') || urlLower.includes('dell') || urlLower.includes('macbook')) {
      labels.push('Electronic Device', 'Laptop', 'Computer Keyboard');
    } else if (urlLower.includes('bottle') || urlLower.includes('water')) {
      labels.push('Drinkware', 'Water Bottle', 'Plastic/Metal Vessel');
    } else if (urlLower.includes('id') || urlLower.includes('card')) {
      labels.push('Identity Document', 'Smart Card', 'Lanyard');
    } else if (urlLower.includes('bag') || urlLower.includes('backpack')) {
      labels.push('Backpack', 'Luggage & Bags', 'Zippers');
    } else if (urlLower.includes('key')) {
      labels.push('Keys', 'Keyring', 'Metallic Hardware');
    } else {
      labels.push('Campus Belonging', 'Object');
    }

    return labels;
  }
};

export default imageSearchService;
