/**
 * Form and input validation helpers for CampusFind.
 */

export const CATEGORIES = [
  'Electronics',
  'ID Cards',
  'Books & Notes',
  'Bags',
  'Clothing',
  'Accessories',
  'Keys',
  'Water Bottles',
  'Other'
];

export const BLOCK_LOCATIONS = [
  'A-Block',
  'U-Block',
  'N-Block',
  'P-Block',
  'H-Block'
];

export const OTHER_LOCATIONS = [
  'Convocation',
  'Main Ground',
  'Basketball Ground',
  'Volleyball Ground',
  'Guest House',
  'Library',
  'MHP Canteen',
  'Other'
];

export const CAMPUS_LOCATION_GROUPS = [
  {
    category: 'Blocks',
    locations: BLOCK_LOCATIONS
  },
  {
    category: 'Other Locations',
    locations: OTHER_LOCATIONS.filter((l) => l !== 'Other')
  }
];

export const CAMPUS_LOCATIONS = [
  ...BLOCK_LOCATIONS,
  ...OTHER_LOCATIONS
];

export const BLOCK_FLOORS = {
  'A-Block': ['Ground Floor', '1st Floor', '2nd Floor', '3rd Floor', '4th Floor', '5th Floor'],
  'U-Block': ['Ground Floor', '1st Floor', '2nd Floor', '3rd Floor', '4th Floor', '5th Floor', '6th Floor', '7th Floor'],
  'N-Block': ['Ground Floor', '1st Floor', '2nd Floor', '3rd Floor', '4th Floor', '5th Floor'],
  'P-Block': ['Ground Floor', '1st Floor', '2nd Floor', '3rd Floor', '4th Floor'],
  'H-Block': ['Ground Floor', '1st Floor', '2nd Floor', '3rd Floor']
};

export function isBlockLocation(location) {
  if (!location) return false;
  return BLOCK_LOCATIONS.includes(location);
}

export function validateEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim());
}

export function validatePassword(password) {
  return typeof password === 'string' && password.length >= 6;
}

export function validateItemForm(data) {
  const errors = {};

  if (!data.title || !data.title.trim()) {
    errors.title = 'Title is required';
  } else if (data.title.trim().length < 3) {
    errors.title = 'Title must be at least 3 characters';
  } else if (data.title.trim().length > 100) {
    errors.title = 'Title must not exceed 100 characters';
  }

  if (!data.type || !['lost', 'found'].includes(data.type)) {
    errors.type = 'Please select whether the item is Lost or Found';
  }

  if (!data.category || !CATEGORIES.includes(data.category)) {
    errors.category = 'Please select a valid category';
  }

  if (!data.location || !data.location.trim()) {
    errors.location = 'Campus location is required';
  } else if (isBlockLocation(data.location)) {
    if (!data.floor || !data.floor.trim()) {
      errors.floor = `Please select a floor for ${data.location}`;
    }
    if (!data.roomNumber || !data.roomNumber.trim()) {
      errors.roomNumber = 'Please specify the room number or lab name';
    }
  }

  if (!data.eventDate) {
    errors.eventDate = 'Date is required';
  } else {
    const selectedDate = new Date(data.eventDate);
    const now = new Date();
    if (isNaN(selectedDate.getTime())) {
      errors.eventDate = 'Invalid date';
    } else if (selectedDate > now) {
      errors.eventDate = 'Date cannot be in the future';
    }
  }

  if (!data.description || !data.description.trim()) {
    errors.description = 'Description is required';
  } else if (data.description.trim().length < 10) {
    errors.description = 'Please provide a more descriptive summary (at least 10 characters)';
  } else if (data.description.trim().length > 1500) {
    errors.description = 'Description exceeds maximum allowed length of 1500 characters';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Checks if the text might contain sensitive personal information
 * such as 10-digit phone numbers, SSNs, credit card numbers, or student ID numbers.
 */
export function checkSensitiveInfoWarning(text) {
  if (!text) return null;

  // Phone number pattern (e.g. 555-123-4567, (555) 123-4567, 10 digits)
  const phonePattern = /(\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b)|(\(\d{3}\)\s*\d{3}[-.\s]?\d{4})/g;
  // SSN or 9-digit sensitive IDs
  const ssnPattern = /\b\d{3}-\d{2}-\d{4}\b/;
  // Credit card 16-digit pattern
  const cardPattern = /\b(?:\d{4}[-\s]?){3}\d{4}\b/;

  if (phonePattern.test(text)) {
    return 'We noticed a phone number in your description. For safety, avoid sharing direct phone numbers publicly. Use our secure in-app recovery requests instead.';
  }

  if (ssnPattern.test(text) || cardPattern.test(text)) {
    return 'For security and identity protection, please do not disclose full account numbers, SSNs, or payment card digits in public listings.';
  }

  return null;
}

/**
 * Validates uploaded image file size and MIME type
 */
export function validateImageFile(file) {
  if (!file) return { isValid: true };

  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
  if (!validTypes.includes(file.type)) {
    return {
      isValid: false,
      error: 'Only JPG, PNG, and WebP images are supported.'
    };
  }

  const maxSizeInBytes = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSizeInBytes) {
    return {
      isValid: false,
      error: 'Image file size must be less than 5 MB.'
    };
  }

  return { isValid: true };
}
