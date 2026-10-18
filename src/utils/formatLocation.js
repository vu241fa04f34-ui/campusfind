import { isBlockLocation } from './validation';

/**
 * Formats item campus location into a standardized, readable string.
 * For block reports: "A-Block • 2nd Floor • Room 204"
 * For other locations: "Library", "Main Ground", etc.
 *
 * @param {Object|string} item - The item object or location string
 * @returns {string} Formatted location string
 */
export function formatItemLocation(item) {
  if (!item) return '';

  // If item is just a string, return directly
  if (typeof item === 'string') {
    return item;
  }

  const location = item.location || '';
  if (!location) return '';

  if (isBlockLocation(location)) {
    const parts = [location];
    if (item.floor && item.floor.trim()) {
      parts.push(item.floor.trim());
    }
    if (item.roomNumber && item.roomNumber.trim()) {
      // Strip leading "room" if already typed by user, then prepend "Room "
      const cleanRoom = item.roomNumber.trim().replace(/^room\s*/i, '');
      if (cleanRoom) {
        parts.push(`Room ${cleanRoom}`);
      }
    }
    return parts.join(' • ');
  }

  return location;
}
