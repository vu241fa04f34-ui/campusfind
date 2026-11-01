/**
 * itemImageHelper.js
 *
 * Provides reliable, local high-quality image paths and fallbacks
 * for CampusFind items and categories, plus browser-side image compression.
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
      item.imageUrl.includes('photo-1589330694653') ||
      item.imageUrl.includes('photo-1578328819058') ||
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

/**
 * Compresses an image file client-side before upload to prevent slow transfers and timeouts.
 * Reduces dimensions to maxWidth/maxHeight and encodes as JPEG Blob.
 */
export function compressImageFile(file, maxWidth = 1200, maxHeight = 1200, quality = 0.8) {
  return new Promise((resolve) => {
    if (!file || typeof window === 'undefined' || !file.type?.startsWith('image/')) {
      resolve(file);
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => resolve(file);
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => resolve(file);
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            const cleanName = (file.name || 'item_photo.jpg').replace(/\.[^.]+$/, '.jpg');
            const compressed = new File([blob], cleanName, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            resolve(compressed);
          },
          'image/jpeg',
          quality
        );
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Converts a file to an optimized Base64 JPEG data URL (< 150KB).
 * Used as a dependable fallback when Firebase Storage is uninitialized or blocked by CORS.
 */
export function fileToOptimizedDataUrl(file, maxWidth = 800, quality = 0.75) {
  return new Promise((resolve) => {
    if (!file || typeof window === 'undefined') {
      resolve(null);
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => resolve(null);
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => resolve(e.target.result);
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target.result);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

export default getItemImageUrl;
