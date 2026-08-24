/**
 * Date and time formatting utilities with accurate local timezone handling.
 */

/**
 * Returns current local date in YYYY-MM-DD format (safe against UTC day offsets)
 */
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats a date string (YYYY-MM-DD or ISO) into a human readable format e.g. "Aug 24, 2026"
 */
export function formatDate(dateString: string): string {
  if (!dateString) return '—';

  // If it's YYYY-MM-DD, parse year, month, day explicitly to avoid UTC-midnight timezone shift
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }
  }

  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;

  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

/**
 * Formats an ISO timestamp or date into "Aug 24, 2026, 2:30 PM"
 */
export function formatDateTime(isoString: string): string {
  if (!isoString) return '—';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return isoString;

  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

/**
 * Returns a human-friendly timestamp (e.g. "Today at 2:30 PM", "Yesterday at 4:15 PM", "Aug 20, 2026 at 10:00 AM")
 */
export function formatFriendlyTimestamp(isoString: string): string {
  if (!isoString) return '—';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return isoString;

  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear();

  const timePart = d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit'
  });

  if (isToday) {
    return `Today at ${timePart}`;
  }
  if (isYesterday) {
    return `Yesterday at ${timePart}`;
  }

  return `${formatDate(isoString)} at ${timePart}`;
}
