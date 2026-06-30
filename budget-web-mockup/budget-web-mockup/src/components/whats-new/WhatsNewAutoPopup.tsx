'use client';

import { useEffect, useState } from 'react';
import WhatsNewModal from './WhatsNewModal';
import {
  CURRENT_WHATS_NEW_VERSION,
  WHATS_NEW_STORAGE_KEY,
} from '@/config/whatsNew';

/**
 * Shows the What's New popup once per release. On mount it compares the current
 * release version against the one saved in localStorage; if they differ, it
 * opens the modal AND immediately records the version as seen.
 *
 * The "seen" flag is written as soon as the popup is shown — not on close — so
 * it sticks even if the user closes the browser without dismissing the modal.
 * (Writing only on close meant closing the tab/browser left it unrecorded, so
 * the popup reappeared on every login.)
 *
 * Mounted in the dashboard layout so it triggers after login on any page.
 */
export default function WhatsNewAutoPopup() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!CURRENT_WHATS_NEW_VERSION) return;
    try {
      const seen = localStorage.getItem(WHATS_NEW_STORAGE_KEY);
      if (seen !== CURRENT_WHATS_NEW_VERSION) {
        setOpen(true);
        // Record it as seen now, while we know it's being shown.
        localStorage.setItem(WHATS_NEW_STORAGE_KEY, CURRENT_WHATS_NEW_VERSION);
      }
    } catch {
      // localStorage unavailable (private mode etc.) — skip the popup silently.
    }
  }, []);

  const handleClose = () => {
    setOpen(false);
  };

  return <WhatsNewModal isOpen={open} onClose={handleClose} />;
}
