/**
 * Formats a date string, timestamp, or Date object into a readable string.
 * Supports Firestore Timestamps, ISO strings, and JavaScript Date instances.
 */
export function formatDate(dateInput) {
  if (!dateInput) return 'Unknown date';

  let date;
  if (typeof dateInput === 'object' && dateInput.seconds) {
    // Firestore Timestamp
    date = new Date(dateInput.seconds * 1000);
  } else if (dateInput instanceof Date) {
    date = dateInput;
  } else {
    date = new Date(dateInput);
  }

  if (isNaN(date.getTime())) {
    return 'Invalid date';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(date);
}

/**
 * Returns a human-friendly relative time string (e.g., 'Just now', '2 hours ago', 'Yesterday').
 */
export function timeAgo(dateInput) {
  if (!dateInput) return '';

  let date;
  if (typeof dateInput === 'object' && dateInput.seconds) {
    date = new Date(dateInput.seconds * 1000);
  } else if (dateInput instanceof Date) {
    date = dateInput;
  } else {
    date = new Date(dateInput);
  }

  if (isNaN(date.getTime())) return '';

  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return 'Yesterday';
  if (diffInDays < 30) return `${diffInDays}d ago`;

  return formatDate(date);
}
