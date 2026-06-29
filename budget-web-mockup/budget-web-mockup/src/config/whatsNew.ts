// "What's New" release notes shown in a popup once per release.
//
// HOW TO PUBLISH A NEW RELEASE:
//   1. Add a new entry to the TOP of WHATS_NEW_ENTRIES (newest first).
//   2. Give it a unique `version` string (the date is a convenient choice).
// Bumping the top entry's `version` re-shows the popup to everyone, because
// the auto-popup compares it against the version saved in localStorage.

export interface WhatsNewEntry {
  /** Unique id for this release. Changing the TOP entry's version re-triggers the popup. */
  version: string;
  /** Human-readable date shown in the popup. */
  date: string;
  /** Short heading for the release. */
  title: string;
  /** Bullet points describing what changed. */
  items: string[];
}

// Newest first. The first entry's `version` drives the auto-popup.
export const WHATS_NEW_ENTRIES: WhatsNewEntry[] = [
  {
    version: '2026-06-29',
    date: '29 June 2026',
    title: 'Welcome to the Trend web app beta',
    items: [
      'Send Feedback: report bugs or ideas any time using the Feedback option in the sidebar.',
      'Additional Modules: Optional trackers that extend Trend with specialised features. Enable them anytime from Settings.',
    ],
  },
];

// The release that drives the auto-popup (the most recent one).
export const CURRENT_WHATS_NEW_VERSION = WHATS_NEW_ENTRIES[0]?.version ?? '';

// localStorage key holding the last version the user has seen.
export const WHATS_NEW_STORAGE_KEY = 'trend:whatsNewSeenVersion';
