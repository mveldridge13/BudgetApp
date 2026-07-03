// "What's New" release notes shown in a popup once per release.
//
// HOW TO PUBLISH A NEW RELEASE:
//   1. Add a new entry with a unique `version` (use today's date, YYYY-MM-DD).
//   2. Add it just BELOW the pinned "Welcome" entry — that entry stays on top
//      of the list during beta. The popup auto-triggers off the NEWEST
//      `version` (not list position), so a new release re-shows to everyone
//      even though it renders under the pinned welcome.

export interface WhatsNewEntry {
  /** Unique id for this release. Changing the TOP entry's version re-triggers the popup. */
  version: string;
  /** Human-readable date shown in the popup. */
  date: string;
  /** Short heading for the release. */
  title: string;
  /** Bullet points describing what changed. */
  items: string[];
  /** Optional known issues to flag to testers (shown in a separate section). */
  knownIssues?: string[];
}

// Newest first. The first entry's `version` drives the auto-popup.
// Display order (top-to-bottom). The "Welcome" entry is pinned first while
// we're in beta; newer releases go below it. Note: this order is NOT what
// drives the auto-popup — see CURRENT_WHATS_NEW_VERSION below.
export const WHATS_NEW_ENTRIES: WhatsNewEntry[] = [
  {
    version: '2026-06-29',
    date: '29 June 2026',
    title: 'Welcome to the Trend web app beta',
    items: [
      'Send Feedback: report bugs or ideas any time using the Feedback option in the sidebar.',
      'Additional Modules: Optional trackers that extend Trend with specialised features. Enable them anytime from Settings.',
    ],
    knownIssues: [
      'Change Photo (Settings → Profile) is not working yet — coming soon.',
    ],
  },
  {
    version: '2026-07-03',
    date: '3 July 2026',
    title: 'Invoices',
    items: [
      'Invoices: Generate, send, and track invoices for your freelance or contracting work.',
    ],
  },
];

// The version that drives the auto-popup: the NEWEST entry by `version`, not
// list position. The "Welcome" entry stays pinned at the top for display, so
// we can't key off index 0 — pick the max version instead (YYYY-MM-DD strings
// compare chronologically) so a newly-added release still re-shows the popup.
export const CURRENT_WHATS_NEW_VERSION = WHATS_NEW_ENTRIES.reduce<string>(
  (latest, entry) => (entry.version > latest ? entry.version : latest),
  '',
);

// localStorage key holding the last version the user has seen.
export const WHATS_NEW_STORAGE_KEY = 'trend:whatsNewSeenVersion';
