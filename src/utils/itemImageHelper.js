/**
 * itemImageHelper.js
 *
 * Provides reliable, local high-quality image paths and fallbacks
 * for CampusFind items and categories.
 */

export const CATEGORY_DEFAULT_IMAGES = {
  Electronics: '/images/items/wireless-earbuds.jpg',
  'ID Cards': '/images/items/student-id-card.jpg',
  'Books & Notes': '/images/items/engineering-textbook.jpg',
  Bags: '/images/items/blue-backpack.jpg',
  Clothing: '/images/items/black-jacket.jpg',
  Accessories: '/images/items/wristwatch.jpg',
  Keys: '/images/items/keychain-keys.jpg',
  'Water Bottles': '/images/items/water-bottle.jpg',
  Other: '/images/items/umbrella.jpg'
};

/**
 * Returns a guaranteed valid image URL for an item, falling back gracefully
 * if imageUrl is missing, broken, or empty.
 */
export function getItemImageUrl(item) {
  if (!item) return CATEGORY_DEFAULT_IMAGES.Other;

  // If item explicitly has an uploaded or custom imageUrl
  if (item.imageUrl && typeof item.imageUrl === 'string' && item.imageUrl.trim() !== '') {
    // If it's a known broken / 404 remote link or an old Unsplash ID card / umbrella link, upgrade to local asset
    if (
      item.imageUrl.includes('photo-1589330694653') || // old broken unsplash ID card
      item.imageUrl.includes('photo-1578328819058') || // old broken unsplash umbrella
      item.imageUrl.includes('photo-1505740420928') ||
      item.imageUrl.includes('photo-1590658268037') ||
      item.imageUrl.includes('photo-1544716278') ||
      item.imageUrl.includes('photo-1553062407') ||
      item.imageUrl.includes('photo-1544441893') ||
      item.imageUrl.includes('photo-1523275335') ||
      item.imageUrl.includes('photo-1582139329') ||
      item.imageUrl.includes('photo-1602143407')
    ) {
      if (item.title?.toLowerCase().includes('umbrella')) return '/images/items/umbrella.jpg';
      if (item.category && CATEGORY_DEFAULT_IMAGES[item.category]) {
        return CATEGORY_DEFAULT_IMAGES[item.category];
      }
    }
    return item.imageUrl;
  }

  // Specific check for umbrella items
  if (item.title?.toLowerCase().includes('umbrella')) {
    return '/images/items/umbrella.jpg';
  }

  // Fallback to category default image
  return CATEGORY_DEFAULT_IMAGES[item.category] || CATEGORY_DEFAULT_IMAGES.Other;
}

export function getCategoryFallbackImage(category) {
  return CATEGORY_DEFAULT_IMAGES[category] || CATEGORY_DEFAULT_IMAGES.Other;
}

export default getItemImageUrl;
